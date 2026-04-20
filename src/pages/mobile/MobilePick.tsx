import React, { useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, PackageCheck, Search, CheckCircle, MapPin, ChevronRight, ArrowLeft, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextSimple';
import { addToStagingQueue } from '@/services/stagingService';
import { CameraQRScanner } from '@/components/mobile/CameraQRScanner';

interface PickItem {
    id: string;
    product_name: string;
    sku: string;
    quantity_to_pick: number;
    quantity_picked: number;
    location: string;
    status: 'pending' | 'picked';
}

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

const MobilePick = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [step, setStep] = useState<'scan_order' | 'pick_items'>('scan_order');
    const [orderNumber, setOrderNumber] = useState('');
    const [orderData, setOrderData] = useState<any>(null);
    const [pickList, setPickList] = useState<PickItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Active picking
    const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);
    const [scannedLocation, setScannedLocation] = useState('');
    const [pickedQty, setPickedQty] = useState(0);

    useScanner({
        onScan: (code) => {
            if (step === 'scan_order') {
                setOrderNumber(code);
                handleLoadOrder(code);
            } else if (activeItemIndex !== -1) {
                setScannedLocation(code);
            }
        }
    });

    const handleLoadOrder = async (orderId: string) => {
        if (!orderId) return;
        setLoading(true);
        try {
            const { data: order, error } = await localDb
                .from('customer_orders')
                .select('*')
                .eq('order_number', orderId)
                .single();

            if (error) throw error;
            if (!order) throw new Error('ไม่พบ Order');

            const { data: orderItems } = await localDb
                .from('order_items')
                .select('*')
                .eq('order_id', (order as any).id);

            const items: PickItem[] = [];

            for (const item of ((orderItems as any[]) || [])) {
                const l1Qty = item.ordered_quantity_level1 || 0;
                const l2Qty = item.ordered_quantity_level2 || 0;
                const l3Qty = item.ordered_quantity_level3 || 0;
                const totalQty = l1Qty + l2Qty + l3Qty;

                let location = item.location;

                if (!location && item.sku) {
                    const { data: invItem } = await localDb
                        .from('inventory_items')
                        .select('location')
                        .eq('sku', item.sku)
                        .gt('quantity_pieces', 0)
                        .single();
                    location = invItem?.location || 'ไม่พบตำแหน่ง';
                }

                items.push({
                    id: item.id,
                    product_name: item.product_name || 'Unknown',
                    sku: item.sku || item.product_code,
                    quantity_to_pick: totalQty || item.quantity || 1,
                    quantity_picked: (item.picked_quantity_level1 || 0) + (item.picked_quantity_level2 || 0) + (item.picked_quantity_level3 || 0),
                    location: location || 'STAGING',
                    status: item.status === 'PICKED' ? 'picked' : 'pending'
                });
            }

            items.sort((a, b) => a.location.localeCompare(b.location));

            setOrderData(order);
            setPickList(items);
            setStep('pick_items');
            toast.success(`โหลด Order ${orderId} สำเร็จ • ${items.length} รายการ`);
        } catch (e: any) {
            toast.error(e.message || 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectItem = (index: number) => {
        setActiveItemIndex(index);
        setPickedQty(pickList[index].quantity_to_pick);
        setScannedLocation('');
    };

    const handleConfirmPick = async () => {
        if (activeItemIndex === -1) return;
        const item = pickList[activeItemIndex];

        if (scannedLocation && scannedLocation.toUpperCase() !== item.location.toUpperCase()) {
            toast.error(`ตำแหน่งไม่ถูก! ต้อง: ${item.location}`);
            return;
        }

        setLoading(true);
        try {
            // ส่งไปจุดพัก (Staging Queue) — ยังไม่หัก inventory
            const result = await addToStagingQueue('pick', {
                sku: item.sku,
                productName: item.product_name,
                quantity: pickedQty,
                unitLevel3Quantity: pickedQty,
                locationFrom: item.location,
                locationTo: 'STAGING',
                referenceType: 'order',
                referenceId: orderData?.id,
                createdBy: user?.id,
                metadata: {
                    orderItemId: item.id,
                    orderNumber: orderData?.order_number,
                    userName: user?.full_name || user?.email
                }
            });

            if (!result.success) {
                toast.error('บันทึกไม่สำเร็จ');
                return;
            }

            const updated = [...pickList];
            updated[activeItemIndex] = { ...item, quantity_picked: pickedQty, status: 'picked' };
            setPickList(updated);
            setActiveItemIndex(-1);
            toast.success(`📦 ส่งไปจุดพักแล้ว • ${pickedQty} ชิ้น จาก ${item.location}`);
        } catch (e) {
            toast.error('บันทึกไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    const handleCompletePicking = async () => {
        const unpicked = pickList.filter(i => i.status === 'pending');
        if (unpicked.length > 0) {
            toast.error(`ยังเหลืออีก ${unpicked.length} รายการ`);
            return;
        }

        setLoading(true);
        try {
            await localDb.from('customer_orders')
                .update({ status: 'STAGING' })
                .eq('id', orderData.id);

            toast.success('📦 ส่งไปจุดพักทั้งหมดแล้ว! รอยืนยัน');
            setStep('scan_order');
            setOrderNumber('');
            setOrderData(null);
            setPickList([]);
        } catch (e) {
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    const activeItem = activeItemIndex !== -1 ? pickList[activeItemIndex] : null;
    const pickedCount = pickList.filter(i => i.status === 'picked').length;
    const progress = pickList.length > 0 ? (pickedCount / pickList.length) * 100 : 0;

    return (
        <MobileLayout title="เบิกจ่ายสินค้า" showBack={true}>
            <StepIndicator
                currentStep={step === 'scan_order' ? 0 : activeItem ? 1 : 2}
                steps={['สแกน Order', 'หยิบสินค้า', 'เสร็จสิ้น']}
            />

            {step === 'scan_order' && (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mb-2">
                        <PackageCheck className="w-10 h-10 text-amber-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">สแกน Order / เลข Wave</h2>

                    <div className="w-full">
                        <CameraQRScanner
                            onScan={(code) => { setOrderNumber(code); handleLoadOrder(code); }}
                            buttonText="📷 สแกน QR ด้วยกล้อง"
                            modalTitle="📷 สแกน Order"
                            modalHint="เล็งกล้องไปที่ QR Code ของ Order"
                            scannerId="qr-reader-pick"
                            buttonClassName="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-slate-400 text-xs">หรือพิมพ์</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <div className="flex gap-2 w-full">
                        <Input
                            value={orderNumber}
                            onChange={e => setOrderNumber(e.target.value.toUpperCase())}
                            placeholder="ORD-2024-XXXX"
                            className="text-center text-base h-12 uppercase font-mono rounded-xl border-slate-200"
                        />
                        <Button
                            onClick={() => handleLoadOrder(orderNumber)}
                            disabled={loading}
                            className="h-12 w-12 p-0 rounded-xl bg-amber-500 hover:bg-amber-600"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Search />}
                        </Button>
                    </div>
                </div>
            )}

            {step === 'pick_items' && (
                <>
                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-700">{orderData?.order_number}</span>
                            <span className="text-xs text-slate-500">{pickedCount}/{pickList.length} รายการ</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Item List View */}
                    {!activeItem && (
                        <div className="space-y-2.5">
                            {pickList.map((item, index) => (
                                <button
                                    key={item.id}
                                    className={`w-full text-left rounded-2xl shadow-sm border transition-all active:scale-[0.98] ${item.status === 'picked'
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : 'bg-white border-slate-100 hover:shadow-md'
                                        }`}
                                    onClick={() => item.status !== 'picked' && handleSelectItem(index)}
                                    disabled={item.status === 'picked'}
                                >
                                    <div className="p-3 flex justify-between items-center">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-slate-800 truncate">{item.product_name}</p>
                                            <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <MapPin className="h-3 w-3 text-blue-500" />
                                                <span className="text-xs font-mono font-bold text-blue-600">{item.location}</span>
                                            </div>
                                        </div>
                                        <div className="text-right ml-3">
                                            {item.status === 'picked' ? (
                                                <div className="flex items-center gap-1 text-emerald-600">
                                                    <CheckCircle className="h-5 w-5" />
                                                    <span className="font-bold text-lg">{item.quantity_picked}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold text-xl text-slate-800">{item.quantity_to_pick}</span>
                                                    <ChevronRight className="h-4 w-4 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}

                            <Button
                                className="w-full mt-4 h-14 text-base font-bold bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                onClick={handleCompletePicking}
                                disabled={pickList.some(i => i.status === 'pending')}
                            >
                                <CheckCircle className="mr-2 h-5 w-5" />
                                หยิบเสร็จ — ส่งไปจุดพัก
                            </Button>
                        </div>
                    )}

                    {/* Active Picking View */}
                    {activeItem && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
                                <p className="text-xs text-amber-500 font-bold mb-1">สินค้าที่ต้องหยิบ</p>
                                <h3 className="font-bold text-lg text-slate-800">{activeItem.product_name}</h3>
                                <p className="text-slate-500 text-sm font-mono">{activeItem.sku}</p>
                                <div className="mt-3 flex items-center gap-2 bg-white p-3 rounded-xl border border-amber-200">
                                    <MapPin className="text-blue-500 h-5 w-5" />
                                    <span className="font-mono font-bold text-lg text-blue-700">{activeItem.location}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">สแกนยืนยันตำแหน่ง (ไม่บังคับ)</label>
                                    <Input
                                        value={scannedLocation}
                                        onChange={e => setScannedLocation(e.target.value)}
                                        placeholder="สแกน QR เพื่อตรวจ"
                                        className="uppercase rounded-xl h-12 border-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">จำนวนที่หยิบ</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            className="h-14 w-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-slate-600"
                                            onClick={() => setPickedQty(Math.max(0, pickedQty - 1))}
                                        >−</button>
                                        <Input
                                            type="number"
                                            value={pickedQty}
                                            onChange={(e) => setPickedQty(Number(e.target.value))}
                                            className="text-center text-3xl font-bold h-16 flex-1 rounded-xl border-slate-200"
                                        />
                                        <button
                                            className="h-14 w-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-slate-600"
                                            onClick={() => setPickedQty(pickedQty + 1)}
                                        >+</button>
                                    </div>
                                </div>
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
                                    className="flex-1 h-14 rounded-xl text-base font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                                    onClick={handleConfirmPick}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-5 w-5" />}
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

export default MobilePick;
