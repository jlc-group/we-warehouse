import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Search, RefreshCw, AlertTriangle, Clock, ChevronUp, ChevronDown, Download } from 'lucide-react';
import { useProductsSummary } from '@/hooks/useProductsSummary';
import { toast } from 'sonner';
import { exportProductSummaryToCSV } from '@/utils/exportUtils';

type SortField = 'product_name' | 'sku' | 'total_level1_quantity' | 'total_pieces' | 'stock_status' | 'product_type';
type SortDirection = 'asc' | 'desc';

const NewDataTables = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortField, setSortField] = useState<SortField>('total_pieces');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: query, error, isLoading, refetch } = useProductsSummary();

  const products = useMemo(() => {
    const data = query?.data || [];
    return data;
  }, [query?.data]);

  // กรองและเรียงข้อมูลจริงจากฐานข้อมูล
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(item => {
      const matchesSearch = searchTerm === '' ||
        (item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

      // ✅ ปรับปรุงการ filter ให้แม่นยำมากขึ้น
      const matchesType = selectedType === 'all' ||
        (selectedType === 'FG' && item.product_type?.toUpperCase() === 'FG') ||
        (selectedType === 'PK' && item.product_type?.toUpperCase() === 'PK');

      return matchesSearch && matchesType;
    });

    // เรียงข้อมูลตาม sortField และ sortDirection
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'product_name':
          aValue = a.product_name || '';
          bValue = b.product_name || '';
          break;
        case 'sku':
          aValue = a.sku || '';
          bValue = b.sku || '';
          break;
        case 'total_level1_quantity':
          aValue = a.total_level1_quantity || 0;
          bValue = b.total_level1_quantity || 0;
          break;
        case 'total_pieces':
          aValue = a.total_pieces || 0;
          bValue = b.total_pieces || 0;
          break;
        case 'stock_status':
          // เรียงตาม priority ของสถานะ
          const statusOrder = { 'out_of_stock': 0, 'low_stock': 1, 'medium_stock': 2, 'high_stock': 3 };
          aValue = statusOrder[a.stock_status as keyof typeof statusOrder] ?? 4;
          bValue = statusOrder[b.stock_status as keyof typeof statusOrder] ?? 4;
          break;
        case 'product_type':
          aValue = a.product_type || '';
          bValue = b.product_type || '';
          break;
        default:
          aValue = a.total_pieces || 0;
          bValue = b.total_pieces || 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue, 'th');
        return sortDirection === 'asc' ? result : -result;
      } else {
        const result = aValue - bValue;
        return sortDirection === 'asc' ? result : -result;
      }
    });

    return filtered;
  }, [products, searchTerm, selectedType, sortField, sortDirection]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('รีเฟรชข้อมูลสำเร็จ');
    } catch (error) {
      toast.error('ไม่สามารถรีเฟรชข้อมูลได้');
    }
  };

  const handleExport = () => {
    try {
      exportProductSummaryToCSV(filteredProducts, 'สรุปสินค้า');
      toast.success(`Export สำเร็จ! ข้อมูล ${filteredProducts.length} รายการ`);
    } catch (error) {
      toast.error('ไม่สามารถ Export ข้อมูลได้');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <div className="w-4 h-4" />; // placeholder space
    }
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4" /> :
      <ChevronDown className="w-4 h-4" />;
  };

  // ฟังก์ชันจัดรูปแบบเวลา
  const formatLastUpdated = (lastChecked: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - lastChecked.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) {
      return 'เมื่อสักครู่';
    } else if (diffMins < 60) {
      return `${diffMins} นาทีที่แล้ว`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} ชั่วโมงที่แล้ว`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'high_stock':
        return <Badge className="bg-green-100 text-green-800 border-green-300">สูง</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-100 text-red-800 border-red-300">หมด</Badge>;
      case 'low_stock':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">ต่ำ</Badge>;
      case 'medium_stock':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">ปานกลาง</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ✅ คำนวณสถิติจากข้อมูลที่กรองแล้ว (ไม่ใช่ข้อมูลทั้งหมด)
  const totalItems = filteredProducts.length;
  const totalCartons = filteredProducts.reduce((sum, product) => sum + (product.total_level1_quantity || 0), 0);
  const totalPieces = filteredProducts.reduce((sum, product) => sum + (product.total_pieces || 0), 0);
  const totalWithStock = filteredProducts.filter(p => (p.total_pieces || 0) > 0).length;
  const totalFG = filteredProducts.filter(p => p.product_type === 'FG').length;
  const totalPK = filteredProducts.filter(p => p.product_type === 'PK').length;

  // แสดง error state
  if (error) {
    return (
      <div className="m-6 bg-white rounded-lg border p-8 text-center">
        <Package className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">ไม่สามารถโหลดข้อมูลได้</h3>
        <p className="text-sm text-gray-500 mb-4">
          เกิดข้อผิดพลาดในการดึงข้อมูลสรุปสต็อก
        </p>
        <Button onClick={handleRefresh} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* ✅ Stats Cards เรียบง่าย - แสดงข้อมูลตาม filter */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-xl font-semibold text-blue-600">{totalItems}</div>
          <div className="text-xs text-gray-500">สินค้าทั้งหมด</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-xl font-semibold text-amber-600">{totalCartons.toLocaleString()}</div>
          <div className="text-xs text-gray-500">ลังทั้งหมด</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-xl font-semibold text-green-600">{totalPieces.toLocaleString()}</div>
          <div className="text-xs text-gray-500">จำนวนรวม (ชิ้น)</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-xl font-semibold text-purple-600">{totalWithStock}</div>
          <div className="text-xs text-gray-500">สินค้าที่มีสต็อก</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-xl font-semibold text-orange-600">{totalFG}</div>
          <div className="text-xs text-gray-500">สินค้าสำเร็จรูป (FG)</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-xl font-semibold text-gray-600">{totalPK}</div>
          <div className="text-xs text-gray-500">วัสดุบรรจุ (PK)</div>
        </div>
      </div>

      {/* ✅ Main Table Card - เรียบง่าย */}
      <div className="bg-white rounded-lg border">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-medium">ตารางสรุปสินค้า</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isLoading || filteredProducts.length === 0}
                size="sm"
                className="flex items-center gap-1 text-xs"
              >
                <Download className="h-3 w-3" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                size="sm"
                className="flex items-center gap-1 text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>
          </div>

          {/* ✅ Status แบบเรียบง่าย */}
          {query?.meta && (
            <div className={`text-xs px-2 py-1 rounded-md mb-3 ${
              query.meta.isUsingFallback
                ? 'bg-orange-50 text-orange-700'
                : 'bg-green-50 text-green-700'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {query.meta.isUsingFallback ? (
                    <>
                      <AlertTriangle className="h-3 w-3" />
                      <span>โหมดสำรอง</span>
                    </>
                  ) : (
                    <>
                      <Package className="h-3 w-3" />
                      <span>ประสิทธิภาพสูง</span>
                    </>
                  )}
                </div>
                <span className="text-xs">{formatLastUpdated(query.meta.lastChecked)}</span>
              </div>

              {/* Admin tools แบบเรียบง่าย */}
              {query.meta.isUsingFallback && (
                <div className="mt-1 pt-1 border-t border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-orange-600">ต้องการ migration</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-xs text-orange-600 hover:bg-orange-100"
                      onClick={() => {
                        const instructionText = `🔧 Apply Migration:
1. เปิด Supabase Dashboard
2. ไป SQL Editor
3. Copy SQL จาก: MANUAL_APPLY_PRODUCTS_SUMMARY.sql
4. Run SQL
5. Refresh หน้า`;
                        navigator.clipboard.writeText(instructionText).then(() => {
                          toast.success('Copy คำแนะนำแล้ว!');
                        }).catch(() => {
                          alert(instructionText);
                        });
                      }}
                    >
                      แก้ไข
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ✅ Search & Filter แบบเรียบง่าย */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="FG">FG</SelectItem>
                <SelectItem value="PK">PK</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ Results count */}
          <div className="text-xs text-gray-500 mt-2">
            แสดง {filteredProducts.length.toLocaleString()} จาก {products.length.toLocaleString()} รายการ
            {selectedType !== 'all' && <span className="text-purple-600 ml-1">({selectedType})</span>}
          </div>
        </div>

        {/* ✅ Table - เรียบง่าย พร้อม sorting */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-32">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 font-semibold hover:bg-gray-100"
                    onClick={() => handleSort('sku')}
                  >
                    <span>SKU</span>
                    {getSortIcon('sku')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 font-semibold hover:bg-gray-100"
                    onClick={() => handleSort('product_name')}
                  >
                    <span>ชื่อสินค้า</span>
                    {getSortIcon('product_name')}
                  </Button>
                </TableHead>
                <TableHead className="w-16">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 font-semibold hover:bg-gray-100"
                    onClick={() => handleSort('product_type')}
                  >
                    <span>ประเภท</span>
                    {getSortIcon('product_type')}
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 font-semibold hover:bg-gray-100"
                    onClick={() => handleSort('total_level1_quantity')}
                  >
                    <span>จำนวนลัง</span>
                    {getSortIcon('total_level1_quantity')}
                  </Button>
                </TableHead>
                <TableHead className="w-24 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 font-semibold hover:bg-gray-100"
                    onClick={() => handleSort('total_pieces')}
                  >
                    <span>จำนวนชิ้น</span>
                    {getSortIcon('total_pieces')}
                  </Button>
                </TableHead>
                <TableHead className="w-20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 font-semibold hover:bg-gray-100"
                    onClick={() => handleSort('stock_status')}
                  >
                    <span>สถานะ</span>
                    {getSortIcon('stock_status')}
                  </Button>
                </TableHead>
                <TableHead className="w-32">ตำแหน่งหลัก</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    กำลังโหลด...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    ไม่พบข้อมูลสินค้า
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.product_id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>
                      <Badge variant={product.product_type === 'FG' ? 'default' : 'secondary'}>
                        {product.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className="text-amber-700">
                        {(product.total_level1_quantity || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">ลัง</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className="text-green-700">
                        {(product.total_pieces || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">ชิ้น</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(product.stock_status)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {product.primary_location || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default NewDataTables;