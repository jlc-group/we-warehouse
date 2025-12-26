import { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, MapPin, Hash, Lock, AlertTriangle } from 'lucide-react';
import { displayLocation, normalizeLocation } from '@/utils/locationUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { InventoryItem } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';

interface SelectableInventoryTableProps {
    items: InventoryItem[];
    selectedIds: Set<string>;
    onSelectionChange: (selectedIds: Set<string>) => void;
}

export function SelectableInventoryTable({ items, selectedIds, onSelectionChange }: SelectableInventoryTableProps) {
    // Client-side pagination/filtering could be added here if needed, 
    // currently assuming 'items' is the viewable set.

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(items.map(item => item.id));
            onSelectionChange(allIds);
        } else {
            onSelectionChange(new Set());
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        onSelectionChange(newSelected);
    };

    const allSelected = items.length > 0 && items.every(item => selectedIds.has(item.id));
    const someSelected = items.some(item => selectedIds.has(item.id)) && !allSelected;

    // Use the same duplicate logic as InventoryTable for consistency
    const getDuplicateCount = (item: InventoryItem): number => {
        return items.filter(i =>
            i.sku === item.sku &&
            i.location === item.location &&
            i.id !== item.id
        ).length;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('th-TH');
    };

    return (
        <div className="rounded-md border bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px] text-center">
                            <Checkbox
                                checked={allSelected || (someSelected ? "indeterminate" : false)}
                                onCheckedChange={handleSelectAll}
                                aria-label="Select all"
                            />
                        </TableHead>
                        <TableHead className="w-[200px]">ชื่อสินค้า</TableHead>
                        <TableHead>รหัสสินค้า</TableHead>
                        <TableHead>ตำแหน่ง</TableHead>
                        <TableHead>LOT</TableHead>
                        <TableHead>MFD</TableHead>
                        <TableHead className="text-right">จำนวนรวม (ชิ้น)</TableHead>
                        <TableHead className="text-right">จองแล้ว</TableHead>
                        <TableHead className="text-right">พร้อมใช้</TableHead>
                        <TableHead>สถานะ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                ไม่พบรายการสินค้า
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => {
                            const duplicates = getDuplicateCount(item);

                            // Calculate unified total (simplified for list view)
                            // NOTE: Using a simplified calculation here for performance in large lists, 
                            // assuming unit_level_rates are available or default. 
                            const level1 = (item as any).unit_level1_quantity || 0;
                            const level2 = (item as any).unit_level2_quantity || 0;
                            const level3 = (item as any).unit_level3_quantity || 0;
                            const level1Rate = (item as any).unit_level1_rate || 144;
                            const level2Rate = (item as any).unit_level2_rate || 12;
                            const total = (level1 * level1Rate) + (level2 * level2Rate) + level3;
                            const reserved = (item as any).reserved_quantity || 0;
                            const available = total - reserved;

                            return (
                                <TableRow
                                    key={item.id}
                                    className={selectedIds.has(item.id) ? "bg-blue-50/50" : ""}
                                    onClick={(e) => {
                                        // Start selection if clicking row (unless clicking interactive elements)
                                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="checkbox"]')) return;
                                        handleSelectRow(item.id, !selectedIds.has(item.id));
                                    }}
                                >
                                    <TableCell className="text-center">
                                        <Checkbox
                                            checked={selectedIds.has(item.id)}
                                            onCheckedChange={(checked) => handleSelectRow(item.id, checked as boolean)}
                                            aria-label={`Select ${item.sku}`}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-primary" />
                                            {item.product_name}
                                            {duplicates > 0 && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>รายการซ้ำในตำแหน่งเดียวกัน</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Hash className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-mono text-sm">{item.sku}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-mono">{displayLocation(item.location)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.lot || '-'}</TableCell>
                                    <TableCell>{item.mfd ? formatDate(item.mfd) : '-'}</TableCell>

                                    {/* Total pieces */}
                                    <TableCell className="text-right font-mono">
                                        <span className="text-blue-600 font-bold">{total.toLocaleString()}</span>
                                    </TableCell>

                                    {/* Reserved */}
                                    <TableCell className="text-right">
                                        {reserved > 0 ? (
                                            <div className="flex items-center justify-end gap-1 text-orange-600">
                                                <Lock className="h-3 w-3" />
                                                <span>{reserved.toLocaleString()}</span>
                                            </div>
                                        ) : '-'}
                                    </TableCell>

                                    {/* Available */}
                                    <TableCell className="text-right">
                                        <span className={available > 0 ? "text-green-600 font-bold" : "text-red-500"}>
                                            {available.toLocaleString()}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        {available === 0 ? <Badge variant="destructive">หมด</Badge> :
                                            available < 20 ? <Badge variant="secondary">น้อย</Badge> :
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">ปกติ</Badge>}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
