/**
 * NotificationCenter - Real-time notification dropdown using useInventoryAlerts
 */

import { useMemo } from 'react';
import { Bell, AlertTriangle, Package, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInventoryAlerts } from '@/hooks/useInventoryAlerts';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

export function NotificationCenter() {
    const { alerts, alertSummary, acknowledgeAlert } = useInventoryAlerts();

    // Get top 5 most important alerts
    const displayAlerts = useMemo(() => {
        return alerts.filter(a => !a.acknowledged).slice(0, 5);
    }, [alerts]);

    // Get icon and color based on alert type
    const getAlertStyle = (type: string, severity: string) => {
        switch (type) {
            case 'out_of_stock':
                return {
                    icon: <AlertTriangle className="h-4 w-4" />,
                    dotColor: 'bg-red-500',
                    iconColor: 'text-red-600'
                };
            case 'critical_stock':
                return {
                    icon: <Package className="h-4 w-4" />,
                    dotColor: 'bg-orange-500',
                    iconColor: 'text-orange-600'
                };
            case 'low_stock':
                return {
                    icon: <Package className="h-4 w-4" />,
                    dotColor: 'bg-yellow-500',
                    iconColor: 'text-yellow-600'
                };
            case 'expiry_warning':
                return {
                    icon: <Clock className="h-4 w-4" />,
                    dotColor: 'bg-purple-500',
                    iconColor: 'text-purple-600'
                };
            default:
                return {
                    icon: <CheckCircle className="h-4 w-4" />,
                    dotColor: 'bg-blue-500',
                    iconColor: 'text-blue-600'
                };
        }
    };

    const totalUnread = alertSummary.unacknowledgedAlerts;
    const hasCritical = alertSummary.criticalAlerts > 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="relative h-9 w-9 rounded-lg border-slate-200 hover:bg-slate-50"
                >
                    <Bell className={`h-4 w-4 ${hasCritical ? 'text-red-600' : 'text-slate-600'}`} />
                    {totalUnread > 0 && (
                        <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full ${hasCritical ? 'bg-red-500' : 'bg-orange-500'} text-white text-[10px] font-bold flex items-center justify-center border-2 border-white`}>
                            {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 rounded-xl shadow-lg border-slate-200">
                <DropdownMenuLabel className="flex items-center justify-between font-semibold text-slate-800">
                    <span>การแจ้งเตือน</span>
                    {totalUnread > 0 && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                            {totalUnread} รายการใหม่
                        </Badge>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {displayAlerts.length === 0 ? (
                    <div className="py-8 text-center">
                        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">ไม่มีแจ้งเตือนใหม่</p>
                        <p className="text-xs text-slate-400">สต็อกทุกรายการอยู่ในเกณฑ์ปกติ</p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-80">
                        {displayAlerts.map((alert) => {
                            const style = getAlertStyle(alert.type, alert.severity);
                            return (
                                <DropdownMenuItem
                                    key={alert.id}
                                    className="py-3 px-3 cursor-pointer hover:bg-slate-50 rounded-lg mx-1 my-1 focus:bg-slate-50"
                                    onClick={() => acknowledgeAlert(alert.id)}
                                >
                                    <div className="flex gap-3 w-full">
                                        <div className={`mt-0.5 ${style.iconColor}`}>
                                            {style.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${style.dotColor}`}></span>
                                                <p className="text-sm font-medium text-slate-800 truncate">
                                                    {alert.item.product_name}
                                                </p>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-0.5">
                                                {alert.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-xs text-slate-400">
                                                    ตำแหน่ง: {alert.item.location || 'ไม่ระบุ'}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {formatDistanceToNow(alert.createdAt, { addSuffix: true, locale: th })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                    </ScrollArea>
                )}

                {displayAlerts.length > 0 && alertSummary.totalAlerts > 5 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="p-2 text-center">
                            <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700">
                                ดูทั้งหมด ({alertSummary.totalAlerts} รายการ)
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
