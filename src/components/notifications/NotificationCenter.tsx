/**
 * NotificationCenter - การแจ้งเตือนสต็อก (ปรับปรุงใหม่ — ไม่ซ้ำ, อ่านง่าย)
 */

import { useMemo } from 'react';
import { Bell, AlertTriangle, Package, CheckCircle, Clock, ChevronRight } from 'lucide-react';
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

export function NotificationCenter() {
    const { alerts, alertSummary, acknowledgeAlert } = useInventoryAlerts();

    const displayAlerts = useMemo(() => {
        return alerts.filter(a => !a.acknowledged).slice(0, 8);
    }, [alerts]);

    const getAlertStyle = (type: string) => {
        switch (type) {
            case 'out_of_stock':
                return { icon: <AlertTriangle className="h-4 w-4" />, bg: 'bg-red-50', border: 'border-red-200', color: 'text-red-700', badge: 'bg-red-100 text-red-700', label: 'หมดสต็อก' };
            case 'critical_stock':
                return { icon: <Package className="h-4 w-4" />, bg: 'bg-orange-50', border: 'border-orange-200', color: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', label: 'สต็อกต่ำมาก' };
            case 'low_stock':
                return { icon: <Package className="h-4 w-4" />, bg: 'bg-yellow-50', border: 'border-yellow-200', color: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: 'สต็อกน้อย' };
            case 'expiry_warning':
                return { icon: <Clock className="h-4 w-4" />, bg: 'bg-purple-50', border: 'border-purple-200', color: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', label: 'ใกล้หมดอายุ' };
            default:
                return { icon: <CheckCircle className="h-4 w-4" />, bg: 'bg-blue-50', border: 'border-blue-200', color: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', label: 'แจ้งเตือน' };
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
                        <span className={`absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full ${hasCritical ? 'bg-red-500' : 'bg-orange-500'} text-white text-[10px] font-bold flex items-center justify-center border-2 border-white`}>
                            {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px] rounded-xl shadow-2xl border border-slate-200 bg-white z-50">
                {/* Header */}
                <DropdownMenuLabel className="flex items-center justify-between py-3">
                    <span className="font-semibold text-slate-800">การแจ้งเตือน</span>
                    <div className="flex gap-1.5">
                        {alertSummary.criticalAlerts > 0 && (
                            <Badge className="bg-red-100 text-red-700 text-[10px] font-semibold px-1.5">
                                {alertSummary.criticalAlerts} หมดสต็อก
                            </Badge>
                        )}
                        {alertSummary.highAlerts > 0 && (
                            <Badge className="bg-orange-100 text-orange-700 text-[10px] font-semibold px-1.5">
                                {alertSummary.highAlerts} สต็อกต่ำ
                            </Badge>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {displayAlerts.length === 0 ? (
                    <div className="py-8 text-center">
                        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">ไม่มีแจ้งเตือนใหม่</p>
                        <p className="text-xs text-slate-400">สต็อกทุกรายการอยู่ในเกณฑ์ปกติ</p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[360px]">
                        <div className="p-1 space-y-1">
                            {displayAlerts.map((alert) => {
                                const style = getAlertStyle(alert.type);
                                return (
                                    <DropdownMenuItem
                                        key={alert.id}
                                        className={`p-2.5 cursor-pointer rounded-lg border ${style.border} ${style.bg} hover:opacity-90`}
                                        onClick={() => acknowledgeAlert(alert.id)}
                                    >
                                        <div className="flex gap-2.5 w-full items-start">
                                            <div className={`mt-0.5 ${style.color}`}>
                                                {style.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-medium text-slate-900 truncate">
                                                        {alert.item.product_name}
                                                    </p>
                                                    <Badge className={`${style.badge} text-[10px] px-1.5 py-0 shrink-0`}>
                                                        {style.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-600 mt-0.5">
                                                    {alert.message}
                                                </p>
                                                {alert.item.sku && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        SKU: {alert.item.sku}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </DropdownMenuItem>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}

                {/* Footer */}
                {alertSummary.totalAlerts > 8 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="p-2 text-center">
                            <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 gap-1">
                                ดูทั้งหมด ({alertSummary.totalAlerts} รายการ)
                                <ChevronRight className="h-3 w-3" />
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
