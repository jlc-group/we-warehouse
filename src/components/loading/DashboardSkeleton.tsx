/**
 * DashboardSkeleton - Loading skeleton for Dashboard components
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Stats card skeleton
 */
export function StatsCardSkeleton() {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
            </CardContent>
        </Card>
    );
}

/**
 * Stats grid skeleton - 4 cards
 */
export function StatsGridSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
        </div>
    );
}

/**
 * Table row skeleton
 */
export function TableRowSkeleton() {
    return (
        <div className="flex items-center gap-4 py-3 px-4 border-b">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
        </div>
    );
}

/**
 * Table skeleton with rows
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="p-0">
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                ))}
            </CardContent>
        </Card>
    );
}

/**
 * Chart skeleton
 */
export function ChartSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-end justify-around gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="w-full"
                            style={{ height: `${30 + Math.random() * 70}%` }}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Full dashboard loading skeleton
 */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6 p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>

            {/* Stats Grid */}
            <StatsGridSkeleton />

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartSkeleton />
                <ChartSkeleton />
            </div>

            {/* Table */}
            <TableSkeleton rows={5} />
        </div>
    );
}

/**
 * Simple loading spinner with text
 */
export function LoadingSpinner({ text = 'กำลังโหลด...' }: { text?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">{text}</p>
        </div>
    );
}
