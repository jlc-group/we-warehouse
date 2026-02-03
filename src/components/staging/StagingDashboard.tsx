/**
 * Shipment Staging Dashboard - รายการรอยืนยันจากระบบ Shipment
 * ดึงข้อมูลจาก shipment_orders WHERE status = 'picked'
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check, X, RefreshCw, Package, Truck, Send, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextSimple';
import { getShipments, shipShipment, cancelShipment, ShipmentOrder } from '@/services/shipmentService';

export function StagingDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [items, setItems] = useState<ShipmentOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchItems = async () => {
        setLoading(true);
        try {
            // ดึงรายการที่มีสถานะ 'picked' (หยิบแล้ว รอยืนยัน)
            const data = await getShipments('picked');
            setItems(data);
        } catch (error) {
            console.error('Error fetching shipments:', error);
            toast({
                title: 'ไม่สามารถโหลดข้อมูลได้',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    // ยืนยันส่ง Csmile (picked → shipped)
    const handleConfirmShip = async (item: ShipmentOrder) => {
        setProcessingId(item.id);
        try {
            const result = await shipShipment(item.taxno, item.docno);
            if (result.success) {
                toast({
                    title: '✅ ยืนยันส่ง Csmile สำเร็จ',
                    description: `${item.taxno} - ${item.arname}`,
                    className: 'bg-green-50 border-green-200'
                });
                // Remove from list
                setItems(prev => prev.filter(i => i.id !== item.id));
            } else {
                toast({
                    title: 'ผิดพลาด',
                    description: result.message || 'เกิดข้อผิดพลาดในการยืนยัน',
                    variant: 'destructive'
                });
            }
        } catch (e: any) {
            console.error(e);
            toast({
                title: 'Error',
                description: e.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
                variant: 'destructive'
            });
        } finally {
            setProcessingId(null);
        }
    };

    // ยกเลิกรายการ
    const handleCancel = async (item: ShipmentOrder) => {
        setProcessingId(item.id);
        try {
            const result = await cancelShipment(item.taxno, item.docno);
            if (result.success) {
                toast({
                    title: 'ยกเลิกรายการแล้ว',
                    description: `${item.taxno} ถูกยกเลิก`,
                });
                setItems(prev => prev.filter(i => i.id !== item.id));
            } else {
                toast({
                    title: 'ผิดพลาด',
                    description: 'ไม่สามารถยกเลิกรายการได้',
                    variant: 'destructive'
                });
            }
        } catch (e) {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    // ยืนยันทั้งหมด
    const handleConfirmAll = async () => {
        setProcessingId('all');
        let success = 0;
        let failed = 0;

        for (const item of items) {
            try {
                const result = await shipShipment(item.taxno, item.docno);
                if (result.success) {
                    success++;
                } else {
                    failed++;
                }
            } catch {
                failed++;
            }
        }

        toast({
            title: '✅ ยืนยันส่ง Csmile',
            description: `สำเร็จ ${success} รายการ${failed > 0 ? `, ไม่สำเร็จ ${failed} รายการ` : ''}`,
            className: 'bg-green-50 border-green-200'
        });

        fetchItems();
        setProcessingId(null);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4 p-2 sm:p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">พักสินค้า (Staging)</h2>
                    <p className="text-muted-foreground">
                        รายการที่หยิบแล้ว รอยืนยันส่ง Csmile
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {items.length > 0 && (
                        <Button
                            onClick={handleConfirmAll}
                            disabled={!!processingId}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processingId === 'all' ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Truck className="h-4 w-4 mr-2" />
                            )}
                            ยืนยันทั้งหมด ({items.length})
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Status Legend */}
            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <span>pending - รอหยิบ</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span>picked - หยิบแล้ว รอยืนยัน</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>shipped - ส่ง Csmile แล้ว</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>confirmed - ยืนยันแล้ว</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-purple-600" />
                        รายการหยิบแล้ว รอยืนยัน ({items.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Check className="h-12 w-12 mx-auto mb-4 text-green-500 bg-green-50 rounded-full p-2" />
                            <p className="font-medium">ไม่มีรายการรอยืนยัน</p>
                            <p className="text-sm mt-1">เมื่อมีการ "ส่งไปพักสินค้า" จากหน้ารายการส่งของ จะมาปรากฏที่นี่</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white hover:bg-purple-50 transition-colors gap-4 border-l-4 border-l-purple-500"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className="bg-purple-100 text-purple-700 font-mono">
                                                    {item.status}
                                                </Badge>
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                <span className="font-semibold">{item.taxno}</span>
                                            </div>
                                            <h4 className="font-medium text-gray-900">
                                                {item.arcode} - {item.arname}
                                            </h4>
                                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                                <span>📅 วันที่: {formatDate(item.taxdate)}</span>
                                                <span>📦 {item.item_count} รายการ</span>
                                                {item.picked_at && (
                                                    <span>⏰ หยิบเมื่อ: {formatTime(item.picked_at)}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <Button
                                                variant="outline"
                                                className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                onClick={() => handleCancel(item)}
                                                disabled={!!processingId}
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                ยกเลิก
                                            </Button>
                                            <Button
                                                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
                                                onClick={() => handleConfirmShip(item)}
                                                disabled={!!processingId}
                                            >
                                                {processingId === item.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Send className="h-4 w-4 mr-2" />
                                                )}
                                                ยืนยันส่ง Csmile
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
