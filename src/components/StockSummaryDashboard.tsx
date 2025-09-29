import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, RefreshCw, ArrowUpDown } from 'lucide-react';
import { StockSummaryCards, StockSummaryDetailCards } from './StockSummaryCards';
import { StockSummaryFilters, useFilteredProducts, type FilterOptions } from './StockSummaryFilters';
import { StockSummaryTable } from './StockSummaryTable';
import { useProductsSummary, useProductsSummaryMeta, type ProductSummary } from '@/hooks/useProductsSummary';
import { useStockSummaryStats } from '@/hooks/useStockSummaryStats';
import { toast } from 'sonner';

export function StockSummaryDashboard() {
  const query = useProductsSummary();
  const products = query.data?.data || [];
  const { isLoading, error, refetch } = query;
  const { stats, hasData } = useStockSummaryStats();
  const meta = useProductsSummaryMeta();

  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    stockStatus: 'all',
    category: 'all',
    brand: 'all',
    sortBy: 'total_pieces',
    sortOrder: 'desc'
  });

  // กรองและเรียงลำดับสินค้า
  const filteredProducts = useFilteredProducts(products || [], filters);

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
      // สร้าง CSV content
      const headers = [
        'รหัส SKU',
        'ชื่อสินค้า',
        'หมวดหมู่',
        'แบรนด์',
        'จำนวนลัง',
        'หน่วยลัง',
        'จำนวนกล่อง',
        'หน่วยกล่อง',
        'จำนวนชิ้น',
        'หน่วยชิ้น',
        'จำนวนรวม (แปลงหน่วย)',
        'รวมทั้งหมด (ชิ้น)',
        'จำนวน Location',
        'ราคาต้นทุน/ชิ้น',
        'มูลค่ารวม',
        'สถานะสต็อก',
        'อัปเดตล่าสุด'
      ];

      const csvData = filteredProducts.map(product => {
        const level1 = product.total_level1_quantity || 0;
        const level2 = product.total_level2_quantity || 0;
        const level3 = product.total_level3_quantity || 0;
        const totalPieces = product.total_pieces || 0;

        // สร้างข้อความแสดงจำนวนแบบรวม เหมือนในตาราง
        const displayQuantity = [];
        if (level1 > 0) displayQuantity.push(`${level1.toLocaleString()} ${product.unit_level1_name || 'ลัง'}`);
        if (level2 > 0) displayQuantity.push(`${level2.toLocaleString()} ${product.unit_level2_name || 'กล่อง'}`);
        if (level3 > 0) displayQuantity.push(`${level3.toLocaleString()} ${product.unit_level3_name || 'ชิ้น'}`);

        return [
          product.sku,
          product.product_name,
          product.category || '',
          product.brand || '',
          level1,
          product.unit_level1_name || 'ลัง',
          level2,
          product.unit_level2_name || 'กล่อง',
          level3,
          product.unit_level3_name || 'ชิ้น',
          displayQuantity.join(' + '),
          totalPieces,
          product.location_count || 0,
          product.unit_cost || 0,
          (product.unit_cost || 0) * totalPieces,
          product.stock_status || '',
          product.last_updated || ''
        ];
      });

      // สร้างไฟล์ CSV
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // ดาวน์โหลดไฟล์
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `สรุปยอดสต็อก_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`ส่งออกข้อมูล ${filteredProducts.length} รายการสำเร็จ`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('ไม่สามารถส่งออกข้อมูลได้');
    }
  };

  const handleItemClick = (product: ProductSummary) => {
    // TODO: เปิด modal แสดงรายละเอียดสินค้า
    console.log('Product clicked:', product);
    toast.info(`คลิก: ${product.product_name}`);
  };

  if (error) {
    return (
      <Card className="m-6">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">ไม่สามารถโหลดข้อมูลได้</h3>
          <p className="text-sm text-gray-500 mb-4">
            เกิดข้อผิดพลาดในการดึงข้อมูลสรุปสต็อก
          </p>
          <Button onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            ลองใหม่
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">สรุปยอดสต็อกทั้งระบบ</h1>
          <p className="text-gray-600 mt-1">
            ภาพรวมสต็อกและยอดรวมของแต่ละ SKU จากทุก location
          </p>
          {meta.isUsingFallback && (
            <p className="text-blue-600 text-sm mt-1 font-medium">
              🔄 กำลังใช้ข้อมูลจาก Inventory (Database views ไม่พร้อม)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          {hasData && (
            <Button
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              ส่งออก CSV
            </Button>
          )}
        </div>
      </div>

      {/* Conversion Legend */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <ArrowUpDown className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">🔢 คำอธิบายระบบแปลงหน่วย</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium text-blue-800">📦 หน่วยการนับ:</div>
                  <div className="space-y-1 text-blue-700">
                    <div>• <span className="font-medium">ลัง (Level 1)</span> = หน่วยใหญ่สุด</div>
                    <div>• <span className="font-medium">กล่อง (Level 2)</span> = หน่วยกลาง</div>
                    <div>• <span className="font-medium">ชิ้น (Level 3)</span> = หน่วยเล็กสุด (หน่วยฐาน)</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-blue-800">🧮 การคำนวณ:</div>
                  <div className="bg-white p-2 rounded border border-blue-200">
                    <div className="text-blue-700 font-mono text-xs">
                      <div>รวมทั้งหมด (ชิ้น) =</div>
                      <div>(ลัง × อัตราแปลงลัง) +</div>
                      <div>(กล่อง × อัตราแปลงกล่อง) +</div>
                      <div>ชิ้น</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-600">
                💡 <strong>หมายเหตุ:</strong> ระบบจะแสดงจำนวนแยกตามหน่วยและจำนวนรวมหลังแปลงเป็นชิ้นเพื่อให้เห็นปริมาณที่แท้จริง
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <StockSummaryCards />

      {/* Detail Cards */}
      <StockSummaryDetailCards />

      {/* Filters */}
      <StockSummaryFilters
        filters={filters}
        onFiltersChange={setFilters}
        products={products || []}
        onExport={handleExport}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Results Summary */}
      {hasData && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">
                แสดงผล <span className="font-medium">{filteredProducts.length}</span> รายการ
                จากทั้งหมด <span className="font-medium">{products?.length || 0}</span> รายการ
              </div>
              <div className="flex items-center gap-4 text-gray-500">
                <span>มูลค่ารวม: <span className="font-medium text-gray-900">
                  {new Intl.NumberFormat('th-TH', {
                    style: 'currency',
                    currency: 'THB',
                    minimumFractionDigits: 0
                  }).format(
                    filteredProducts.reduce((sum, p) =>
                      sum + ((p.unit_cost || 0) * (p.total_pieces || 0)), 0
                    )
                  )}
                </span></span>
                <span>ชิ้นรวม: <span className="font-medium text-gray-900">
                  {new Intl.NumberFormat('th-TH').format(
                    filteredProducts.reduce((sum, p) => sum + (p.total_pieces || 0), 0)
                  )}
                </span></span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <StockSummaryTable
        products={filteredProducts}
        isLoading={isLoading}
        onItemClick={handleItemClick}
      />

      {/* Footer Info */}
      {hasData && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-sm text-gray-500">
              <p>
                📊 ข้อมูลอัปเดตล่าสุด: {new Date().toLocaleString('th-TH')} |
                🏪 รวมจากทุก location ในระบบ |
                📈 อัปเดตอัตโนมัติทุก 30 วินาที
              </p>
              <p className="text-xs text-gray-400 mt-1">
                🔢 จำนวนรวม (ชิ้น) คำนวณจาก: (ลัง × อัตราแปลงลัง) + (กล่อง × อัตราแปลงกล่อง) + ชิ้น
              </p>
              {meta.isUsingFallback && (
                <p className="text-blue-600 mt-2">
                  🔄 ใช้ข้อมูลจาก Inventory Items (Database views ไม่พร้อม)
                </p>
              )}
              {!meta.viewExists && meta.isUsingFallback && (
                <p className="text-orange-600 mt-1">
                  ⚠️ ระบบทำงานในโหมด Fallback - ข้อมูลมาจากการรวมข้อมูล Inventory
                </p>
              )}
              {meta.viewExists && !meta.isUsingFallback && (
                <p className="text-green-600 mt-1">
                  ✅ ใช้ข้อมูลจาก Database Views - ประสิทธิภาพสูงสุด
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}