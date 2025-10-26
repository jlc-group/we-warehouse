const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, Package, MapPin, List, LayoutGrid, Clock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { useProducts } from '@/contexts/ProductsContext';
import { useWarehouses } from '@/hooks/useWarehouses';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StockCardItem {
  DOCDATE?: string;
  STKTIME?: string;
  DOCGROUP?: string;
  TRANSTYPE?: number | string;
  DOCNO?: string;
  TAXNO?: string;
  PRODUCTCODE?: string;
  WAREHOUSE?: string;
  LOCATION?: string;
  INQTY?: number;
  OUTQTY?: number;
  BALQTY?: number;
  CALCULATED_BALANCE?: number; // ยอดคงเหลือที่คำนวณจริง
  INOUTFLAG?: number;
  ARCODE?: string;
  TABLENAME?: string;
}

interface DocumentType {
  type: 'sale' | 'purchase' | 'transfer' | 'production' | 'unknown';
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

// Helper function: แยกประเภทเอกสาร
const getDocumentType = (row: StockCardItem): DocumentType => {
  const docno = row.DOCNO || '';
  const transtype = Number(row.TRANSTYPE);
  const tablename = row.TABLENAME || '';

  // จาก DOCNO prefix
  if (docno.startsWith('SA-')) {
    return { type: 'sale', label: 'ใบขาย', icon: '📤', color: 'text-red-700', bgColor: 'bg-red-100' };
  }

  if (docno.startsWith('APP-')) {
    return { type: 'purchase', label: 'ใบรับซื้อ', icon: '📦', color: 'text-blue-700', bgColor: 'bg-blue-100' };
  }

  if (docno.startsWith('TF-')) {
    return { type: 'transfer', label: 'ใบโอนย้าย', icon: '🔄', color: 'text-purple-700', bgColor: 'bg-purple-100' };
  }

  if (docno.startsWith('FG')) {
    return { type: 'production', label: 'ใบรับผลิต', icon: '🏭', color: 'text-green-700', bgColor: 'bg-green-100' };
  }

  // จาก TRANSTYPE + TABLENAME
  if (transtype === 7 && tablename === 'CSSALE') {
    return { type: 'sale', label: 'ใบขาย', icon: '📤', color: 'text-red-700', bgColor: 'bg-red-100' };
  }

  if (transtype === 3 && tablename === 'CSPurchase') {
    return { type: 'purchase', label: 'ใบรับซื้อ', icon: '📦', color: 'text-blue-700', bgColor: 'bg-blue-100' };
  }

  if ((transtype === 11 || transtype === 12) && tablename === 'CSStkMove') {
    return { type: 'transfer', label: 'ใบโอนย้าย', icon: '🔄', color: 'text-purple-700', bgColor: 'bg-purple-100' };
  }

  if (transtype === 1 && tablename === 'CSFG') {
    return { type: 'production', label: 'ใบรับผลิต', icon: '🏭', color: 'text-green-700', bgColor: 'bg-green-100' };
  }

  // Default
  return { type: 'unknown', label: 'อื่นๆ', icon: '📄', color: 'text-gray-700', bgColor: 'bg-gray-100' };
};

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

interface FiltersResponse {
  success: boolean;
  data: {
    products: string[];
    warehouses: string[];
  };
}

const fetchStockCardFilters = async (): Promise<FiltersResponse> => {
  const res = await fetch(`${SALES_API_BASE}/stock/stock-card/filters`);
  if (!res.ok) throw new Error('Failed to fetch filters');
  return res.json();
};

interface StockCardTabNewProps {
  /**
   * Optional filter to show only specific document types
   * - 'transfer': Show only Transfer documents (TF-, TRANSTYPE 11/12)
   * - 'non-transfer': Show all EXCEPT Transfer documents
   * - undefined: Show all documents (default)
   */
  documentTypeFilter?: 'transfer' | 'non-transfer';
  /**
   * Optional title override for the tab
   */
  title?: string;
}

export function StockCardTabNew({ documentTypeFilter, title }: StockCardTabNewProps = {}) {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];

  const [viewMode, setViewMode] = useState<'card' | 'table' | 'timeline'>('card');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]); // เพิ่มฟิลเตอร์ประเภทเอกสาร
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const { products } = useProducts();
  const { data: warehouses = [] } = useWarehouses(true);

  // Fetch filters from CSSTOCKCARD
  const { data: filtersData } = useQuery({
    queryKey: ['stockCardFilters'],
    queryFn: fetchStockCardFilters,
    staleTime: 300000 // Cache for 5 minutes
  });

  const productOptions: MultiSelectOption[] = useMemo(() => {
    if (!filtersData?.data?.products) return [];

    return filtersData.data.products.map(code => {
      // Try to get product name from our products list
      const product = products.find(p => p.sku_code === code);
      return {
        value: code,
        label: code,
        description: product?.product_name || code
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [filtersData, products]);

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
    if (!filtersData?.data?.warehouses) return [];

    return filtersData.data.warehouses.map(code => {
      // Try to get warehouse name from our warehouses list
      const wh = warehouses.find(w => w.code === code);
      return {
        value: code,
        label: wh?.name || code,
        description: code
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [filtersData, warehouses]);

  // ตัวเลือกประเภทเอกสาร
  const docTypeOptions: MultiSelectOption[] = [
    { value: 'sale', label: '📤 ใบขาย', description: 'Sales (SA-)' },
    { value: 'purchase', label: '📦 ใบรับซื้อ', description: 'Purchase (APP-)' },
    { value: 'transfer', label: '🔄 ใบโอนย้าย', description: 'Transfer (TF-)' },
    { value: 'production', label: '🏭 ใบรับผลิต', description: 'Production (FG)' },
    { value: 'unknown', label: '📄 อื่นๆ', description: 'Other' },
  ];

  const queryParams = useMemo(() => ({
    productCode: selectedProducts.join(',') || undefined,
    warehouse: selectedWarehouses.join(',') || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    limit: 500
  }), [selectedProducts, selectedWarehouses, fromDate, toDate]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['stockCard', queryParams],
    queryFn: () => fetchStockCard(queryParams),
    staleTime: 30000
  });

  const allRows = data?.data || [];

  const rows = useMemo(() => {
    let filteredRows = allRows;

    // Apply document type filter if specified
    if (documentTypeFilter) {
      filteredRows = filteredRows.filter(row => {
        const docType = getDocumentType(row);

        if (documentTypeFilter === 'transfer') {
          // Show ONLY transfer documents
          return docType.type === 'transfer';
        } else if (documentTypeFilter === 'non-transfer') {
          // Show all EXCEPT transfer documents
          return docType.type !== 'transfer';
        }

        return true;
      });
    }

    // Apply document type filter from multi-select (ฟิลเตอร์ประเภทเอกสาร)
    if (selectedDocTypes.length > 0) {
      filteredRows = filteredRows.filter(row => {
        const docType = getDocumentType(row);
        return selectedDocTypes.includes(docType.type);
      });
    }

    // Apply product type filter if selected
    if (selectedProductTypes.length > 0) {
      const productCodesInSelectedTypes = products
        .filter(p => selectedProductTypes.includes(p.product_type))
        .map(p => p.sku_code);

      filteredRows = filteredRows.filter(row =>
        row.PRODUCTCODE && productCodesInSelectedTypes.includes(row.PRODUCTCODE)
      );
    }

    return filteredRows;
  }, [allRows, selectedProductTypes, selectedDocTypes, products, documentTypeFilter]);

  const totalIn = useMemo(() => rows.reduce((s, r) => s + (r.INQTY || 0), 0), [rows]);
  const totalOut = useMemo(() => rows.reduce((s, r) => s + (r.OUTQTY || 0), 0), [rows]);

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
      {/* Optional Title */}
      {title && (
        <Card className="border-2 border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Filter Section */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                ประเภทเอกสาร {selectedDocTypes.length > 0 && `(${selectedDocTypes.length})`}
              </Label>
              <MultiSelect
                options={docTypeOptions}
                selected={selectedDocTypes}
                onChange={setSelectedDocTypes}
                placeholder="เลือกประเภท..."
                searchPlaceholder="ค้นหาประเภทเอกสาร..."
              />
            </div>

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

      {/* View Mode Selector */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                แบบการ์ด (เน้นสินค้า)
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                แบบตาราง (Excel)
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                แบบ Timeline
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Package className="h-4 w-4" />
            <span className="font-medium">หมายเหตุ:</span>
            <span>ยอดคงเหลือคำนวณจาก IN - OUT ของรายการที่แสดง (ข้อมูลจาก CSSTOCKCARD)</span>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">รับเข้าทั้งหมด</div>
            <div className="text-2xl font-bold text-blue-600">{totalIn.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-200 bg-red-50/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">ส่งออกทั้งหมด</div>
            <div className="text-2xl font-bold text-red-600">{totalOut.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">คงเหลือ</div>
            <div className={`text-2xl font-bold ${totalIn - totalOut >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(totalIn - totalOut).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 bg-purple-50/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">จำนวนรายการ</div>
            <div className="text-2xl font-bold text-purple-600">{rows.length.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'card' && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">การ์ดแบบเน้นสินค้า</h3>
          {rows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                ไม่พบข้อมูล Stock Card
              </CardContent>
            </Card>
          ) : (
            rows.map((row, idx) => {
              const docType = getDocumentType(row);
              return (
              <Card key={idx} className={`border-l-4 ${row.INQTY && row.INQTY > 0 ? 'border-l-green-500 bg-green-50/30' : 'border-l-red-500 bg-red-50/30'}`}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Product Info */}
                    <div className="md:col-span-2">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${row.INQTY && row.INQTY > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                          <Package className="h-5 w-5 text-gray-700" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg">{row.PRODUCTCODE}</div>
                          <div className="text-sm text-gray-600">{getProductName(row.PRODUCTCODE || '')}</div>
                          <Badge className={`mt-1 ${docType.bgColor} ${docType.color} border-0`}>
                            {docType.icon} {docType.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Warehouse & Date */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">คลัง</div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold">{getWarehouseName(row.WAREHOUSE || '')}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">{formatDate(row.DOCDATE)}</div>
                    </div>

                    {/* Movement */}
                    <div>
                      {row.INQTY && row.INQTY > 0 ? (
                        <>
                          <div className="text-xs text-gray-500 mb-1">รับเข้า</div>
                          <div className="text-2xl font-bold text-green-600">+{row.INQTY.toLocaleString()}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-gray-500 mb-1">ส่งออก</div>
                          <div className="text-2xl font-bold text-red-600">-{(row.OUTQTY || 0).toLocaleString()}</div>
                        </>
                      )}
                    </div>

                    {/* Balance */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">คงเหลือ</div>
                      <div className="text-2xl font-bold text-gray-700">{(row.CALCULATED_BALANCE || 0).toLocaleString()}</div>
                      <Badge variant="outline" className="mt-1 text-xs">{row.DOCNO}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            })
          )}
        </div>
      )}

      {viewMode === 'table' && (
        <Card>
          <CardHeader>
            <CardTitle>ตารางแบบ Excel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="p-2 text-left text-xs font-semibold">วันที่</th>
                    <th className="p-2 text-left text-xs font-semibold">รหัสสินค้า</th>
                    <th className="p-2 text-left text-xs font-semibold">ชื่อสินค้า</th>
                    <th className="p-2 text-left text-xs font-semibold">ประเภท</th>
                    <th className="p-2 text-left text-xs font-semibold">คลัง</th>
                    <th className="p-2 text-right text-xs font-semibold">รับเข้า</th>
                    <th className="p-2 text-right text-xs font-semibold">ส่งออก</th>
                    <th className="p-2 text-right text-xs font-semibold">คงเหลือ</th>
                    <th className="p-2 text-left text-xs font-semibold">เอกสาร</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500">
                        ไม่พบข้อมูล Stock Card
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => {
                      const docType = getDocumentType(row);
                      return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-xs">{formatDate(row.DOCDATE)}</td>
                        <td className="p-2 text-xs font-semibold">{row.PRODUCTCODE}</td>
                        <td className="p-2 text-xs">{getProductName(row.PRODUCTCODE || '')}</td>
                        <td className="p-2 text-xs">
                          <Badge className={`${docType.bgColor} ${docType.color} border-0 text-xs`}>
                            {docType.icon} {docType.label}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs">{getWarehouseName(row.WAREHOUSE || '')}</td>
                        <td className="p-2 text-xs text-right text-green-600 font-semibold">
                          {row.INQTY && row.INQTY > 0 ? row.INQTY.toLocaleString() : '-'}
                        </td>
                        <td className="p-2 text-xs text-right text-red-600 font-semibold">
                          {row.OUTQTY && row.OUTQTY > 0 ? row.OUTQTY.toLocaleString() : '-'}
                        </td>
                        <td className="p-2 text-xs text-right font-semibold">{(row.CALCULATED_BALANCE || 0).toLocaleString()}</td>
                        <td className="p-2 text-xs text-gray-600">{row.DOCNO}</td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'timeline' && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Timeline แสดงการเคลื่อนไหว</h3>
          {rows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                ไม่พบข้อมูล Stock Card
              </CardContent>
            </Card>
          ) : (
            <div className="relative pl-8 border-l-2 border-gray-300">
              {rows.map((row, idx) => {
                const docType = getDocumentType(row);
                return (
                <div key={idx} className="mb-6 relative">
                  <div className={`absolute -left-[33px] w-4 h-4 rounded-full ${row.INQTY && row.INQTY > 0 ? 'bg-green-500' : 'bg-red-500'} border-4 border-white`} />
                  <Card className="ml-4">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            <span className="font-bold">{row.PRODUCTCODE}</span>
                            <span className="text-sm text-gray-600">{getProductName(row.PRODUCTCODE || '')}</span>
                            <Badge className={`${docType.bgColor} ${docType.color} border-0 text-xs`}>
                              {docType.icon} {docType.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>📅 {formatDate(row.DOCDATE)}</span>
                            <span>🏢 {getWarehouseName(row.WAREHOUSE || '')}</span>
                            <span>📄 {row.DOCNO}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {row.INQTY && row.INQTY > 0 ? (
                            <div className="text-2xl font-bold text-green-600">+{row.INQTY.toLocaleString()}</div>
                          ) : (
                            <div className="text-2xl font-bold text-red-600">-{(row.OUTQTY || 0).toLocaleString()}</div>
                          )}
                          <div className="text-sm text-gray-500">คงเหลือ: {(row.CALCULATED_BALANCE || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
