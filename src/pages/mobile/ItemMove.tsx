import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, ArrowRight, CheckCircle2, MapPin, Package } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextSimple';
import { addToStagingQueue } from '@/services/stagingService';
import { CameraQRScanner } from '@/components/mobile/CameraQRScanner';

const ItemMove = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const itemId = searchParams.get('item');
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [item, setItem] = useState<any>(null);
    const [targetLocation, setTargetLocation] = useState('');
    const [moveQty, setMoveQty] = useState<number>(0);

    // Scanner for target location
    useScanner({
        onScan: (code) => {
            setTargetLocation(code);
        }
    });

    useEffect(() => {
        if (itemId) {
            loadItem(itemId);
        } else {
            toast.error('ไม่ได้ระบุสินค้า');
            navigate('/mobile/lookup');
        }
    }, [itemId]);

    const loadItem = async (id: string) => {
        try {
            const { data, error } = await localDb
                .from('inventory_items')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setItem(data);
            setMoveQty(data.quantity_pieces);
        } catch (error) {
            toast.error('โหลดสินค้าไม่สำเร็จ');
            navigate('/mobile/lookup');
        } finally {
            setLoading(false);
        }
    };

    const handleMove = async () => {
        if (!targetLocation) {
            toast.error('กรุณาสแกนหรือพิมพ์ตำแหน่งปลายทาง');
            return;
        }
        if (moveQty <= 0 || moveQty > (item?.quantity_pieces || 0)) {
            toast.error('จำนวนไม่ถูกต้อง');
            return;
        }

        setSubmitting(true);
        try {
            // ส่งไปจุดพัก (Staging Queue) — ยังไม่ย้ายจริง
            const result = await addToStagingQueue('move', {
                inventoryItemId: item.id,
                sku: item.sku || item.product_name,
                productName: item.product_name,
                quantity: moveQty,
                locationFrom: item.location,
                locationTo: targetLocation,
                referenceType: 'manual',
                createdBy: user?.email
            });

            if (result.success) {
                toast.success(`📦 ส่งไปจุดพักแล้ว • รอยืนยัน`);
                navigate('/mobile/lookup');
            } else {
                toast.error('บันทึกไม่สำเร็จ');
            }
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <MobileLayout title="ย้ายสินค้า" showBack={true}>
                <div className="flex flex-col items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="mt-3 text-slate-400 text-sm">กำลังโหลด...</p>
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout title="ย้ายสินค้า" showBack={true}>
            {/* Product Info */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100 mb-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-slate-800 truncate">{item.product_name}</h3>
                        <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                    </div>
                </div>
            </div>

            {/* Visual Flow: From → To */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
                <div className="flex items-center gap-3">
                    {/* From */}
                    <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-blue-500 font-bold mb-1">ต้นทาง</p>
                        <p className="text-lg font-mono font-bold text-blue-700">{item.location}</p>
                        <p className="text-xs text-blue-400 mt-0.5">{item.quantity_pieces} ชิ้น</p>
                    </div>

                    {/* Arrow */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                        <ArrowRight className="h-5 w-5 text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-bold">{moveQty}</span>
                    </div>

                    {/* To */}
                    <div className={`flex-1 rounded-xl p-3 text-center border-2 border-dashed transition-all ${targetLocation
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                        }`}>
                        <p className={`text-[10px] font-bold mb-1 ${targetLocation ? 'text-emerald-500' : 'text-slate-400'}`}>
                            ปลายทาง
                        </p>
                        <p className={`text-lg font-mono font-bold ${targetLocation ? 'text-emerald-700' : 'text-slate-300'}`}>
                            {targetLocation || '???'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Quantity */}
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">จำนวนที่ย้าย (ชิ้น)</label>
                    <div className="flex gap-2">
                        <Button
                            variant={moveQty === item.quantity_pieces ? "default" : "outline"}
                            className="flex-1 h-12 rounded-xl"
                            onClick={() => setMoveQty(item.quantity_pieces)}
                        >
                            ทั้งหมด ({item.quantity_pieces})
                        </Button>
                        <Input
                            type="number"
                            value={moveQty}
                            onChange={(e) => setMoveQty(parseInt(e.target.value) || 0)}
                            className="w-24 text-center font-bold h-12 rounded-xl border-slate-200"
                        />
                    </div>
                </div>

                {/* Target Location */}
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">ตำแหน่งปลายทาง</label>
                    <CameraQRScanner
                        onScan={(code) => {
                            setTargetLocation(code);
                            toast.success(`สแกนได้: ${code}`);
                        }}
                        buttonText="📷 สแกน QR ปลายทาง"
                        modalTitle="📷 สแกน Location ปลายทาง"
                        modalHint="เล็งกล้องไปที่ QR Code ของ Location ปลายทาง"
                        scannerId="qr-reader-move"
                        buttonClassName="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    />
                    <Input
                        placeholder="หรือพิมพ์ Location"
                        value={targetLocation}
                        onChange={(e) => setTargetLocation(e.target.value.toUpperCase())}
                        className="text-base h-12 font-mono rounded-xl border-slate-200 mt-2"
                    />
                </div>

                {/* Confirm Button */}
                <Button
                    className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all mt-2"
                    onClick={handleMove}
                    disabled={submitting || !targetLocation}
                >
                    {submitting ? (
                        <Loader2 className="animate-spin mr-2" />
                    ) : (
                        <ArrowRight className="mr-2 h-5 w-5" />
                    )}
                    ยืนยันการย้าย
                </Button>
            </div>
        </MobileLayout>
    );
};

export default ItemMove;
