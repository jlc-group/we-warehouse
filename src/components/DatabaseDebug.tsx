import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Table, BarChart3, Package, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function DatabaseDebug() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Query inventory_items sample
  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .limit(20);

      if (error) throw error;
      setInventoryItems(data || []);
      console.log('📦 Inventory Items Sample:', data);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    }
  };

  // Query inventory_movements sample
  const fetchInventoryMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .limit(20);

      if (error) throw error;
      setInventoryMovements(data || []);
      console.log('🔄 Inventory Movements Sample:', data);
    } catch (error) {
      console.error('Error fetching inventory movements:', error);
    }
  };

  // Query products sample
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(10);

      if (error) throw error;
      setProducts(data || []);
      console.log('🏷️ Products Sample:', data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Try to get table names (might not work with RLS)
  const fetchTablesList = async () => {
    try {
      // Try to get table information
      const { data, error } = await supabase.rpc('get_table_names').select();

      if (error) {
        // Fallback: known tables
        setTablesList([
          'inventory_items',
          'inventory_movements',
          'products',
          'product_conversion_rates',
          'profiles',
          'events',
          'bookings'
        ]);
      } else {
        setTablesList(data || []);
      }
    } catch (error) {
      // Fallback list
      setTablesList([
        'inventory_items',
        'inventory_movements',
        'products',
        'product_conversion_rates',
        'profiles',
        'events',
        'bookings'
      ]);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchInventoryItems(),
      fetchInventoryMovements(),
      fetchProducts(),
      fetchTablesList()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Analyze location patterns
  const analyzeLocations = () => {
    const locations = inventoryItems.map(item => item.location).filter(Boolean);
    const uniqueLocations = [...new Set(locations)];
    const locationPattern = uniqueLocations.slice(0, 10);

    return {
      total: locations.length,
      unique: uniqueLocations.length,
      samples: locationPattern,
      format: locationPattern[0] ? getLocationFormat(locationPattern[0]) : 'ไม่ทราบ'
    };
  };

  const getLocationFormat = (location: string) => {
    if (/^[A-Z]\d+\/\d+$/.test(location)) return 'Letter+Number/Number (เช่น A1/1)';
    if (/^[A-Z]\d+$/.test(location)) return 'Letter+Number (เช่น A1)';
    return 'รูปแบบอื่น';
  };

  // Analyze movement types
  const analyzeMovements = () => {
    const movementTypes = inventoryMovements.map(m => m.movement_type).filter(Boolean);
    const uniqueTypes = [...new Set(movementTypes)];

    return {
      total: movementTypes.length,
      types: uniqueTypes,
      typeCounts: uniqueTypes.map(type => ({
        type,
        count: movementTypes.filter(t => t === type).length
      }))
    };
  };

  const locationAnalysis = analyzeLocations();
  const movementAnalysis = analyzeMovements();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Debug & Analysis
          </h1>
          <p className="text-gray-600">ตรวจสอบข้อมูลปัจจุบันใน Database เพื่อออกแบบโครงสร้างใหม่</p>
        </div>
        <Button onClick={fetchAllData} disabled={loading}>
          {loading ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
        </Button>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">สรุปภาพรวม</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Items</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  การวิเคราะห์ Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">จำนวนรายการ</p>
                    <p className="text-2xl font-bold text-blue-600">{locationAnalysis.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location ที่แตกต่าง</p>
                    <p className="text-2xl font-bold text-green-600">{locationAnalysis.unique}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">รูปแบบ Location:</p>
                  <Badge variant="outline">{locationAnalysis.format}</Badge>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">ตัวอย่าง Locations:</p>
                  <div className="flex flex-wrap gap-1">
                    {locationAnalysis.samples.slice(0, 5).map(loc => (
                      <Badge key={loc} variant="secondary" className="text-xs">
                        {loc}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Movement Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  การวิเคราะห์ Movements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">จำนวนการเคลื่อนไหว</p>
                  <p className="text-2xl font-bold text-purple-600">{movementAnalysis.total}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">ประเภทการเคลื่อนไหว:</p>
                  <div className="space-y-1">
                    {movementAnalysis.typeCounts.map(({ type, count }) => (
                      <div key={type} className="flex justify-between items-center">
                        <Badge variant="outline" className="text-xs">{type}</Badge>
                        <span className="text-sm text-gray-600">{count} ครั้ง</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Text */}
          <Card>
            <CardHeader>
              <CardTitle>สรุปสำหรับการออกแบบ Multi-Warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>📍 Location Format ปัจจุบัน:</strong> {locationAnalysis.format}</p>
                <p><strong>📦 จำนวน Inventory Items:</strong> {inventoryItems.length} รายการ (ตัวอย่าง)</p>
                <p><strong>🔄 ประเภท Movements:</strong> {movementAnalysis.types.join(', ')}</p>
                <p><strong>🏷️ จำนวน Products:</strong> {products.length} ชนิด (ตัวอย่าง)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items (ตัวอย่าง 20 รายการแรก)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {inventoryItems.map((item, index) => (
                    <div key={item.id || index} className="border rounded p-3 text-sm">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div><strong>SKU:</strong> {item.sku}</div>
                        <div><strong>Location:</strong> {item.location}</div>
                        <div><strong>Product:</strong> {item.product_name}</div>
                        <div><strong>Lot:</strong> {item.lot || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Movements (ตัวอย่าง 20 รายการแรก)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {inventoryMovements.map((movement, index) => (
                    <div key={movement.id || index} className="border rounded p-3 text-sm">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div><strong>Type:</strong> {movement.movement_type}</div>
                        <div><strong>From:</strong> {movement.location_from || movement.location_before || '-'}</div>
                        <div><strong>To:</strong> {movement.location_to || movement.location_after || '-'}</div>
                      </div>
                      {movement.notes && (
                        <div className="mt-1 text-gray-600">
                          <strong>Notes:</strong> {movement.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Products (ตัวอย่าง 10 รายการแรก)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {products.map((product, index) => (
                    <div key={product.id || index} className="border rounded p-3 text-sm">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div><strong>SKU:</strong> {product.sku_code}</div>
                        <div><strong>Name:</strong> {product.product_name}</div>
                        <div><strong>Type:</strong> {product.product_type}</div>
                      </div>
                      {product.category && (
                        <div className="mt-1">
                          <strong>Category:</strong> {product.category}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle>Tables ในระบบ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {tablesList.map((table, index) => (
                  <Badge key={index} variant="outline" className="justify-center p-2">
                    <Table className="h-4 w-4 mr-2" />
                    {typeof table === 'string' ? table : table.table_name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}