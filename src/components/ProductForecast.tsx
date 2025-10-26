import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Search, Calendar, TrendingUp, Package, X } from 'lucide-react';
import { useProductForecast } from '@/hooks/useProductForecast';

// Format ตัวเลข
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
};

// Format วันที่
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export function ProductForecast() {
  // Date Range State
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [tempDateRange, setTempDateRange] = useState(dateRange);
  const [searchQuery, setSearchQuery] = useState('');

  // Expanded state tracking
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fetch data
  const { data: forecast, isLoading, error } = useProductForecast({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    search: searchQuery
  });

  // Handle date filter apply
  const handleApplyFilter = () => {
    setDateRange(tempDateRange);
  };

  // Handle expand/collapse
  const toggleExpand = (baseCode: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(baseCode)) {
        next.delete(baseCode);
      } else {
        next.add(baseCode);
      }
      return next;
    });
  };

  // Expand/Collapse all
  const expandAll = () => {
    if (forecast) {
      setExpandedItems(new Set(forecast.map(item => item.baseCode)));
    }
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📦 ยอดฟอร์แคสต์สินค้า (Product Forecast)</h2>
        <p className="text-gray-600 mt-1">แสดงยอดรวมตาม Base Code พร้อมคำนวณ Multiplier (X6, X12, etc.)</p>
      </div>

      {/* Filters */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Calendar className="h-5 w-5" />
            ตัวกรอง
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-blue-900">วันที่เริ่มต้น</Label>
              <Input
                id="startDate"
                type="date"
                value={tempDateRange.startDate}
                onChange={(e) => setTempDateRange({ ...tempDateRange, startDate: e.target.value })}
                className="border-blue-300"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-blue-900">วันที่สิ้นสุด</Label>
              <Input
                id="endDate"
                type="date"
                value={tempDateRange.endDate}
                onChange={(e) => setTempDateRange({ ...tempDateRange, endDate: e.target.value })}
                className="border-blue-300"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleApplyFilter} className="w-full bg-blue-600 hover:bg-blue-700">
                <Calendar className="h-4 w-4 mr-2" />
                ค้นหา
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="search">ค้นหา Base Code หรือชื่อสินค้า</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="พิมพ์เพื่อค้นหา..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                disabled={isLoading || !forecast || forecast.length === 0}
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                ขยายทั้งหมด
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                disabled={isLoading || expandedItems.size === 0}
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                ซ่อนทั้งหมด
              </Button>
            </div>
          </div>

          {/* Current Range Display */}
          {dateRange.startDate && dateRange.endDate && (
            <div className="p-3 bg-white border border-blue-300 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>ช่วงเวลาที่เลือก:</strong> {formatDate(dateRange.startDate)} ถึง {formatDate(dateRange.endDate)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {forecast && forecast.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                จำนวน Base Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">{formatNumber(forecast.length)}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                ยอดรวมทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">
                {formatNumber(forecast.reduce((sum, item) => sum + item.totalQty, 0))} ชิ้น
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                มี Multiplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">
                {formatNumber(forecast.filter(item => item.details.some(d => d.multiplier > 1)).length)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              รายการสินค้า
            </span>
            {searchQuery && forecast && (
              <Badge variant="outline" className="text-sm">
                พบ {forecast.length} รายการ
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>เกิดข้อผิดพลาด: {error.message}</p>
            </div>
          ) : !forecast || forecast.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>ไม่พบข้อมูลสินค้า</p>
            </div>
          ) : (
            <div className="space-y-2">
              {forecast.map((item) => (
                <Collapsible
                  key={item.baseCode}
                  open={expandedItems.has(item.baseCode)}
                  onOpenChange={() => toggleExpand(item.baseCode)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {expandedItems.has(item.baseCode) ? (
                          <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="font-semibold text-gray-900">{item.baseCode}</strong>
                            {item.details.some(d => d.multiplier > 1) && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-300">
                                มี Multiplier
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">{item.baseName}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <Badge className="bg-blue-100 text-blue-900 text-lg px-3 py-1">
                          {formatNumber(item.totalQty)} ชิ้น
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="ml-12 mr-4 mt-2 space-y-2 pb-2">
                      {item.details.map((detail, idx) => (
                        <div
                          key={`${detail.originalCode}-${idx}`}
                          className="flex items-start justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700 font-medium">{detail.originalCode}</span>
                              {detail.multiplier > 1 && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                  ×{detail.multiplier}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{detail.originalName}</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            {detail.multiplier > 1 ? (
                              <div className="text-sm">
                                <div className="text-gray-600">
                                  {formatNumber(detail.rawQty)} × {detail.multiplier} =
                                </div>
                                <div className="text-lg font-bold text-blue-700">
                                  {formatNumber(detail.actualQty)} ชิ้น
                                </div>
                              </div>
                            ) : (
                              <div className="text-lg font-semibold text-gray-700">
                                {formatNumber(detail.actualQty)} ชิ้น
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
