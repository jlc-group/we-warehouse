import { useState, useMemo, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MapPin, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { displayLocation, normalizeLocation } from '@/utils/locationUtils';
import { useAuth } from '@/contexts/AuthContextSimple';
import { executeTransfer } from '@/services/transferService';

interface InventoryItem {
    id: string;
    product_name: string;
    sku: string;
    location: string;
    product_type?: string;
    unit_level1_quantity: number;
    unit_level2_quantity: number;
    unit_level3_quantity: number;
    unit_level1_name: string;
    unit_level2_name: string;
    unit_level3_name: string;
    unit_level1_rate: number;
    unit_level2_rate: number;
}

interface TransferItemState {
    inventoryItem: InventoryItem;
    destinationLocation: string;
    error?: string;
}

interface MultiLocationBinTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItems: InventoryItem[];
}

export function MultiLocationBinTransferModal({
    isOpen,
    onClose,
    selectedItems
}: MultiLocationBinTransferModalProps) {
    const { user } = useAuth();
    const [items, setItems] = useState<TransferItemState[]>([]);
    const [globalDestination, setGlobalDestination] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize state when selected items change
    useEffect(() => {
        if (isOpen && selectedItems.length > 0) {
            setItems(selectedItems.map(item => ({
                inventoryItem: item,
                destinationLocation: ''
            })));
            setGlobalDestination('');
        }
    }, [isOpen, selectedItems]);

    const handleApplyGlobalDestination = () => {
        if (!globalDestination) return;

        setItems(prev => prev.map(item => ({
            ...item,
            destinationLocation: globalDestination,
            error: item.inventoryItem.location === globalDestination ? 'ปลายทางซ้ำกับต้นทาง' : undefined
        })));
    };

    const handleDestinationChange = (id: string, value: string) => {
        setItems(prev => prev.map(item => {
            if (item.inventoryItem.id !== id) return item;
            return {
                ...item,
                destinationLocation: value,
                error: item.inventoryItem.location === value ? 'ปลายทางซ้ำกับต้นทาง' : undefined
            };
        }));
    };

    const calculateTotalPieces = (item: InventoryItem): number => {
        return (
            (item.unit_level1_quantity || 0) * (item.unit_level1_rate || 0) +
            (item.unit_level2_quantity || 0) * (item.unit_level2_rate || 0) +
            (item.unit_level3_quantity || 0)
        );
    };

    const handleConfirmTransfer = async () => {
        // Validate
        const invalidItems = items.filter(
            item => !item.destinationLocation || item.error || item.destinationLocation === item.inventoryItem.location
        );

        if (invalidItems.length > 0) {
            toast.error(`มีสินค้า ${invalidItems.length} รายการที่ข้อมูลไม่ถูกต้อง`);
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;
        const errors: string[] = [];

        try {

            for (const itemState of items) {
                const { inventoryItem, destinationLocation } = itemState;

                const result = await executeTransfer(inventoryItem, destinationLocation, user);

                if (result.success) {
                    successCount++;
                } else {
                    console.error(result.message, result.error);
                    errors.push(result.message || 'Error');
                }
            }

            if (successCount > 0) {
                toast.success(`ย้ายสำเร็จ ${successCount} รายการ`);
                onClose(); // Close modal
                window.location.reload(); // Refresh to show changes
            } else {
                toast.error('ไม่สามารถย้ายรายการได้');
            }

        } catch (e) {
            console.error('Bulk transfer error', e);
            toast.error('เกิดข้อผิดพลาดในการย้ายสินค้า');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>ย้ายตำแหน่งสินค้าแบบชุด ({selectedItems.length} รายการ)</DialogTitle>
                    <DialogDescription>
                        กำหนดตำแหน่งปลายทางให้กับสินค้าที่เลือก
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Global Actions */}
                    <div className="flex items-end gap-3 bg-muted/40 p-4 rounded-lg">
                        <div className="flex-1 space-y-1">
                            <Label>กำหนดปลายทางทั้งหมด</Label>
                            <Input
                                placeholder="ระบุ Location (เช่น B1-2)..."
                                value={globalDestination}
                                onChange={(e) => setGlobalDestination(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleApplyGlobalDestination} variant="secondary">
                            นำไปใช้กับทุกรายการ
                        </Button>
                    </div>

                    {/* List */}
                    <div className="space-y-4">
                        {items.map((item, idx) => (
                            <div key={item.inventoryItem.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border p-3 rounded-lg relative">
                                {/* Product Info */}
                                <div className="md:col-span-5 space-y-1">
                                    <div className="font-medium text-sm truncate" title={item.inventoryItem.product_name}>
                                        {item.inventoryItem.product_name}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Badge variant="outline">{item.inventoryItem.sku}</Badge>
                                        <span>{calculateTotalPieces(item.inventoryItem)} ชิ้น</span>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="md:col-span-1 flex justify-center text-muted-foreground">
                                    <ArrowRight className="h-4 w-4" />
                                </div>

                                {/* Locations */}
                                <div className="md:col-span-6 grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground block">ต้นทาง</span>
                                        <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1.5 rounded text-sm font-medium border border-red-100">
                                            <MapPin className="h-3 w-3" />
                                            {item.inventoryItem.location}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground block">ปลายทาง</span>
                                        <Input
                                            className={`h-9 ${item.error ? 'border-red-500 bg-red-50' : ''}`}
                                            placeholder="ระบุปลายทาง..."
                                            value={item.destinationLocation}
                                            onChange={(e) => handleDestinationChange(item.inventoryItem.id, e.target.value)}
                                        />
                                    </div>
                                </div>

                                {item.error && (
                                    <div className="absolute -bottom-2 right-4 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200 shadow-sm">
                                        <AlertTriangle className="h-3 w-3" />
                                        {item.error}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        ยกเลิก
                    </Button>
                    <Button onClick={handleConfirmTransfer} disabled={isSubmitting || items.some(i => !i.destinationLocation || i.error)}>
                        {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการย้าย'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
