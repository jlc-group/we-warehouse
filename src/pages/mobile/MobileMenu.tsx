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
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScanner } from '@/hooks/mobile/useScanner';
import { toast } from '@/components/ui/sonner';
import { getTodayStats, TodayStats } from '@/services/movementService';
import { getShipments } from '@/services/shipmentService';

const MobileMenu = () => {
    const navigate = useNavigate();
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

    // Handle global scan on menu to quick jump?
    useScanner({
        onScan: (code) => {
            toast.success(`Scanned: ${code}`);
            // Future: Intelligent routing based on barcode format
            // if (code.startsWith('LOC-')) navigate(...)
        }
    });

    const menuItems = [
        {
            title: '📦 งานของฉัน',
            subtitle: 'My Tasks',
            icon: <Package className="h-7 w-7" />,
            path: '/mobile/my-tasks',
            gradient: 'from-indigo-500 to-purple-600',
            bgLight: 'bg-indigo-50',
            highlight: true,
        },
        {
            title: 'รับสินค้า',
            subtitle: 'Receive',
            icon: <PackageCheck className="h-7 w-7" />,
            path: '/mobile/receive',
            gradient: 'from-green-500 to-emerald-600',
            bgLight: 'bg-green-50',
        },
        {
            title: 'ย้ายสินค้า',
            subtitle: 'Move',
            icon: <Move className="h-7 w-7" />,
            path: '/mobile/move',
            gradient: 'from-blue-500 to-cyan-600',
            bgLight: 'bg-blue-50',
        },
        {
            title: 'ค้นหา',
            subtitle: 'Lookup',
            icon: <Search className="h-7 w-7" />,
            path: '/mobile/lookup',
            gradient: 'from-purple-500 to-violet-600',
            bgLight: 'bg-purple-50',
        },
        {
            title: 'นับสต็อก',
            subtitle: 'Count',
            icon: <ClipboardCheck className="h-7 w-7" />,
            path: '/mobile/count',
            gradient: 'from-orange-500 to-amber-600',
            bgLight: 'bg-orange-50',
        },
        {
            title: 'เบิกจ่าย',
            subtitle: 'Pick',
            icon: <Truck className="h-7 w-7" />,
            path: '/mobile/pick',
            gradient: 'from-red-500 to-rose-600',
            bgLight: 'bg-red-50',
        },
        {
            title: 'สแกน Location',
            subtitle: 'Tasks',
            icon: <MapPin className="h-7 w-7" />,
            path: '/mobile/tasks',
            gradient: 'from-teal-500 to-cyan-600',
            bgLight: 'bg-teal-50',
        },
    ];

    const quickActions = [
        {
            title: 'รายการส่งของ',
            badge: shipmentStats.pending > 0 ? shipmentStats.pending.toString() : null,
            path: '/dashboard?tab=packing-list',
            icon: <Package className="h-5 w-5 text-blue-600" />,
            status: 'pending'
        },
        {
            title: 'พักสินค้า',
            badge: shipmentStats.picked > 0 ? shipmentStats.picked.toString() : null,
            path: '/staging',
            icon: <Send className="h-5 w-5 text-purple-600" />,
            status: 'picked'
        },
        {
            title: 'ส่ง Csmile แล้ว',
            badge: shipmentStats.shipped > 0 ? shipmentStats.shipped.toString() : null,
            path: '/dashboard?tab=csmile-summary',
            icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
            status: 'shipped'
        }
    ];

    return (
        <MobileLayout title="" showBack={false}>
            <div className="space-y-4">
                {/* Header with Time */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">คลังสินค้า</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
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
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-3 shadow-lg">
                        <div className="text-2xl font-bold">
                            {loading ? '...' : stats.totalIn}
                        </div>
                        <div className="text-xs opacity-90 font-medium">รับเข้า</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl p-3 shadow-lg">
                        <div className="text-2xl font-bold">
                            {loading ? '...' : stats.totalOut}
                        </div>
                        <div className="text-xs opacity-90 font-medium">เบิกออก</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-xl p-3 shadow-lg">
                        <div className="text-2xl font-bold">
                            {loading ? '...' : stats.totalMoves}
                        </div>
                        <div className="text-xs opacity-90 font-medium">ย้าย</div>
                    </div>
                </div>

                {/* Shipment Status Flow */}
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        สถานะการจัดส่ง
                    </h3>
                    <div className="flex items-center justify-between">
                        {quickActions.map((action, index) => (
                            <React.Fragment key={action.title}>
                                <button
                                    onClick={() => navigate(action.path)}
                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-all active:scale-95 relative"
                                >
                                    <div className="relative">
                                        {action.icon}
                                        {action.badge && (
                                            <Badge className="absolute -top-2 -right-2 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-red-500">
                                                {action.badge}
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-600 font-medium whitespace-nowrap">
                                        {action.title}
                                    </span>
                                </button>
                                {index < quickActions.length - 1 && (
                                    <div className="text-gray-300 text-lg">→</div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Main Menu Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {menuItems.map((item) => (
                        <button
                            key={item.title}
                            className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all active:scale-[0.98] shadow-sm border border-gray-100 ${item.bgLight}`}
                            onClick={() => navigate(item.path)}
                        >
                            <div className={`absolute top-0 right-0 w-20 h-20 -mr-4 -mt-4 rounded-full bg-gradient-to-br ${item.gradient} opacity-20`} />
                            <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-lg mb-3`}>
                                {item.icon}
                            </div>
                            <h3 className="font-bold text-gray-900">{item.title}</h3>
                            <p className="text-xs text-gray-500">{item.subtitle}</p>
                        </button>
                    ))}
                </div>

                {/* Bottom spacing for nav */}
                <div className="h-4" />
            </div>
        </MobileLayout>
    );
};

export default MobileMenu;
