import React, { useState, useEffect, useCallback } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Loader2, Package, MapPin, Phone, User, ChevronRight, RefreshCw, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextSimple';

interface ShipmentTask {
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
    assigned_at: string;
}

// Backend API URL
const API_URL = import.meta.env.VITE_BACKEND_URL?.replace('/api/local', '') || 'http://localhost:3004';

const MyTasks = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tasks, setTasks] = useState<ShipmentTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadMyTasks = useCallback(async () => {
        if (!user?.email) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/shipments/my-tasks?email=${encodeURIComponent(user.email)}`);
            const result = await response.json();

            if (result.success) {
                setTasks(result.data || []);
            } else {
                console.error('Failed to load tasks:', result.error);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            toast.error('ไม่สามารถโหลดงานได้');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.email]);

    useEffect(() => {
        loadMyTasks();

        // Auto-refresh every 30 seconds
        const interval = setInterval(loadMyTasks, 30000);
        return () => clearInterval(interval);
    }, [loadMyTasks]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadMyTasks();
    };

    const handleStartPicking = async (task: ShipmentTask) => {
        try {
            const response = await fetch(`${API_URL}/api/shipments/start-picking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: task.id,
                    workerEmail: user?.email
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('เริ่มหยิบสินค้าแล้ว');
                // Navigate to pick page with order info
                navigate(`/mobile/pick?order=${task.docno}`);
            } else {
                toast.error(result.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            toast.error('ไม่สามารถเริ่มงานได้');
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return <Badge className="bg-red-500 text-white animate-pulse">🚨 ด่วนมาก</Badge>;
            case 'high':
                return <Badge className="bg-orange-500 text-white">⚡ ด่วน</Badge>;
            case 'normal':
                return <Badge variant="secondary">ปกติ</Badge>;
            case 'low':
                return <Badge variant="outline">ไม่ด่วน</Badge>;
            default:
                return null;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-blue-500 text-white">รอหยิบ</Badge>;
            case 'picked':
                return <Badge className="bg-green-500 text-white">หยิบแล้ว</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <MobileLayout title="งานของฉัน" showBack={true}>
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                    <p className="mt-4 text-gray-500">กำลังโหลดงาน...</p>
                </div>
            </MobileLayout>
        );
    }

    if (!user?.email) {
        return (
            <MobileLayout title="งานของฉัน" showBack={true}>
                <div className="flex flex-col items-center justify-center py-20">
                    <User className="h-16 w-16 text-gray-300" />
                    <p className="mt-4 text-gray-500">กรุณาเข้าสู่ระบบก่อน</p>
                    <Button onClick={() => navigate('/auth')} className="mt-4">
                        เข้าสู่ระบบ
                    </Button>
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout title="งานของฉัน" showBack={true}>
            {/* Header with refresh */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-lg font-bold">📦 งานที่ต้องทำ</h2>
                    <p className="text-sm text-gray-500">{tasks.length} รายการ</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    รีเฟรช
                </Button>
            </div>

            {/* Task List */}
            {tasks.length === 0 ? (
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-8 text-center">
                        <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-green-700">ไม่มีงานค้าง 🎉</h3>
                        <p className="text-green-600 text-sm mt-2">รอ Admin assign งานใหม่</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {tasks.map((task, index) => (
                        <Card
                            key={task.id}
                            className={`border-l-4 ${task.priority === 'urgent' ? 'border-l-red-500 bg-red-50' :
                                    task.priority === 'high' ? 'border-l-orange-500 bg-orange-50' :
                                        'border-l-blue-500 bg-white'
                                } ${index === 0 ? 'ring-2 ring-blue-400' : ''}`}
                        >
                            <CardContent className="p-4">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-mono font-bold text-lg">{task.docno}</p>
                                        <p className="text-xs text-gray-500">Tax: {task.taxno}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        {getPriorityBadge(task.priority)}
                                        {getStatusBadge(task.status)}
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="h-4 w-4 text-gray-500" />
                                        <span className="font-bold">{task.arname}</span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        รหัสลูกค้า: {task.arcode}
                                    </div>
                                </div>

                                {/* Order Info */}
                                <div className="flex justify-between items-center mb-3 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Package className="h-4 w-4 text-blue-500" />
                                        <span>{task.item_count} รายการ</span>
                                    </div>
                                    <div className="text-gray-600">
                                        ฿{task.total_amount?.toLocaleString() || 0}
                                    </div>
                                </div>

                                {/* Action Button */}
                                {task.status === 'pending' ? (
                                    <Button
                                        className="w-full h-12 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                        onClick={() => handleStartPicking(task)}
                                    >
                                        <Package className="h-5 w-5 mr-2" />
                                        เริ่มหยิบสินค้า
                                        <ChevronRight className="h-5 w-5 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full h-12 text-lg bg-gray-400"
                                        disabled
                                    >
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        หยิบแล้ว - รอส่ง
                                    </Button>
                                )}

                                {/* First task indicator */}
                                {index === 0 && task.status === 'pending' && (
                                    <p className="text-center text-sm text-blue-600 mt-2 animate-pulse">
                                        👆 งานถัดไปของคุณ
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Auto-refresh indicator */}
            <p className="text-center text-xs text-gray-400 mt-6">
                🔄 รีเฟรชอัตโนมัติทุก 30 วินาที
            </p>
        </MobileLayout>
    );
};

export default MyTasks;
