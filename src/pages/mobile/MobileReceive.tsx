import React, { useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, PackagePlus, Search, CheckCircle, ArrowLeft, Package, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextSimple';
import { CameraQRScanner } from '@/components/mobile/CameraQRScanner';
import { addToStagingQueue } from '@/services/stagingService';

// Step Indicator Component
const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
    <div className="flex items-center justify-center gap-1 mb-5">
        {steps.map((label, i) => (
            <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < currentStep ? 'bg-emerald-500 text-white' :
                        i === currentStep ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' :
                            'bg-slate-200 text-slate-400'
                        }`}>
                        {i < currentStep ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium ${i === currentStep ? 'text-blue-600' : 'text-slate-400'}`}>
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

// Success Animation
const SuccessAnimation = ({ onDone }: { onDone: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onDone, 2000);
        return () => clearTimeout(timer);
    }, [onDone]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center animate-in zoom-in-95">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">รับสำเร็จ! ✅</h3>
                <p className="text-slate-500 text-sm mt-1">บันทึกข้อมูลเรียบร้อย</p>
            </div>
        </div>
    );
};

const MobileReceive = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState<'scan_po' | 'process_item'>('scan_po');
    const [poNumber, setPoNumber] = useState('');
    const [poData, setPoData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Process Item State
    const [scanProduct, setScanProduct] = useState('');
    const [scanLocation, setScanLocation] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeItem, setActiveItem] = useState<any>(null);

    useScanner({
        onScan: (code) => {
            if (step === 'scan_po') {
                setPoNumber(code);
                handleLoadPO(code);
            } else {
                if (code.toUpperCase().startsWith('LOC') || code.length < 5) {
                    setScanLocation(code);
                } else {
                    setScanProduct(code);
                    handleFindItemInPO(code);
                }
            }
        }
    });

    /**
     * แปลง raw scan input → PO number
     * รองรับ: URL จาก QR, JSON, plain text
     */
    const parsePOInput = (raw: string): string => {
        const trimmed = raw.trim();
        if (/^https?:\/\//i.test(trimmed)) {
            try {
                const u = new URL(trimmed);
                const m = u.pathname.match(/\/(?:po|receive|mobile\/receive)\/([^/]+)/);
                if (m) return decodeURIComponent(m[1]);
                const q = u.searchParams.get('po') || u.searchParams.get('po_number');
                if (q) return q;
            } catch { /* fall through */ }
        }
        if (trimmed.startsWith('{')) {
            try {
                const j = JSON.parse(trimmed);
                if (j.po_number) return String(j.po_number);
            } catch { /* fall through */ }
        }
        return trimmed;
    };

    const handleLoadPO = async (rawInput: string) => {
        const po = parsePOInput(rawInput);
        if (!po) return;
        setLoading(true);
        try {
            // PO sync เก็บลง customer_orders (order_number = PO number จาก JLC)
            const { data: order, error: orderError } = await localDb
                .from('customer_orders')
                .select('*')
                .eq('order_number', po)
                .maybeSingle();

            if (orderError) throw orderError;
            if (!order) throw new Error(`ไม่พบ PO: ${po}`);

            const { data: items, error: itemsError } = await localDb
                .from('order_items')
                .select('*')
                .eq('order_id', order.id);

            if (itemsError) throw itemsError;

            // Normalize ให้ตรงกับ shape เดิมที่ UI ใช้ (inbound_receipt_items)
            const normalizedItems = (items || []).map((it: any) => ({
                id: it.id,
                product_code: it.sku,
                product_name: it.product_name,
                quantity_expected: it.ordered_quantity_level1 || 0,
                quantity_received: it.shipped_quantity_level1 || 0,
                location: it.location,
                unit_price: it.unit_price,
            }));

            setPoData({
                ...order,
                document_number: order.order_number,
                inbound_receipt_items: normalizedItems,
            });
            setStep('process_item');
            toast.success(`โหลด PO ${po} สำเร็จ (${normalizedItems.length} รายการ)`);
        } catch (e: any) {
            toast.error(e.message || 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    const handleFindItemInPO = (skuOrCode: string) => {
        if (!poData) return;
        const item = poData.inbound_receipt_items.find((i: any) =>
            i.product_code === skuOrCode || (i.product_name || '').includes(skuOrCode)
        );

        if (item) {
            setActiveItem(item);
            setQuantity(item.quantity_expected - (item.quantity_received || 0));
            toast.success(`พบ: ${item.product_name}`);
        } else {
            toast('ไม่พบสินค้าใน PO นี้');
        }
    };

    const handleSubmitReceive = async () => {
        if (!activeItem || !scanLocation || quantity <= 0) {
            toast.error('กรุณากรอกข้อมูลให้ครบ');
            return;
        }

        setLoading(true);
        try {
            // ส่งไปจุดพัก (Staging Queue) — ยังไม่เพิ่ม inventory
            const result = await addToStagingQueue('receive', {
                sku: activeItem.product_code,
                productName: activeItem.product_name,
                quantity: quantity,
                unitLevel3Quantity: quantity,
                locationFrom: undefined,
                locationTo: scanLocation,
                referenceType: 'po',
                referenceId: poData.id,
                createdBy: user?.id,
                metadata: {
                    receiptItemId: activeItem.id,
                    documentNumber: poData.document_number,
                    userName: user?.full_name || user?.email
                }
            });

            if (!result.success) {
                toast.error('บันทึกไม่สำเร็จ');
                return;
            }

            setShowSuccess(true);
            setScanProduct('');
            setQuantity(0);
            setActiveItem(null);
            toast.success('📦 ส่งไปจุดพักแล้ว รอยืนยัน');
        } catch (e) {
            toast.error('รับสินค้าไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    const receivedCount = poData?.inbound_receipt_items?.filter(
        (i: any) => (i.quantity_received || 0) >= i.quantity_expected
    ).length || 0;
    const totalCount = poData?.inbound_receipt_items?.length || 0;
    const progress = totalCount > 0 ? (receivedCount / totalCount) * 100 : 0;

    return (
        <MobileLayout title="รับสินค้าเข้า" showBack={true}>
            {showSuccess && <SuccessAnimation onDone={() => setShowSuccess(false)} />}

            <StepIndicator
                currentStep={step === 'scan_po' ? 0 : activeItem ? 1 : 2}
                steps={['สแกน PO', 'สแกนสินค้า', 'ยืนยัน']}
            />

            {step === 'scan_po' && (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-2">
                        <PackagePlus className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">สแกน PO / ใบรับสินค้า</h2>

                    <div className="w-full">
                        <CameraQRScanner
                            onScan={(code) => { setPoNumber(code); handleLoadPO(code); }}
                            buttonText="📷 สแกน QR ด้วยกล้อง"
                            modalTitle="📷 สแกน PO / Receipt"
                            modalHint="เล็งกล้องไปที่ QR Code ของ PO"
                            scannerId="qr-reader-receive"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-slate-400 text-xs">หรือพิมพ์</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <div className="flex gap-2 w-full">
                        <Input
                            value={poNumber}
                            onChange={e => setPoNumber(e.target.value.toUpperCase())}
                            placeholder="PO-2024-XXXX"
                            className="text-center text-base h-12 uppercase font-mono rounded-xl border-slate-200"
                        />
                        <Button
                            onClick={() => handleLoadPO(poNumber)}
                            disabled={loading}
                            className="h-12 w-12 p-0 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Search />}
                        </Button>
                    </div>
                </div>
            )}

            {step === 'process_item' && poData && (
                <div className="space-y-4">
                    {/* PO Header + Progress */}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-2xl border border-emerald-100">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <p className="text-[11px] text-emerald-600 font-bold">ใบรับสินค้า</p>
                                <p className="text-lg font-bold text-slate-800">{poData.document_number}</p>
                            </div>
                            <span className="text-xs text-emerald-600 font-medium">{receivedCount}/{totalCount} รายการ</span>
                        </div>
                        <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {!activeItem && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                            <Package className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                            <p className="text-amber-700 font-medium">สแกนสินค้าเพื่อรับเข้า</p>
                            <p className="text-amber-500 text-xs mt-1">สแกนบาร์โค้ดหรือเลือกจากรายการด้านล่าง</p>
                        </div>
                    )}

                    {activeItem && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
                            <div>
                                <p className="text-xs text-blue-500 font-bold mb-1">สินค้าที่จะรับ</p>
                                <h3 className="font-bold text-lg text-slate-800">{activeItem.product_name}</h3>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    คาด: {activeItem.quantity_expected} | รับแล้ว: {activeItem.quantity_received || 0}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">จำนวน</label>
                                    <Input
                                        type="number"
                                        value={quantity}
                                        onChange={e => setQuantity(Number(e.target.value))}
                                        className="text-right text-lg font-bold rounded-xl h-12 border-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">ตำแหน่ง</label>
                                    <Input
                                        value={scanLocation}
                                        onChange={e => setScanLocation(e.target.value)}
                                        placeholder="สแกน Loc"
                                        className="uppercase rounded-xl h-12 border-slate-200 font-mono"
                                    />
                                </div>
                            </div>
                            <Button
                                className="w-full h-14 text-base font-bold bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                                onClick={handleSubmitReceive}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                                ยืนยันการรับ
                            </Button>
                        </div>
                    )}

                    {/* Pending Items */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">รายการสินค้า</h4>
                        <div className="space-y-2">
                            {poData.inbound_receipt_items.map((i: any) => {
                                const done = (i.quantity_received || 0) >= i.quantity_expected;
                                return (
                                    <button
                                        key={i.id}
                                        className={`w-full text-left p-3 rounded-xl border transition-all active:scale-[0.98] ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:shadow-sm'
                                            }`}
                                        onClick={() => !done && handleFindItemInPO(i.product_code)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className={`text-sm font-medium ${done ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                {i.product_name}
                                            </span>
                                            <span className={`font-mono text-sm font-bold ${done ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {done && '✓ '}{i.quantity_received || 0}/{i.quantity_expected}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </MobileLayout>
    );
};

export default MobileReceive;
