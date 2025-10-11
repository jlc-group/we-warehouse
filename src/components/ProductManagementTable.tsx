import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Settings, Search, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { useProducts } from '@/contexts/ProductsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

export const ProductManagementTable = () => {
  const { products, loading, error, refetch } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'FG' | 'PK'>('all');

  // Edit modal states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    sku_code: '',
    product_name: '',
    product_type: 'FG' as 'FG' | 'PK',
    category: '',
    brand: '',
    description: ''
  });

  // Delete modal states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by product type
    if (productTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.product_type === productTypeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [products, searchTerm, productTypeFilter]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      sku_code: product.sku_code,
      product_name: product.product_name,
      product_type: product.product_type as 'FG' | 'PK',
      category: product.category || '',
      brand: product.brand || '',
      description: product.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({
          product_name: editForm.product_name,
          product_type: editForm.product_type,
          category: editForm.category || null,
          brand: editForm.brand || null,
          description: editForm.description || null
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast.success('อัปเดตข้อมูลสินค้าสำเร็จ');
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      refetch();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  };

  const handleDelete = (product: Product) => {
    setDeletingProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;

    try {
      // Check if product is used in inventory
      const { data: inventoryItems, error: checkError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('sku', deletingProduct.sku_code)
        .limit(1);

      if (checkError) throw checkError;

      if (inventoryItems && inventoryItems.length > 0) {
        toast.error('ไม่สามารถลบสินค้าได้ เนื่องจากมีข้อมูลในคลังสินค้า');
        setIsDeleteDialogOpen(false);
        return;
      }

      // Delete product
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', deletingProduct.id);

      if (deleteError) throw deleteError;

      toast.success('ลบข้อมูลสินค้าสำเร็จ');
      setIsDeleteDialogOpen(false);
      setDeletingProduct(null);
      refetch();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            จัดการข้อมูลสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <div className="text-muted-foreground">กำลังโหลดข้อมูล...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            จัดการข้อมูลสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            เกิดข้อผิดพลาด: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              จัดการข้อมูลสินค้า
            </div>
            <Badge variant="outline">{filteredProducts.length} รายการ</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="space-y-3">
            {/* Product Type Filter */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setProductTypeFilter('all')}
                className={`transition-all ${
                  productTypeFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'hover:bg-accent'
                }`}
              >
                ✨ ทั้งหมด
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setProductTypeFilter('FG')}
                className={`transition-all ${
                  productTypeFilter === 'FG'
                    ? 'bg-green-600 text-white border-green-600 shadow-md hover:bg-green-700'
                    : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                }`}
              >
                🏭 FG - สินค้าสำเร็จรูป
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setProductTypeFilter('PK')}
                className={`transition-all ${
                  productTypeFilter === 'PK'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                📦 PK - วัสดุบรรจุภัณฑ์
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหารหัสสินค้าหรือชื่อสินค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสสินค้า (SKU)</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead>แบรนด์</TableHead>
                  <TableHead className="text-center">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      ไม่พบข้อมูลสินค้า
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.sku_code}</TableCell>
                      <TableCell>{product.product_name}</TableCell>
                      <TableCell>
                        {product.product_type === 'FG' ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            🏭 FG
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            📦 PK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.category || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.brand || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(product)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(product)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              แก้ไขข้อมูลสินค้า
            </DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลสินค้าในระบบ (ไม่สามารถแก้ไข SKU ได้)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>รหัสสินค้า (SKU) *</Label>
              <Input
                value={editForm.sku_code}
                disabled
                className="bg-muted font-mono"
              />
              <p className="text-xs text-muted-foreground">
                ไม่สามารถแก้ไขรหัสสินค้าได้ เนื่องจากมีการใช้งานในระบบ
              </p>
            </div>

            <div className="space-y-2">
              <Label>ชื่อสินค้า *</Label>
              <Input
                value={editForm.product_name}
                onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
                placeholder="กรอกชื่อสินค้า"
              />
            </div>

            <div className="space-y-2">
              <Label>ประเภทสินค้า *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={editForm.product_type === 'FG' ? 'default' : 'outline'}
                  className={editForm.product_type === 'FG' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setEditForm({ ...editForm, product_type: 'FG' })}
                >
                  🏭 FG - สินค้าสำเร็จรูป
                </Button>
                <Button
                  type="button"
                  variant={editForm.product_type === 'PK' ? 'default' : 'outline'}
                  className={editForm.product_type === 'PK' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  onClick={() => setEditForm({ ...editForm, product_type: 'PK' })}
                >
                  📦 PK - วัสดุบรรจุภัณฑ์
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>หมวดหมู่</Label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  placeholder="เช่น เซรั่ม, ครีม"
                />
              </div>

              <div className="space-y-2">
                <Label>แบรนด์</Label>
                <Input
                  value={editForm.brand}
                  onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                  placeholder="เช่น Chulaherb"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleUpdateProduct} disabled={!editForm.product_name}>
              บันทึกการแก้ไข
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ยืนยันการลบสินค้า
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า <strong>{deletingProduct?.product_name}</strong> (SKU: <code className="font-mono">{deletingProduct?.sku_code}</code>)?
              <br /><br />
              <span className="text-destructive font-medium">
                การดำเนินการนี้ไม่สามารถย้อนกลับได้ และจะลบข้อมูลอัตราแปลงหน่วยที่เกี่ยวข้องด้วย
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ยืนยันการลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
