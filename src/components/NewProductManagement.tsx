import { useState, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PackagePlus, Search, Edit, Download, RefreshCw, AlertCircle, Save, X, Check } from 'lucide-react';
import { useProducts } from '@/contexts/ProductsContext';
import { useConversionRates } from '@/hooks/useConversionRates';
import { useProductsWithConversions } from '@/hooks/useProductsWithConversions';
import { useToast } from '@/hooks/use-toast';
import type { ConversionRateData } from '@/types';

interface ConversionRate {
  sku: string;
  product_name: string;
  product_type: 'FG' | 'PK' | 'N/A';
  unit_level1: string;
  unit_level2: string;
  unit_level3: string;
  conversion_rate_1_to_2: string;
  conversion_rate_2_to_3: string;
  status: 'พร้อมใช้งาน' | 'ระงับ';
}

// Sample data for conversion rates
const sampleConversionRates: ConversionRate[] = [
  {
    sku: 'A1-40G',
    product_name: 'จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง',
    product_type: 'N/A',
    unit_level1: 'ลัง',
    unit_level2: 'กล่อง',
    unit_level3: 'ชิ้น',
    conversion_rate_1_to_2: '1 : 30',
    conversion_rate_2_to_3: '1 : 6',
    status: 'พร้อมใช้งาน'
  },
  {
    sku: 'BC-0001-400G',
    product_name: 'ฝาปั๊มขวด ขนาด 400 กรัม',
    product_type: 'PK',
    unit_level1: 'ลัง',
    unit_level2: 'กล่อง',
    unit_level3: 'ชิ้น',
    conversion_rate_1_to_2: '1 : 500',
    conversion_rate_2_to_3: '1 : 100',
    status: 'พร้อมใช้งาน'
  },
  {
    sku: 'BC-JHQ1-M01',
    product_name: 'แบล็คการ์ดวอเตอร์เมลอน อีอี คูชั่น แมต์ 01',
    product_type: 'PK',
    unit_level1: 'ลัง',
    unit_level2: 'กล่อง',
    unit_level3: 'ชิ้น',
    conversion_rate_1_to_2: '1 : 4000',
    conversion_rate_2_to_3: '1 : 100',
    status: 'พร้อมใช้งาน'
  },
  {
    sku: 'BC-JHQ2-M01',
    product_name: 'แบล็คการ์ดวอเตอร์เมลอน อีอี คูชั่น แมต์ 02',
    product_type: 'PK',
    unit_level1: 'ลัง',
    unit_level2: 'กล่อง',
    unit_level3: 'ชิ้น',
    conversion_rate_1_to_2: '1 : 4000',
    conversion_rate_2_to_3: '1 : 100',
    status: 'พร้อมใช้งาน'
  },
  {
    sku: 'BC-K3-30G',
    product_name: 'ฝาขวดกลูต้า-ไฮยา บูสเตอร์ เซรั่ม 30G',
    product_type: 'PK',
    unit_level1: 'ลัง',
    unit_level2: 'กล่อง',
    unit_level3: 'ชิ้น',
    conversion_rate_1_to_2: '1 : 1120',
    conversion_rate_2_to_3: '1 : 100',
    status: 'พร้อมใช้งาน'
  }
];

export const NewProductManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ConversionRateData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { products } = useProducts();
  const {
    conversionRates,
    loading: conversionLoading,
    error: conversionError,
    fetchConversionRates
  } = useConversionRates();
  const {
    products: productsWithConversions,
    loading: productsLoading,
    error: productsError,
    fetchProductsWithConversions,
    getProductsWithoutConversions,
    getProductsWithConversions,
    updateConversionRate,
    deleteConversionRate
  } = useProductsWithConversions();
  const { toast } = useToast();

  console.log('🔍 NewProductManagement: conversionRates:', conversionRates?.length, 'products:', productsWithConversions?.length);

  // Handle inline editing
  const handleEditStart = useCallback((sku: string, conversionData: ConversionRateData) => {
    setEditingRow(sku);
    setEditFormData({
      sku: conversionData.sku,
      product_name: conversionData.product_name,
      product_type: conversionData.product_type,
      unit_level1_name: conversionData.unit_level1_name,
      unit_level1_rate: conversionData.unit_level1_rate,
      unit_level2_name: conversionData.unit_level2_name,
      unit_level2_rate: conversionData.unit_level2_rate,
      unit_level3_name: conversionData.unit_level3_name
    });
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingRow(null);
    setEditFormData({});
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingRow || !editFormData.sku) return;

    setIsSaving(true);
    try {
      const success = await updateConversionRate(editFormData.sku, editFormData);
      if (success) {
        toast({
          title: "บันทึกสำเร็จ",
          description: `อัพเดทอัตราแปลงหน่วยของ ${editFormData.sku} แล้ว`,
        });
        setEditingRow(null);
        setEditFormData({});
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกข้อมูลได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving conversion rate:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editingRow, editFormData, updateConversionRate, toast]);

  const handleDeleteConversion = useCallback(async (sku: string) => {
    if (!confirm(`ต้องการลบอัตราแปลงหน่วยของ ${sku} หรือไม่?`)) return;

    try {
      const success = await deleteConversionRate(sku);
      if (success) {
        toast({
          title: "ลบสำเร็จ",
          description: `ลบอัตราแปลงหน่วยของ ${sku} แล้ว`,
        });
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถลบข้อมูลได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting conversion rate:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลได้",
        variant: "destructive",
      });
    }
  }, [deleteConversionRate, toast]);

  const filteredConversionRates = useMemo(() => {
    if (!conversionRates || conversionRates.length === 0) {
      console.log('⚠️ No conversion rates available, using sample data for demo');
      return sampleConversionRates.filter(item => {
        const matchesSearch = searchTerm === '' ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.unit_level1.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.unit_level2.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.unit_level3.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = selectedType === 'all' || item.product_type === selectedType;
        return matchesSearch && matchesType;
      });
    }

    console.log('✅ Using real conversion rates data:', conversionRates.length, 'items');

    // Transform real data to match interface and include raw data for editing
    const transformedRates = conversionRates.map(rate => ({
      sku: rate.sku,
      product_name: rate.product_name || 'ไม่ระบุ',
      product_type: (rate.product_type || 'N/A') as 'FG' | 'PK' | 'RM' | 'N/A',
      unit_level1: rate.unit_level1_name || 'ลัง',
      unit_level2: rate.unit_level2_name || 'กล่อง',
      unit_level3: rate.unit_level3_name || 'ชิ้น',
      conversion_rate_1_to_2: `1 : ${rate.unit_level1_rate || 144}`,
      conversion_rate_2_to_3: `1 : ${rate.unit_level2_rate || 12}`,
      status: 'พร้อมใช้งาน' as const,
      // Include raw data for editing
      rawData: rate
    }));

    return transformedRates.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit_level1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit_level2.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit_level3.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'all' || item.product_type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [conversionRates, searchTerm, selectedType]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <PackagePlus className="h-6 w-6 text-green-600" />
            จัดการสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="add-product" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="add-product">เพิ่มสินค้า</TabsTrigger>
              <TabsTrigger value="sku-codes">รหัสสินค้า</TabsTrigger>
              <TabsTrigger value="unit-conversion">การแปลงหน่วย</TabsTrigger>
            </TabsList>

            <TabsContent value="add-product" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">เพิ่มสินค้าใหม่</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">รหัสสินค้า (SKU)</label>
                      <Input placeholder="เช่น L3-8G" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">ชื่อสินค้า</label>
                      <Input placeholder="ชื่อสินค้าภาษาไทย" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">ประเภทสินค้า</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FG">FG - สินค้าสำเร็จรูป</SelectItem>
                          <SelectItem value="PK">PK - วัสดุบรรจุ</SelectItem>
                          <SelectItem value="RM">RM - วัตถุดิบ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">หน่วยระดับ 1</label>
                      <Input placeholder="เช่น ลัง" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">หน่วยระดับ 2</label>
                      <Input placeholder="เช่น กล่อง" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">หน่วยระดับ 3</label>
                      <Input placeholder="เช่น ชิ้น" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">อัตราแปลง 1→2</label>
                      <Input placeholder="เช่น 84 (1 ลัง = 84 กล่อง)" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">อัตราแปลง 2→3</label>
                      <Input placeholder="เช่น 6 (1 กล่อง = 6 ชิ้น)" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <PackagePlus className="h-4 w-4 mr-2" />
                      เพิ่มสินค้า
                    </Button>
                    <Button variant="outline">ยกเลิก</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sku-codes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">รายการรหัสสินค้า</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <Input
                        placeholder="ค้นหารหัส SKU หรือชื่อสินค้า..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                    <Button variant="outline">
                      <Search className="h-4 w-4 mr-2" />
                      ค้นหา
                    </Button>
                    <Button>
                      <Download className="h-4 w-4 mr-2" />
                      ส่งออก
                    </Button>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    แสดงรายการ SKU ทั้งหมด {productsWithConversions?.length || 0} รายการ
                    {productsLoading && <span className="text-blue-600 ml-2">(กำลังโหลด...)</span>}
                  </div>

                  {productsError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm text-red-700">
                        <strong>ข้อผิดพลาด:</strong> {productsError}
                      </div>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัส SKU</TableHead>
                        <TableHead>ชื่อสินค้า</TableHead>
                        <TableHead>ประเภท</TableHead>
                        <TableHead>แบรนด์</TableHead>
                        <TableHead>การแปลงหน่วย</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>การดำเนินการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsWithConversions
                        ?.filter(product => {
                          const matchesSearch = searchTerm === '' ||
                            product.sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
                          return matchesSearch;
                        })
                        .slice(0, 20)
                        .map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium font-mono text-blue-600">
                            {product.sku_code}
                          </TableCell>
                          <TableCell>{product.product_name}</TableCell>
                          <TableCell>
                            <Badge variant={product.product_type === 'FG' ? 'default' : 'secondary'}>
                              {product.product_type || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {product.brand || '-'}
                          </TableCell>
                          <TableCell>
                            {product.conversion_id ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                มีอัตราแปลง
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                ไม่มีอัตราแปลง
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              {product.is_active ? 'ใช้งาน' : 'ระงับ'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {productsWithConversions && productsWithConversions.length === 0 && !productsLoading && (
                    <div className="text-center py-8 text-gray-500">
                      ไม่มีข้อมูลสินค้า
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unit-conversion" className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">รายการตั้งค่าแปลงหน่วย</CardTitle>
                    <div className="flex items-center gap-3">
                      {conversionLoading && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">กำลังโหลด...</span>
                        </div>
                      )}
                      {conversionError && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">เกิดข้อผิดพลาด</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        {filteredConversionRates.length} รายการ
                        {conversionRates && conversionRates.length > 0 && (
                          <span className="text-green-600 ml-2">
                            (จากฐานข้อมูล: {conversionRates.length})
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('🔄 Manual refresh triggered');
                          fetchConversionRates();
                          toast({
                            title: "กำลังโหลดข้อมูลใหม่",
                            description: "รอสักครู่...",
                          });
                        }}
                        disabled={conversionLoading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${conversionLoading ? 'animate-spin' : ''}`} />
                        รีเฟรช
                      </Button>
                    </div>
                  </div>
                  {conversionError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm text-red-700">
                        <strong>ข้อผิดพลาด:</strong> {conversionError}
                      </div>
                    </div>
                  )}
                  {conversionRates && conversionRates.length === 0 && !conversionLoading && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm text-yellow-700">
                        <strong>ไม่พบข้อมูล:</strong> ยังไม่มีข้อมูลการแปลงหน่วยในระบบ กำลังแสดงข้อมูลตัวอย่าง
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="ค้นหา SKU, ชื่อสินค้า, หน่วย..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">ประเภทสินค้า: ทั้งหมด</SelectItem>
                          <SelectItem value="FG">FG - สินค้าสำเร็จรูป</SelectItem>
                          <SelectItem value="PK">PK - วัสดุบรรจุ</SelectItem>
                          <SelectItem value="RM">RM - วัตถุดิบ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">SKU</TableHead>
                          <TableHead className="min-w-[250px]">ชื่อสินค้า</TableHead>
                          <TableHead className="w-20">ประเภท</TableHead>
                          <TableHead className="w-24">หน่วยระดับ 1</TableHead>
                          <TableHead className="w-24">หน่วยระดับ 2</TableHead>
                          <TableHead className="w-24">หน่วยระดับ 3</TableHead>
                          <TableHead className="w-32">อัตราแปลง 1→2</TableHead>
                          <TableHead className="w-32">อัตราแปลง 2→3</TableHead>
                          <TableHead className="w-24">สถานะ</TableHead>
                          <TableHead className="w-32">การดำเนินการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredConversionRates.map((item, index) => {
                          const isEditing = editingRow === item.sku;
                          const rawData = (item as any).rawData;

                          return (
                            <TableRow key={index} className={isEditing ? "bg-blue-50" : "hover:bg-gray-50"}>
                              <TableCell className="font-mono text-sm font-medium text-blue-600">
                                {item.sku}
                              </TableCell>
                              <TableCell className="text-sm">
                                {item.product_name}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={item.product_type === 'FG' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {item.product_type}
                                </Badge>
                              </TableCell>

                              {/* Unit Level 1 Name */}
                              <TableCell className="text-sm">
                                {isEditing ? (
                                  <Input
                                    value={editFormData.unit_level1_name || ''}
                                    onChange={(e) => setEditFormData(prev => ({...prev, unit_level1_name: e.target.value}))}
                                    className="h-8 text-xs"
                                    placeholder="เช่น ลัง"
                                  />
                                ) : (
                                  item.unit_level1
                                )}
                              </TableCell>

                              {/* Unit Level 2 Name */}
                              <TableCell className="text-sm">
                                {isEditing ? (
                                  <Input
                                    value={editFormData.unit_level2_name || ''}
                                    onChange={(e) => setEditFormData(prev => ({...prev, unit_level2_name: e.target.value}))}
                                    className="h-8 text-xs"
                                    placeholder="เช่น กล่อง"
                                  />
                                ) : (
                                  item.unit_level2
                                )}
                              </TableCell>

                              {/* Unit Level 3 Name */}
                              <TableCell className="text-sm">
                                {isEditing ? (
                                  <Input
                                    value={editFormData.unit_level3_name || ''}
                                    onChange={(e) => setEditFormData(prev => ({...prev, unit_level3_name: e.target.value}))}
                                    className="h-8 text-xs"
                                    placeholder="เช่น ชิ้น"
                                  />
                                ) : (
                                  item.unit_level3
                                )}
                              </TableCell>

                              {/* Conversion Rate 1->2 */}
                              <TableCell className="text-sm font-mono">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">1 :</span>
                                    <Input
                                      type="number"
                                      value={editFormData.unit_level1_rate || ''}
                                      onChange={(e) => setEditFormData(prev => ({...prev, unit_level1_rate: Number(e.target.value)}))}
                                      className="h-8 w-20 text-xs"
                                      placeholder="144"
                                      min="1"
                                    />
                                  </div>
                                ) : (
                                  item.conversion_rate_1_to_2
                                )}
                              </TableCell>

                              {/* Conversion Rate 2->3 */}
                              <TableCell className="text-sm font-mono">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">1 :</span>
                                    <Input
                                      type="number"
                                      value={editFormData.unit_level2_rate || ''}
                                      onChange={(e) => setEditFormData(prev => ({...prev, unit_level2_rate: Number(e.target.value)}))}
                                      className="h-8 w-20 text-xs"
                                      placeholder="12"
                                      min="1"
                                    />
                                  </div>
                                ) : (
                                  item.conversion_rate_2_to_3
                                )}
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="text-green-600 border-green-600 text-xs"
                                >
                                  {item.status}
                                </Badge>
                              </TableCell>

                              {/* Action Buttons */}
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-green-600 hover:text-green-700"
                                      onClick={handleEditSave}
                                      disabled={isSaving}
                                    >
                                      {isSaving ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-red-600 hover:text-red-700"
                                      onClick={handleEditCancel}
                                      disabled={isSaving}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2"
                                      onClick={() => rawData && handleEditStart(item.sku, rawData)}
                                      disabled={!!editingRow}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    {rawData && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-red-600 hover:text-red-700"
                                        onClick={() => handleDeleteConversion(item.sku)}
                                        disabled={!!editingRow}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};