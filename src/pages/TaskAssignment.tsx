import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';
import {
    Package,
    User,
    RefreshCw,
    Send,
    Clock,
    CheckCircle,
    AlertTriangle,
    Users,
    Loader2,
    Filter
} from 'lucide-react';

interface ShipmentOrder {
    id: string;
    taxno: string;
    docno: string;
    taxdate: string;
    arcode: string;
    arname: string;
    total_amount: number;
    item_count: number;
    status: string;
    priority: string;
    assigned_to: string | null;
    assigned_at: string | null;
}

interface Worker {
    email: string;
    full_name: string;
}

// Backend API URL
const API_URL = import.meta.env.VITE_BACKEND_URL?.replace('/api/local', '') || 'http://localhost:3004';

const TaskAssignment = () => {
    const [unassignedOrders, setUnassignedOrders] = useState<ShipmentOrder[]>([]);
    const [assignedOrders, setAssignedOrders] = useState<ShipmentOrder[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [selectedWorker, setSelectedWorker] = useState<string>('');
    const [selectedPriority, setSelectedPriority] = useState<string>('normal');
    const [assigning, setAssigning] = useState(false);
    const [view, setView] = useState<'unassigned' | 'assigned'>('unassigned');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [unassignedRes, assignedRes, workersRes] = await Promise.all([
                fetch(`${API_URL}/api/shipments/unassigned`),
                fetch(`${API_URL}/api/shipments/assigned`),
                fetch(`${API_URL}/api/shipments/workers`)
            ]);

            const [unassignedData, assignedData, workersData] = await Promise.all([
                unassignedRes.json(),
                assignedRes.json(),
                workersRes.json()
            ]);

            if (unassignedData.success) setUnassignedOrders(unassignedData.data || []);
            if (assignedData.success) setAssignedOrders(assignedData.data || []);
            if (workersData.success) setWorkers(workersData.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSelectOrder = (orderId: string, checked: boolean) => {
        const newSelected = new Set(selectedOrders);
        if (checked) {
            newSelected.add(orderId);
        } else {
            newSelected.delete(orderId);
        }
        setSelectedOrders(newSelected);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedOrders(new Set(unassignedOrders.map(o => o.id)));
        } else {
            setSelectedOrders(new Set());
        }
    };

    const handleAssign = async () => {
        if (selectedOrders.size === 0) {
            toast.error('กรุณาเลือก Order ที่ต้องการ assign');
            return;
        }
        if (!selectedWorker) {
            toast.error('กรุณาเลือกพนักงาน');
            return;
        }

        setAssigning(true);
        try {
            const response = await fetch(`${API_URL}/api/shipments/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderIds: Array.from(selectedOrders),
                    workerEmail: selectedWorker,
                    priority: selectedPriority
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Assign ${result.assigned} orders สำเร็จ!`);
                setSelectedOrders(new Set());
                loadData();
            } else {
                toast.error(result.message || 'Assign ไม่สำเร็จ');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async (orderId: string) => {
        try {
            const response = await fetch(`${API_URL}/api/shipments/unassign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Unassign สำเร็จ');
                loadData();
            } else {
                toast.error(result.message || 'Unassign ไม่สำเร็จ');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return <Badge className="bg-red-500">🚨 ด่วนมาก</Badge>;
            case 'high':
                return <Badge className="bg-orange-500">⚡ ด่วน</Badge>;
            case 'normal':
                return <Badge variant="secondary">ปกติ</Badge>;
            case 'low':
                return <Badge variant="outline">ไม่ด่วน</Badge>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">กำลังโหลด...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">📋 กระจายงาน Pick</h1>
                    <p className="text-gray-500">Assign orders ให้พนักงานหน้างาน</p>
                </div>
                <Button onClick={loadData} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    รีเฟรช
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <Package className="h-8 w-8 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold">{unassignedOrders.length}</p>
                                <p className="text-sm text-gray-500">รอ Assign</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-8 w-8 text-yellow-500" />
                            <div>
                                <p className="text-2xl font-bold">{assignedOrders.filter(o => o.status === 'pending').length}</p>
                                <p className="text-sm text-gray-500">รอหยิบ</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold">{assignedOrders.filter(o => o.status === 'picked').length}</p>
                                <p className="text-sm text-gray-500">หยิบแล้ว</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-8 w-8 text-purple-500" />
                            <div>
                                <p className="text-2xl font-bold">{workers.length}</p>
                                <p className="text-sm text-gray-500">พนักงาน</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <Button
                    variant={view === 'unassigned' ? 'default' : 'outline'}
                    onClick={() => setView('unassigned')}
                >
                    <Package className="h-4 w-4 mr-2" />
                    รอ Assign ({unassignedOrders.length})
                </Button>
                <Button
                    variant={view === 'assigned' ? 'default' : 'outline'}
                    onClick={() => setView('assigned')}
                >
                    <User className="h-4 w-4 mr-2" />
                    Assigned แล้ว ({assignedOrders.length})
                </Button>
            </div>

            {/* Unassigned View */}
            {view === 'unassigned' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>📦 Orders รอ Assign</span>
                            {selectedOrders.size > 0 && (
                                <Badge className="bg-blue-500">
                                    เลือก {selectedOrders.size} รายการ
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Assignment Controls */}
                        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedOrders.size === unassignedOrders.length && unassignedOrders.length > 0}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                />
                                <span className="text-sm">เลือกทั้งหมด</span>
                            </div>
                            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="เลือกพนักงาน" />
                                </SelectTrigger>
                                <SelectContent>
                                    {workers.map(worker => (
                                        <SelectItem key={worker.email} value={worker.email}>
                                            {worker.full_name || worker.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="urgent">🚨 ด่วนมาก</SelectItem>
                                    <SelectItem value="high">⚡ ด่วน</SelectItem>
                                    <SelectItem value="normal">ปกติ</SelectItem>
                                    <SelectItem value="low">ไม่ด่วน</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={handleAssign}
                                disabled={selectedOrders.size === 0 || !selectedWorker || assigning}
                                className="bg-green-500 hover:bg-green-600"
                            >
                                {assigning ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                Assign ({selectedOrders.size})
                            </Button>
                        </div>

                        {/* Orders Table */}
                        {unassignedOrders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-400" />
                                <p>ไม่มี Order รอ Assign 🎉</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="p-2 text-left w-10"></th>
                                            <th className="p-2 text-left">Doc No</th>
                                            <th className="p-2 text-left">ลูกค้า</th>
                                            <th className="p-2 text-left">วันที่</th>
                                            <th className="p-2 text-right">รายการ</th>
                                            <th className="p-2 text-right">ยอด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unassignedOrders.map(order => (
                                            <tr
                                                key={order.id}
                                                className={`border-b hover:bg-blue-50 cursor-pointer ${selectedOrders.has(order.id) ? 'bg-blue-100' : ''
                                                    }`}
                                                onClick={() => handleSelectOrder(order.id, !selectedOrders.has(order.id))}
                                            >
                                                <td className="p-2">
                                                    <Checkbox
                                                        checked={selectedOrders.has(order.id)}
                                                        onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                                                    />
                                                </td>
                                                <td className="p-2 font-mono font-bold">{order.docno}</td>
                                                <td className="p-2">
                                                    <div className="font-medium">{order.arname}</div>
                                                    <div className="text-xs text-gray-500">{order.arcode}</div>
                                                </td>
                                                <td className="p-2 text-sm">{order.taxdate}</td>
                                                <td className="p-2 text-right">{order.item_count}</td>
                                                <td className="p-2 text-right">฿{order.total_amount?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Assigned View */}
            {view === 'assigned' && (
                <Card>
                    <CardHeader>
                        <CardTitle>👤 Orders ที่ Assign แล้ว</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {assignedOrders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Clock className="h-12 w-12 mx-auto mb-2 text-yellow-400" />
                                <p>ยังไม่มี Order ที่ Assign</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="p-2 text-left">Doc No</th>
                                            <th className="p-2 text-left">ลูกค้า</th>
                                            <th className="p-2 text-left">พนักงาน</th>
                                            <th className="p-2 text-left">Priority</th>
                                            <th className="p-2 text-left">สถานะ</th>
                                            <th className="p-2 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignedOrders.map(order => (
                                            <tr key={order.id} className="border-b hover:bg-gray-50">
                                                <td className="p-2 font-mono font-bold">{order.docno}</td>
                                                <td className="p-2">{order.arname}</td>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-4 w-4" />
                                                        {order.assigned_to}
                                                    </div>
                                                </td>
                                                <td className="p-2">{getPriorityBadge(order.priority)}</td>
                                                <td className="p-2">
                                                    {order.status === 'pending' ? (
                                                        <Badge className="bg-yellow-500">รอหยิบ</Badge>
                                                    ) : (
                                                        <Badge className="bg-green-500">หยิบแล้ว</Badge>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {order.status === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleUnassign(order.id)}
                                                        >
                                                            Unassign
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default TaskAssignment;
