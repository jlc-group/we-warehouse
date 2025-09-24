import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Table, BarChart3, Package, ArrowRight } from 'lucide-react';
import { DatabaseService, type InventoryAnalysis, type MovementAnalysis } from '@/services/databaseService';

export function DatabaseDebug() {
  const [analysisData, setAnalysisData] = useState<{
    inventoryItems: any[];
    inventoryMovements: any[];
    products: any[];
    tablesList: string[];
    locationAnalysis: InventoryAnalysis;
    movementAnalysis: MovementAnalysis;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // All fetch functions are now replaced by a single comprehensive fetch




  const fetchAllData = async () => {
    setLoading(true);
    try {
      const result = await DatabaseService.getAnalysisData();

      if (result.success && result.data) {
        setAnalysisData(result.data);
        console.log('📦 Database Analysis Data:', result.data);
      } else {
        console.error('Failed to fetch analysis data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching all data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Analysis is now done in the service layer



  const locationAnalysis = analysisData?.locationAnalysis || {
    total: 0,
    unique: 0,
    samples: [],
    format: 'ไม่ทราบ'
  };
  const movementAnalysis = analysisData?.movementAnalysis || {
    total: 0,
    types: [],
    typeCounts: []
  };

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
                <p><strong>📦 จำนวน Inventory Items:</strong> {analysisData?.inventoryItems.length || 0} รายการ (ตัวอย่าง)</p>
                <p><strong>🔄 ประเภท Movements:</strong> {movementAnalysis.types.join(', ')}</p>
                <p><strong>🏷️ จำนวน Products:</strong> {analysisData?.products.length || 0} ชนิด (ตัวอย่าง)</p>
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
                  {(analysisData?.inventoryItems || []).map((item, index) => (
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
                  {(analysisData?.inventoryMovements || []).map((movement, index) => (
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
                  {(analysisData?.products || []).map((product, index) => (
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
                {(analysisData?.tablesList || []).map((table, index) => (
                  <Badge key={index} variant="outline" className="justify-center p-2">
                    <Table className="h-4 w-4 mr-2" />
                    {table}
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