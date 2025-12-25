import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  MapPin,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface InventoryItem {
  id: string;
  product_id: string;
  location: string;
  quantity_pieces: number;
  products?: {
    sku_code: string;
    name: string;
  };
}

interface TransferItem {
  id: string;
  productId: string;
  productName: string;
  skuCode: string;
  destinationLocation: string;
  quantity: number;
  availableQuantity: number;
}

interface BulkTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLocation: string;
  onTransferComplete?: () => void;
}

export function BulkTransferModal({
  isOpen,
  onClose,
  sourceLocation,
  onTransferComplete,
}: BulkTransferModalProps) {
  const { toast } = useToast();
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load available items from source location
  useEffect(() => {
    if (isOpen && sourceLocation) {
      loadAvailableItems();
      loadAllLocations();
    }
  }, [isOpen, sourceLocation]);

  const loadAvailableItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          id,
          product_id,
          location,
          quantity_pieces,
          products!inner (
            sku_code,
            name
          )
        `)
        .eq('location', sourceLocation)
        .gt('quantity_pieces', 0);

      if (error) throw error;
      setAvailableItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดรายการสินค้าได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('location')
        .neq('location', sourceLocation);

      if (error) throw error;

      const uniqueLocations = [...new Set(data?.map(item => item.location) || [])];
      setAllLocations(uniqueLocations.sort());
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const addTransferItem = () => {
    if (availableItems.length === 0) {
      toast({
        title: "ไม่มีสินค้า",
        description: "ไม่มีสินค้าในโลเคชั่นนี้",
        variant: "destructive",
      });
      return;
    }

    const firstItem = availableItems[0];
    const newItem: TransferItem = {
      id: `temp-${Date.now()}`,
      productId: firstItem.product_id,
      productName: firstItem.products?.name || 'Unknown',
      skuCode: firstItem.products?.sku_code || 'Unknown',
      destinationLocation: '',
      quantity: 0,
      availableQuantity: firstItem.quantity_pieces,
    };

    setTransferItems([...transferItems, newItem]);
  };

  const removeTransferItem = (id: string) => {
    setTransferItems(transferItems.filter(item => item.id !== id));
  };

  const updateTransferItem = (id: string, field: keyof TransferItem, value: any) => {
    setTransferItems(transferItems.map(item => {
      if (item.id === id) {
        // If product changed, update available quantity
        if (field === 'productId') {
          const selectedItem = availableItems.find(i => i.product_id === value);
          return {
            ...item,
            [field]: value,
            productName: selectedItem?.products?.name || 'Unknown',
            skuCode: selectedItem?.products?.sku_code || 'Unknown',
            availableQuantity: selectedItem?.quantity_pieces || 0,
            quantity: 0,
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const calculateSummary = () => {
    const summary = new Map<string, { used: number; available: number; name: string }>();

    availableItems.forEach(item => {
      const totalUsed = transferItems
        .filter(t => t.productId === item.product_id)
        .reduce((sum, t) => sum + t.quantity, 0);

      summary.set(item.product_id, {
        used: totalUsed,
        available: item.quantity_pieces,
        name: item.products?.name || 'Unknown',
      });
    });

    return summary;
  };

  const validateTransfers = (): string | null => {
    if (transferItems.length === 0) {
      return "กรุณาเพิ่มรายการที่ต้องการย้าย";
    }

    for (const item of transferItems) {
      if (!item.destinationLocation) {
        return `กรุณาเลือกโลเคชั่นปลายทางสำหรับ ${item.productName}`;
      }
      if (item.quantity <= 0) {
        return `กรุณาระบุจำนวนที่ต้องการย้ายสำหรับ ${item.productName}`;
      }
      if (item.destinationLocation === sourceLocation) {
        return `ไม่สามารถย้ายไปโลเคชั่นเดียวกันได้ (${item.productName})`;
      }
    }

    const summary = calculateSummary();
    for (const [productId, data] of summary.entries()) {
      if (data.used > data.available) {
        return `${data.name}: ใช้ ${data.used} ชิ้น แต่มีเพียง ${data.available} ชิ้น`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateTransfers();
    if (validationError) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Group transfers by product and destination
      const transfers = transferItems.map(item => ({
        product_id: item.productId,
        from_location: sourceLocation,
        to_location: item.destinationLocation,
        quantity_pieces: item.quantity,
      }));

      // Call bulk transfer service
      const { error } = await supabase.rpc('bulk_transfer_inventory', {
        transfers_json: JSON.stringify(transfers)
      });

      if (error) throw error;

      toast({
        title: "✅ ย้ายสินค้าสำเร็จ",
        description: `ย้ายสินค้า ${transferItems.length} รายการจาก ${sourceLocation}`,
      });

      onTransferComplete?.();
      handleClose();
    } catch (error: any) {
      console.error('Bulk transfer error:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: error.message || "ไม่สามารถย้ายสินค้าได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTransferItems([]);
    onClose();
  };

  const summary = calculateSummary();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-blue-600" />
            ย้ายสินค้าหลายรายการพร้อมกัน
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>จากโลเคชั่น:</span>
            <Badge variant="outline" className="font-mono">{sourceLocation}</Badge>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            กำลังโหลดข้อมูล...
          </div>
        ) : (
          <>
            {/* Transfer Items List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">รายการที่จะย้าย</Label>
                <Button
                  onClick={addTransferItem}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={availableItems.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มรายการ
                </Button>
              </div>

              {transferItems.length === 0 ? (
                <Card className="bg-gray-50 border-dashed">
                  <CardContent className="py-8 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>ยังไม่มีรายการ กรุณาคลิก "เพิ่มรายการ"</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {transferItems.map((item, index) => (
                    <Card key={item.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                            {index + 1}
                          </div>

                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Product Selection */}
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-600">สินค้า</Label>
                              <Select
                                value={item.productId}
                                onValueChange={(value) => updateTransferItem(item.id, 'productId', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableItems.map((availItem) => (
                                    <SelectItem key={availItem.product_id} value={availItem.product_id}>
                                      {availItem.products?.name} ({availItem.quantity_pieces} ชิ้น)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-500">
                                SKU: {item.skuCode} | คงเหลือ: {item.availableQuantity} ชิ้น
                              </p>
                            </div>

                            {/* Destination Location */}
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-600">โลเคชั่นปลายทาง</Label>
                              <Select
                                value={item.destinationLocation}
                                onValueChange={(value) => updateTransferItem(item.id, 'destinationLocation', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="เลือกโลเคชั่น..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {allLocations.map((loc) => (
                                    <SelectItem key={loc} value={loc}>
                                      {loc}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Quantity */}
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-600">จำนวน (ชิ้น)</Label>
                              <Input
                                type="number"
                                min="0"
                                max={item.availableQuantity}
                                value={item.quantity || ''}
                                onChange={(e) => updateTransferItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTransferItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Transfer Preview */}
                        {item.destinationLocation && item.quantity > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded">
                            <ArrowRight className="h-4 w-4 text-blue-600" />
                            <span className="font-mono text-xs">{sourceLocation}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-mono text-xs">{item.destinationLocation}</span>
                            <span className="ml-auto font-semibold text-blue-700">{item.quantity} ชิ้น</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Summary Section */}
            {summary.size > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-base font-semibold">สรุปการย้าย</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Array.from(summary.entries()).map(([productId, data]) => (
                      <Card key={productId} className={data.used > data.available ? 'border-red-500 bg-red-50' : 'bg-gray-50'}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{data.name}</p>
                              <p className="text-xs text-gray-600">
                                ย้าย {data.used} / {data.available} ชิ้น
                                {data.used > 0 && (
                                  <span className="ml-2 text-blue-600">
                                    (คงเหลือ {data.available - data.used})
                                  </span>
                                )}
                              </p>
                            </div>
                            {data.used > data.available ? (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            ) : data.used > 0 ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || transferItems.length === 0 || loading}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                กำลังย้าย...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                ยืนยันการย้าย ({transferItems.length} รายการ)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
