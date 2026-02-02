import React, { useEffect, useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
    PackageCheck,
    Move,
    Search,
    ClipboardCheck,
    Truck,
    RefreshCw,
    MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScanner } from '@/hooks/mobile/useScanner';
import { toast } from '@/components/ui/sonner';
import { getTodayStats, TodayStats } from '@/services/movementService';

const MobileMenu = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<TodayStats>({ totalIn: 0, totalOut: 0, totalMoves: 0, totalTransactions: 0 });
    const [loading, setLoading] = useState(true);

    // Fetch today's stats
    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await getTodayStats();
            setStats(data);
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
            title: 'รับสินค้า (Receive)',
            icon: <PackageCheck className="h-8 w-8 mb-2 text-green-600" />,
            path: '/mobile/receive',
            color: 'border-green-200 bg-green-50 hover:bg-green-100',
        },
        {
            title: 'ย้ายสินค้า (Move)',
            icon: <Move className="h-8 w-8 mb-2 text-blue-600" />,
            path: '/mobile/move',
            color: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
        },
        {
            title: 'ค้นหา (Lookup)',
            icon: <Search className="h-8 w-8 mb-2 text-purple-600" />,
            path: '/mobile/lookup',
            color: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
        },
        {
            title: 'นับสต็อก (Count)',
            icon: <ClipboardCheck className="h-8 w-8 mb-2 text-orange-600" />,
            path: '/mobile/count',
            color: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
        },
        {
            title: 'เบิกจ่าย (Pick)',
            icon: <Truck className="h-8 w-8 mb-2 text-red-600" />,
            path: '/mobile/pick',
            color: 'border-red-200 bg-red-50 hover:bg-red-100',
        },
        {
            title: 'สแกน Location',
            icon: <MapPin className="h-8 w-8 mb-2 text-teal-600" />,
            path: '/mobile/tasks',
            color: 'border-teal-200 bg-teal-50 hover:bg-teal-100',
        },
    ];

    return (
        <MobileLayout title="Main Menu" showBack={false}>
            <div className="grid grid-cols-2 gap-3 mt-2">
                {menuItems.map((item) => (
                    <Card
                        key={item.title}
                        className={`cursor-pointer transition-all active:scale-95 ${item.color}`}
                        onClick={() => navigate(item.path)}
                    >
                        <CardContent className="flex flex-col items-center justify-center p-4 text-center h-32">
                            {item.icon}
                            <span className="font-semibold text-sm">{item.title}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-500">Today's Stats</h3>
                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                        <div className="text-xl font-bold text-green-600">
                            {loading ? '...' : stats.totalIn}
                        </div>
                        <div className="text-green-700 font-medium">In</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                        <div className="text-xl font-bold text-red-600">
                            {loading ? '...' : stats.totalOut}
                        </div>
                        <div className="text-red-700 font-medium">Out</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="text-xl font-bold text-blue-600">
                            {loading ? '...' : stats.totalMoves}
                        </div>
                        <div className="text-blue-700 font-medium">Moved</div>
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
};

export default MobileMenu;
