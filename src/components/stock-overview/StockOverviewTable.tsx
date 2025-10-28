import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, MapPin, AlertCircle } from 'lucide-react';
import type { StockOverviewItem } from '@/hooks/useStockOverview';

interface StockOverviewTableProps {
  items: StockOverviewItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  onLocationClick?: (location: string) => void; // ⭐ เพิ่ม callback เมื่อคลิก location
}

const PRODUCT_TYPES = ['ทั้งหมด', 'FG', 'PK', 'RM', 'อื่นๆ'];

export function StockOverviewTable({
  items,
  searchTerm,
  setSearchTerm,
  selectedType,
  setSelectedType,
  onLocationClick
}: StockOverviewTableProps) {

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH').format(Math.round(num));
  };

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold text-gray-800">
              รายละเอียดสินค้า ({items.length} รายการ)
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหา SKU, ชื่อสินค้า, ประเภท..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Product Type Filter */}
          <div className="flex gap-2 flex-wrap">
            {PRODUCT_TYPES.map(type => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className={`transition-all ${
                  selectedType === type
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 hover:bg-gray-100">
                <TableHead className="font-semibold text-gray-700">SKU Code</TableHead>
                <TableHead className="font-semibold text-gray-700">ชื่อสินค้า</TableHead>
                <TableHead className="font-semibold text-gray-700">ประเภท</TableHead>
                <TableHead className="font-semibold text-gray-700">แบรนด์</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">จำนวนชิ้น</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">จำนวนลัง</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">ตำแหน่ง</TableHead>
                <TableHead className="font-semibold text-gray-700">สถานที่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีข้อมูล'}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => {
                  const isZeroStock = item.totalPieces === 0;
                  return (
                    <TableRow
                      key={index}
                      className={`hover:bg-gray-50 transition-colors ${
                        isZeroStock ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <TableCell className="font-mono font-medium text-gray-900">
                        {item.skuCode}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-gray-800">
                        {item.productName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-gray-300 text-gray-700 font-medium"
                        >
                          {item.productType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700">{item.brand || '-'}</TableCell>
                      <TableCell className={`text-right font-semibold ${
                        isZeroStock ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {isZeroStock && (
                          <AlertCircle className="inline-block h-4 w-4 mr-1 mb-0.5" />
                        )}
                        {formatNumber(item.totalPieces)}
                        {isZeroStock && <span className="ml-1 text-xs">(สต็อก 0)</span>}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        isZeroStock ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {formatNumber(item.totalCartons)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isZeroStock ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            0
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">
                            <MapPin className="h-3 w-3" />
                            {item.locationCount}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isZeroStock ? (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                            ไม่มีตำแหน่ง
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.locations.slice(0, 3).map((location, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-blue-100 hover:border-blue-500 transition-colors"
                                onClick={() => onLocationClick?.(location)}
                              >
                                {location}
                              </Badge>
                            ))}
                            {item.locations.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.locations.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
