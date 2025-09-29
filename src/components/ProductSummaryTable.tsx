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
  Search,
  ArrowRight,
  Settings,
  Edit,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

type SortField = 'product_name' | 'sku' | 'product_type';
type SortDirection = 'asc' | 'desc';
import { useProductsSummary } from '@/hooks/useProductsSummary';
import { toast } from 'sonner';

interface ProductSummaryTableProps {
  onEditConversion?: (product: any) => void;
  onSetupConversion?: (product: any) => void;
}

export const ProductSummaryTable = ({
  onEditConversion,
  onSetupConversion
}: ProductSummaryTableProps = {}) => {
  const { data: summaryResult, isLoading: loading, error } = useProductsSummary();
  const products = summaryResult?.data || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('product_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Check if product has custom conversion rates
  const hasCustomConversion = (product: any) => {
    const defaultLevel1Rate = 24;
    const defaultLevel2Rate = 1;

    return (
      (product.unit_level1_rate && product.unit_level1_rate !== defaultLevel1Rate) ||
      (product.unit_level2_rate && product.unit_level2_rate !== defaultLevel2Rate)
    );
  };

  // Get conversion status badge
  const getConversionStatusBadge = (product: any) => {
    const hasCustom = hasCustomConversion(product);

    if (hasCustom) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          ตั้งค่าแล้ว
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <AlertCircle className="mr-1 h-3 w-3" />
          ใช้ค่าเริ่มต้น
        </Badge>
      );
    }
  };

  // Get product type badge
  const getTypeBadge = (type: string) => {
    const typeConfig = {
      'FG': { label: 'สินค้าสำเร็จรูป', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      'PK': { label: 'บรรจุภัณฑ์', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      'RM': { label: 'วัตถุดิบ', color: 'bg-blue-50 text-blue-700 border-blue-200' }
    };

    const config = typeConfig[type] || { label: type, color: 'bg-gray-50 text-gray-700 border-gray-200' };

    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = !searchTerm ||
        product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || product.product_type === filterType;

      return matchesSearch && matchesType;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'product_name':
        case 'sku':
        case 'product_type':
          aValue = a[sortField]?.toLowerCase() || '';
          bValue = b[sortField]?.toLowerCase() || '';
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [products, searchTerm, filterType, sortField, sortDirection]);

  // Handle conversion setup
  const handleSetupConversion = (product: any) => {
    if (onSetupConversion) {
      onSetupConversion(product);
    } else {
      toast.info(`กำลังเปิดหน้าตั้งค่าแปลงหน่วยสำหรับ: ${product.product_name}`);
    }
  };

  const handleEditConversion = (product: any) => {
    if (onEditConversion) {
      onEditConversion(product);
    } else {
      toast.info(`กำลังเปิดหน้าแก้ไขแปลงหน่วยสำหรับ: ${product.product_name}`);
    }
  };

  // Count products needing conversion setup
  const needsSetup = filteredProducts.filter(p => !hasCustomConversion(p)).length;
  const hasSetup = filteredProducts.filter(p => hasCustomConversion(p)).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p>กำลังโหลดข้อมูลสินค้า...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p>เกิดข้อผิดพลาด: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          จัดการค่าแปลงหน่วยสินค้า
        </CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>ทั้งหมด: {filteredProducts.length} รายการ</span>
          <span className="text-green-600">ตั้งค่าแล้ว: {hasSetup}</span>
          <span className="text-orange-600">ยังไม่ตั้งค่า: {needsSetup}</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาสินค้า หรือ รหัสสินค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    ประเภททั้งหมด
                  </div>
                </SelectItem>
                <SelectItem value="FG">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-600" />
                    สินค้าสำเร็จรูป (FG)
                  </div>
                </SelectItem>
                <SelectItem value="PK">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-600" />
                    บรรจุภัณฑ์ (PK)
                  </div>
                </SelectItem>
                <SelectItem value="RM">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    วัตถุดิบ (RM)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('product_name')}
                >
                  <div className="flex items-center gap-1">
                    ชื่อสินค้า
                    {sortField === 'product_name' && (
                      sortDirection === 'asc' ? '↑' : '↓'
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('sku')}
                >
                  <div className="flex items-center gap-1">
                    รหัส SKU
                    {sortField === 'sku' && (
                      sortDirection === 'asc' ? '↑' : '↓'
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('product_type')}
                >
                  <div className="flex items-center gap-1">
                    ประเภทสินค้า
                    {sortField === 'product_type' && (
                      sortDirection === 'asc' ? '↑' : '↓'
                    )}
                  </div>
                </TableHead>
                <TableHead>หน่วยการแปลง</TableHead>
                <TableHead>สถานะการตั้งค่า</TableHead>
                <TableHead className="text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไขการค้นหา
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id || product.sku}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{product.product_name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{product.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(product.product_type)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">1 {product.unit_level1_name || 'ลัง'}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span>{product.unit_level1_rate || 24} {product.unit_level3_name || 'ชิ้น'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">1 {product.unit_level2_name || 'กล่อง'}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span>{product.unit_level2_rate || 1} {product.unit_level3_name || 'ชิ้น'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getConversionStatusBadge(product)}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasCustomConversion(product) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditConversion(product)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          แก้ไข
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSetupConversion(product)}
                          className="gap-1"
                        >
                          <Settings className="h-3 w-3" />
                          ตั้งค่า
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredProducts.length > 0 && (
          <div className="text-sm text-muted-foreground mt-4">
            แสดง {filteredProducts.length} จากทั้งหมด {products.length} รายการ
          </div>
        )}
      </CardContent>
    </Card>
  );
};