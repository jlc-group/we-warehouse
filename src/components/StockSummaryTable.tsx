import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  MapPin,
  Info
} from 'lucide-react';
import type { ProductSummary } from '@/hooks/useProductsSummary';
import { formatNumber, formatStockValue, getStockStatusLabel, getStockStatusColor } from '@/hooks/useStockSummaryStats';

interface StockSummaryTableProps {
  products: ProductSummary[];
  isLoading?: boolean;
  onItemClick?: (product: ProductSummary) => void;
}

type SortField = 'sku' | 'product_name' | 'total_pieces' | 'total_level1_quantity' |
                 'total_level2_quantity' | 'total_level3_quantity' | 'location_count' |
                 'unit_cost' | 'stock_status' | 'category';

interface SortConfig {
  field: SortField;
  direction: 'asc' | 'desc';
}

export function StockSummaryTable({ products, isLoading = false, onItemClick }: StockSummaryTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'total_pieces',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // การเรียงลำดับ
  const sortedProducts = [...products].sort((a, b) => {
    const { field, direction } = sortConfig;
    let aValue: any = a[field];
    let bValue: any = b[field];

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    // Handle null/undefined values
    if (aValue == null) aValue = direction === 'asc' ? -Infinity : Infinity;
    if (bValue == null) bValue = direction === 'asc' ? -Infinity : Infinity;

    if (direction === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ?
      <ArrowUp className="h-4 w-4 text-blue-600" /> :
      <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  const calculateTotalValue = (product: ProductSummary): number => {
    return (product.unit_cost || 0) * (product.total_pieces || 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            รายละเอียดสต็อกแต่ละ SKU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            รายละเอียดสต็อกแต่ละ SKU
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">ไม่พบข้อมูลสินค้า</h3>
          <p className="text-sm text-gray-500">ลองเปลี่ยนตัวกรองหรือเพิ่มสินค้าใหม่</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            รายละเอียดสต็อกแต่ละ SKU
          </CardTitle>
          <div className="text-sm text-gray-500">
            แสดง {startIndex + 1}-{Math.min(endIndex, sortedProducts.length)} จาก {sortedProducts.length} รายการ
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('sku')} className="h-8 p-0">
                    รหัส SKU
                    {getSortIcon('sku')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('product_name')} className="h-8 p-0">
                    ชื่อสินค้า
                    {getSortIcon('product_name')}
                  </Button>
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('total_level1_quantity')} className="h-8 p-0">
                    ลัง
                    {getSortIcon('total_level1_quantity')}
                  </Button>
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('total_level2_quantity')} className="h-8 p-0">
                    กล่อง
                    {getSortIcon('total_level2_quantity')}
                  </Button>
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('total_level3_quantity')} className="h-8 p-0">
                    ชิ้น
                    {getSortIcon('total_level3_quantity')}
                  </Button>
                </TableHead>
                <TableHead className="text-center w-[120px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('total_pieces')} className="h-8 p-0">
                          รวม (ชิ้น) 🔢
                          {getSortIcon('total_pieces')}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <div className="font-medium">การคำนวณ:</div>
                          <div>(ลัง × อัตราแปลงลัง) +</div>
                          <div>(กล่อง × อัตราแปลงกล่อง) +</div>
                          <div>ชิ้น = จำนวนชิ้นรวม</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('location_count')} className="h-8 p-0">
                    Location
                    {getSortIcon('location_count')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('unit_cost')} className="h-8 p-0">
                    ราคา/ชิ้น
                    {getSortIcon('unit_cost')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">มูลค่ารวม</TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('stock_status')} className="h-8 p-0">
                    สถานะ
                    {getSortIcon('stock_status')}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProducts.map((product) => {
                const totalValue = calculateTotalValue(product);

                return (
                  <TableRow
                    key={product.product_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onItemClick?.(product)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-sm">{product.sku}</span>
                        {product.category && (
                          <span className="text-xs text-gray-500">{product.category}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[200px]">
                        <span className="font-medium truncate">{product.product_name}</span>
                        {product.brand && (
                          <span className="text-xs text-gray-500">{product.brand}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-base">
                          {formatNumber(product.total_level1_quantity || 0)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {product.unit_level1_name || 'ลัง'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-base">
                          {formatNumber(product.total_level2_quantity || 0)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {product.unit_level2_name || 'กล่อง'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-base">
                          {formatNumber(product.total_level3_quantity || 0)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {product.unit_level3_name || 'ชิ้น'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col cursor-help">
                              <span className="font-bold text-lg text-blue-600">
                                {formatNumber(product.total_pieces || 0)}
                              </span>
                              <span className="text-xs text-gray-500">
                                ชิ้นรวม 🔢
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-medium mb-1">{product.product_name}</div>
                              <div>🧮 การคำนวณ:</div>
                              <div>{product.total_level1_quantity || 0} {product.unit_level1_name || 'ลัง'} × {product.unit_level1_rate || 0} = {(product.total_level1_quantity || 0) * (product.unit_level1_rate || 0)}</div>
                              <div>{product.total_level2_quantity || 0} {product.unit_level2_name || 'กล่อง'} × {product.unit_level2_rate || 0} = {(product.total_level2_quantity || 0) * (product.unit_level2_rate || 0)}</div>
                              <div>{product.total_level3_quantity || 0} {product.unit_level3_name || 'ชิ้น'} × 1 = {product.total_level3_quantity || 0}</div>
                              <div className="border-t pt-1 mt-1 font-medium">
                                รวม = {formatNumber(product.total_pieces || 0)} ชิ้น
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="font-medium">
                          {formatNumber(product.location_count || 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {product.unit_cost ? formatStockValue(product.unit_cost) : '-'}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {totalValue > 0 ? formatStockValue(totalValue) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-xs ${getStockStatusColor(product.stock_status || 'out_of_stock')}`}>
                        {getStockStatusLabel(product.stock_status || 'out_of_stock')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onItemClick?.(product);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: เปิดในหน้าใหม่หรือ modal
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              หน้า {currentPage} จาก {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ก่อนหน้า
              </Button>

              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

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
  );
}