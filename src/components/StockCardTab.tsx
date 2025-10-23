const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Calendar, RefreshCw, Search, FileText, Warehouse as WarehouseIcon, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [productCode, setProductCode] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [location, setLocation] = useState('');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [limit, setLimit] = useState(200);

  const queryParams = useMemo(() => ({
    productCode: productCode || undefined,
    warehouse: warehouse || undefined,
    location: location || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    limit
  }), [productCode, warehouse, location, fromDate, toDate, limit]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['stockCard', queryParams],
    queryFn: () => fetchStockCard(queryParams),
    staleTime: 30000
  });

  const rows = data?.data || [];
  const totalIn = useMemo(() => rows.reduce((s, r) => s + (r.INQTY || 0), 0), [rows]);
  const totalOut = useMemo(() => rows.reduce((s, r) => s + (r.OUTQTY || 0), 0), [rows]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Stock Card (CSSTOCKCARD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>รหัสสินค้า</Label>
              <Input placeholder="เช่น ABC-001" value={productCode} onChange={(e) => setProductCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>คลัง</Label>
              <Input placeholder="เช่น WH01" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ตำแหน่ง</Label>
              <Input placeholder="เช่น A1-01" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>วันที่เริ่ม</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input type="date" className="pl-10" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>วันที่สิ้นสุด</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input type="date" className="pl-10" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limit</Label>
              <Input type="number" min={1} max={5000} value={limit} onChange={(e) => setLimit(Number(e.target.value)||0)} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> รีเฟรช
            </Button>
            <Button
              onClick={() => {
                const d = new Date();
                const t = d.toISOString().split('T')[0];
                setFromDate(t);
                setToDate(t);
              }}
              variant="outline"
              className="gap-2"
            >
              วันนี้
            </Button>
            <Button
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 7);
                setFromDate(start.toISOString().split('T')[0]);
                setToDate(end.toISOString().split('T')[0]);
              }}
              variant="outline"
              className="gap-2"
            >
              7 วัน
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">จำนวนรายการ</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
                )}
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">รวมรับเข้า</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{totalIn.toLocaleString()}</p>
                )}
              </div>
              <WarehouseIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">รวมจ่ายออก</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{totalOut.toLocaleString()}</p>
                )}
              </div>
              <WarehouseIcon className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายละเอียด Movement</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              <p className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">เกิดข้อผิดพลาด</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">ไม่มีข้อมูล</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead className="hidden md:table-cell">เวลา</TableHead>
                    <TableHead>กลุ่ม</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead className="hidden lg:table-cell">ภาษี</TableHead>
                    <TableHead className="hidden lg:table-cell">คลัง</TableHead>
                    <TableHead className="hidden lg:table-cell">ตำแหน่ง</TableHead>
                    <TableHead className="text-right">รับเข้า</TableHead>
                    <TableHead className="text-right">จ่ายออก</TableHead>
                    <TableHead className="text-right">คงเหลือ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{r.DOCDATE ? new Date(r.DOCDATE).toLocaleDateString('th-TH') : '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">{r.STKTIME || '-'}</TableCell>
                      <TableCell>{r.DOCGROUP || '-'}</TableCell>
                      <TableCell>{r.TRANSTYPE || '-'}</TableCell>
                      <TableCell className="font-mono">{r.DOCNO || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{r.TAXNO || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{r.WAREHOUSE || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{r.LOCATION || '-'}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">{(r.INQTY || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">{(r.OUTQTY || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">{(r.BALQTY || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StockCardTab;
