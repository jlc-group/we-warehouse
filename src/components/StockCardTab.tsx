const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, ArrowUpCircle, ArrowDownCircle, Package, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { useProducts } from '@/contexts/ProductsContext';
import { useWarehouses } from '@/hooks/useWarehouses';

interface StockCardItem {
  DOCDATE?: string;
  STKTIME?: string;
  DOCGROUP?: string;
  TRANSTYPE?: string;
  DOCNO?: string;
  TAXNO?: string;
  PRODUCTCODE?: string;
  WAREHOUSE?: string;
  LOCATION?: string;
  INQTY?: number;
  OUTQTY?: number;
  BALQTY?: number;
}

interface ApiResponse {
  success: boolean;
  data: StockCardItem[];
  count: number;
}

const fetchStockCard = async (params: {
  productCode?: string;
  warehouse?: string;
  location?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<ApiResponse> => {
  const qs = new URLSearchParams();
  if (params.productCode) qs.append('productCode', params.productCode);
  if (params.warehouse) qs.append('warehouse', params.warehouse);
  if (params.location) qs.append('location', params.location);
  if (params.from) qs.append('from', params.from);
  if (params.to) qs.append('to', params.to);
  qs.append('limit', String(params.limit ?? 200));

  const res = await fetch(`${SALES_API_BASE}/stock/stock-card?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch stock card');
  return res.json();
};

export function StockCardTab() {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];

  // ใช้ array สำหรับ multi-select
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // Fetch data จาก contexts/hooks
  const { products } = useProducts();
  const { data: warehouses = [] } = useWarehouses(true);

  // สร้าง options สำหรับ MultiSelect
  const productOptions: MultiSelectOption[] = useMemo(() => {
    return products
      .filter(p => p.is_active)
      .map(p => ({
        value: p.sku_code,
        label: p.sku_code,
        description: p.product_name
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  // สร้าง Product Type options (FG, PK, etc.)
  const productTypeOptions: MultiSelectOption[] = useMemo(() => {
    const types = new Set(products.map(p => p.product_type));
    return Array.from(types)
      .filter(Boolean)
      .map(type => ({
        value: type,
        label: type === 'FG' ? 'สินค้าสำเร็จรูป (FG)' : type === 'PK' ? 'บรรจุภัณฑ์ (PK)' : type,
        description: type
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const warehouseOptions: MultiSelectOption[] = useMemo(() => {
    return warehouses.map(w => ({
      value: w.code,
      label: w.name,
      description: w.code
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  }, [warehouses]);

  const queryParams = useMemo(() => ({
    productCode: selectedProducts.join(',') || undefined,
    warehouse: selectedWarehouses.join(',') || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    limit: 500 // เพิ่มจาก 200 เป็น 500 เพื่อให้เห็นข้อมูลมากขึ้น
  }), [selectedProducts, selectedWarehouses, fromDate, toDate]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['stockCard', queryParams],
    queryFn: () => fetchStockCard(queryParams),
    staleTime: 30000
  });

  console.log('🔍 Stock Card Debug:', {
    queryParams,
    data,
    isLoading,
    error: error?.message,
    dataLength: data?.data?.length
  });

  const allRows = data?.data || [];

  // Filter by product type on frontend (ก รอง product type ที่ frontend เพราะ backend ยังไม่รองรับ)
  const rows = useMemo(() => {
    if (selectedProductTypes.length === 0) return allRows;

    const productCodesInSelectedTypes = products
      .filter(p => selectedProductTypes.includes(p.product_type))
      .map(p => p.sku_code);

    return allRows.filter(row =>
      row.PRODUCTCODE && productCodesInSelectedTypes.includes(row.PRODUCTCODE)
    );
  }, [allRows, selectedProductTypes, products]);

  const totalIn = useMemo(() => rows.reduce((s, r) => s + (r.INQTY || 0), 0), [rows]);
  const totalOut = useMemo(() => rows.reduce((s, r) => s + (r.OUTQTY || 0), 0), [rows]);

  // คำนวณยอดคงเหลือตามคลัง
  const warehouseBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    // หายอดคงเหลือล่าสุดของแต่ละคลัง
    rows.forEach(row => {
      if (row.WAREHOUSE && row.BALQTY !== undefined) {
        // ใช้ BALQTY ล่าสุด (rows เรียงตามเวลาแล้ว)
        balances[row.WAREHOUSE] = row.BALQTY;
      }
    });

    return balances;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Filter Section - Enhanced */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                กลุ่มสินค้า {selectedProductTypes.length > 0 && `(${selectedProductTypes.length})`}
              </Label>
              <MultiSelect
                options={productTypeOptions}
                selected={selectedProductTypes}
                onChange={setSelectedProductTypes}
                placeholder="เลือกกลุ่ม..."
                searchPlaceholder="ค้นหากลุ่มสินค้า..."
                emptyText="ไม่พบกลุ่มสินค้า"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                รหัสสินค้า {selectedProducts.length > 0 && `(${selectedProducts.length})`}
              </Label>
              <MultiSelect
                options={productOptions}
                selected={selectedProducts}
                onChange={setSelectedProducts}
                placeholder="เลือกสินค้า..."
                searchPlaceholder="ค้นหารหัสสินค้า..."
                emptyText="ไม่พบสินค้า"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                คลัง {selectedWarehouses.length > 0 && `(${selectedWarehouses.length})`}
              </Label>
              <MultiSelect
                options={warehouseOptions}
                selected={selectedWarehouses}
                onChange={setSelectedWarehouses}
                placeholder="เลือกคลัง..."
                searchPlaceholder="ค้นหาคลัง..."
                emptyText="ไม่พบคลัง"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">วันที่เริ่ม - สิ้นสุด</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">&nbsp;</Label>
              <div className="flex gap-2">
                <Button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  size="sm"
                  className="flex-1 h-9"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                  ค้นหา
                </Button>
                <Button
                  onClick={() => {
                    const d = new Date();
                    const t = d.toISOString().split('T')[0];
                    setFromDate(t);
                    setToDate(t);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  วันนี้
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - More Visual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium mb-1">รายการทั้งหมด</p>
                {isLoading ? (
                  <div className="h-7 w-12 bg-blue-200 animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold text-blue-900">{rows.length}</p>
                )}
              </div>
              <Package className="h-8 w-8 text-blue-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium mb-1">รับเข้าทั้งหมด</p>
                {isLoading ? (
                  <div className="h-7 w-16 bg-green-200 animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold text-green-900">{totalIn.toLocaleString()}</p>
                )}
              </div>
              <ArrowUpCircle className="h-8 w-8 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-medium mb-1">ส่งออกทั้งหมด</p>
                {isLoading ? (
                  <div className="h-7 w-16 bg-red-200 animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold text-red-900">{totalOut.toLocaleString()}</p>
                )}
              </div>
              <ArrowDownCircle className="h-8 w-8 text-red-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 font-medium mb-1">สุทธิ</p>
                {isLoading ? (
                  <div className="h-7 w-16 bg-purple-200 animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold text-purple-900">{(totalIn - totalOut).toLocaleString()}</p>
                )}
              </div>
              <Package className="h-8 w-8 text-purple-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Balance Summary */}
      {Object.keys(warehouseBalances).length > 0 && (
        <Card className="border-2 border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-900">
              <MapPin className="h-4 w-4" />
              ยอดคงเหลือตามคลัง (Balance by Warehouse)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(warehouseBalances)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([warehouse, balance]) => (
                  <Card key={warehouse} className="bg-white border-amber-200">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-3.5 w-3.5 text-amber-600" />
                        <p className="font-semibold text-sm text-gray-900">{warehouse}</p>
                      </div>
                      <p className="text-xl font-bold text-amber-900">
                        {balance.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">คงเหลือ</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movement List - Clean & Simple */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">ประวัติการเคลื่อนไหวสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              <p className="ml-3 text-gray-600">กำลังโหลด...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-600 font-medium">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">ไม่พบข้อมูลการเคลื่อนไหว</p>
              <p className="text-gray-400 text-sm mt-1">ลองเปลี่ยนเงื่อนไขการค้นหา</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r, idx) => {
                const isInbound = (r.INQTY || 0) > 0;
                const qty = isInbound ? r.INQTY : r.OUTQTY;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      isInbound
                        ? 'bg-green-50/50 border-green-200 hover:bg-green-50'
                        : 'bg-red-50/50 border-red-200 hover:bg-red-50'
                    }`}
                  >
                    {/* Left: Icon + Type */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`flex-shrink-0 p-2.5 rounded-lg ${
                        isInbound ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {isInbound ? (
                          <ArrowUpCircle className="h-5 w-5 text-white" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5 text-white" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            {r.DOCNO || '-'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {r.DOCGROUP || '-'}
                          </Badge>
                          {r.TRANSTYPE && (
                            <Badge variant="outline" className="text-xs">
                              {r.TRANSTYPE}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {r.DOCDATE ? new Date(r.DOCDATE).toLocaleDateString('th-TH', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </span>
                          {r.STKTIME && (
                            <span className="hidden md:inline">{r.STKTIME}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Center: Warehouse Info */}
                    <div className="hidden lg:flex items-center gap-2 px-4">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">
                          {r.WAREHOUSE || '-'}
                        </div>
                        {r.LOCATION && (
                          <div className="text-xs text-gray-500">{r.LOCATION}</div>
                        )}
                      </div>
                    </div>

                    {/* Right: Quantity & Balance */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          isInbound ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {isInbound ? '+' : '-'}{(qty || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          คงเหลือ: <span className="font-semibold text-gray-700">{(r.BALQTY || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StockCardTab;
