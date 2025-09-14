import { useEffect, useState } from 'react';
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
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity_boxes_before: number;
  quantity_loose_before: number;
  quantity_boxes_after: number;
  quantity_loose_after: number;
  quantity_boxes_change: number;
  quantity_loose_change: number;
  location_before?: string;
  location_after?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export function MovementLogs() {
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMovements = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Fetch movements error:', error);
        throw error;
      }
      
      setMovements((data as MovementLog[]) || []);
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
  };

  useEffect(() => {
    fetchMovements();

    // Set up real-time subscription
    const channel = supabase
      .channel('movement_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_movements'
        },
        () => {
          fetchMovements(); // Refresh data on new movement
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'transfer':
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
      case 'transfer':
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
      case 'transfer':
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
                        {/* Location Changes */}
                        {movement.movement_type === 'transfer' && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">ตำแหน่ง:</span>
                            <span className="font-mono">{movement.location_before}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{movement.location_after}</span>
                          </div>
                        )}

                        {movement.movement_type !== 'transfer' && movement.location_after && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">ตำแหน่ง:</span>
                            <span className="font-mono">{movement.location_after}</span>
                          </div>
                        )}

                        {/* Quantity Changes */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">ลัง:</span>
                            <span className="font-mono">{movement.quantity_boxes_before}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{movement.quantity_boxes_after}</span>
                            {movement.quantity_boxes_change !== 0 && (
                              <span className={`text-sm font-medium ${
                                movement.quantity_boxes_change > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ({movement.quantity_boxes_change > 0 ? '+' : ''}{movement.quantity_boxes_change})
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">ชิ้น:</span>
                            <span className="font-mono">{movement.quantity_loose_before}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{movement.quantity_loose_after}</span>
                            {movement.quantity_loose_change !== 0 && (
                              <span className={`text-sm font-medium ${
                                movement.quantity_loose_change > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ({movement.quantity_loose_change > 0 ? '+' : ''}{movement.quantity_loose_change})
                              </span>
                            )}
                          </div>
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