import React, { useState, useEffect, useCallback } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Loader2, Package, MapPin, Phone, User, ChevronRight, RefreshCw, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'picked'>('all');

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
                navigate(`/mobile/pick?order=${task.docno}`);
            } else {
                toast.error(result.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            toast.error('ไม่สามารถเริ่มงานได้');
        }
    };

    const getTimeElapsed = (assignedAt: string) => {
        if (!assignedAt) return '';
        const diff = Date.now() - new Date(assignedAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} นาทีที่แล้ว`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} ชม.ที่แล้ว`;
        return `${Math.floor(hours / 24)} วันที่แล้ว`;
    };

    const getPriorityConfig = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return { label: '🚨 ด่วนมาก', className: 'bg-red-500 text-white', borderColor: 'border-l-red-500', bgColor: 'bg-red-50/50' };
            case 'high':
                return { label: '⚡ ด่วน', className: 'bg-amber-500 text-white', borderColor: 'border-l-amber-500', bgColor: 'bg-amber-50/50' };
            default:
                return { label: 'ปกติ', className: 'bg-slate-100 text-slate-600', borderColor: 'border-l-blue-500', bgColor: 'bg-white' };
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (activeTab === 'pending') return t.status === 'pending';
        if (activeTab === 'picked') return t.status === 'picked';
        return true;
    });

    const pendingCount = tasks.filter(t => t.status === 'pending').length;
    const pickedCount = tasks.filter(t => t.status === 'picked').length;

    const tabs = [
        { key: 'all' as const, label: 'ทั้งหมด', count: tasks.length },
        { key: 'pending' as const, label: 'รอหยิบ', count: pendingCount },
        { key: 'picked' as const, label: 'หยิบแล้ว', count: pickedCount },
    ];

    if (loading) {
        return (
            <MobileLayout title="งานของฉัน" showBack={true}>
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    </div>
                    <p className="mt-4 text-slate-500 text-sm">กำลังโหลดงาน...</p>
                </div>
            </MobileLayout>
        );
    }

    if (!user?.email) {
        return (
            <MobileLayout title="งานของฉัน" showBack={true}>
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <User className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="text-slate-500 mb-4">กรุณาเข้าสู่ระบบก่อน</p>
                    <Button onClick={() => navigate('/auth')} className="rounded-xl px-6">
                        เข้าสู่ระบบ
                    </Button>
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout title="งานของฉัน" showBack={true}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">📦 งานที่ต้องทำ</h2>
                    <p className="text-xs text-slate-400">{tasks.length} รายการ</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all"
                >
                    <RefreshCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Tab Filters */}
            <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${activeTab === tab.key
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`ml-1 ${activeTab === tab.key ? 'text-blue-100' : 'text-slate-400'}`}>
                                ({tab.count})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Task List */}
            {filteredTasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-emerald-700">ไม่มีงานค้าง 🎉</h3>
                    <p className="text-emerald-600/70 text-sm mt-1.5">รอ Admin assign งานใหม่</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTasks.map((task, index) => {
                        const priority = getPriorityConfig(task.priority);
                        return (
                            <div
                                key={task.id}
                                className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${index === 0 && task.status === 'pending' ? 'ring-2 ring-blue-400/50' : ''
                                    }`}
                            >
                                <div className={`border-l-4 ${priority.borderColor} p-4`}>
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-mono font-bold text-base text-slate-800">{task.docno}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    {getTimeElapsed(task.assigned_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            <Badge className={`text-[10px] px-2 py-0.5 ${priority.className}`}>
                                                {priority.label}
                                            </Badge>
                                            <Badge className={`text-[10px] px-2 py-0.5 ${task.status === 'pending'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {task.status === 'pending' ? 'รอหยิบ' : 'หยิบแล้ว'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Customer */}
                                    <div className="bg-slate-50 rounded-xl p-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                                <User className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-sm text-slate-700">{task.arname}</span>
                                                <p className="text-[11px] text-slate-400">{task.arcode}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex justify-between items-center mb-3 text-sm">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Package className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">{task.item_count} รายการ</span>
                                        </div>
                                        <span className="text-slate-500 font-mono text-sm">
                                            ฿{task.total_amount?.toLocaleString() || 0}
                                        </span>
                                    </div>

                                    {/* Action */}
                                    {task.status === 'pending' ? (
                                        <Button
                                            className="w-full h-14 text-base font-bold bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                                            onClick={() => handleStartPicking(task)}
                                        >
                                            <Package className="h-5 w-5 mr-2" />
                                            เริ่มหยิบสินค้า
                                            <ChevronRight className="h-5 w-5 ml-2" />
                                        </Button>
                                    ) : (
                                        <div className="flex items-center justify-center h-12 rounded-xl bg-emerald-50 text-emerald-600 font-medium">
                                            <CheckCircle className="h-5 w-5 mr-2" />
                                            หยิบแล้ว — รอส่ง
                                        </div>
                                    )}

                                    {/* First task indicator */}
                                    {index === 0 && task.status === 'pending' && (
                                        <p className="text-center text-xs text-blue-500 mt-2 animate-pulse font-medium">
                                            ☝️ งานถัดไปของคุณ
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Auto-refresh */}
            <p className="text-center text-[10px] text-slate-300 mt-6 mb-2">
                🔄 รีเฟรชอัตโนมัติทุก 30 วินาที
            </p>
        </MobileLayout>
    );
};

export default MyTasks;
