import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Save, X, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LocationActivityService, type LocationInventorySummary } from '@/services/locationActivityService';

interface LocationRemoveItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    location: string;
    inventory: LocationInventorySummary | null;
    onSuccess: () => void;
}

interface RemoveItem {
    sku: string;
    product_name: string;
    selected: boolean;
    currentQuantity: number;
    removeQuantity: number;
    unit: string;
    lot?: string;
}

export function LocationRemoveItemModal({
    isOpen,
    onClose,
    location,
    inventory,
    onSuccess
}: LocationRemoveItemModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [removeItems, setRemoveItems] = useState<RemoveItem[]>([]);
    const [notes, setNotes] = useState('');

    // Initialize items from inventory when modal opens
    useEffect(() => {
        if (isOpen && inventory?.products) {
            setRemoveItems(inventory.products.map(p => ({
                sku: p.sku,
                product_name: p.product_name,
                selected: false,
                currentQuantity: p.quantity,
                removeQuantity: 0,
                unit: p.unit,
                lot: p.lot
            })));
            setNotes('');
        }
    }, [isOpen, inventory]);

    const handleItemToggle = (sku: string) => {
        setRemoveItems(prev => prev.map(item =>
            item.sku === sku ? { ...item, selected: !item.selected } : item
        ));
    };

    const handleQuantityChange = (sku: string, value: string) => {
        const numValue = parseInt(value) || 0;
        setRemoveItems(prev => prev.map(item => {
            if (item.sku === sku) {
                return {
                    ...item,
                    removeQuantity: Math.min(Math.max(0, numValue), item.currentQuantity)
                };
            }
            return item;
        }));
    };

    const handleSave = async () => {
        const selectedItems = removeItems.filter(item => item.selected && item.removeQuantity > 0);

        if (selectedItems.length === 0) {
            toast({
                title: '⚠️ ไม่ได้เลือกสินค้า',
                description: 'กรุณาเลือกสินค้าและระบุจำนวนที่ต้องการส่งออก',
                variant: 'destructive'
            });
            return;
        }

        try {
            setLoading(true);

            // Process each selected item
            for (const item of selectedItems) {
                // Find the inventory item
                const { data: inventoryItem, error: fetchError } = await (supabase
                    .from('inventory_items') as any)
                    .select('id, unit_level3_quantity')
                    .eq('location', location)
                    .eq('sku', item.sku)
                    .single();

                if (fetchError || !inventoryItem) {
                    console.error('Error fetching inventory item:', fetchError);
                    continue;
                }

                const invItem = inventoryItem as { id: string; unit_level3_quantity: number };

                // Calculate new quantity (simplified - removing from level3/pieces)
                const newQuantity = (invItem.unit_level3_quantity || 0) - item.removeQuantity;

                if (newQuantity <= 0) {
                    // Delete the item if quantity reaches zero
                    const { error: deleteError } = await (supabase
                        .from('inventory_items') as any)
                        .delete()
                        .eq('id', invItem.id);

                    if (deleteError) throw deleteError;
                } else {
                    // Update with reduced quantity
                    const { error: updateError } = await (supabase
                        .from('inventory_items') as any)
                        .update({
                            unit_level3_quantity: newQuantity,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', invItem.id);

                    if (updateError) throw updateError;
                }

                // Log activity
                await LocationActivityService.logMoveOut({
                    location,
                    productSku: item.sku,
                    productName: item.product_name,
                    quantity: item.removeQuantity,
                    unit: item.unit,
                    userName: 'User',
                    notes: notes || undefined
                });
            }

            toast({
                title: '✅ ส่งสินค้าออกสำเร็จ',
                description: `ส่งออก ${selectedItems.length} รายการจาก ${location}`,
            });

            onSuccess();
            onClose();

        } catch (error) {
            console.error('Error removing items:', error);
            toast({
                title: '❌ เกิดข้อผิดพลาด',
                description: 'ไม่สามารถส่งสินค้าออกได้',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const selectedCount = removeItems.filter(item => item.selected && item.removeQuantity > 0).length;
    const totalRemoveQuantity = removeItems
        .filter(item => item.selected)
        .reduce((sum, item) => sum + item.removeQuantity, 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-full h-full sm:max-w-lg sm:h-auto overflow-y-auto">
                <DialogHeader className="p-4 sm:p-6">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg text-red-700">
                        <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                        ส่งสินค้าออก - {location}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        เลือกสินค้าและจำนวนที่ต้องการส่งออกจาก Location นี้
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Item List */}
                    {removeItems.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>ไม่มีสินค้าใน Location นี้</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {removeItems.map((item) => (
                                <Card key={item.sku} className={item.selected ? 'border-red-300 bg-red-50' : ''}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={item.selected}
                                                onCheckedChange={() => handleItemToggle(item.sku)}
                                                className="mt-1 h-5 w-5"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{item.product_name}</div>
                                                <div className="text-xs text-gray-500 font-mono">{item.sku}</div>
                                                {item.lot && (
                                                    <div className="text-xs text-gray-400">LOT: {item.lot}</div>
                                                )}
                                                <div className="text-xs text-blue-600 mt-1">
                                                    มีอยู่: {item.currentQuantity.toLocaleString()} {item.unit}
                                                </div>

                                                {item.selected && (
                                                    <div className="mt-3 space-y-2">
                                                        <Label className="text-xs text-red-700">จำนวนที่ส่งออก</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max={item.currentQuantity}
                                                                value={item.removeQuantity}
                                                                onChange={(e) => handleQuantityChange(item.sku, e.target.value)}
                                                                className="w-24 text-center h-10"
                                                            />
                                                            <span className="text-sm text-gray-500">{item.unit}</span>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleQuantityChange(item.sku, item.currentQuantity.toString())}
                                                                className="text-xs"
                                                            >
                                                                ทั้งหมด
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    {selectedCount > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm">หมายเหตุ (ถ้ามี)</Label>
                            <Input
                                placeholder="เช่น ส่งให้ลูกค้า, ย้ายไปโกดัง..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-11"
                            />
                        </div>
                    )}

                    {/* Warning */}
                    {selectedCount > 0 && (
                        <Card className="border-orange-200 bg-orange-50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-orange-800">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    <div className="text-sm">
                                        <strong>สรุป:</strong> ส่งออก {selectedCount} รายการ รวม {totalRemoveQuantity.toLocaleString()} ชิ้น
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="h-11 w-full sm:w-auto">
                        <X className="h-4 w-4 mr-2" />
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading || selectedCount === 0}
                        className="bg-red-600 hover:bg-red-700 h-11 w-full sm:w-auto"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'กำลังบันทึก...' : `ส่งออก (${selectedCount} รายการ)`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
