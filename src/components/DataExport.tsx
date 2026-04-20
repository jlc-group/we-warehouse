import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';

type ExportableTable = {
  key: string;
  label: string;
  description: string;
  orderBy?: { column: string; ascending: boolean };
};

const TABLES: ExportableTable[] = [
  { key: 'inventory_items', label: 'รายการสต็อก (Inventory)', description: 'ข้อมูลสต็อกทุกรายการพร้อม location, lot, จำนวนหน่วยหลายระดับ', orderBy: { column: 'location', ascending: true } },
  { key: 'products', label: 'สินค้า (Products)', description: 'รายการสินค้าหลัก (SKU master)', orderBy: { column: 'sku_code', ascending: true } },
  { key: 'product_conversion_rates', label: 'อัตราแปลงหน่วย', description: 'อัตราแปลงหน่วย ลัง/กล่อง/ชิ้น ของแต่ละ SKU' },
  { key: 'warehouse_locations', label: 'ตำแหน่งคลัง (Locations)', description: 'Location ทั้งหมดในระบบ' },
  { key: 'warehouses', label: 'คลังสินค้า (Warehouses)', description: 'Warehouse master', orderBy: { column: 'code', ascending: true } },
  { key: 'inventory_movements', label: 'ประวัติการเคลื่อนไหว', description: 'Movement log ทั้งหมด', orderBy: { column: 'created_at', ascending: false } },
  { key: 'customer_orders', label: 'ใบสั่งซื้อ (Orders)', description: 'Customer orders', orderBy: { column: 'created_at', ascending: false } },
  { key: 'order_items', label: 'รายการในใบสั่งซื้อ', description: 'Order items' },
  { key: 'customers', label: 'ลูกค้า (Customers)', description: 'Customer master' },
  { key: 'users', label: 'ผู้ใช้งาน (Users)', description: 'User accounts' },
];

function timestampSuffix(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

async function fetchAllRows(tableKey: string, orderBy?: { column: string; ascending: boolean }): Promise<any[]> {
  let query: any = localDb.from(tableKey).select('*');
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending });
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as any[]) || [];
}

export const DataExport = () => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ key: string; rows: number; file: string } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleExportExcel = async (t: ExportableTable) => {
    setLoadingKey(t.key);
    setLastError(null);
    setLastResult(null);
    try {
      const rows = await fetchAllRows(t.key, t.orderBy);

      if (rows.length === 0) {
        toast.warning(`ไม่มีข้อมูลในตาราง ${t.label}`);
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto column widths (limited scan for perf)
      const cols = Object.keys(rows[0] ?? {});
      ws['!cols'] = cols.map((c) => {
        const maxLen = Math.max(
          c.length,
          ...rows.slice(0, 200).map((r) => String(r?.[c] ?? '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
      });

      XLSX.utils.book_append_sheet(wb, ws, t.key.slice(0, 31));

      const fileName = `${t.key}_${timestampSuffix()}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setLastResult({ key: t.key, rows: rows.length, file: fileName });
      toast.success(`Export ${t.label} สำเร็จ: ${rows.length} รายการ`);
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      setLastError(`Export ${t.label} ล้มเหลว: ${msg}`);
      toast.error(`Export ล้มเหลว: ${msg}`);
    } finally {
      setLoadingKey(null);
    }
  };

  const handleExportCsv = async (t: ExportableTable) => {
    setLoadingKey(t.key);
    setLastError(null);
    setLastResult(null);
    try {
      const rows = await fetchAllRows(t.key, t.orderBy);
      if (rows.length === 0) {
        toast.warning(`ไม่มีข้อมูลในตาราง ${t.label}`);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileName = `${t.key}_${timestampSuffix()}.csv`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastResult({ key: t.key, rows: rows.length, file: fileName });
      toast.success(`Export CSV ${t.label} สำเร็จ: ${rows.length} รายการ`);
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      setLastError(`Export CSV ${t.label} ล้มเหลว: ${msg}`);
      toast.error(`Export ล้มเหลว: ${msg}`);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Data Export — ส่งออกข้อมูลเป็น Excel / CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              ไฟล์ดาวน์โหลดลงในเครื่องทันที ข้อมูลดึงจาก local PostgreSQL แบบ real-time (ไม่จำกัดจำนวน rows)
            </AlertDescription>
          </Alert>

          {lastResult && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-xs">
                Export ล่าสุด: <strong>{lastResult.file}</strong> ({lastResult.rows.toLocaleString()} rows)
              </AlertDescription>
            </Alert>
          )}
          {lastError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{lastError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            {TABLES.map((t) => {
              const isLoading = loadingKey === t.key;
              return (
                <div
                  key={t.key}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.label}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {t.key}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportExcel(t)}
                      disabled={isLoading}
                      className="h-8"
                    >
                      {isLoading ? (
                        <span className="text-xs">กำลังโหลด...</span>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">Excel</span>
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportCsv(t)}
                      disabled={isLoading}
                      className="h-8"
                    >
                      <span className="text-xs">CSV</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
