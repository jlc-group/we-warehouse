import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStockOverview, StockOverviewItem } from '@/hooks/useStockOverview';
import { StockOverviewStats } from './StockOverviewStats';
import { StockOverviewTable } from './StockOverviewTable';
import { exportStockOverviewToCSV } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';

interface StockOverviewPageProps {
  warehouseId?: string;
}

export function StockOverviewPage({ warehouseId }: StockOverviewPageProps) {
  const { items, generatedAt, isLoading, error, refresh } = useStockOverview(warehouseId);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ทั้งหมด');
  const { toast } = useToast();

  // Calculate filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Filter by search term
      const matchesSearch = item.skuCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filter by product type
      const matchesType = selectedType === 'ทั้งหมด' || item.productType === selectedType;

      return matchesSearch && matchesType;
    });
  }, [items, searchTerm, selectedType]);

  // Calculate summary from filtered items
  const filteredSummary = useMemo(() => {
    const uniqueSkus = new Set(filteredItems.map(item => item.skuCode));
    const uniqueLocations = new Set(filteredItems.flatMap(item => item.locations));

    return {
      totalItems: filteredItems.length,
      totalProducts: uniqueSkus.size,
      totalLocations: uniqueLocations.size,
      totalPieces: filteredItems.reduce((sum, item) => sum + item.totalPieces, 0),
      totalCartons: filteredItems.reduce((sum, item) => sum + item.totalCartons, 0),
      timestamp: Date.now()
    };
  }, [filteredItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          เกิดข้อผิดพลาดในการโหลดข้อมูล: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const handleExport = () => {
    try {
      exportStockOverviewToCSV(filteredItems, 'stock_overview');
      toast({
        title: 'ส่งออกข้อมูลสำเร็จ',
        description: `ส่งออกข้อมูล ${filteredItems.length} รายการเรียบร้อยแล้ว`,
      });
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถส่งออกข้อมูลได้',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">สรุปข้อมูลคลัง</h2>
          <p className="text-sm text-gray-600 mt-1">
            ข้อมูลอัพเดททุก 3 ชั่วโมง • แสดงสินค้าทั้งหมดรวมสต็อก 0
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="gap-2 border-green-600 text-green-700 hover:bg-green-50"
          >
            <Download className="h-4 w-4" />
            ส่งออก CSV
          </Button>
          <Button
            onClick={() => refresh()}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Summary Statistics - now updates with filters */}
      <StockOverviewStats summary={filteredSummary} lastUpdated={generatedAt} />

      {/* Detailed Table */}
      <StockOverviewTable
        items={filteredItems}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
      />
    </div>
  );
}
