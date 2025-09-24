import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterButton } from '@/components/ui/filter-button';
import {
  Settings,
  Save,
  RefreshCw,
  Calculator,
  Package,
  Edit3,
  AlertCircle,
  CheckCircle,
  Info,
  Plus,
  Search
} from 'lucide-react';
import { productHelpers } from '@/utils/productHelpers';
import { useProducts } from '@/contexts/ProductsContext';
import { useConversionRates, conversionRateHelpers } from '@/hooks/useConversionRates';
import type { ConversionRateData, ConversionRateInput } from '@/services/conversionRateService';

interface Product {
  id: string;
  sku_code: string;
  product_name: string;
  product_type: string;
}

interface UnitConversionSettingsProps {
  onClose?: () => void;
  onConversionRateUpdate?: () => void; // Callback when conversion rate is updated
}

export function UnitConversionSettings({ onClose, onConversionRateUpdate }: UnitConversionSettingsProps) {
  const { products: allProducts, isLoading: productsLoading } = useProducts();
  const {
    conversionRates,
    isLoading,
    createConversionRate,
    updateConversionRate,
    syncInventoryItems,
    refetch,
    isCreating,
    isUpdating,
    isSyncing
  } = useConversionRates();

  const [editingItem, setEditingItem] = useState<ConversionRateData | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('');
  const [dialogProductTypeFilter, setDialogProductTypeFilter] = useState<string>('');

  // Refresh ข้อมูลเมื่อมีการเปลี่ยนแปลง
  const handleRefresh = () => {
    refetch();
    if (onConversionRateUpdate) {
      onConversionRateUpdate();
    }
  };

  const handleEditClick = (item: ConversionRateData) => {
    setEditingItem({ ...item });
    setShowEditDialog(true);
  };

  const handleSaveConversion = async () => {
    if (!editingItem) return;

    try {
      // เตรียมข้อมูลสำหรับบันทึก
      const inputData: ConversionRateInput = {
        sku: editingItem.sku,
        product_name: editingItem.product_name,
        unit_level1_name: editingItem.unit_level1_name || 'ลัง',
        unit_level1_rate: editingItem.unit_level1_rate || 1,
        unit_level2_name: editingItem.unit_level2_name || 'กล่อง',
        unit_level2_rate: editingItem.unit_level2_rate || 1,
        unit_level3_name: editingItem.unit_level3_name || 'ชิ้น'
      };

      // ตรวจสอบว่าเป็นการสร้างใหม่หรืออัปเดต
      const existingRate = conversionRates.find(rate => rate.sku === editingItem.sku);
      let success = false;

      if (existingRate) {
        // อัปเดต conversion rate ที่มีอยู่
        success = await updateConversionRate(editingItem.sku, inputData);
      } else {
        // สร้าง conversion rate ใหม่
        success = await createConversionRate(inputData);
      }

      if (success) {
        // ซิงค์ข้อมูลกับ inventory items
        const syncResult = await syncInventoryItems(editingItem.sku, editingItem);

        // ปิด dialogs และ reset state
        setShowEditDialog(false);
        setEditingItem(null);

        // รีเฟรชข้อมูล
        handleRefresh();
      }
    } catch (error) {
      console.error('Error saving conversion rate:', error);
    }
  };


  const handleCreateConversion = async () => {
    const selectedProduct = allProducts.find(p => p.id === selectedProductId);
    if (!selectedProduct) return;

    // Use productHelpers to get display info
    const productDisplayInfo = productHelpers.getProductDisplayInfo(allProducts, selectedProduct.sku_code);

    // Check if conversion rate already exists
    const existingConversion = conversionRates.find(item => item.sku === selectedProduct.sku_code);

    if (existingConversion) {
      // Edit existing conversion with updated product name from database
      setEditingItem({
        ...existingConversion,
        product_name: productDisplayInfo.name || existingConversion.product_name
      });
    } else {
      // Create new conversion with current product name from database
      const newConversion: ConversionRateData = {
        sku: selectedProduct.sku_code,
        product_name: productDisplayInfo.name || selectedProduct.product_name,
        unit_level1_name: 'ลัง',
        unit_level2_name: 'กล่อง',
        unit_level3_name: 'ชิ้น',
        unit_level1_rate: 1,
        unit_level2_rate: 1,
      };
      setEditingItem(newConversion);
    }

    setShowCreateDialog(false);
    setShowEditDialog(true);
    setSelectedProductId('');
  };

  // Calculate conversion preview using helper
  const calculateConversion = (item: ConversionRateData, baseValue: number, fromLevel: 1 | 2 | 3, toLevel: 1 | 2 | 3): string => {
    const result = conversionRateHelpers.calculateConversion(item, baseValue, fromLevel, toLevel);
    return result.toFixed(2);
  };

  const hasValidConversion = (item: ConversionRateData): boolean => {
    return conversionRateHelpers.hasValidConversion(item);
  };

  // Filter conversion data based on search query and product type
  const filteredConversionData = useMemo(() => {
    let filtered = conversionRates;

    // Filter by search query
    if (tableSearchQuery.trim()) {
      const query = tableSearchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.sku.toLowerCase().includes(query) ||
        item.product_name.toLowerCase().includes(query) ||
        item.unit_level1_name?.toLowerCase().includes(query) ||
        item.unit_level2_name?.toLowerCase().includes(query) ||
        item.unit_level3_name?.toLowerCase().includes(query)
      );
    }

    // Filter by product type
    if (productTypeFilter) {
      filtered = filtered.filter(item => {
        const product = allProducts.find(p => p.sku_code === item.sku);
        return product?.product_type === productTypeFilter;
      });
    }

    return filtered;
  }, [conversionRates, tableSearchQuery, productTypeFilter, allProducts]);

  if (isLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">ตั้งค่าอัตราแปลงหน่วยสินค้า</h1>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            <Package className="h-4 w-4 mr-1" />
            {tableSearchQuery ? `${filteredConversionData.length}/${conversionRates.length}` : conversionRates.length} SKU
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
            disabled={isCreating}
          >
            <Plus className="h-4 w-4" />
            สร้าง SKU ใหม่
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              ปิด
            </Button>
          )}
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          ตั้งค่าอัตราแปลงหน่วยสำหรับแต่ละ SKU เพื่อให้ระบบคำนวณการแปลงหน่วยได้อย่างถูกต้อง
          <br />
          <strong>หน่วยระดับ 1 → หน่วยระดับ 2:</strong> ใส่จำนวนที่ 1 หน่วยระดับ 1 เท่ากับกี่หน่วยระดับ 2
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            รายการตั้งค่าแปลงหน่วย
          </CardTitle>

          {/* Search box and filters for table */}
          <div className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ค้นหา SKU, ชื่อสินค้า, หน่วย..."
                  value={tableSearchQuery}
                  onChange={(e) => setTableSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Product type filter buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">ประเภทสินค้า:</span>
                <FilterButton
                  isActive={productTypeFilter === ''}
                  onClick={() => setProductTypeFilter('')}
                  variant="all"
                >
                  ทั้งหมด
                </FilterButton>
                <FilterButton
                  isActive={productTypeFilter === 'FG'}
                  onClick={() => setProductTypeFilter('FG')}
                  variant="fg"
                >
                  FG
                </FilterButton>
                <FilterButton
                  isActive={productTypeFilter === 'PK'}
                  onClick={() => setProductTypeFilter('PK')}
                  variant="pk"
                >
                  PK
                </FilterButton>
              </div>
            </div>

            {(tableSearchQuery || productTypeFilter) && (
              <p className="text-sm text-gray-500">
                พบ {filteredConversionData.length} รายการ
                {tableSearchQuery && ` จากการค้นหา "${tableSearchQuery}"`}
                {productTypeFilter && ` ประเภท ${productTypeFilter}`}
                {(tableSearchQuery || productTypeFilter) && ` จากทั้งหมด ${conversionRates.length} รายการ`}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>หน่วยระดับ 1</TableHead>
                  <TableHead>หน่วยระดับ 2</TableHead>
                  <TableHead>หน่วยระดับ 3</TableHead>
                  <TableHead>อัตราแปลง 1→2</TableHead>
                  <TableHead>อัตราแปลง 2→3</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversionData.map((item) => {
                  const product = allProducts.find(p => p.sku_code === item.sku);
                  return (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                      <TableCell className="max-w-xs truncate" title={item.product_name}>
                        {item.product_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            product?.product_type === 'FG'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : product?.product_type === 'PK'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : ''
                          }
                        >
                          {product?.product_type || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.unit_level1_name || 'ไม่ได้ตั้งค่า'}</Badge>
                      </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.unit_level2_name || 'ไม่ได้ตั้งค่า'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.unit_level3_name || 'ไม่ได้ตั้งค่า'}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.unit_level1_rate ? (
                        <span className="font-medium">1 : {item.unit_level1_rate}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.unit_level2_rate ? (
                        <span className="font-medium">1 : {item.unit_level2_rate}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasValidConversion(item) ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          พร้อมใช้งาน
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          ยังไม่ได้ตั้งค่า
                        </Badge>
                      )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(item)}
                          className="flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          แก้ไข
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredConversionData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      {tableSearchQuery
                        ? `ไม่พบรายการที่ตรงกับ "${tableSearchQuery}"`
                        : 'ยังไม่มีการตั้งค่าแปลงหน่วย'
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไขการตั้งค่าแปลงหน่วย</DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-6 py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">ข้อมูลสินค้า</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">SKU:</span>
                    <span className="font-mono font-medium ml-2">{editingItem.sku}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ชื่อสินค้า:</span>
                    <span className="ml-2">{editingItem.product_name}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">ชื่อหน่วย</h3>

                  <div className="space-y-2">
                    <Label htmlFor="unit1">หน่วยระดับ 1 (หน่วยใหญ่สุด)</Label>
                    <Input
                      id="unit1"
                      placeholder="เช่น กล่อง, แพ็ค"
                      value={editingItem.unit_level1_name || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level1_name: e.target.value } : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit2">หน่วยระดับ 2 (หน่วยกลาง)</Label>
                    <Input
                      id="unit2"
                      placeholder="เช่น ชิ้น, หลอด"
                      value={editingItem.unit_level2_name || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level2_name: e.target.value } : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit3">หน่วยระดับ 3 (หน่วยเล็กสุด)</Label>
                    <Input
                      id="unit3"
                      placeholder="เช่น กรัม, มิลลิลิตร"
                      value={editingItem.unit_level3_name || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level3_name: e.target.value } : null)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">อัตราแปลง</h3>

                  <div className="space-y-2">
                    <Label htmlFor="rate1">
                      1 {editingItem.unit_level1_name || 'หน่วยระดับ 1'} = ? {editingItem.unit_level2_name || 'หน่วยระดับ 2'}
                    </Label>
                    <Input
                      id="rate1"
                      type="number"
                      step="0.01"
                      placeholder="เช่น 12 (1 กล่อง = 12 ชิ้น)"
                      value={editingItem.unit_level1_rate || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level1_rate: parseFloat(e.target.value) || null } : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate2">
                      1 {editingItem.unit_level2_name || 'หน่วยระดับ 2'} = ? {editingItem.unit_level3_name || 'หน่วยระดับ 3'}
                    </Label>
                    <Input
                      id="rate2"
                      type="number"
                      step="0.01"
                      placeholder="เช่น 50 (1 ชิ้น = 50 กรัม)"
                      value={editingItem.unit_level2_rate || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level2_rate: parseFloat(e.target.value) || null } : null)}
                    />
                  </div>
                </div>
              </div>

              {/* Conversion Preview */}
              {editingItem.unit_level1_name && editingItem.unit_level2_name && editingItem.unit_level1_rate && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    ตัวอย่างการแปลงหน่วย
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-blue-700">1 {editingItem.unit_level1_name}</div>
                      <div className="text-blue-600">= {editingItem.unit_level1_rate} {editingItem.unit_level2_name}</div>
                      {editingItem.unit_level2_rate && (
                        <div className="text-blue-600">= {(editingItem.unit_level1_rate * editingItem.unit_level2_rate).toFixed(2)} {editingItem.unit_level3_name}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-700">5 {editingItem.unit_level1_name}</div>
                      <div className="text-blue-600">= {editingItem.unit_level1_rate * 5} {editingItem.unit_level2_name}</div>
                      {editingItem.unit_level2_rate && (
                        <div className="text-blue-600">= {(editingItem.unit_level1_rate * editingItem.unit_level2_rate * 5).toFixed(2)} {editingItem.unit_level3_name}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-700">10 {editingItem.unit_level1_name}</div>
                      <div className="text-blue-600">= {editingItem.unit_level1_rate * 10} {editingItem.unit_level2_name}</div>
                      {editingItem.unit_level2_rate && (
                        <div className="text-blue-600">= {(editingItem.unit_level1_rate * editingItem.unit_level2_rate * 10).toFixed(2)} {editingItem.unit_level3_name}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingItem(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleSaveConversion}
                  disabled={isUpdating || isCreating || !editingItem.unit_level1_name || !editingItem.unit_level2_name || !editingItem.unit_level1_rate}
                >
                  {(isUpdating || isCreating) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      บันทึก
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New SKU Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>เลือก SKU จากสินค้าในระบบ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                เลือกสินค้าจากรายการด้านล่างเพื่อสร้างการตั้งค่าแปลงหน่วยใหม่ หรือแก้ไขการตั้งค่าที่มีอยู่แล้ว
                <br />
                ระบบจะดึงข้อมูล SKU และชื่อสินค้าจากฐานข้อมูลสินค้าโดยตรง
                <br />
                <strong>🔹 สินค้าที่มี badge "มีการตั้งค่าแล้ว" จะเป็นการแก้ไขค่าเดิม</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-search">ค้นหาสินค้า</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="product-search"
                    placeholder="ค้นหาด้วย SKU หรือชื่อสินค้า..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Product type filter for create dialog */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">ประเภทสินค้า:</span>
                <FilterButton
                  isActive={dialogProductTypeFilter === ''}
                  onClick={() => setDialogProductTypeFilter('')}
                  variant="all"
                >
                  ทั้งหมด
                </FilterButton>
                <FilterButton
                  isActive={dialogProductTypeFilter === 'FG'}
                  onClick={() => setDialogProductTypeFilter('FG')}
                  variant="fg"
                >
                  FG
                </FilterButton>
                <FilterButton
                  isActive={dialogProductTypeFilter === 'PK'}
                  onClick={() => setDialogProductTypeFilter('PK')}
                  variant="pk"
                >
                  PK
                </FilterButton>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-select">เลือกสินค้า</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสินค้าที่ต้องการตั้งค่าแปลงหน่วย" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-64">
                    {productHelpers
                      .filterProducts(allProducts, searchQuery, dialogProductTypeFilter || undefined)
                      .map((product) => {
                        const hasConversion = conversionRates.find(c => c.sku === product.sku_code);
                        const displayInfo = productHelpers.getProductDisplayInfo(allProducts, product.sku_code);

                        return (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex flex-col items-start w-full">
                              <div className="flex items-center gap-2 w-full">
                                <span className="font-mono font-medium">{product.sku_code}</span>
                                <Badge variant="outline">{product.product_type}</Badge>
                                {hasConversion && (
                                  <Badge variant="secondary" className="text-xs">
                                    มีการตั้งค่าแล้ว
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-gray-600 truncate max-w-xs">
                                {displayInfo.name}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {selectedProductId && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">สินค้าที่เลือก</h4>
                {(() => {
                  const selectedProduct = allProducts.find(p => p.id === selectedProductId);
                  return selectedProduct ? (
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <span className="text-blue-600">SKU:</span>
                        <span className="font-mono font-medium ml-2">{selectedProduct.sku_code}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">ชื่อสินค้า:</span>
                        <span className="ml-2">{selectedProduct.product_name}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">ประเภท:</span>
                        <span className="ml-2">{selectedProduct.product_type}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setSelectedProductId('');
                  setSearchQuery('');
                  setDialogProductTypeFilter('');
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleCreateConversion}
                disabled={!selectedProductId}
              >
                <Plus className="h-4 w-4 mr-1" />
                ดำเนินการ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}