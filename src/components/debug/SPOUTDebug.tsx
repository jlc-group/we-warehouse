import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, Package, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useConversionRates } from '@/hooks/useConversionRates';
import type { ConversionRateData } from '@/types/conversionTypes';

interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
  location: string;
  lot?: string;
  mfd?: string;
  unit_level1_quantity: number;
  unit_level2_quantity: number;
  unit_level3_quantity: number;
  unit_level1_rate?: number;
  unit_level2_rate?: number;
  created_at: string;
  is_deleted?: boolean;
}

export function SPOUTDebug() {
  const { toast } = useToast();
  const { getConversionRate } = useConversionRates();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [conversionRateCache, setConversionRateCache] = useState<Map<string, ConversionRateData>>(new Map());

  const calculateTotalQuantity = async (item: InventoryItem): Promise<number> => {
    const level1 = item.unit_level1_quantity || 0;
    const level2 = item.unit_level2_quantity || 0;
    const level3 = item.unit_level3_quantity || 0;

    let level1Rate = item.unit_level1_rate;
    let level2Rate = item.unit_level2_rate;

    // Try to get conversion rates from cache first
    if (conversionRateCache.has(item.sku)) {
      const cachedRate = conversionRateCache.get(item.sku)!;
      level1Rate = cachedRate.unit_level1_rate;
      level2Rate = cachedRate.unit_level2_rate;
      console.log(`🔍 DEBUG ${item.sku} - Using cached rates - Level1: ${level1}x${level1Rate}, Level2: ${level2}x${level2Rate}, Level3: ${level3}`);
    } else {
      // Fetch from database if not in cache
      try {
        const conversionRate = await getConversionRate(item.sku);
        if (conversionRate) {
          level1Rate = conversionRate.unit_level1_rate;
          level2Rate = conversionRate.unit_level2_rate;

          // Update cache
          setConversionRateCache(prev => new Map(prev.set(item.sku, conversionRate)));
          console.log(`🔍 DEBUG ${item.sku} - Using DB rates (${level1Rate}/${level2Rate}) - Level1: ${level1}x${level1Rate}, Level2: ${level2}x${level2Rate}, Level3: ${level3}`);
        }
      } catch (error) {
        console.warn(`⚠️ DEBUG Could not fetch conversion rate for ${item.sku}, using defaults`);
      }
    }

    // Use fallback defaults if still no rates
    if (!level1Rate) level1Rate = 144;
    if (!level2Rate) level2Rate = 12;

    return (level1 * level1Rate) + (level2 * level2Rate) + level3;
  };

  const calculateTotalQuantitySync = (item: InventoryItem): number => {
    const level1 = item.unit_level1_quantity || 0;
    const level2 = item.unit_level2_quantity || 0;
    const level3 = item.unit_level3_quantity || 0;

    // Try to get conversion rates from cache first
    if (conversionRateCache.has(item.sku)) {
      const cachedRate = conversionRateCache.get(item.sku)!;
      const total = (level1 * cachedRate.unit_level1_rate) + (level2 * cachedRate.unit_level2_rate) + level3;
      console.log(`🔍 DEBUG SYNC ${item.sku} - Using cached - Level1: ${level1}x${cachedRate.unit_level1_rate}, Level2: ${level2}x${cachedRate.unit_level2_rate}, Level3: ${level3} = ${total}`);
      return total;
    }

    // Use item rates if available, otherwise fallback to defaults
    const level1Rate = item.unit_level1_rate || 144;
    const level2Rate = item.unit_level2_rate || 12;
    const total = (level1 * level1Rate) + (level2 * level2Rate) + level3;
    console.log(`🔍 DEBUG SYNC ${item.sku} - Using fallback - Level1: ${level1}x${level1Rate}, Level2: ${level2}x${level2Rate}, Level3: ${level3} = ${total}`);
    return total;
  };

  const canDeleteItem = (item: InventoryItem): boolean => {
    const totalQuantity = calculateTotalQuantitySync(item);
    return totalQuantity === 0;
  };

  const canDeleteItemAsync = async (item: InventoryItem): Promise<boolean> => {
    const totalQuantity = await calculateTotalQuantity(item);
    return totalQuantity === 0;
  };

  const fetchSPOUTItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('sku', 'SPOUT-LW02')
        .order('created_at');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      toast({
        title: '❌ ข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูล SPOUT-LW02 ได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      setDeleting(itemId);
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: '✅ ลบรายการสำเร็จ',
        description: 'ลบรายการ SPOUT-LW02 เรียบร้อยแล้ว',
      });

      // Refresh items
      await fetchSPOUTItems();
    } catch (error) {
      toast({
        title: '❌ ลบรายการไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchSPOUTItems();
  }, []);

  const zeroStockItems = items.filter(item => canDeleteItem(item));
  const hasStockItems = items.filter(item => !canDeleteItem(item));

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Search className="h-5 w-5" />
            🔍 Debug SPOUT-LW02 Inventory Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={fetchSPOUTItems} disabled={loading}>
                🔄 รีเฟรชข้อมูล
              </Button>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  ทั้งหมด: {items.length} รายการ
                </Badge>
                <Badge variant="destructive">
                  สต็อกหมด: {zeroStockItems.length} รายการ
                </Badge>
                <Badge variant="default">
                  มีสต็อก: {hasStockItems.length} รายการ
                </Badge>
              </div>
            </div>

            {zeroStockItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-medium text-red-900">
                    รายการที่สามารถลบได้ (สต็อก = 0)
                  </h3>
                </div>
                <div className="space-y-2">
                  {zeroStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white p-3 rounded border"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-sm text-gray-500">
                          ID: {item.id} | ตำแหน่ง: {item.location}
                        </div>
                        <div className="text-sm text-gray-500">
                          จำนวน: {calculateTotalQuantity(item)} ชิ้น
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                        disabled={deleting === item.id}
                      >
                        {deleting === item.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        ลบ
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasStockItems.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium text-green-900">
                    รายการที่มีสต็อก (ไม่สามารถลบได้)
                  </h3>
                </div>
                <div className="space-y-2">
                  {hasStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-3 rounded border"
                    >
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-sm text-gray-500">
                        ID: {item.id} | ตำแหน่ง: {item.location}
                      </div>
                      <div className="text-sm text-gray-500">
                        จำนวน: {calculateTotalQuantity(item)} ชิ้น
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {items.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                ไม่พบรายการ SPOUT-LW02 ในระบบ
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}