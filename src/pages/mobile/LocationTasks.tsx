import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import {
    Search, Loader2, MapPin, Package, ArrowRight,
    PackagePlus, PackageCheck, ArrowRightLeft, AlertCircle,
    QrCode
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface LocationTask {
    id: string;
    type: 'pick' | 'receive' | 'move_out' | 'move_in';
    order_number?: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit: string;
    priority: 'HIGH' | 'NORMAL' | 'LOW';
    status: string;
}

interface LocationOption {
    code: string;
    description?: string;
}

const LocationTasks = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [manualInput, setManualInput] = useState<string>('');
    const [locationCode, setLocationCode] = useState<string | null>(null);
    const [tasks, setTasks] = useState<LocationTask[]>([]);

    // Load all locations on mount
    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        setLoadingLocations(true);
        try {
            const { data, error } = await localDb
                .from('warehouse_locations')
                .select('location_code, description')
                .eq('is_active', true);

            if (data) {
                const sorted = (data as any[])
                    .map(l => ({ code: l.location_code, description: l.description }))
                    .sort((a, b) => a.code.localeCompare(b.code));
                setLocations(sorted);
                console.log(`Loaded ${sorted.length} locations`);
            }
        } catch (error) {
            console.error('Failed to load locations:', error);
        } finally {
            setLoadingLocations(false);
        }
    };

    // Handle hardware scanner / QR code scan
    useScanner({
        onScan: (code) => {
            toast.success(`สแกน QR: ${code}`);
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
            // 1. Verify location exists
            const { data: location, error: locError } = await localDb
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

            // 2. Find PICK tasks
            const { data: pickItems } = await localDb
                .from('order_items')
                .select('*')
                .eq('location', location.location_code)
                .eq('status', 'PENDING');

            if (pickItems && pickItems.length > 0) {
                for (const item of pickItems as any[]) {
                    const { data: order } = await localDb
                        .from('customer_orders')
                        .select('order_number, priority')
                        .eq('id', item.order_id)
                        .single();

                    const qty = (item.ordered_quantity_level1 || 0) +
                        (item.ordered_quantity_level2 || 0) +
                        (item.ordered_quantity_level3 || 0);

                    foundTasks.push({
                        id: item.id,
                        type: 'pick',
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

            // 3. Find RECEIVE tasks
            const { data: receiveItems } = await localDb
                .from('inbound_receipt_items')
                .select('*')
                .eq('location', location.location_code);

            if (receiveItems && receiveItems.length > 0) {
                for (const item of receiveItems as any[]) {
                    if (item.quantity_received < item.quantity_expected) {
                        const { data: receipt } = await localDb
                            .from('inbound_receipts')
                            .select('document_number')
                            .eq('id', item.receipt_id)
                            .single();

                        foundTasks.push({
                            id: item.id,
                            type: 'receive',
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

            // Sort by priority
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
            console.error(error);
            toast.error(error.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    const getTaskIcon = (type: string) => {
        switch (type) {
            case 'pick': return <PackageCheck className="h-5 w-5 text-blue-600" />;
            case 'receive': return <PackagePlus className="h-5 w-5 text-green-600" />;
            case 'move_out': return <ArrowRight className="h-5 w-5 text-orange-600" />;
            case 'move_in': return <ArrowRightLeft className="h-5 w-5 text-purple-600" />;
            default: return <Package className="h-5 w-5" />;
        }
    };

    const getTaskLabel = (type: string) => {
        switch (type) {
            case 'pick': return 'หยิบส่ง';
            case 'receive': return 'รับเข้า';
            case 'move_out': return 'ย้ายออก';
            case 'move_in': return 'ย้ายเข้า';
            default: return type;
        }
    };

    const getTaskColor = (type: string) => {
        switch (type) {
            case 'pick': return 'bg-blue-100 text-blue-800';
            case 'receive': return 'bg-green-100 text-green-800';
            case 'move_out': return 'bg-orange-100 text-orange-800';
            case 'move_in': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100';
        }
    };

    const handleTaskAction = (task: LocationTask) => {
        switch (task.type) {
            case 'pick':
                if (task.order_number) {
                    navigate(`/mobile/pick?order=${task.order_number}`);
                }
                break;
            case 'receive':
                if (task.order_number) {
                    navigate(`/mobile/receive?po=${task.order_number}`);
                }
                break;
            case 'move_out':
            case 'move_in':
                navigate(`/mobile/move?item=${task.id}`);
                break;
        }
    };

    return (
        <MobileLayout title="เลือก Location" showBack={true}>
            {/* Manual Input */}
            <div className="flex gap-2 mb-3">
                <Input
                    placeholder="พิมพ์ Location (เช่น J5/4)"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    className="text-lg h-12 font-mono"
                    autoFocus
                />
                <Button onClick={handleManualSearch} className="h-12 w-12 p-0">
                    <Search />
                </Button>
            </div>

            {/* Dropdown Selector */}
            <div className="mb-4">
                <Select
                    value={selectedLocation}
                    onValueChange={handleLocationSelect}
                    disabled={loadingLocations}
                >
                    <SelectTrigger className="w-full h-12">
                        <SelectValue placeholder={loadingLocations ? "กำลังโหลด..." : `เลือกจากรายการ (${locations.length} locations)`} />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                        {locations.map((loc) => (
                            <SelectItem key={loc.code} value={loc.code} className="py-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-red-500" />
                                    <span className="font-mono font-bold">{loc.code}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1 text-center">
                    หรือสแกน QR Code ที่ติดอยู่ที่ชั้นวาง
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {/* Location Header & Tasks */}
            {!loading && locationCode && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-6 w-6 text-red-500" />
                        <h2 className="text-2xl font-bold text-gray-800">{locationCode}</h2>
                        <Badge variant="outline">{tasks.length} งาน</Badge>
                    </div>

                    {tasks.length > 0 ? (
                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <Card
                                    key={task.id}
                                    className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${task.priority === 'HIGH' ? 'border-l-red-500' : 'border-l-gray-300'
                                        }`}
                                    onClick={() => handleTaskAction(task)}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${getTaskColor(task.type)}`}>
                                                {getTaskIcon(task.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className={getTaskColor(task.type)}>
                                                        {getTaskLabel(task.type)}
                                                    </Badge>
                                                    {task.priority === 'HIGH' && (
                                                        <Badge variant="destructive">ด่วน</Badge>
                                                    )}
                                                </div>
                                                <p className="font-medium text-sm truncate">{task.product_name}</p>
                                                <p className="text-xs text-gray-500">SKU: {task.sku}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-lg font-bold text-primary">
                                                        {task.quantity} {task.unit}
                                                    </span>
                                                    {task.order_number && (
                                                        <span className="text-xs text-gray-400">{task.order_number}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-gray-400 self-center" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-6 text-center">
                                <PackageCheck className="h-12 w-12 mx-auto mb-3 text-green-500" />
                                <p className="text-green-700 font-medium">ไม่มีงานค้าง</p>
                                <p className="text-sm text-green-600 mt-1">Location นี้พร้อมใช้งาน</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!loading && !locationCode && (
                <Card className="bg-gray-50">
                    <CardContent className="p-6 text-center">
                        <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">
                            พิมพ์ / เลือก / สแกน Location
                        </h3>
                        <p className="text-sm text-gray-400">
                            ระบบจะแสดงรายการที่ต้องทำ
                        </p>
                    </CardContent>
                </Card>
            )}
        </MobileLayout>
    );
};

export default LocationTasks;
