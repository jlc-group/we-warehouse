import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, ClipboardCheck, ScanLine, Save, Search, CheckCircle, ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextSimple';
import { CameraQRScanner } from '@/components/mobile/CameraQRScanner';

// Step Indicator Component
const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
    <div className="flex items-center justify-center gap-1 mb-5">
        {steps.map((label, i) => (
            <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < currentStep ? 'bg-emerald-500 text-white' :
                            i === currentStep ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30' :
                                'bg-slate-200 text-slate-400'
                        }`}>
                        {i < currentStep ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium ${i === currentStep ? 'text-violet-600' : 'text-slate-400'}`}>
                        {label}
                    </span>
                </div>
                {i < steps.length - 1 && (
                    <div className={`w-8 h-0.5 -mt-4 ${i < currentStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
            </React.Fragment>
        ))}
    </div>
);

const MobileCount = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [step, setStep] = useState<'scan_location' | 'count_items'>('scan_location');
    const [location, setLocation] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Counting State
    const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);
    const [countQty, setCountQty] = useState<number>(0);

    useScanner({
        onScan: (code) => {
            if (activeItemIndex === -1) {
                setLocation(code);
                handleLoadLocation(code);
            }
        }
    });

    const handleLoadLocation = async (locCode: string) => {
        if (!locCode) return;
        setLoading(true);
        try {
            const { data: locData, error: locError } = await localDb
                .from('warehouse_locations')
                .select('location_code')
                .eq('location_code', locCode)
                .single();

            if (locError || !locData) throw new Error('ไม่พบ Location');

            const { data: invData, error: invError } = await localDb
                .from('inventory_items')
                .select('*')
                .eq('location', locCode)
                .gt('quantity_pieces', 0);

            if (invError) throw invError;

            const countList = (invData || []).map((item: any) => ({
                ...item,
                counted_qty: null,
                status: 'pending'
            }));

            setItems(countList);
            setStep('count_items');
            toast.success(`โหลด Location ${locCode} สำเร็จ`);
        } catch (e: any) {
            toast.error(e.message || 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectForCount = (index: number) => {
        setActiveItemIndex(index);
        setCountQty(items[index].counted_qty || 0);
    };

    const handleSaveItemCount = () => {
        if (activeItemIndex === -1) return;

        const updatedItems = [...items];
        updatedItems[activeItemIndex] = {
            ...updatedItems[activeItemIndex],
            counted_qty: countQty,
            status: 'counted'
        };

        setItems(updatedItems);
        setActiveItemIndex(-1);
        toast.success('บันทึกจำนวนแล้ว');
    };

    const handleSubmitFinal = async () => {
        const uncounted = items.filter(i => i.status === 'pending');
        if (uncounted.length > 0) {
            toast.error(`ยังเหลือ ${uncounted.length} รายการที่ยังไม่ได้นับ`);
            return;
        }

        setLoading(true);
        try {
            let adjustments = 0;
            for (const item of items) {
                const diff = (item.counted_qty || 0) - item.quantity_pieces;
                if (diff !== 0) {
                    await localDb.from('inventory_items')
                        .update({ quantity_pieces: item.counted_qty })
                        .eq('id', item.id);
                    adjustments++;
                }
            }

            toast.success(`🎉 เสร็จสิ้น! ปรับ ${adjustments} รายการ`);
            setStep('scan_location');
            setLocation('');
            setItems([]);
        } catch (e) {
            toast.error('บันทึกไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    const activeItem = activeItemIndex !== -1 ? items[activeItemIndex] : null;
    const countedCount = items.filter(i => i.status === 'counted').length;
    const progress = items.length > 0 ? (countedCount / items.length) * 100 : 0;

    // Count summary stats
    const diffItems = items.filter(i => i.status === 'counted' && i.counted_qty !== i.quantity_pieces);

    const getDiffDisplay = (item: any) => {
        if (item.counted_qty === null) return null;
        const diff = item.counted_qty - item.quantity_pieces;
        if (diff === 0) return { icon: <Minus className="h-3 w-3" />, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'ตรง' };
        if (diff > 0) return { icon: <TrendingUp className="h-3 w-3" />, color: 'text-amber-600', bg: 'bg-amber-50', label: `+${diff}` };
        return { icon: <TrendingDown className="h-3 w-3" />, color: 'text-red-600', bg: 'bg-red-50', label: `${diff}` };
    };

    return (
        <MobileLayout title="นับสต็อก" showBack={true}>
            <StepIndicator
                currentStep={step === 'scan_location' ? 0 : activeItem ? 1 : 2}
                steps={['สแกน Loc', 'นับสินค้า', 'ส่งผล']}
            />

            {step === 'scan_location' && (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-violet-50 flex items-center justify-center mb-2">
                        <ScanLine className="w-10 h-10 text-violet-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">สแกน Location</h2>

                    <div className="w-full">
                        <CameraQRScanner
                            onScan={(code) => { setLocation(code); handleLoadLocation(code); }}
                            buttonText="📷 สแกน QR ด้วยกล้อง"
                            modalTitle="📷 สแกน Location"
                            modalHint="เล็งกล้องไปที่ QR Code ของ Location"
                            scannerId="qr-reader-count"
                            buttonClassName="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-slate-400 text-xs">หรือพิมพ์</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <div className="flex gap-2 w-full">
                        <Input
                            value={location}
                            onChange={e => setLocation(e.target.value.toUpperCase())}
                            placeholder="J5/4 หรือ A1/1"
                            className="text-center text-base h-12 uppercase font-mono rounded-xl border-slate-200"
                        />
                        <Button
                            onClick={() => handleLoadLocation(location)}
                            disabled={loading}
                            className="h-12 w-12 p-0 rounded-xl bg-violet-600 hover:bg-violet-700"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Search />}
                        </Button>
                    </div>
                </div>
            )}

            {step === 'count_items' && (
                <>
                    {/* Item List View */}
                    {!activeItem && (
                        <div className="space-y-3">
                            {/* Header + Progress */}
                            <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-2xl border border-violet-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-violet-800 font-mono">{location}</span>
                                    <span className="text-xs text-violet-600 font-medium">{countedCount}/{items.length} นับแล้ว</span>
                                </div>
                                <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Diff Summary (only if some counted) */}
                            {diffItems.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span className="text-xs text-amber-700 font-medium">
                                        {diffItems.length} รายการที่จำนวนไม่ตรง
                                    </span>
                                </div>
                            )}

                            <div className="space-y-2">
                                {items.map((item, index) => {
                                    const diff = getDiffDisplay(item);
                                    return (
                                        <button
                                            key={item.id}
                                            className={`w-full text-left rounded-2xl shadow-sm border transition-all active:scale-[0.98] ${item.status === 'counted'
                                                    ? diff && diff.label !== 'ตรง'
                                                        ? 'bg-amber-50/50 border-amber-200'
                                                        : 'bg-emerald-50 border-emerald-200'
                                                    : 'bg-white border-slate-100 hover:shadow-md'
                                                }`}
                                            onClick={() => handleSelectForCount(index)}
                                        >
                                            <div className="p-3 flex justify-between items-center">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-slate-800 truncate">{item.product_name}</p>
                                                    <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        ระบบ: <span className="font-bold text-slate-600">{item.quantity_pieces}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right ml-3">
                                                    {item.status === 'counted' ? (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="font-bold text-lg text-slate-800">{item.counted_qty}</span>
                                                            {diff && (
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${diff.bg} ${diff.color}`}>
                                                                    {diff.icon} {diff.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-400 font-medium">นับ</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <Button
                                className="w-full mt-4 h-14 text-base font-bold bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 rounded-xl shadow-lg shadow-violet-500/20 disabled:opacity-50"
                                onClick={handleSubmitFinal}
                                disabled={items.some(i => i.status === 'pending') || loading}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                                ส่งผลการนับ
                            </Button>
                        </div>
                    )}

                    {/* Active Counting View */}
                    {activeItem && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-100 text-center">
                                <p className="text-xs text-violet-500 font-bold mb-1">สินค้าที่กำลังนับ</p>
                                <h3 className="font-bold text-lg text-slate-800">{activeItem.product_name}</h3>
                                <p className="text-slate-500 text-sm font-mono">{activeItem.sku}</p>
                                <div className="mt-2 bg-white/70 rounded-lg p-2 inline-block">
                                    <span className="text-xs text-slate-500">ระบบ: </span>
                                    <span className="font-bold text-slate-700">{activeItem.quantity_pieces} ชิ้น</span>
                                </div>
                            </div>

                            <div className="text-center py-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">จำนวนที่นับได้</label>
                                <div className="flex items-center gap-3 mt-3 px-4">
                                    <button
                                        className="h-14 w-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-slate-600"
                                        onClick={() => setCountQty(Math.max(0, countQty - 1))}
                                    >−</button>
                                    <Input
                                        type="number"
                                        value={countQty}
                                        onChange={(e) => setCountQty(Number(e.target.value))}
                                        className="text-center text-4xl font-bold h-20 flex-1 rounded-xl border-2 border-violet-200 focus:border-violet-500"
                                        autoFocus
                                    />
                                    <button
                                        className="h-14 w-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-slate-600"
                                        onClick={() => setCountQty(countQty + 1)}
                                    >+</button>
                                </div>

                                {/* Diff Preview */}
                                {countQty !== activeItem.quantity_pieces && (
                                    <div className={`mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${countQty > activeItem.quantity_pieces
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                        {countQty > activeItem.quantity_pieces ? (
                                            <><TrendingUp className="h-4 w-4" /> +{countQty - activeItem.quantity_pieces} เกิน</>
                                        ) : (
                                            <><TrendingDown className="h-4 w-4" /> {countQty - activeItem.quantity_pieces} ขาด</>
                                        )}
                                    </div>
                                )}
                                {countQty === activeItem.quantity_pieces && (
                                    <div className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                                        <CheckCircle className="h-4 w-4" /> ตรงกัน ✓
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-14 rounded-xl text-base"
                                    onClick={() => setActiveItemIndex(-1)}
                                >
                                    <ArrowLeft className="mr-1 h-4 w-4" /> กลับ
                                </Button>
                                <Button
                                    className="flex-1 h-14 rounded-xl text-base font-bold bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-500/20 active:scale-[0.98]"
                                    onClick={handleSaveItemCount}
                                >
                                    <CheckCircle className="mr-2 h-5 w-5" />
                                    ยืนยัน
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </MobileLayout>
    );
};

export default MobileCount;
