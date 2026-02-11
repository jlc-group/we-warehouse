import React, { useEffect, useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    PackageCheck,
    Move,
    Search,
    ClipboardCheck,
    Truck,
    RefreshCw,
    MapPin,
    Package,
    Send,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScanner } from '@/hooks/mobile/useScanner';
import { toast } from '@/components/ui/sonner';
import { getTodayStats, TodayStats } from '@/services/movementService';
import { getShipments } from '@/services/shipmentService';
import { useAuth } from '@/contexts/AuthContextSimple';

const MobileMenu = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState<TodayStats>({ totalIn: 0, totalOut: 0, totalMoves: 0, totalTransactions: 0 });
    const [shipmentStats, setShipmentStats] = useState({ pending: 0, picked: 0, shipped: 0 });
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Fetch today's stats
    const fetchStats = async () => {
        setLoading(true);
        try {
            const [movementData, pendingShipments, pickedShipments, shippedShipments] = await Promise.all([
                getTodayStats(),
                getShipments('pending').catch(() => []),
                getShipments('picked').catch(() => []),
                getShipments('shipped').catch(() => [])
            ]);
            setStats(movementData);
            setShipmentStats({
                pending: pendingShipments.length,
                picked: pickedShipments.length,
                shipped: shippedShipments.length
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Handle global scan on menu to quick jump
    useScanner({
        onScan: (code) => {
            toast.success(`สแกนได้: ${code}`);
        }
    });

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'สวัสดีตอนเช้า';
        if (hour < 17) return 'สวัสดีตอนบ่าย';
        return 'สวัสดีตอนเย็น';
    };

    const menuItems = [
        {
            title: 'งานของฉัน',
            subtitle: 'My Tasks',
            icon: <Package className="h-6 w-6" />,
            path: '/mobile/my-tasks',
            gradient: 'from-indigo-500 to-purple-600',
            bgGlow: 'bg-indigo-500/10',
            badge: shipmentStats.pending > 0 ? shipmentStats.pending : null,
            highlight: true,
        },
        {
            title: 'รับสินค้า',
            subtitle: 'Receive',
            icon: <PackageCheck className="h-6 w-6" />,
            path: '/mobile/receive',
            gradient: 'from-emerald-500 to-green-600',
            bgGlow: 'bg-emerald-500/10',
        },
        {
            title: 'ย้ายสินค้า',
            subtitle: 'Move',
            icon: <Move className="h-6 w-6" />,
            path: '/mobile/move',
            gradient: 'from-blue-500 to-cyan-600',
            bgGlow: 'bg-blue-500/10',
        },
        {
            title: 'ค้นหา',
            subtitle: 'Lookup',
            icon: <Search className="h-6 w-6" />,
            path: '/mobile/lookup',
            gradient: 'from-violet-500 to-purple-600',
            bgGlow: 'bg-violet-500/10',
        },
        {
            title: 'นับสต็อก',
            subtitle: 'Count',
            icon: <ClipboardCheck className="h-6 w-6" />,
            path: '/mobile/count',
            gradient: 'from-amber-500 to-orange-600',
            bgGlow: 'bg-amber-500/10',
        },
        {
            title: 'เบิกจ่าย',
            subtitle: 'Pick',
            icon: <Truck className="h-6 w-6" />,
            path: '/mobile/pick',
            gradient: 'from-rose-500 to-red-600',
            bgGlow: 'bg-rose-500/10',
        },
        {
            title: 'สแกน Location',
            subtitle: 'Tasks',
            icon: <MapPin className="h-6 w-6" />,
            path: '/mobile/tasks',
            gradient: 'from-teal-500 to-cyan-600',
            bgGlow: 'bg-teal-500/10',
        },
    ];

    const flowSteps = [
        {
            title: 'รอจัด',
            count: shipmentStats.pending,
            icon: <Clock className="h-4 w-4" />,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            dotColor: 'bg-amber-400',
        },
        {
            title: 'จัดแล้ว',
            count: shipmentStats.picked,
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            dotColor: 'bg-blue-400',
        },
        {
            title: 'ส่งแล้ว',
            count: shipmentStats.shipped,
            icon: <Send className="h-4 w-4" />,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            dotColor: 'bg-emerald-400',
        },
    ];

    return (
        <MobileLayout title="" showBack={false}>
            <div className="space-y-5">
                {/* Greeting Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500">{getGreeting()} 👋</p>
                        <h1 className="text-xl font-bold text-slate-900">
                            {user?.full_name || 'คลังสินค้า'}
                        </h1>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {currentTime.toLocaleDateString('th-TH', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                            })} • {currentTime.toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                        <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2.5">
                    {[
                        { label: 'รับเข้า', value: stats.totalIn, gradient: 'from-emerald-500 to-green-600', icon: '📦' },
                        { label: 'เบิกออก', value: stats.totalOut, gradient: 'from-rose-500 to-red-600', icon: '📤' },
                        { label: 'ย้าย', value: stats.totalMoves, gradient: 'from-blue-500 to-cyan-600', icon: '🔄' },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-3 shadow-lg shadow-black/5`}
                        >
                            <div className="text-2xl font-bold text-white">
                                {loading ? (
                                    <div className="h-8 w-10 bg-white/20 rounded animate-pulse" />
                                ) : stat.value}
                            </div>
                            <div className="text-[11px] text-white/80 font-medium mt-0.5">{stat.icon} {stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Shipment Flow */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        สถานะการจัดส่งวันนี้
                    </h3>
                    <div className="flex items-center justify-between">
                        {flowSteps.map((step, index) => (
                            <React.Fragment key={step.title}>
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className={`${step.bg} rounded-xl p-2.5 relative`}>
                                        <span className={step.color}>{step.icon}</span>
                                        {step.count > 0 && (
                                            <span className={`absolute -top-1.5 -right-1.5 ${step.dotColor} text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1`}>
                                                {step.count}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-medium">{step.title}</span>
                                </div>
                                {index < flowSteps.length - 1 && (
                                    <ChevronRight className="h-4 w-4 text-slate-300 -mt-3" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Main Menu Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {menuItems.map((item, index) => (
                        <button
                            key={item.title}
                            className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all active:scale-[0.97] bg-white shadow-sm border border-slate-100 hover:shadow-md group`}
                            onClick={() => navigate(item.path)}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Background glow */}
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full ${item.bgGlow} blur-xl opacity-0 group-hover:opacity-100 transition-opacity`} />

                            <div className="relative">
                                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-lg mb-3`}>
                                    {item.icon}
                                </div>
                                {item.badge && (
                                    <span className="absolute -top-1 left-10 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1 shadow-sm">
                                        {item.badge}
                                    </span>
                                )}
                                <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                                <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Bottom spacing */}
                <div className="h-2" />
            </div>
        </MobileLayout>
    );
};

export default MobileMenu;
