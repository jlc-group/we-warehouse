import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Search,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package2,
  Hash,
  MapPin,
  Box
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProductConversionRate } from '@/integrations/supabase/types';

interface ProductSummaryData {
  id: string;
  sku_code: string;
  product_name: string;
  product_type: string;
  total_stock_quantity: number;
  inventory_items_count: number;
  conversion_rates?: ProductConversionRate;
  formatted_quantity?: {
    cartons: number;
    boxes: number;
    pieces: number;
    display: string;
  };
}

type SortField = 'sku_code' | 'product_name' | 'total_stock_quantity' | 'inventory_items_count' | 'product_type';
type SortDirection = 'asc' | 'desc';

export function ProductSummaryTable() {
  const [products, setProducts] = useState<ProductSummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('total_stock_quantity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [conversionRates, setConversionRates] = useState<Map<string, ProductConversionRate>>(new Map());

  const itemsPerPage = 50;

  // Fetch raw data and calculate quantities correctly
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, sku_code, product_name, product_type');

        if (productsError) {
          console.error('Error fetching products:', productsError);
          toast.error('ไม่สามารถโหลดข้อมูลสินค้าได้');
          return;
        }

        // Fetch all inventory items
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory_items')
          .select('sku, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity');

        if (inventoryError) {
          console.error('Error fetching inventory:', inventoryError);
          toast.error('ไม่สามารถโหลดข้อมูล inventory ได้');
          return;
        }

        // Fetch conversion rates
        const { data: ratesData, error: ratesError } = await supabase
          .from('product_conversion_rates')
          .select('*');

        if (ratesError) {
          console.error('Error fetching conversion rates:', ratesError);
        }

        // Create conversion rates map
        const ratesMap = new Map<string, ProductConversionRate>();
        ratesData?.forEach(rate => {
          ratesMap.set(rate.sku, rate);
        });
        setConversionRates(ratesMap);

        // Group inventory by SKU and calculate totals
        const inventoryMap = new Map<string, {
          totalL1: number;
          totalL2: number;
          totalL3: number;
          locationCount: number;
        }>();

        inventoryData?.forEach(item => {
          if (!inventoryMap.has(item.sku)) {
            inventoryMap.set(item.sku, {
              totalL1: 0,
              totalL2: 0,
              totalL3: 0,
              locationCount: 0
            });
          }
          const inv = inventoryMap.get(item.sku)!;
          inv.totalL1 += item.unit_level1_quantity || 0;
          inv.totalL2 += item.unit_level2_quantity || 0;
          inv.totalL3 += item.unit_level3_quantity || 0;
          inv.locationCount += 1;
        });

        // Process products data with correct calculations
        const processedProducts = productsData?.map(product => {
          const inventory = inventoryMap.get(product.sku_code);
          const rate = ratesMap.get(product.sku_code);

          let total_stock_quantity = 0;
          let inventory_items_count = 0;
          let formatted_quantity = undefined;

          if (inventory) {
            inventory_items_count = inventory.locationCount;

            if (rate) {
              // Calculate total pieces using correct conversion rates
              const level1Pieces = inventory.totalL1 * (rate.unit_level1_rate || 0);
              const level2Pieces = inventory.totalL2 * (rate.unit_level2_rate || 0);
              const level3Pieces = inventory.totalL3;

              total_stock_quantity = level1Pieces + level2Pieces + level3Pieces;

              // Format quantity display
              if (total_stock_quantity > 0) {
                const level1Rate = rate.unit_level1_rate || 0;
                const level2Rate = rate.unit_level2_rate || 0;

                if (level1Rate > 0 && level2Rate > 0) {
                  const cartons = Math.floor(total_stock_quantity / level1Rate);
                  const remaining1 = total_stock_quantity % level1Rate;
                  const boxes = Math.floor(remaining1 / level2Rate);
                  const pieces = remaining1 % level2Rate;

                  const displayParts = [];
                  if (cartons > 0) displayParts.push(`${cartons} ลัง`);
                  if (boxes > 0) displayParts.push(`${boxes} กล่อง`);
                  if (pieces > 0) displayParts.push(`${pieces} ชิ้น`);

                  formatted_quantity = {
                    cartons,
                    boxes,
                    pieces,
                    display: displayParts.join(' + ') || `${total_stock_quantity} ชิ้น`
                  };
                }
              }
            } else {
              // If no conversion rates, use simple sum as fallback
              total_stock_quantity = inventory.totalL1 + inventory.totalL2 + inventory.totalL3;
            }
          }

          return {
            id: product.id,
            sku_code: product.sku_code,
            product_name: product.product_name,
            product_type: product.product_type,
            total_stock_quantity,
            inventory_items_count,
            conversion_rates: rate,
            formatted_quantity
          };
        }) || [];

        setProducts(processedProducts);

      } catch (error) {
        console.error('Error in fetchData:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get type badge color and label
  const getTypeBadge = (type: string) => {
    const typeConfig = {
      'FG': { label: 'สินค้าสำเร็จรูป', color: 'bg-purple-100 text-purple-700' },
      'PK': { label: 'บรรจุภัณฑ์', color: 'bg-orange-100 text-orange-700' },
      'RM': { label: 'วัตถุดิบ', color: 'bg-blue-100 text-blue-700' }
    };

    const config = typeConfig[type] || { label: type, color: 'bg-gray-100 text-gray-700' };

    return (
      <Badge variant="secondary" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // Get stock level badge
  const getStockLevelBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">หมดสต็อก</Badge>;
    } else if (quantity <= 10) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">สต็อกน้อย</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">มีสต็อก</Badge>;
    }
  };

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch = !searchQuery ||
        product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku_code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = productTypeFilter === 'all' || product.product_type === productTypeFilter;

      return matchesSearch && matchesType;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'sku_code':
        case 'product_name':
        case 'product_type':
          aValue = a[sortField].toLowerCase();
          bValue = b[sortField].toLowerCase();
          break;
        case 'total_stock_quantity':
        case 'inventory_items_count':
          aValue = a[sortField];
          bValue = b[sortField];
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
  }, [products, searchQuery, productTypeFilter, sortField, sortDirection]);

  // Paginate products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);

  // Calculate summary statistics from filtered products
  const summaryStats = useMemo(() => {
    const stats = {
      totalProducts: filteredAndSortedProducts.length,
      totalPieces: 0,
      totalCartons: 0,
      totalBoxes: 0,
      totalLocations: 0,
      productsByType: {
        FG: 0,
        PK: 0,
        RM: 0
      }
    };

    filteredAndSortedProducts.forEach(product => {
      // Add up total pieces with safety check
      if (product?.total_stock_quantity != null) {
        stats.totalPieces += product.total_stock_quantity;
      }

      // Add up cartons and boxes from formatted quantity with safety check
      if (product?.formatted_quantity) {
        if (product.formatted_quantity.cartons != null) {
          stats.totalCartons += product.formatted_quantity.cartons;
        }
        if (product.formatted_quantity.boxes != null) {
          stats.totalBoxes += product.formatted_quantity.boxes;
        }
      }

      // Add up locations with safety check
      if (product?.inventory_items_count != null) {
        stats.totalLocations += product.inventory_items_count;
      }

      // Count by product type with safety check
      if (product?.product_type && Object.prototype.hasOwnProperty.call(stats.productsByType, product.product_type)) {
        stats.productsByType[product.product_type]++;
      }
    });

    return stats;
  }, [filteredAndSortedProducts]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="ml-1 h-3 w-3" /> :
      <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['รหัสสินค้า', 'ชื่อสินค้า', 'ประเภท', 'จำนวนทั้งหมด (ชิ้น)', 'จำนวนตำแหน่ง', 'รูปแบบแสดงผล'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedProducts.map(product => [
        product.sku_code,
        `"${product.product_name}"`,
        product.product_type,
        product.total_stock_quantity,
        product.inventory_items_count,
        `"${product.formatted_quantity?.display || product.total_stock_quantity + ' ชิ้น'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'product_summary.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast.success('ส่งออกข้อมูลสำเร็จ');
  };

  // Format number with commas - enhanced with error handling
  const formatNumber = (num: number | undefined | null) => {
    if (num == null || isNaN(num)) return '0';
    return new Intl.NumberFormat('th-TH').format(num);
  };

  // Summary Cards Component
  const SummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Total Pieces */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">จำนวนรวม (ชิ้น)</p>
              <p className="text-2xl font-bold">{formatNumber(summaryStats.totalPieces)}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      {/* Total Cartons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">จำนวนลัง</p>
              <p className="text-2xl font-bold">{formatNumber(summaryStats.totalCartons)}</p>
            </div>
            <Box className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* Total Locations */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ตำแหน่งสต็อก</p>
              <p className="text-2xl font-bold">{formatNumber(summaryStats.totalLocations)}</p>
            </div>
            <MapPin className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      {/* Total Products */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">รายการสินค้า</p>
              <p className="text-2xl font-bold">{formatNumber(summaryStats.totalProducts)}</p>
            </div>
            <Hash className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      {/* FG Products */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">สินค้าสำเร็จรูป (FG)</p>
              <p className="text-2xl font-bold">{formatNumber(summaryStats.productsByType.FG)}</p>
            </div>
            <Package2 className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      {/* PK Products */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">บรรจุภัณฑ์ (PK)</p>
              <p className="text-2xl font-bold">{formatNumber(summaryStats.productsByType.PK)}</p>
            </div>
            <Package className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p>กำลังโหลดข้อมูลสินค้า...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            สรุปข้อมูลสินค้า
            <Badge variant="secondary" className="ml-2">
              {filteredAndSortedProducts.length} รายการ
            </Badge>
          </CardTitle>
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={exportToCSV} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                ส่งออก CSV
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
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

          {/* Summary Cards */}
          <SummaryCards />

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('sku_code')}
                  >
                    <div className="flex items-center">
                      รหัสสินค้า
                      {getSortIcon('sku_code')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('product_name')}
                  >
                    <div className="flex items-center">
                      <Package className="mr-2 h-4 w-4" />
                      ชื่อสินค้า
                      {getSortIcon('product_name')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('product_type')}
                  >
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      ประเภท
                      {getSortIcon('product_type')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort('total_stock_quantity')}
                  >
                    <div className="flex items-center justify-end">
                      <Box className="mr-2 h-4 w-4" />
                      จำนวนคงเหลือ
                      {getSortIcon('total_stock_quantity')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort('inventory_items_count')}
                  >
                    <div className="flex items-center justify-end">
                      <MapPin className="mr-2 h-4 w-4" />
                      ตำแหน่ง
                      {getSortIcon('inventory_items_count')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไขการค้นหา
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{product?.sku_code || 'Unknown SKU'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{product?.product_name || 'Unknown Product'}</div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(product?.product_type || 'Unknown')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          {/* ยอดรวมหลัก - เด่นชัด */}
                          <div className="text-lg font-bold text-foreground">
                            {formatNumber(product?.total_stock_quantity || 0)} ชิ้น
                          </div>

                          {/* รายละเอียดแยก - เป็นข้อมูลเสริม */}
                          {product?.formatted_quantity && (
                            <div className="text-sm text-muted-foreground">
                              {product.formatted_quantity.display || ''}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-sm">{product?.inventory_items_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStockLevelBadge(product?.total_stock_quantity || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredAndSortedProducts.length)} จาก {filteredAndSortedProducts.length} รายการ
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ก่อนหน้า
                </Button>
                <span className="flex items-center px-3 text-sm">
                  หน้า {currentPage} จาก {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}