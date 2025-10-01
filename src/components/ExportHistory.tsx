import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  TrendingDown,
  Search,
  Calendar,
  Package,
  MapPin,
  User,
  FileText,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface ExportMovement {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity_boxes_before: number;
  quantity_loose_before: number;
  quantity_boxes_after: number;
  quantity_loose_after: number;
  quantity_boxes_change: number;
  quantity_loose_change: number;
  location_before: string;
  location_after: string;
  notes: string;
  created_at: string;
  created_by: string;
  // Joined data
  product_name?: string;
  sku?: string;
  unit_level1_name?: string;
  unit_level2_name?: string;
  unit_level3_name?: string;
  unit_level1_rate?: number;
  unit_level2_rate?: number;
}

export function ExportHistory() {
  const [movements, setMovements] = useState<ExportMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<ExportMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  useEffect(() => {
    fetchExportMovements();
  }, []);

  useEffect(() => {
    filterMovements();
  }, [searchTerm, dateFilter, movements]);

  const fetchExportMovements = async () => {
    try {
      setLoading(true);

      // Query inventory_movements where movement_type = 'out'
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          inventory_item_id,
          movement_type,
          quantity_boxes_before,
          quantity_loose_before,
          quantity_boxes_after,
          quantity_loose_after,
          quantity_boxes_change,
          quantity_loose_change,
          location_before,
          location_after,
          notes,
          created_at,
          created_by,
          inventory_items!inner(
            product_name,
            sku,
            unit_level1_name,
            unit_level2_name,
            unit_level3_name,
            unit_level1_rate,
            unit_level2_rate
          )
        `)
        .eq('movement_type', 'out')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Flatten joined data
      const flattenedData: ExportMovement[] = (data || []).map((item: any) => ({
        ...item,
        product_name: item.inventory_items?.product_name,
        sku: item.inventory_items?.sku,
        unit_level1_name: item.inventory_items?.unit_level1_name || 'ลัง',
        unit_level2_name: item.inventory_items?.unit_level2_name || 'กล่อง',
        unit_level3_name: item.inventory_items?.unit_level3_name || 'ชิ้น',
        unit_level1_rate: item.inventory_items?.unit_level1_rate || 144,
        unit_level2_rate: item.inventory_items?.unit_level2_rate || 12,
      }));

      console.log('✅ Loaded export movements:', flattenedData.length);
      setMovements(flattenedData);
    } catch (error) {
      console.error('❌ Error fetching export movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMovements = () => {
    let filtered = [...movements];

    // Filter by search term (customer name, product, SKU)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.location_after?.toLowerCase().includes(term) ||
        m.product_name?.toLowerCase().includes(term) ||
        m.sku?.toLowerCase().includes(term) ||
        m.notes?.toLowerCase().includes(term)
      );
    }

    // Filter by date
    const now = new Date();
    if (dateFilter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(m => new Date(m.created_at) >= startOfDay);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => new Date(m.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => new Date(m.created_at) >= monthAgo);
    }

    setFilteredMovements(filtered);
  };

  const extractCustomerName = (locationAfter: string): string => {
    // Extract customer name from "ลูกค้า: บริษัท XYZ"
    const match = locationAfter?.match(/ลูกค้า:\s*(.+?)(?:\s*\(|$)/);
    return match ? match[1].trim() : locationAfter || 'ไม่ระบุ';
  };

  const calculateTotalPieces = (movement: ExportMovement): number => {
    const boxesChange = Math.abs(movement.quantity_boxes_change || 0);
    const looseChange = Math.abs(movement.quantity_loose_change || 0);

    const piecesFromBoxes = boxesChange * (movement.unit_level1_rate || 144);
    const piecesFromLoose = looseChange * (movement.unit_level2_rate || 12);

    return piecesFromBoxes + piecesFromLoose;
  };

  const formatQuantity = (movement: ExportMovement): string => {
    const boxes = Math.abs(movement.quantity_boxes_change || 0);
    const loose = Math.abs(movement.quantity_loose_change || 0);

    const parts = [];
    if (boxes > 0) parts.push(`${boxes} ${movement.unit_level1_name}`);
    if (loose > 0) parts.push(`${loose} ${movement.unit_level2_name}`);

    return parts.join(' + ') || '0';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลดประวัติการส่งออก...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                ประวัติการส่งออกสินค้า
              </CardTitle>
              <CardDescription>
                รายการสินค้าที่ส่งออกไปยังลูกค้า ({filteredMovements.length} รายการ)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExportMovements}
            >
              รีเฟรช
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาลูกค้า, สินค้า, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('all')}
              >
                ทั้งหมด
              </Button>
              <Button
                variant={dateFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('today')}
              >
                วันนี้
              </Button>
              <Button
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('week')}
              >
                7 วัน
              </Button>
              <Button
                variant={dateFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('month')}
              >
                30 วัน
              </Button>
            </div>
          </div>

          {/* Table */}
          {filteredMovements.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">ไม่พบประวัติการส่งออก</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีการส่งออกสินค้า'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่/เวลา</TableHead>
                    <TableHead>สินค้า</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>จาก</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((movement) => {
                    const customerName = extractCustomerName(movement.location_after);
                    const totalPieces = calculateTotalPieces(movement);

                    return (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {format(new Date(movement.created_at), 'dd MMM yyyy', { locale: th })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(movement.created_at), 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">{movement.product_name || 'ไม่ระบุ'}</div>
                            {movement.sku && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {movement.sku}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium text-red-600">
                              {formatQuantity(movement)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ({totalPieces.toLocaleString()} {movement.unit_level3_name})
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{movement.location_before || '-'}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{customerName}</span>
                          </div>
                        </TableCell>

                        <TableCell className="max-w-xs">
                          {movement.notes && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{movement.notes}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          {filteredMovements.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                แสดง {filteredMovements.length} รายการจากทั้งหมด {movements.length} รายการ
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="font-medium">
                    รวม {filteredMovements.reduce((sum, m) => sum + calculateTotalPieces(m), 0).toLocaleString()} ชิ้น
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
