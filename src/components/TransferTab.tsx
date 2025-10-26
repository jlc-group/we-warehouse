const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Package, MapPin, ArrowRightLeft, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { useProducts } from '@/contexts/ProductsContext';
import { useWarehouses } from '@/hooks/useWarehouses';

interface TransferItem {
  DOCDATE?: string;
  DOCNO?: string;
  REMARK?: string;
  WAREHOUSE_FROM?: string;
  LOCATION_FROM?: string;
  WAREHOUSE_TO?: string;
  LOCATION_TO?: string;
  PRODUCTCODE?: string;
  PRODUCTNAME?: string;
  TRANSFERQTY?: number;
  UNITCODE?: string;
  PRODUCTREMARK?: string;
  WAREHOUSE?: string;
  LOCATION?: string;
  WAREHOUSEIN?: string;
  LOCATIONIN?: string;
  TABLENAME?: string;
  TRANSTYPE?: number;
}

interface ApiResponse {
  success: boolean;
  data: TransferItem[];
  count: number;
}

const fetchTransferDocuments = async (params: {
  productCode?: string;
  warehouse?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<ApiResponse> => {
  const qs = new URLSearchParams();
  if (params.productCode) qs.append('productCode', params.productCode);
  if (params.warehouse) qs.append('warehouse', params.warehouse);
  if (params.from) qs.append('from', params.from);
  if (params.to) qs.append('to', params.to);
  qs.append('limit', String(params.limit ?? 200));

  const res = await fetch(`${SALES_API_BASE}/stock/transfers?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch transfer documents');
  return res.json();
};

export function TransferTab() {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const { products } = useProducts();
  const { data: warehouses = [] } = useWarehouses(true);

  const productOptions: MultiSelectOption[] = useMemo(() => {
    const uniqueProducts = Array.from(new Set(products.map(p => p.sku_code))).filter(Boolean);
    return uniqueProducts.map(code => {
      const product = products.find(p => p.sku_code === code);
      return {
        value: code,
        label: code,
        description: product?.product_name || code
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const warehouseOptions: MultiSelectOption[] = useMemo(() => {
    return warehouses.map(wh => ({
      value: wh.code || wh.id,
      label: wh.name,
      description: wh.code
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [warehouses]);

  const queryParams = useMemo(() => ({
    productCode: selectedProducts.join(',') || undefined,
    warehouse: selectedWarehouses.join(',') || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    limit: 500
  }), [selectedProducts, selectedWarehouses, fromDate, toDate]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['transfers', queryParams],
    queryFn: () => fetchTransferDocuments(queryParams),
    staleTime: 30000
  });

  const transfers = data?.data || [];

  // Group transfers by DOCNO
  const transfersByDoc = useMemo(() => {
    const grouped = new Map<string, TransferItem[]>();
    transfers.forEach(item => {
      const docno = item.DOCNO || 'UNKNOWN';
      if (!grouped.has(docno)) {
        grouped.set(docno, []);
      }
      grouped.get(docno)!.push(item);
    });
    return Array.from(grouped.entries()).map(([docno, items]) => ({
      docno,
      items,
      docdate: items[0]?.DOCDATE,
      remark: items[0]?.REMARK,
      totalQty: items.reduce((sum, item) => sum + (item.TRANSFERQTY || 0), 0)
    }));
  }, [transfers]);

  // Get product name helper
  const getProductName = (code: string) => {
    const product = products.find(p => p.sku_code === code);
    return product?.product_name || code;
  };

  // Get warehouse name helper
  const getWarehouseName = (code: string) => {
    const wh = warehouses.find(w => w.code === code);
    return wh?.name || code;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-2 border-purple-200 bg-purple-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-purple-600" />
            <span className="text-purple-600">ใบโอนย้าย (Transfer Documents)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            แสดงข้อมูลการโอนย้ายสินค้าระหว่างคลัง จากตาราง CSStkMove
          </p>
        </CardContent>
      </Card>

      {/* Filter Section */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">วันที่</Label>
              <div className="flex gap-1.5">
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
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
                size="sm"
                className="w-full h-9"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                ค้นหา
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-2 border-purple-200 bg-purple-50/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">จำนวนเอกสาร</div>
            <div className="text-2xl font-bold text-purple-600">{transfersByDoc.length.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">จำนวนรายการ</div>
            <div className="text-2xl font-bold text-blue-600">{transfers.length.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">ปริมาณรวม</div>
            <div className="text-2xl font-bold text-green-600">
              {transfers.reduce((sum, t) => sum + (t.TRANSFERQTY || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Documents List */}
      <div className="space-y-3">
        {transfersByDoc.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              {isLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลใบโอนย้าย'}
            </CardContent>
          </Card>
        ) : (
          transfersByDoc.map(({ docno, items, docdate, remark, totalQty }) => (
            <Card key={docno} className="border-l-4 border-l-purple-500 bg-purple-50/20">
              <CardContent className="p-4">
                {/* Document Header */}
                <div className="flex items-start justify-between mb-3 pb-3 border-b">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="font-bold text-lg">{docno}</span>
                      <Badge className="bg-purple-100 text-purple-700 border-0">
                        🔄 ใบโอนย้าย
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      📅 {formatDate(docdate)} | {remark || 'ไม่มีหมายเหตุ'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">ปริมาณรวม</div>
                    <div className="text-xl font-bold text-purple-600">{totalQty.toLocaleString()}</div>
                  </div>
                </div>

                {/* Product Items */}
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-white rounded-lg border">
                      {/* Product */}
                      <div className="md:col-span-2">
                        <div className="flex items-start gap-2">
                          <div className="p-2 rounded-lg bg-purple-100">
                            <Package className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{item.PRODUCTCODE}</div>
                            <div className="text-xs text-gray-600">{item.PRODUCTNAME || getProductName(item.PRODUCTCODE || '')}</div>
                          </div>
                        </div>
                      </div>

                      {/* From */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">จาก (FROM)</div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-red-400" />
                          <div className="text-xs">
                            <div className="font-semibold">{getWarehouseName(item.WAREHOUSE || '')}</div>
                            <div className="text-gray-500">{item.LOCATION || '-'}</div>
                          </div>
                        </div>
                      </div>

                      {/* To */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">ไป (TO)</div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-green-400" />
                          <div className="text-xs">
                            <div className="font-semibold">{getWarehouseName(item.WAREHOUSEIN || '')}</div>
                            <div className="text-gray-500">{item.LOCATIONIN || '-'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">จำนวน</div>
                        <div className="text-xl font-bold text-purple-600">{(item.TRANSFERQTY || 0).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{item.UNITCODE || 'หน่วย'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
