import { useState, useEffect, useMemo } from 'react';
import { EditProductModal } from '@/components/EditProductModal';
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
  Box,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { ProductConversionRate, Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

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
  const { deleteProduct } = useProducts();
  const [products, setProducts] = useState<ProductSummaryData[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductSummaryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('total_stock_quantity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [conversionRates, setConversionRates] = useState<Map<string, ProductConversionRate>>(new Map());
  const { toast } = useToast();

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
          toast({
            title: 'ข้อผิดพลาด',
            description: 'ไม่สามารถโหลดข้อมูลสินค้าได้',
            variant: 'destructive'
          });
          return;
        }

        // Fetch all inventory items
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory_items')
          .select('sku, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity');

        if (inventoryError) {
          console.error('Error fetching inventory:', inventoryError);
          toast({
            title: 'ข้อผิดพลาด',
            description: 'ไม่สามารถโหลดข้อมูล inventory ได้',
            variant: 'destructive'
          });
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
        toast({
          title: 'ข้อผิดพลาด',
          description: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch =
        product.sku_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.product_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = productTypeFilter === 'all' || product.product_type === productTypeFilter;

      return matchesSearch && matchesType;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [products, searchQuery, productTypeFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredAndSortedProducts.slice(startIndex, endIndex);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="w-4 h-4 text-blue-600" /> :
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Export functions
  const exportToCSV = () => {
    const csvContent = [
      // Header
      ['SKU', 'ชื่อสินค้า', 'ประเภท', 'จำนวนรวม (ชิ้น)', 'จำนวนรวม (แปลงหน่วย)', 'จำนวน Location', 'หมายเหตุ'].join(','),
      // Data
      ...filteredAndSortedProducts.map(product => [
        product.sku_code,
        `"${product.product_name}"`,
        product.product_type,
        product.total_stock_quantity,
        `"${product.formatted_quantity?.display || product.total_stock_quantity + ' ชิ้น'}"`,
        product.inventory_items_count,
        product.total_stock_quantity === 0 ? 'ไม่มีสต็อก' : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `สรุปสินค้า_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'ส่งออกสำเร็จ',
      description: 'ส่งออกข้อมูลเป็น CSV เรียบร้อยแล้ว'
    });
  };

  // Handler functions
  const handleEdit = async (product: ProductSummaryData) => {
    try {
      // Fetch the full product data from the database
      const { data: fullProduct, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', product.id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        toast({
          title: 'ข้อผิดพลาด',
          description: 'ไม่สามารถโหลดข้อมูลสินค้าได้',
          variant: 'destructive'
        });
        return;
      }

      setSelectedProduct(fullProduct as Product);
      setEditModalOpen(true);
    } catch (error) {
      console.error('Error in handleEdit:', error);
      toast({
        title: 'ข้อผิดพลาด',
        description: 'เกิดข้อผิดพลาดในการเปิดหน้าแก้ไข',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteClick = (product: ProductSummaryData) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const success = await deleteProduct(productToDelete.id);
      if (success) {
        setDeleteConfirmOpen(false);
        setProductToDelete(null);
        // Refresh data by re-fetching
        const fetchData = async () => {
          try {
            setLoading(true);
            // Re-fetch products after deletion
            const { data: productsData, error: productsError } = await supabase
              .from('products')
              .select('id, sku_code, product_name, product_type');

            if (productsError) {
              console.error('Error fetching products:', productsError);
              return;
            }

            // Fetch all inventory items
            const { data: inventoryData } = await supabase
              .from('inventory_items')
              .select('sku, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity');

            // Process and update products
            const inventoryMap = new Map();
            inventoryData?.forEach(item => {
              if (!inventoryMap.has(item.sku)) {
                inventoryMap.set(item.sku, {
                  totalL1: 0, totalL2: 0, totalL3: 0, locationCount: 0
                });
              }
              const inv = inventoryMap.get(item.sku);
              inv.totalL1 += item.unit_level1_quantity || 0;
              inv.totalL2 += item.unit_level2_quantity || 0;
              inv.totalL3 += item.unit_level3_quantity || 0;
              inv.locationCount += 1;
            });

            const processedProducts = productsData?.map(product => {
              const inventory = inventoryMap.get(product.sku_code);
              const rate = conversionRates.get(product.sku_code);

              let total_stock_quantity = 0;
              let inventory_items_count = 0;

              if (inventory) {
                inventory_items_count = inventory.locationCount;

                if (rate) {
                  const level1Pieces = inventory.totalL1 * (rate.unit_level1_rate || 0);
                  const level2Pieces = inventory.totalL2 * (rate.unit_level2_rate || 0);
                  const level3Pieces = inventory.totalL3;
                  total_stock_quantity = level1Pieces + level2Pieces + level3Pieces;
                } else {
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
                conversion_rates: rate
              };
            }) || [];

            setProducts(processedProducts);
          } finally {
            setLoading(false);
          }
        };

        fetchData();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedProduct(null);
    // Refresh data after successful edit
    window.location.reload();
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalProducts = filteredAndSortedProducts.length;
    const totalStock = filteredAndSortedProducts.reduce((sum, p) => sum + p.total_stock_quantity, 0);
    const productsWithStock = filteredAndSortedProducts.filter(p => p.total_stock_quantity > 0).length;
    const fgProducts = filteredAndSortedProducts.filter(p => p.product_type === 'FG').length;
    const pkProducts = filteredAndSortedProducts.filter(p => p.product_type === 'PK').length;

    return {
      totalProducts,
      totalStock,
      productsWithStock,
      fgProducts,
      pkProducts
    };
  }, [filteredAndSortedProducts]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              สรุปสินค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalProducts}</div>
            <div className="text-sm text-gray-500">สินค้าทั้งหมด</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summaryStats.totalStock.toLocaleString()}</div>
            <div className="text-sm text-gray-500">จำนวนรวม (ชิ้น)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{summaryStats.productsWithStock}</div>
            <div className="text-sm text-gray-500">สินค้าที่มีสต็อก</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{summaryStats.fgProducts}</div>
            <div className="text-sm text-gray-500">สินค้าสำเร็จรูป (FG)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-teal-600">{summaryStats.pkProducts}</div>
            <div className="text-sm text-gray-500">วัสดุบรรจุ (PK)</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            ตารางสรุปสินค้า
          </CardTitle>

          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหาด้วย SKU หรือชื่อสินค้า..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select value={productTypeFilter} onValueChange={(value) => {
              setProductTypeFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="ประเภทสินค้า" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                <SelectItem value="FG">สินค้าสำเร็จรูป (FG)</SelectItem>
                <SelectItem value="PK">วัสดุบรรจุ (PK)</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              ส่งออก CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 w-32"
                    onClick={() => handleSort('sku_code')}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      SKU
                      {getSortIcon('sku_code')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('product_name')}
                  >
                    <div className="flex items-center gap-2">
                      <Package2 className="w-4 h-4" />
                      ชื่อสินค้า
                      {getSortIcon('product_name')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 w-24"
                    onClick={() => handleSort('product_type')}
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      ประเภท
                      {getSortIcon('product_type')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right w-32"
                    onClick={() => handleSort('total_stock_quantity')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <Box className="w-4 h-4" />
                      จำนวนรวม
                      {getSortIcon('total_stock_quantity')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-48">จำนวน (แปลงหน่วย)</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-center w-32"
                    onClick={() => handleSort('inventory_items_count')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Locations
                      {getSortIcon('inventory_items_count')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-24">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm font-medium">
                      {product.sku_code}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={product.product_name}>
                        {product.product_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.product_type === 'FG' ? 'default' : 'secondary'}>
                        {product.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={product.total_stock_quantity === 0 ? 'text-red-500' : 'text-green-600'}>
                        {product.total_stock_quantity.toLocaleString()}
                      </span>
                      <div className="text-xs text-gray-500">ชิ้น</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        {product.formatted_quantity?.display ||
                         (product.total_stock_quantity > 0 ? `${product.total_stock_quantity} ชิ้น` : '-')}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {product.inventory_items_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(product)}
                            className="flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            แก้ไข
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(product)}
                            className="flex items-center gap-2 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {currentProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไข
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                แสดง {startIndex + 1}-{Math.min(endIndex, filteredAndSortedProducts.length)} จาก {filteredAndSortedProducts.length} รายการ
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ก่อนหน้า
                </Button>
                <span className="text-sm">
                  หน้า {currentPage} จาก {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสินค้า</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบสินค้า "{productToDelete?.product_name}" (SKU: {productToDelete?.sku_code})?
              <br />
              <span className="text-red-600 font-medium">
                การลบจะไม่สามารถกู้คืนได้ และจะส่งผลต่อข้อมูล inventory ที่เกี่ยวข้อง
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบสินค้า
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}