/**
 * Staging Dashboard - รวม Shipment Staging + Mobile Staging Queue
 * Tab 1: Shipment (เดิม) — shipment_orders WHERE status = 'picked'
 * Tab 2: Mobile Queue (ใหม่) — mobile_staging_queue WHERE status = 'pending'
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, Truck, RefreshCw, Check, X, Send, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextSimple';
import { getShipments, shipShipment, cancelShipment, ShipmentOrder } from '@/services/shipmentService';
import {
    getStagingQueue,
    confirmStagingQueueItem,
    cancelStagingQueueItem,
    StagingQueueItem
} from '@/services/stagingService';

export function StagingDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'shipment' | 'mobile'>('mobile');
    const [items, setItems] = useState<ShipmentOrder[]>([]);
    const [queueItems, setQueueItems] = useState<StagingQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // ============ Shipment Tab (เดิม) ============

    const fetchShipments = async () => {
        setLoading(true);
        try {
            const data = await getShipments('picked');
            setItems(data);
        } catch (error) {
            console.error('Error fetching shipments:', error);
        } finally {
            setLoading(false);
        }
    };

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
                setItems(prev => prev.filter(i => i.id !== item.id));
            } else {
                toast({ title: 'ผิดพลาด', description: result.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
            }
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancelShipment = async (item: ShipmentOrder) => {
        setProcessingId(item.id);
        try {
            const result = await cancelShipment(item.taxno, item.docno);
            if (result.success) {
                toast({ title: 'ยกเลิกรายการแล้ว', description: `${item.taxno} ถูกยกเลิก` });
                setItems(prev => prev.filter(i => i.id !== item.id));
            } else {
                toast({ title: 'ผิดพลาด', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleConfirmAllShipments = async () => {
        setProcessingId('all');
        let success = 0, failed = 0;
        for (const item of items) {
            try {
                const result = await shipShipment(item.taxno, item.docno);
                result.success ? success++ : failed++;
            } catch { failed++; }
        }
        toast({
            title: '✅ ยืนยันส่ง Csmile',
            description: `สำเร็จ ${success} รายการ${failed > 0 ? `, ไม่สำเร็จ ${failed} รายการ` : ''}`,
            className: 'bg-green-50 border-green-200'
        });
        fetchShipments();
        setProcessingId(null);
    };

    // ============ Mobile Queue Tab (ใหม่) ============

    const fetchQueueItems = async () => {
        setLoading(true);
        try {
            const data = await getStagingQueue('pending');
            setQueueItems(data);
        } catch (error) {
            console.error('Error fetching queue:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmQueueItem = async (item: StagingQueueItem) => {
        setProcessingId(item.id);
        try {
            const result = await confirmStagingQueueItem(item, user?.id || 'system');
            if (result.success) {
                toast({
                    title: `✅ ยืนยัน${getOpLabel(item.operation_type)}สำเร็จ`,
                    description: `${item.product_name || item.sku} - ${item.quantity} ชิ้น`,
                    className: 'bg-green-50 border-green-200'
                });
                setQueueItems(prev => prev.filter(q => q.id !== item.id));
            } else {
                toast({ title: 'ผิดพลาด', description: result.message, variant: 'destructive' });
            }
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancelQueueItem = async (item: StagingQueueItem) => {
        setProcessingId(item.id);
        try {
            const result = await cancelStagingQueueItem(item.id, user?.id);
            if (result.success) {
                toast({ title: 'ยกเลิกรายการแล้ว' });
                setQueueItems(prev => prev.filter(q => q.id !== item.id));
            } else {
                toast({ title: 'ผิดพลาด', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleConfirmAllQueue = async () => {
        setProcessingId('all-queue');
        let success = 0, failed = 0;
        for (const item of queueItems) {
            try {
                const result = await confirmStagingQueueItem(item, user?.id || 'system');
                result.success ? success++ : failed++;
            } catch { failed++; }
        }
        toast({
            title: '✅ ยืนยันทั้งหมด',
            description: `สำเร็จ ${success} รายการ${failed > 0 ? `, ไม่สำเร็จ ${failed}` : ''}`,
            className: 'bg-green-50 border-green-200'
        });
        fetchQueueItems();
        setProcessingId(null);
    };

    // ============ Helpers ============

    const getOpLabel = (type: string) => {
        switch (type) {
            case 'pick': return 'หยิบสินค้า';
            case 'receive': return 'รับสินค้า';
            case 'move': return 'ย้ายสินค้า';
            default: return type;
        }
    };

    const getOpBadge = (type: string) => {
        switch (type) {
            case 'pick': return { label: '🟡 หยิบ', className: 'bg-amber-100 text-amber-700' };
            case 'receive': return { label: '🟢 รับเข้า', className: 'bg-green-100 text-green-700' };
            case 'move': return { label: '🔵 ย้าย', className: 'bg-blue-100 text-blue-700' };
            default: return { label: type, className: 'bg-gray-100 text-gray-700' };
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleTimeString('th-TH', {
            hour: '2-digit', minute: '2-digit'
        });
    };

    useEffect(() => {
        if (activeTab === 'shipment') {
            fetchShipments();
        } else {
            fetchQueueItems();
        }
    }, [activeTab]);

    // Auto-refresh every 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab === 'shipment') fetchShipments();
            else fetchQueueItems();
        }, 15000);
        return () => clearInterval(interval);
    }, [activeTab]);

    return (
        <div className="space-y-4 p-2 sm:p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">จุดพักสินค้า (Staging)</h2>
                    <p className="text-muted-foreground">รายการรอยืนยันจากระบบ Mobile + Shipment</p>
                </div>
                <Button variant="outline" size="sm"
                    onClick={() => activeTab === 'shipment' ? fetchShipments() : fetchQueueItems()}
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('mobile')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'mobile'
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    📱 Mobile Queue
                    {queueItems.length > 0 && activeTab !== 'mobile' && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                            {queueItems.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('shipment')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'shipment'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    🚚 Shipment
                    {items.length > 0 && activeTab !== 'shipment' && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                            {items.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ============ Mobile Queue Tab ============ */}
            {activeTab === 'mobile' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-violet-600" />
                                รายการรอยืนยันจาก Mobile ({queueItems.length})
                            </CardTitle>
                            {queueItems.length > 0 && (
                                <Button onClick={handleConfirmAllQueue} disabled={!!processingId}
                                    className="bg-green-600 hover:bg-green-700" size="sm"
                                >
                                    {processingId === 'all-queue' ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    ยืนยันทั้งหมด
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : queueItems.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Check className="h-12 w-12 mx-auto mb-4 text-green-500 bg-green-50 rounded-full p-2" />
                                <p className="font-medium">ไม่มีรายการรอยืนยัน</p>
                                <p className="text-sm mt-1">เมื่อมีการทำรายการจาก Mobile จะแสดงที่นี่</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-3">
                                    {queueItems.map((item) => {
                                        const badge = getOpBadge(item.operation_type);
                                        const ageMs = Date.now() - new Date(item.created_at).getTime();
                                        const isStale = ageMs > 24 * 60 * 60 * 1000; // > 24h
                                        return (
                                            <div
                                                key={item.id}
                                                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors gap-4 border-l-4 ${isStale ? 'border-l-red-500 bg-red-50' :
                                                        item.operation_type === 'pick' ? 'border-l-amber-400' :
                                                            item.operation_type === 'receive' ? 'border-l-green-400' :
                                                                'border-l-blue-400'
                                                    }`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge className={badge.className}>{badge.label}</Badge>
                                                        <span className="font-semibold text-gray-800">
                                                            {item.product_name || item.sku}
                                                        </span>
                                                        {isStale && (
                                                            <Badge className="bg-red-100 text-red-700 text-xs">
                                                                ⚠️ ค้างเกิน 24 ชม.
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                                        <span>📦 จำนวน: <strong>{item.quantity}</strong> ชิ้น</span>
                                                        {item.location_from && (
                                                            <span>📍 จาก: <strong>{item.location_from}</strong></span>
                                                        )}
                                                        {item.location_to && (
                                                            <span>➡️ ไป: <strong>{item.location_to}</strong></span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                                        <span>👤 โดย: {item.created_by || '-'}</span>
                                                        <span>⏰ {formatTime(item.created_at)}</span>
                                                        {item.metadata?.orderNumber && (
                                                            <span>🧾 Order: {item.metadata.orderNumber}</span>
                                                        )}
                                                        {item.metadata?.documentNumber && (
                                                            <span>📄 PO: {item.metadata.documentNumber}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                        onClick={() => handleCancelQueueItem(item)}
                                                        disabled={!!processingId}
                                                    >
                                                        <X className="h-4 w-4 mr-1" /> ยกเลิก
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleConfirmQueueItem(item)}
                                                        disabled={!!processingId}
                                                    >
                                                        {processingId === item.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                        ) : (
                                                            <Check className="h-4 w-4 mr-1" />
                                                        )}
                                                        ยืนยัน
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ============ Shipment Tab (เดิม) ============ */}
            {activeTab === 'shipment' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5 text-blue-600" />
                                รายการ Shipment หยิบแล้ว รอยืนยัน ({items.length})
                            </CardTitle>
                            {items.length > 0 && (
                                <Button onClick={handleConfirmAllShipments} disabled={!!processingId}
                                    className="bg-green-600 hover:bg-green-700" size="sm"
                                >
                                    {processingId === 'all' ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Truck className="h-4 w-4 mr-2" />
                                    )}
                                    ยืนยันทั้งหมด ({items.length})
                                </Button>
                            )}
                        </div>
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
                                <p className="text-sm mt-1">เมื่อมีการ "ส่งไปพักสินค้า" จะมาแสดงที่นี่</p>
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
                                                    <Badge className="bg-purple-100 text-purple-700 font-mono">{item.status}</Badge>
                                                    <FileText className="h-4 w-4 text-blue-500" />
                                                    <span className="font-semibold">{item.taxno}</span>
                                                </div>
                                                <h4 className="font-medium text-gray-900">{item.arcode} - {item.arname}</h4>
                                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                                    <span>📅 {formatDate(item.taxdate)}</span>
                                                    <span>📦 {item.item_count} รายการ</span>
                                                    {item.picked_at && <span>⏰ หยิบเมื่อ: {formatTime(item.picked_at)}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <Button
                                                    variant="outline" size="sm"
                                                    className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                    onClick={() => handleCancelShipment(item)}
                                                    disabled={!!processingId}
                                                >
                                                    <X className="h-4 w-4 mr-2" /> ยกเลิก
                                                </Button>
                                                <Button
                                                    size="sm"
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
            )}
        </div>
    );
}
