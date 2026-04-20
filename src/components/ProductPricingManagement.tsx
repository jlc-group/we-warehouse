import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { localDb } from '@/integrations/local/client';
import { Search, DollarSign, Edit, Save, X, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Product {
  id: string;
  sku_code: string;
  product_name: string;
  product_type: string;
  unit_cost: number | null;
  category: string | null;
  is_active: boolean;
}

interface ExportWithoutPrice {
  id: string;
  product_name: string;
  product_code: string;
  customer_name: string;
  quantity_exported: number;
  created_at: string;
  unit_price: number | null;
  total_value: number | null;
}

export const ProductPricingManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [exportsWithoutPrice, setExportsWithoutPrice] = useState<ExportWithoutPrice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadProducts(), loadExportsWithoutPrice()]);
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await localDb
        .from('products')
        .select('id, sku_code, product_name, product_type, unit_cost, category, is_active')
        .order('product_name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลสินค้าได้',
        variant: 'destructive',
      });
    }
  };

  const loadExportsWithoutPrice = async () => {
    try {
      const { data, error } = await localDb
        .from('customer_exports')
        .select('id, product_name, product_code, customer_name, quantity_exported, created_at, unit_price, total_value')
        .is('unit_price', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setExportsWithoutPrice(data || []);
    } catch (error) {
      console.error('Error loading exports without price:', error);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;

    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(term) ||
        p.sku_code.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  const stats = useMemo(() => {
    const total = products.length;
    const withPrice = products.filter((p) => p.unit_cost != null && p.unit_cost > 0).length;
    const withoutPrice = total - withPrice;
    const avgPrice = products
      .filter((p) => p.unit_cost != null && p.unit_cost > 0)
      .reduce((sum, p) => sum + (p.unit_cost || 0), 0) / (withPrice || 1);

    return {
      total,
      withPrice,
      withoutPrice,
      avgPrice,
      exportsWithoutPrice: exportsWithoutPrice.length,
    };
  }, [products, exportsWithoutPrice]);

  const handleEditPrice = (product: Product) => {
    setEditingProduct(product);
    setEditPrice(product.unit_cost?.toString() || '');
  };

  const handleSavePrice = async () => {
    if (!editingProduct) return;

    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      toast({
        title: 'ราคาไม่ถูกต้อง',
        description: 'กรุณาระบุราคาเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await localDb
        .from('products')
        .update({ unit_cost: price })
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast({
        title: '✅ บันทึกราคาสำเร็จ',
        description: `อัปเดตราคา ${editingProduct.product_name} เป็น ฿${price.toLocaleString()}`,
      });

      setEditingProduct(null);
      await loadProducts();
    } catch (error) {
      console.error('Error saving price:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกราคาได้',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBackfillPrices = async () => {
    try {
      // Update customer_exports ที่ไม่มีราคาด้วยราคาจาก products
      const { error } = await localDb.rpc('backfill_export_prices');

      if (error) {
        // ถ้าไม่มี function ให้ทำแบบ manual
        const { error: updateError } = await localDb
          .from('customer_exports')
          .update({
            unit_price: localDb.raw('(SELECT unit_cost FROM products WHERE sku_code = customer_exports.product_code)'),
            total_value: localDb.raw('quantity_exported * (SELECT unit_cost FROM products WHERE sku_code = customer_exports.product_code)'),
          })
          .is('unit_price', null);

        if (updateError) throw updateError;
      }

      toast({
        title: '✅ Backfill สำเร็จ',
        description: 'อัปเดตราคาย้อนหลังเรียบร้อยแล้ว',
      });

      await loadExportsWithoutPrice();
    } catch (error) {
      console.error('Error backfilling prices:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตราคาย้อนหลังได้',
        variant: 'destructive',
      });
    }
  };

  const getProductTypeColor = (type: string) => {
    switch (type) {
      case 'FG':
        return 'bg-blue-100 text-blue-800';
      case 'PK':
        return 'bg-purple-100 text-purple-800';
      case 'RM':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">💰 จัดการราคาสินค้า</h2>
        <p className="text-muted-foreground mt-1">
          กำหนดและจัดการราคาต้นทุนสินค้าทั้งหมด
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">สินค้าทั้งหมด</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">มีราคาแล้ว</p>
                <p className="text-2xl font-bold text-green-600">{stats.withPrice}</p>
                <p className="text-xs text-muted-foreground">
                  {((stats.withPrice / stats.total) * 100).toFixed(0)}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ยังไม่มีราคา</p>
                <p className="text-2xl font-bold text-orange-600">{stats.withoutPrice}</p>
                <p className="text-xs text-muted-foreground">
                  {((stats.withoutPrice / stats.total) * 100).toFixed(0)}%
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ราคาเฉลี่ย</p>
                <p className="text-2xl font-bold text-blue-600">
                  ฿{stats.avgPrice.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">รายการสินค้า</TabsTrigger>
          <TabsTrigger value="missing">
            ข้อมูลส่งออกที่ไม่มีราคา
            {stats.exportsWithoutPrice > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.exportsWithoutPrice}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาสินค้า (ชื่อ, SKU, หมวดหมู่)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>รายการสินค้าทั้งหมด ({filteredProducts.length})</CardTitle>
              <CardDescription>
                คลิกแก้ไขเพื่อตั้งราคาสินค้า
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead className="text-right">ราคาต้นทุน</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">
                        {product.sku_code}
                      </TableCell>
                      <TableCell>{product.product_name}</TableCell>
                      <TableCell>
                        <Badge className={getProductTypeColor(product.product_type)}>
                          {product.product_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.unit_cost != null ? (
                          <span className="font-semibold">
                            ฿{product.unit_cost.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-orange-600">ไม่มีราคา</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPrice(product)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          แก้ไข
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่พบสินค้าที่ค้นหา
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ข้อมูลส่งออกที่ไม่มีราคา</CardTitle>
                  <CardDescription>
                    รายการส่งออกที่ยังไม่มีการบันทึกราคา
                  </CardDescription>
                </div>
                <Button onClick={handleBackfillPrices} disabled={stats.exportsWithoutPrice === 0}>
                  <Save className="h-4 w-4 mr-2" />
                  Backfill ราคาทั้งหมด
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {exportsWithoutPrice.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead>สินค้า</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportsWithoutPrice.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>
                          {new Date(exp.created_at).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{exp.product_name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {exp.product_code || '-'}
                        </TableCell>
                        <TableCell>{exp.customer_name}</TableCell>
                        <TableCell className="text-right">
                          {exp.quantity_exported.toLocaleString()} ชิ้น
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-green-600">
                  ✅ ข้อมูลส่งออกทั้งหมดมีราคาครบแล้ว
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Price Dialog */}
      <Dialog open={editingProduct !== null} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขราคาสินค้า</DialogTitle>
            <DialogDescription>
              กำหนดราคาต้นทุนต่อหน่วย (บาท)
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">สินค้า</p>
                <p className="font-semibold">{editingProduct.product_name}</p>
                <p className="text-sm text-muted-foreground">SKU: {editingProduct.sku_code}</p>
              </div>

              <div>
                <Label htmlFor="price">ราคาต้นทุน (บาท)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="0.00"
                  className="mt-2"
                />
              </div>

              {editingProduct.unit_cost != null && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">ราคาเดิม:</p>
                  <p className="font-semibold">฿{editingProduct.unit_cost.toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              ยกเลิก
            </Button>
            <Button onClick={handleSavePrice} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
