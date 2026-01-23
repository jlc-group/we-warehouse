import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check, X, RefreshCw, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextSimple';
import { getStagingItems, confirmStagingItem, cancelStagingItem } from '@/services/stagingService';

export function StagingDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchItems = async () => {
        setLoading(true);
        const data = await getStagingItems('pending');
        setItems(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleConfirm = async (item: any) => {
        setProcessingId(item.id);
        try {
            const result = await confirmStagingItem(item, user);
            if (result.success) {
                toast({
                    title: 'ยืนยันสำเร็จ',
                    description: `ตัดสต็อก ${item.product_code} เรียบร้อยแล้ว`,
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
        } catch (e) {
            console.error(e);
            toast({
                title: 'Exception',
                description: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
                variant: 'destructive'
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancel = async (item: any) => {
        setProcessingId(item.id);
        try {
            const result = await cancelStagingItem(item.id);
            if (result.success) {
                toast({
                    title: 'ยกเลิกรายการ',
                    description: 'รายการถูกยกเลิกแล้ว',
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

    return (
        <div className="space-y-4 p-2 sm:p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">พักสินค้า (Staging)</h2>
                    <p className="text-muted-foreground">
                        ตรวจสอบรายการที่หยิบมาและยืนยันเพื่อตัดสต็อกจริง
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        รายการรอตรวจสอบ ({items.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Check className="h-12 w-12 mx-auto mb-4 text-green-100 bg-green-50 rounded-full p-2" />
                            <p>ไม่มีรายการรอตรวจสอบ</p>
                            <p className="text-sm">เมื่อมีการหยิบสินค้าแบบ "พักสินค้า" จะมาปรากฏที่นี่</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors gap-4"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-200">
                                                    {item.product_code}
                                                </Badge>
                                                <span className="text-sm text-gray-500">
                                                    จาก {item.location}
                                                </span>
                                                <ArrowRightIcon />
                                                <span className="text-sm font-medium text-purple-600">
                                                    {item.target_location}
                                                </span>
                                            </div>
                                            <h4 className="font-medium">
                                                {item.inventory_items?.product_name || 'Unknown Product'}
                                            </h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                จำนวน: <span className="font-bold text-lg">{item.quantity}</span> {item.unit || 'ชิ้น'}
                                                <span className="text-xs text-gray-400 ml-2">
                                                    ({new Date(item.created_at).toLocaleString('th-TH')})
                                                </span>
                                            </p>
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
                                                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                                                onClick={() => handleConfirm(item)}
                                                disabled={!!processingId}
                                            >
                                                {processingId === item.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Check className="h-4 w-4 mr-2" />
                                                )}
                                                ยืนยันตัดสต็อก
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

function ArrowRightIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 mx-1"
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    );
}
