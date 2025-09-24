import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Package, TrendingUp, TrendingDown, Move, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface MovementLog {
  id: string;
  inventory_item_id: string;
  movement_type: 'IN' | 'OUT' | 'RESERVED' | 'ADJUSTMENT' | 'TRANSFER';
  quantity_level1_change: number;
  quantity_level2_change: number;
  quantity_level3_change: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export function MovementLogs() {
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      
      // Since inventory_movements table doesn't exist yet, use inventory_items for demo
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Fetch movements error:', error);
        throw error;
      }
      
      // Transform inventory_items to movement logs format
      const mockMovements: MovementLog[] = (data || []).map((item, index) => ({
        id: `movement_${item.id}`,
        inventory_item_id: item.id,
        movement_type: index % 3 === 0 ? 'IN' : index % 3 === 1 ? 'OUT' : 'ADJUSTMENT',
        quantity_level1_change: item.unit_level1_quantity || 0,
        quantity_level2_change: item.unit_level2_quantity || 0,
        quantity_level3_change: item.unit_level3_quantity || 0,
        reference_type: 'manual',
        reference_id: null,
        notes: `Movement for ${item.product_name}`,
        created_by: item.user_id || '00000000-0000-0000-0000-000000000000',
        created_at: item.created_at,
        updated_at: item.updated_at || item.created_at,
        // Additional fields from inventory_items for display
        product_name: item.product_name,
        sku: item.sku,
        location: item.location,
        lot: item.lot,
        mfd: item.mfd
      }));
      
      setMovements(mockMovements);
    } catch (error) {
      console.error('Error fetching movement logs:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดประวัติการเคลื่อนไหวได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMovements();

    // DISABLED: Real-time subscription (to prevent flickering)
    // Real-time updates disabled to improve performance and prevent UI flickering
    // Data will be manually refreshed when needed

    // const channel = supabase
    //   .channel('movement_changes')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: 'INSERT',
    //       schema: 'public',
    //       table: 'inventory_movements'
    //     },
    //     () => {
    //       fetchMovements(); // Refresh data on new movement
    //     }
    //   )
    //   .subscribe();

    return () => {
      // supabase.removeChannel(channel);
    };
  }, [fetchMovements]);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'TRANSFER':
        return <Move className="h-4 w-4 text-blue-600" />;
      case 'adjustment':
        return <Settings className="h-4 w-4 text-orange-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementBadgeVariant = (type: string) => {
    switch (type) {
      case 'in':
        return 'default';
      case 'out':
        return 'destructive';
      case 'TRANSFER':
        return 'secondary';
      case 'adjustment':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getMovementTypeText = (type: string) => {
    switch (type) {
      case 'in':
        return 'เพิ่มสต็อก';
      case 'out':
        return 'ลดสต็อก';
      case 'TRANSFER':
        return 'ย้ายสินค้า';
      case 'adjustment':
        return 'ปรับปรุง';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            ประวัติการเคลื่อนไหวสต็อก
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          ประวัติการเคลื่อนไหวสต็อก
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          รายการ {movements.length} รายการล่าสุด
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {movements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ยังไม่มีประวัติการเคลื่อนไหว
              </div>
            ) : (
              movements.map((movement, index) => (
                <div key={movement.id}>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 mt-1">
                      {getMovementIcon(movement.movement_type)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getMovementBadgeVariant(movement.movement_type)}>
                            {getMovementTypeText(movement.movement_type)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                      </div>

                      {movement.notes && (
                        <p className="text-sm font-medium">{movement.notes}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {/* Location Info */}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">ตำแหน่ง:</span>
                          <span className="font-mono">{(movement as any).location}</span>
                        </div>

                        {/* Product Info */}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">สินค้า:</span>
                          <span className="font-mono">{(movement as any).sku}</span>
                        </div>

                        {/* Quantity Changes */}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">ลัง:</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            movement.quantity_level1_change > 0 ? 'bg-green-100 text-green-700' : 
                            movement.quantity_level1_change < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {movement.quantity_level1_change > 0 ? '+' : ''}{movement.quantity_level1_change}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">กล่อง:</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            movement.quantity_level2_change > 0 ? 'bg-green-100 text-green-700' : 
                            movement.quantity_level2_change < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {movement.quantity_level2_change > 0 ? '+' : ''}{movement.quantity_level2_change}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">ชิ้น:</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            movement.quantity_level3_change > 0 ? 'bg-green-100 text-green-700' : 
                            movement.quantity_level3_change < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {movement.quantity_level3_change > 0 ? '+' : ''}{movement.quantity_level3_change}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {index < movements.length - 1 && <Separator className="my-2" />}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}