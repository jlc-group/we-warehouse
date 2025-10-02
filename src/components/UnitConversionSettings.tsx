import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  ArrowRight
} from 'lucide-react';
import { useConversionRates, ConversionRateInput } from '@/hooks/useConversionRates';
import { useProducts } from '@/contexts/ProductsContext';
import { toast } from 'sonner';

export default function UnitConversionSettings() {
  console.log('🎨 UnitConversionSettings: Component rendering...');

  const { products } = useProducts();
  const {
    conversionRates,
    loading,
    error,
    fetchConversionRates,
    createConversionRate,
    updateConversionRate,
    deleteConversionRate
  } = useConversionRates();

  console.log('🎨 UnitConversionSettings: State loaded', {
    productsCount: products.length,
    conversionRatesCount: conversionRates.length,
    loading,
    error
  });

  // Debug: Show sample data with details
  if (conversionRates.length > 0) {
    console.log('🔍 Sample conversion rate data:', conversionRates[0]);
    console.log('🔍 First conversion rate details:', {
      sku: conversionRates[0]?.sku,
      product_name: conversionRates[0]?.product_name,
      product_id: conversionRates[0]?.product_id,
      unit_level1_name: conversionRates[0]?.unit_level1_name,
      unit_level1_rate: conversionRates[0]?.unit_level1_rate
    });
    console.log('🔍 First 3 conversion rates:', conversionRates.slice(0, 3));
  }
  if (products.length > 0) {
    console.log('🔍 Sample product data:', products[0]);
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'FG' | 'PK'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedConversionRate, setSelectedConversionRate] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // แสดง 50 รายการต่อหน้า
  const [formData, setFormData] = useState<ConversionRateInput>({
    sku: '',
    product_name: '',
    unit_level1_name: 'ลัง',
    unit_level1_rate: 1,
    unit_level2_name: 'กล่อง',
    unit_level2_rate: 1,
    unit_level3_name: 'ชิ้น'
  });

  // Show all products (not just those without conversion rates)
  const availableProducts = useMemo(() => {
    console.log('🔍 UnitConversionSettings - All products:', products.length);
    console.table(products.map(p => ({ id: p.id, sku: p.sku_code, name: p.product_name })));
    console.log('🔍 UnitConversionSettings - Existing conversion rates:', conversionRates.length);
    console.table(conversionRates.map(c => ({ sku: c.sku, name: c.product_name, level1: c.unit_level1_name, rate1: c.unit_level1_rate })));
    // Return all products instead of filtering
    return products;
  }, [products, conversionRates]);

  // Filter conversion rates by search term and product type
  const filteredConversionRates = useMemo(() => {
    console.log('🔍 useMemo filteredConversionRates triggered', {
      conversionRatesLength: conversionRates.length,
      searchTerm,
      productTypeFilter,
      hasConversionRates: conversionRates.length > 0
    });

    let filtered = conversionRates;

    // Filter by product type
    if (productTypeFilter !== 'all') {
      filtered = filtered.filter(rate => rate.product_type === productTypeFilter);
      console.log(`✅ After product type filter (${productTypeFilter}):`, filtered.length, 'records');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(rate =>
        rate.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rate.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('✅ After search filter:', filtered.length, 'records');
    }

    console.log('✅ Final filtered results:', filtered.length, 'records');
    return filtered;
  }, [conversionRates, searchTerm, productTypeFilter]);

  // Paginate filtered results
  const paginatedConversionRates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredConversionRates.slice(startIndex, endIndex);

    console.log('📄 Pagination:', {
      currentPage,
      itemsPerPage,
      totalItems: filteredConversionRates.length,
      startIndex,
      endIndex,
      paginatedCount: paginated.length
    });

    return paginated;
  }, [filteredConversionRates, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredConversionRates.length / itemsPerPage);

  // Reset to page 1 when search term or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, productTypeFilter]);

  const handleAdd = async () => {
    try {
      if (!formData.sku || !formData.product_name) {
        toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      await createConversionRate(formData);
      await fetchConversionRates();
      setIsAddDialogOpen(false);
      setFormData({
        sku: '',
        product_name: '',
        unit_level1_name: 'ลัง',
        unit_level1_rate: 1,
        unit_level2_name: 'กล่อง',
        unit_level2_rate: 1,
        unit_level3_name: 'ชิ้น'
      });
      toast.success('เพิ่มการตั้งค่าการแปลงหน่วยเรียบร้อย');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
    }
  };

  const handleEdit = (conversionRate: any) => {
    setSelectedConversionRate(conversionRate);
    setFormData({
      sku: conversionRate.sku,
      product_name: conversionRate.product_name,
      unit_level1_name: conversionRate.unit_level1_name || 'ลัง',
      unit_level1_rate: conversionRate.unit_level1_rate || 1,
      unit_level2_name: conversionRate.unit_level2_name || 'กล่อง',
      unit_level2_rate: conversionRate.unit_level2_rate || 1,
      unit_level3_name: conversionRate.unit_level3_name || 'ชิ้น'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    try {
      if (!selectedConversionRate) return;

      await updateConversionRate(selectedConversionRate.sku, formData);
      await fetchConversionRates();
      setIsEditDialogOpen(false);
      setSelectedConversionRate(null);
      toast.success('อัปเดตการตั้งค่าการแปลงหน่วยเรียบร้อย');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  };

  const handleDelete = async (sku: string) => {
    try {
      await deleteConversionRate(sku);
      await fetchConversionRates();
      toast.success('ลบการตั้งค่าการแปลงหน่วยเรียบร้อย');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        sku: product.sku_code,
        product_name: product.product_name
      }));
    }
  };

  // Get products without conversion rates
  const productsWithoutConversion = useMemo(() => {
    const conversionSkus = new Set(conversionRates.map(c => c.sku));
    return availableProducts.filter(p => !conversionSkus.has(p.sku_code));
  }, [availableProducts, conversionRates]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            การตั้งค่าการแปลงหน่วย
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <div className="text-muted-foreground">กำลังโหลดข้อมูลการแปลงหน่วย...</div>
              <div className="text-xs text-muted-foreground mt-1">กรุณาตรวจสอบ Console สำหรับข้อมูลเพิ่มเติม</div>
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
          <CardTitle>
            การตั้งค่าการแปลงหน่วย
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-red-500 font-medium">เกิดข้อผิดพลาด</div>
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border">
              {error}
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  console.log('🔄 Manually retrying fetchConversionRates...');
                  fetchConversionRates();
                }}
                variant="outline"
                size="sm"
              >
                ลองใหม่
              </Button>
              <div className="text-xs text-muted-foreground">
                หากปัญหายังคงอยู่ กรุณาตรวจสอบ Console (F12) สำหรับข้อมูลเพิ่มเติม
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Final render state logging
  console.log('🎨🎨🎨 FINAL RENDER STATE 🎨🎨🎨', {
    conversionRatesLength: conversionRates.length,
    filteredConversionRatesLength: filteredConversionRates.length,
    searchTerm,
    loading,
    error,
    firstThreeFiltered: filteredConversionRates.slice(0, 3).map(r => ({
      sku: r.sku,
      name: r.product_name,
      level1: r.unit_level1_name,
      rate1: r.unit_level1_rate
    }))
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          การตั้งค่าการแปลงหน่วย
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">
              {filteredConversionRates.length} รายการ
            </Badge>
            {conversionRates.length === 0 && (
              <Badge variant="destructive" className="text-xs">
                ไม่มีข้อมูล
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* DEBUG INFO CARD - REMOVE AFTER FIXING */}
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 space-y-2">
          <div className="text-sm font-bold text-blue-900">🔍 DEBUG INFORMATION</div>
          <div className="text-xs text-blue-800 font-mono space-y-1">
            <div>✅ Total conversion rates in state: {conversionRates.length}</div>
            <div>✅ Filtered conversion rates: {filteredConversionRates.length}</div>
            <div>✅ Paginated (showing now): {paginatedConversionRates.length}</div>
            <div>✅ Current page: {currentPage} / {totalPages}</div>
            <div>✅ Items per page: {itemsPerPage}</div>
            <div>✅ Search term: "{searchTerm}"</div>
            <div>✅ Loading: {loading ? 'YES' : 'NO'}</div>
            <div>✅ Error: {error || 'NONE'}</div>
            {paginatedConversionRates.length > 0 && (
              <div className="mt-2 bg-blue-100 p-2 rounded">
                <div className="font-bold">First 3 items on this page:</div>
                {paginatedConversionRates.slice(0, 3).map((r, i) => (
                  <div key={i} className="ml-2">
                    {i + 1}. SKU: {r.sku} | Name: {r.product_name} | Type: {r.product_type || 'N/A'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info and Missing Conversions Alert */}
        {productsWithoutConversion.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
            <div className="text-sm font-medium text-yellow-900">⚠️ พบสินค้าที่ยังไม่มีการตั้งค่าการแปลงหน่วย:</div>
            <div className="text-xs text-yellow-700">
              มี <span className="font-bold">{productsWithoutConversion.length}</span> สินค้าที่ยังไม่ได้ตั้งค่าการแปลงหน่วย:
              <div className="mt-2 space-y-1">
                {productsWithoutConversion.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-yellow-100 px-2 py-1 rounded">
                    <span className="font-mono text-xs">{p.sku_code}</span>
                    <span className="text-xs">{p.product_name}</span>
                  </div>
                ))}
                {productsWithoutConversion.length > 5 && (
                  <div className="text-xs text-yellow-600">...และอีก {productsWithoutConversion.length - 5} รายการ</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div className="text-sm font-medium text-blue-900">🔍 ข้อมูล Debug:</div>
          <div className="grid grid-cols-3 gap-2 text-xs text-blue-700">
            <div>สินค้าทั้งหมด: <span className="font-bold">{products.length}</span></div>
            <div>มีการแปลงหน่วย: <span className="font-bold text-green-600">{conversionRates.length}</span></div>
            <div>ยังไม่มีการแปลง: <span className="font-bold text-red-600">{productsWithoutConversion.length}</span></div>
          </div>
          <Button
            onClick={() => {
              console.log('=== DEBUG: Manual Check ===');
              console.log('Products:', products);
              console.log('Conversion Rates:', conversionRates);
              console.log('Products without conversion:', productsWithoutConversion);
              fetchConversionRates();
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            🔄 รีเฟรชและแสดงข้อมูลใน Console
          </Button>
        </div>

        {/* Search, Filter and Add Button */}
        <div className="space-y-3">
          {/* Product Type Filter Buttons */}
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

          {/* Search and Add */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="ค้นหารหัสสินค้าหรือชื่อสินค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                เพิ่มการตั้งค่า
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>เพิ่มการตั้งค่าการแปลงหน่วย</DialogTitle>
                <DialogDescription>
                  กำหนดอัตราการแปลงหน่วยสำหรับสินค้า
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>เลือกสินค้า</Label>
                  <Select
                    value={availableProducts.find(p => p.sku_code === formData.sku)?.id || ''}
                    onValueChange={handleProductSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสินค้า" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <span>{product.product_name} ({product.sku_code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.sku && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>หน่วยระดับ 1</Label>
                        <Input
                          value={formData.unit_level1_name || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_level1_name: e.target.value }))}
                          placeholder="เช่น ลัง"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>อัตราแปลง (ต่อหน่วยฐาน)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.unit_level1_rate || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_level1_rate: parseInt(e.target.value) || 1 }))}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>หน่วยระดับ 2</Label>
                        <Input
                          value={formData.unit_level2_name || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_level2_name: e.target.value }))}
                          placeholder="เช่น กล่อง"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>อัตราแปลง (ต่อหน่วยฐาน)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.unit_level2_rate || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_level2_rate: parseInt(e.target.value) || 1 }))}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>หน่วยฐาน (ระดับ 3)</Label>
                      <Input
                        value={formData.unit_level3_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit_level3_name: e.target.value }))}
                        placeholder="เช่น ชิ้น"
                      />
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">ตัวอย่างการแปลงหน่วย</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <span>1 {formData.unit_level1_name}</span>
→
                          <span>{formData.unit_level1_rate} {formData.unit_level3_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>1 {formData.unit_level2_name}</span>
→
                          <span>{formData.unit_level2_rate} {formData.unit_level3_name}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleAdd} disabled={!formData.sku}>
                  เพิ่มการตั้งค่า
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Conversion Rates Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>สินค้า</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>หน่วยระดับ 1</TableHead>
                <TableHead>หน่วยระดับ 2</TableHead>
                <TableHead>หน่วยฐาน</TableHead>
                <TableHead className="text-center">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                console.log('🎨 RENDER: About to render table body', {
                  filteredLength: filteredConversionRates.length,
                  paginatedLength: paginatedConversionRates.length,
                  currentPage,
                  totalPages,
                  willShowEmptyState: paginatedConversionRates.length === 0
                });
                return null;
              })()}
              {paginatedConversionRates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="space-y-2">
                      <div className="text-muted-foreground">
                        {conversionRates.length === 0
                          ? 'ยังไม่มีการตั้งค่าการแปลงหน่วย'
                          : 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'
                        }
                      </div>
                      {conversionRates.length === 0 && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>🔍 Debug: กำลังตรวจสอบการเชื่อมต่อฐานข้อมูล...</div>
                          <div>📋 ตรวจสอบ Console (F12) สำหรับข้อมูลเพิ่มเติม</div>
                          <Button
                            onClick={() => {
                              console.log('🔄 Debug: Manual refresh triggered');
                              console.log('🔍 Current state:', {
                                loading,
                                error,
                                conversionRatesCount: conversionRates.length,
                                productsCount: products.length
                              });
                              fetchConversionRates();
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            ลองโหลดใหม่
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedConversionRates.map((rate) => (
                  <TableRow key={rate.sku}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{rate.product_name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          SKU: {rate.sku}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {rate.product_type || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rate.unit_level1_name}</div>
                        <div className="text-sm text-muted-foreground">
                          = {rate.unit_level1_rate} {rate.unit_level3_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rate.unit_level2_name}</div>
                        <div className="text-sm text-muted-foreground">
                          = {rate.unit_level2_rate} {rate.unit_level3_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{rate.unit_level3_name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rate)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                              <AlertDialogDescription>
                                คุณต้องการลบการตั้งค่าการแปลงหน่วยสำหรับสินค้า "{rate.product_name}" หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(rate.sku)}>
                                ลบ
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              แสดง {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredConversionRates.length)} จาก {filteredConversionRates.length} รายการ
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← ก่อนหน้า
              </Button>
              <span className="text-sm">
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                ถัดไป →
              </Button>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <div>ทั้งหมด {conversionRates.length} รายการ | กรองแล้ว {filteredConversionRates.length} รายการ</div>
          <div className="text-xs text-orange-600 font-mono">
            DEBUG: total={conversionRates.length}, filtered={filteredConversionRates.length}, page={currentPage}/{totalPages}, showing={paginatedConversionRates.length}
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>แก้ไขการตั้งค่าการแปลงหน่วย</DialogTitle>
              <DialogDescription>
                แก้ไขอัตราการแปลงหน่วยสำหรับสินค้า "{selectedConversionRate?.product_name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>หน่วยระดับ 1</Label>
                  <Input
                    value={formData.unit_level1_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level1_name: e.target.value }))}
                    placeholder="เช่น ลัง"
                  />
                </div>
                <div className="space-y-2">
                  <Label>อัตราแปลง (ต่อหน่วยฐาน)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.unit_level1_rate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level1_rate: parseInt(e.target.value) || 1 }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>หน่วยระดับ 2</Label>
                  <Input
                    value={formData.unit_level2_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level2_name: e.target.value }))}
                    placeholder="เช่น กล่อง"
                  />
                </div>
                <div className="space-y-2">
                  <Label>อัตราแปลง (ต่อหน่วยฐาน)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.unit_level2_rate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level2_rate: parseInt(e.target.value) || 1 }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>หน่วยฐาน (ระดับ 3)</Label>
                <Input
                  value={formData.unit_level3_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_level3_name: e.target.value }))}
                  placeholder="เช่น ชิ้น"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">ตัวอย่างการแปลงหน่วย</h4>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span>1 {formData.unit_level1_name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{formData.unit_level1_rate} {formData.unit_level3_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>1 {formData.unit_level2_name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{formData.unit_level2_rate} {formData.unit_level3_name}</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleUpdate}>
                บันทึกการแก้ไข
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}