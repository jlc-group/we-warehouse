import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContextSimple';
import { recordShip, recordReceive } from '@/services/movementService';
import { CameraQRScanner } from '@/components/mobile/CameraQRScanner';
import {
    Search, Loader2, MapPin, Package, ArrowRight,
    PackagePlus, PackageCheck, ArrowRightLeft, CheckCircle2,
    QrCode, X, Minus, Plus, Camera
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface LocationTask {
    id: string;
    type: 'pick' | 'receive' | 'move_out' | 'move_in';
    order_number?: string;
    order_id?: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit: string;
    priority: 'HIGH' | 'NORMAL' | 'LOW';
    status: string;
    completed?: boolean;
}

interface LocationOption {
    code: string;
    description?: string;
    taskCount: number;
}

const LocationTasks = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [manualInput, setManualInput] = useState<string>('');
    const [locationCode, setLocationCode] = useState<string | null>(null);
    const [tasks, setTasks] = useState<LocationTask[]>([]);

    // Task action modal
    const [activeTask, setActiveTask] = useState<LocationTask | null>(null);
    const [actionQuantity, setActionQuantity] = useState<number>(0);
    const [processing, setProcessing] = useState(false);

    // Camera QR Scanner state removed — CameraQRScanner manages its own modal


    useEffect(() => {
        loadLocationsWithTasks();
    }, []);

    // Load only locations that have pending tasks
    const loadLocationsWithTasks = async () => {
        setLoadingLocations(true);
        try {
            const locationTaskMap = new Map<string, number>();

            // Get PICK tasks from order_items (PENDING status)
            try {
                const { data: pickItems } = await localDb
                    .from('order_items')
                    .select('location, status');

                if (pickItems) {
                    const pending = (pickItems as any[]).filter(
                        item => item.status === 'PENDING' && item.location
                    );
                    for (const item of pending) {
                        const loc = item.location.toUpperCase();
                        locationTaskMap.set(loc, (locationTaskMap.get(loc) || 0) + 1);
                    }
                }
            } catch (e) {
                console.warn('order_items not available:', e);
            }

            // Get RECEIVE tasks from inbound_receipt_items (incomplete receipts)
            try {
                const { data: receiveItems } = await localDb
                    .from('inbound_receipt_items')
                    .select('location, quantity_expected, quantity_received');

                if (receiveItems) {
                    const pending = (receiveItems as any[]).filter(
                        item => item.location && item.quantity_received < item.quantity_expected
                    );
                    for (const item of pending) {
                        const loc = item.location.toUpperCase();
                        locationTaskMap.set(loc, (locationTaskMap.get(loc) || 0) + 1);
                    }
                }
            } catch (e) {
                console.warn('inbound_receipt_items not available:', e);
            }

            // Convert to array and sort by task count (most tasks first)
            if (locationTaskMap.size > 0) {
                const locationsWithTasks: LocationOption[] = Array.from(locationTaskMap.entries())
                    .map(([code, taskCount]) => ({ code, taskCount }))
                    .sort((a, b) => b.taskCount - a.taskCount);
                setLocations(locationsWithTasks);
            } else {
                setLocations([]);
            }
        } catch (error) {
            console.error('Failed to load locations with tasks:', error);
        } finally {
            setLoadingLocations(false);
        }
    };

    // Handle QR/barcode scanner
    useScanner({
        onScan: (code) => {
            // If modal is open and waiting for item scan
            if (activeTask) {
                if (code.toUpperCase().includes(activeTask.sku.toUpperCase())) {
                    toast.success(`✅ สแกน SKU ถูกต้อง: ${activeTask.sku}`);
                } else {
                    toast.error(`❌ SKU ไม่ตรง! ต้องการ: ${activeTask.sku}`);
                }
                return;
            }

            // Otherwise, search location
            const locCode = code.replace(/^LOC[-_]/i, '').toUpperCase();
            setManualInput(locCode);
            setSelectedLocation(locCode);
            handleSearch(locCode);
        }
    });

    const handleLocationSelect = (value: string) => {
        setSelectedLocation(value);
        setManualInput(value);
        handleSearch(value);
    };

    const handleManualSearch = () => {
        if (manualInput) {
            handleSearch(manualInput.toUpperCase());
        }
    };

    const handleSearch = async (searchTerm: string) => {
        if (!searchTerm) return;
        setLoading(true);
        setTasks([]);
        setLocationCode(null);

        try {
            const { data: location } = await localDb
                .from('warehouse_locations')
                .select('location_code')
                .eq('location_code', searchTerm.toUpperCase())
                .single();

            if (!location) {
                toast.error(`ไม่พบ Location: ${searchTerm}`);
                setLoading(false);
                return;
            }

            setLocationCode(location.location_code);
            const foundTasks: LocationTask[] = [];

            // Find PICK tasks
            const { data: pickItems } = await localDb
                .from('order_items')
                .select('*')
                .eq('location', location.location_code)
                .eq('status', 'PENDING');

            if (pickItems && pickItems.length > 0) {
                for (const item of pickItems as any[]) {
                    const { data: order } = await localDb
                        .from('customer_orders')
                        .select('id, order_number, priority')
                        .eq('id', item.order_id)
                        .single();

                    const qty = (item.ordered_quantity_level1 || 0) +
                        (item.ordered_quantity_level2 || 0) +
                        (item.ordered_quantity_level3 || 0);

                    foundTasks.push({
                        id: item.id,
                        type: 'pick',
                        order_id: (order as any)?.id,
                        order_number: (order as any)?.order_number,
                        product_name: item.product_name,
                        sku: item.sku,
                        quantity: qty,
                        unit: item.unit_level3_name || 'ชิ้น',
                        priority: (order as any)?.priority || 'NORMAL',
                        status: item.status
                    });
                }
            }

            // Find RECEIVE tasks  
            const { data: receiveItems } = await localDb
                .from('inbound_receipt_items')
                .select('*')
                .eq('location', location.location_code);

            if (receiveItems && receiveItems.length > 0) {
                for (const item of receiveItems as any[]) {
                    if (item.quantity_received < item.quantity_expected) {
                        const { data: receipt } = await localDb
                            .from('inbound_receipts')
                            .select('id, document_number')
                            .eq('id', item.receipt_id)
                            .single();

                        foundTasks.push({
                            id: item.id,
                            type: 'receive',
                            order_id: (receipt as any)?.id,
                            order_number: (receipt as any)?.document_number,
                            product_name: item.product_name,
                            sku: item.product_code,
                            quantity: item.quantity_expected - item.quantity_received,
                            unit: item.unit_name || 'ชิ้น',
                            priority: 'NORMAL',
                            status: 'PENDING'
                        });
                    }
                }
            }

            foundTasks.sort((a, b) => {
                const priorityOrder = { HIGH: 0, NORMAL: 1, LOW: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });

            setTasks(foundTasks);

            if (foundTasks.length === 0) {
                toast.success(`ไม่มีงานค้างที่ ${location.location_code}`);
            } else {
                toast.success(`พบ ${foundTasks.length} งาน`);
            }

        } catch (error: any) {
            toast.error(error.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClick = (task: LocationTask) => {
        setActiveTask(task);
        setActionQuantity(task.quantity);
    };

    const handleCompleteTask = async () => {
        if (!activeTask || actionQuantity <= 0) return;

        setProcessing(true);
        try {
            if (activeTask.type === 'pick') {
                // Record pick movement
                await recordShip(
                    activeTask.sku,
                    activeTask.product_name,
                    locationCode || '',
                    actionQuantity,
                    undefined,
                    activeTask.order_id,
                    `หยิบจาก ${locationCode} สำหรับ ${activeTask.order_number}`,
                    user?.email
                );

                // Update order_item status
                await localDb.from('order_items')
                    .update({
                        picked_quantity_level3: actionQuantity,
                        status: 'PICKED',
                        picked_at: new Date().toISOString()
                    })
                    .eq('id', activeTask.id);

                toast.success(`✅ หยิบ ${actionQuantity} ${activeTask.unit} สำเร็จ`);

            } else if (activeTask.type === 'receive') {
                // Record receive movement
                await recordReceive(
                    activeTask.sku,
                    activeTask.product_name,
                    locationCode || '',
                    actionQuantity,
                    undefined,
                    `รับเข้า ${locationCode} จาก ${activeTask.order_number}`,
                    user?.email
                );

                // Update inbound_receipt_item
                await localDb.from('inbound_receipt_items')
                    .update({
                        quantity_received: actionQuantity,
                        status: 'COMPLETED',
                        received_at: new Date().toISOString()
                    })
                    .eq('id', activeTask.id);

                toast.success(`✅ รับเข้า ${actionQuantity} ${activeTask.unit} สำเร็จ`);
            }

            // Mark task as completed and close modal
            setTasks(prev => prev.map(t =>
                t.id === activeTask.id ? { ...t, completed: true } : t
            ));
            setActiveTask(null);

            // Refresh tasks after short delay
            setTimeout(() => {
                if (locationCode) handleSearch(locationCode);
            }, 500);

        } catch (error: any) {
            toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const getTaskIcon = (type: string) => {
        switch (type) {
            case 'pick': return <PackageCheck className="h-5 w-5 text-blue-600" />;
            case 'receive': return <PackagePlus className="h-5 w-5 text-green-600" />;
            default: return <Package className="h-5 w-5" />;
        }
    };

    const getTaskLabel = (type: string) => {
        switch (type) {
            case 'pick': return 'หยิบส่ง';
            case 'receive': return 'รับเข้า';
            default: return type;
        }
    };

    const getTaskColor = (type: string) => {
        switch (type) {
            case 'pick': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
            case 'receive': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
            default: return 'bg-gray-100';
        }
    };

    const getTaskBgColor = (type: string) => {
        switch (type) {
            case 'pick': return 'bg-blue-50';
            case 'receive': return 'bg-green-50';
            default: return 'bg-gray-50';
        }
    };

    const completedCount = tasks.filter(t => t.completed).length;

    return (
        <MobileLayout title="สแกน Location" showBack={true}>
            {/* Camera QR Scanner */}
            <CameraQRScanner
                onScan={(code) => {
                    const locCode = code.replace(/^LOC[-_]/i, '').toUpperCase();
                    setManualInput(locCode);
                    setSelectedLocation(locCode);
                    handleSearch(locCode);
                }}
                buttonText="📷 สแกน QR Location"
                modalTitle="📷 สแกน Location"
                modalHint="เล็งกล้องไปที่ QR Code ของ Location"
                scannerId="qr-reader-tasks"
                buttonClassName="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 mb-4"
            />

            {/* Search Input */}
            <div className="flex gap-2 mb-3">
                <Input
                    placeholder="พิมพ์ Location (เช่น J5/4)"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    className="text-lg h-12 font-mono"
                />
                <Button onClick={handleManualSearch} className="h-12 w-12 p-0">
                    <Search />
                </Button>
            </div>

            {/* Dropdown - ONLY locations with pending tasks */}
            {loadingLocations ? (
                <div className="flex items-center justify-center py-4 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>กำลังหา Location ที่มีงานค้าง...</span>
                </div>
            ) : locations.length > 0 ? (
                <Select
                    value={selectedLocation}
                    onValueChange={handleLocationSelect}
                >
                    <SelectTrigger className="w-full h-12 mb-4 bg-white border-2 border-blue-200">
                        <SelectValue placeholder={`📍 เลือก Location ที่มีงาน (${locations.length} แห่ง)`} />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                        {locations.map((loc) => (
                            <SelectItem key={loc.code} value={loc.code} className="py-3">
                                <div className="flex items-center justify-between w-full gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-red-100 rounded-lg">
                                            <MapPin className="h-4 w-4 text-red-500" />
                                        </div>
                                        <span className="font-mono font-bold text-base">{loc.code}</span>
                                    </div>
                                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2">
                                        {loc.taskCount} งาน
                                    </Badge>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <div className="text-center py-4 px-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <p className="text-green-700 font-medium">✅ ไม่มี Location ที่มีงานค้าง</p>
                    <p className="text-green-600 text-sm mt-1">งานทั้งหมดเสร็จแล้ว หรือพิมพ์ค้นหาด้วยตัวเอง</p>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {/* Tasks */}
            {!loading && locationCode && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-6 w-6 text-red-500" />
                            <h2 className="text-2xl font-bold">{locationCode}</h2>
                        </div>
                        {tasks.length > 0 && (
                            <Badge variant={completedCount === tasks.length ? 'default' : 'outline'}>
                                {completedCount}/{tasks.length} เสร็จ
                            </Badge>
                        )}
                    </div>

                    {tasks.length > 0 ? (
                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`relative overflow-hidden rounded-2xl transition-all active:scale-[0.98] shadow-sm ${task.completed
                                        ? 'bg-green-50 opacity-60'
                                        : getTaskBgColor(task.type)
                                        }`}
                                    onClick={() => !task.completed && handleTaskClick(task)}
                                >
                                    {/* Priority indicator */}
                                    {task.priority === 'HIGH' && !task.completed && (
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                                    )}

                                    <div className="p-4">
                                        <div className="flex items-start gap-3">
                                            {/* Icon with gradient background */}
                                            <div className={`p-3 rounded-xl shadow-md ${task.completed
                                                ? 'bg-gradient-to-br from-green-400 to-green-500'
                                                : task.type === 'pick'
                                                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                                                    : 'bg-gradient-to-br from-green-500 to-emerald-500'
                                                }`}>
                                                {task.completed
                                                    ? <CheckCircle2 className="h-6 w-6 text-white" />
                                                    : React.cloneElement(getTaskIcon(task.type), { className: 'h-6 w-6 text-white' })
                                                }
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className={`${getTaskColor(task.type)} shadow-sm`}>
                                                        {getTaskLabel(task.type)}
                                                    </Badge>
                                                    {task.priority === 'HIGH' && !task.completed && (
                                                        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
                                                            ด่วน
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="font-bold text-gray-900 truncate">{task.product_name}</p>
                                                <p className="text-xs text-gray-500 font-mono">SKU: {task.sku}</p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className={`text-xl font-bold ${task.completed
                                                        ? 'text-green-600'
                                                        : task.type === 'pick'
                                                            ? 'text-blue-600'
                                                            : 'text-green-600'
                                                        }`}>
                                                        {task.quantity} {task.unit}
                                                    </span>
                                                    {task.order_number && (
                                                        <Badge variant="outline" className="text-xs font-mono">
                                                            {task.order_number}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {!task.completed && (
                                                <div className="self-center p-2 bg-white/50 rounded-full">
                                                    <ArrowRight className="h-5 w-5 text-gray-600" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-6 text-center">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                                <p className="text-green-700 font-medium">ไม่มีงานค้าง</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!loading && !locationCode && (
                <Card className="bg-gray-50">
                    <CardContent className="p-6 text-center">
                        <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="font-medium text-gray-600 mb-2">สแกน QR หรือเลือก Location</h3>
                        <p className="text-sm text-gray-400">ระบบจะแสดงงานที่ต้องทำ</p>
                    </CardContent>
                </Card>
            )}

            {/* Action Modal */}
            <Dialog open={!!activeTask} onOpenChange={() => setActiveTask(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {activeTask && getTaskIcon(activeTask.type)}
                            {activeTask?.type === 'pick' ? 'ยืนยันหยิบสินค้า' : 'ยืนยันรับสินค้า'}
                        </DialogTitle>
                    </DialogHeader>

                    {activeTask && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="font-medium text-sm">{activeTask.product_name}</p>
                                <p className="text-xs text-gray-500 mt-1">SKU: {activeTask.sku}</p>
                                <p className="text-xs text-gray-500">Location: {locationCode}</p>
                                {activeTask.order_number && (
                                    <p className="text-xs text-gray-500">เอกสาร: {activeTask.order_number}</p>
                                )}
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-2">จำนวน ({activeTask.unit})</p>
                                <div className="flex items-center justify-center gap-4">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setActionQuantity(Math.max(1, actionQuantity - 1))}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                        type="number"
                                        value={actionQuantity}
                                        onChange={(e) => setActionQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-20 text-center text-2xl font-bold"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setActionQuantity(actionQuantity + 1)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    ต้องการ: {activeTask.quantity} {activeTask.unit}
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setActiveTask(null)} disabled={processing}>
                            <X className="h-4 w-4 mr-1" /> ยกเลิก
                        </Button>
                        <Button onClick={handleCompleteTask} disabled={processing}>
                            {processing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                            )}
                            ยืนยัน
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CameraQRScanner is inline above, no separate modal needed */}
        </MobileLayout>
    );
};

export default LocationTasks;
