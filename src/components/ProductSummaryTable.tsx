import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Hash,
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Building,
  Tag,
  Scale,
  ArrowRight
} from 'lucide-react';
import { useProducts } from '@/contexts/ProductsContext';
import { useConversionRates } from '@/hooks/useConversionRates';
import { toast } from 'sonner';

export const ProductSummaryTable = () => {
  const { products, loading, error } = useProducts();
  const { conversionRates } = useConversionRates();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Get conversion rate for a specific SKU
  const getConversionRate = (sku: string) => {
    return conversionRates.find(rate => rate.sku === sku);
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch =
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = filterType === 'all' || product.product_type === filterType;
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && product.is_active) ||
        (filterStatus === 'inactive' && !product.is_active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [products, searchTerm, filterType, filterStatus]);

  // Export to CSV
  const handleExport = () => {
    if (filteredProducts.length === 0) {
      toast.error('ไม่มีข้อมูลสินค้าที่จะส่งออก');
      return;
    }

    const csvContent = [
      ['ชื่อสินค้า', 'รหัสสินค้า (SKU)', 'ประเภท', 'แบรนด์', 'หมวดหมู่', 'หน่วยนับ', 'อัตราแปลงหน่วย', 'สถานะ', 'วันที่สร้าง'],
      ...filteredProducts.map(product => {
        const conversionRate = getConversionRate(product.sku_code);
        const conversionInfo = conversionRate
          ? `1 ${conversionRate.unit_level1_name} = ${conversionRate.unit_level1_rate} ${conversionRate.unit_level3_name}, 1 ${conversionRate.unit_level2_name} = ${conversionRate.unit_level2_rate} ${conversionRate.unit_level3_name}`
          : 'ใช้ค่าเริ่มต้น (1 ลัง = 144 ชิ้น, 1 กล่อง = 12 ชิ้น)';

        return [
          product.product_name,
          product.sku_code,
          product.product_type === 'FG' ? 'สินค้าสำเร็จรูป' : 'บรรจุภัณฑ์',
          product.brand || '',
          product.category || '',
          product.unit_of_measure,
          conversionInfo,
          product.is_active ? 'ใช้งาน' : 'ปิดใช้งาน',
          new Date(product.created_at).toLocaleDateString('th-TH')
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`ส่งออกข้อมูลสินค้า ${filteredProducts.length} รายการเรียบร้อย`);
  };

  const getTypeLabel = (type: string) => {
    return type === 'FG' ? 'สินค้าสำเร็จรูป' : 'บรรจุภัณฑ์';
  };

  const getTypeBadge = (type: string) => {
    const variant = type === 'FG' ? 'default' : 'secondary';
    return (
      <Badge variant={variant}>
        {getTypeLabel(type)}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'destructive'}>
        {isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            สรุปข้อมูลสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">กำลังโหลดข้อมูลสินค้า...</div>
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
            <Package className="h-5 w-5" />
            สรุปข้อมูลสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-red-500">เกิดข้อผิดพลาด: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          สรุปข้อมูลสินค้า
          <Badge variant="outline" className="ml-auto">
            {filteredProducts.length} รายการ
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาสินค้า, รหัสสินค้า, แบรนด์, หมวดหมู่..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ประเภททั้งหมด</SelectItem>
              <SelectItem value="FG">สินค้าสำเร็จรูป</SelectItem>
              <SelectItem value="PK">บรรจุภัณฑ์</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะทั้งหมด</SelectItem>
              <SelectItem value="active">ใช้งาน</SelectItem>
              <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            ส่งออก CSV
          </Button>
        </div>

        {/* Products Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อสินค้า</TableHead>
                <TableHead>รหัสสินค้า (SKU)</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>แบรนด์</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>หน่วยนับ</TableHead>
                <TableHead>อัตราแปลงหน่วย</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่สร้าง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไขการค้นหา
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{product.product_name}</div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground">
                              {product.description.length > 50
                                ? `${product.description.substring(0, 50)}...`
                                : product.description
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{product.sku_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(product.product_type)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{product.brand || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span>{product.category || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span>{product.unit_of_measure}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const conversionRate = getConversionRate(product.sku_code);
                        if (conversionRate) {
                          return (
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">1 {conversionRate.unit_level1_name}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span>{conversionRate.unit_level1_rate} {conversionRate.unit_level3_name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">1 {conversionRate.unit_level2_name}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span>{conversionRate.unit_level2_rate} {conversionRate.unit_level3_name}</span>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span>1 ลัง</span>
                                <ArrowRight className="h-3 w-3" />
                                <span>144 ชิ้น</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>1 กล่อง</span>
                                <ArrowRight className="h-3 w-3" />
                                <span>12 ชิ้น</span>
                              </div>
                              <Badge variant="outline" className="text-xs">ค่าเริ่มต้น</Badge>
                            </div>
                          );
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(product.is_active)}
                    </TableCell>
                    <TableCell>
                      {new Date(product.created_at).toLocaleDateString('th-TH')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredProducts.length > 0 && (
          <div className="text-sm text-muted-foreground">
            แสดง {filteredProducts.length} จากทั้งหมด {products.length} รายการ
          </div>
        )}
      </CardContent>
    </Card>
  );
};