/**
 * Daily Shipment Summary - สรุปยอดส่งออกรายวัน + รวมบิลส่ง Csmile
 */

import { useState, useMemo, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Calendar,
  Package,
  FileText,
  User,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Copy,
  FileSpreadsheet,
  Send,
  Eye,
  Truck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

// API Configuration
const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

interface ShipmentItem {
  LINEID: number;
  PRODUCTCODE: string;
  PRODUCTNAME: string;
  QUANTITY: number;
  UNIT: string;
}

interface ShipmentInvoice {
  TAXNO: string;
  TAXDATE: string;
  DOCNO: string;
  DOCDATE: string;
  ARCODE: string;
  ARNAME: string;
  TOTALAMOUNT: number;
  ITEM_COUNT: number;
  ITEMS: ShipmentItem[];
  // เพิ่มสถานะการ Picking
  pickingStatus?: 'pending' | 'picked' | 'shipped';
  pickedAt?: string;
}

interface CustomerSummary {
  arcode: string;
  arname: string;
  invoiceCount: number;
  itemCount: number;
  totalQuantity: number;
  invoices: ShipmentInvoice[];
  isSelected: boolean;
  csmileStatus: 'pending' | 'exported' | 'confirmed';
}

// Fetch packing list data
const fetchShipmentData = async (taxDate: string): Promise<ShipmentInvoice[]> => {
  const response = await fetch(`${SALES_API_BASE}/sales/packing-list?tax_date=${taxDate}`);
  if (!response.ok) {
    throw new Error('Failed to fetch shipment data');
  }
  const result = await response.json();
  return result.data || [];
};

export const DailyShipmentSummary = () => {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];

  // State
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');

  // Fetch data
  const { data: shipmentData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['shipmentSummary', selectedDate],
    queryFn: () => fetchShipmentData(selectedDate),
    staleTime: 30000,
  });

  // Group by customer
  const customerSummaries = useMemo((): CustomerSummary[] => {
    if (!shipmentData) return [];

    const customerMap = new Map<string, CustomerSummary>();

    shipmentData.forEach(invoice => {
      const key = invoice.ARCODE;
      
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          arcode: invoice.ARCODE,
          arname: invoice.ARNAME,
          invoiceCount: 0,
          itemCount: 0,
          totalQuantity: 0,
          invoices: [],
          isSelected: selectedCustomers.has(key),
          csmileStatus: 'pending'
        });
      }

      const customer = customerMap.get(key)!;
      customer.invoiceCount++;
      customer.itemCount += invoice.ITEM_COUNT || 0;
      customer.totalQuantity += (invoice.ITEMS || []).reduce((sum, item) => sum + (item.QUANTITY || 0), 0);
      customer.invoices.push(invoice);
    });

    return Array.from(customerMap.values()).sort((a, b) => a.arcode.localeCompare(b.arcode));
  }, [shipmentData, selectedCustomers]);

  // Calculate summary
  const summary = useMemo(() => {
    const selected = customerSummaries.filter(c => selectedCustomers.has(c.arcode));
    return {
      totalCustomers: customerSummaries.length,
      selectedCustomers: selected.length,
      totalInvoices: customerSummaries.reduce((sum, c) => sum + c.invoiceCount, 0),
      selectedInvoices: selected.reduce((sum, c) => sum + c.invoiceCount, 0),
      totalItems: customerSummaries.reduce((sum, c) => sum + c.itemCount, 0),
      selectedItems: selected.reduce((sum, c) => sum + c.itemCount, 0),
      totalQuantity: customerSummaries.reduce((sum, c) => sum + c.totalQuantity, 0),
      selectedQuantity: selected.reduce((sum, c) => sum + c.totalQuantity, 0),
    };
  }, [customerSummaries, selectedCustomers]);

  // Toggle customer selection
  const toggleCustomer = (arcode: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(arcode)) {
      newSelected.delete(arcode);
    } else {
      newSelected.add(arcode);
    }
    setSelectedCustomers(newSelected);
  };

  // Select all / Deselect all
  const selectAll = () => {
    setSelectedCustomers(new Set(customerSummaries.map(c => c.arcode)));
  };

  const deselectAll = () => {
    setSelectedCustomers(new Set());
  };

  // Generate export data
  const generateExportData = (): string[][] => {
    const headers = ['ARCODE', 'ARNAME', 'TAXNO', 'TAXDATE', 'DOCNO', 'PRODUCTCODE', 'PRODUCTNAME', 'QUANTITY', 'UNIT'];
    const rows: string[][] = [headers];

    customerSummaries
      .filter(c => selectedCustomers.has(c.arcode))
      .forEach(customer => {
        customer.invoices.forEach(invoice => {
          (invoice.ITEMS || []).forEach(item => {
            rows.push([
              customer.arcode,
              customer.arname,
              invoice.TAXNO,
              invoice.TAXDATE,
              invoice.DOCNO,
              item.PRODUCTCODE,
              item.PRODUCTNAME,
              item.QUANTITY.toString(),
              item.UNIT || 'ชิ้น'
            ]);
          });
        });
      });

    return rows;
  };

  // Export to CSV
  const exportToCSV = () => {
    const data = generateExportData();
    const csvContent = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `csmile_export_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: '✅ ส่งออก CSV สำเร็จ',
      description: `บันทึกไฟล์ csmile_export_${selectedDate}.csv แล้ว`,
    });
  };

  // Export to Excel (simple CSV with .xlsx extension for now)
  const exportToExcel = () => {
    const data = generateExportData();
    const csvContent = data.map(row => row.map(cell => `"${cell}"`).join('\t')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `csmile_export_${selectedDate}.xls`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: '✅ ส่งออก Excel สำเร็จ',
      description: `บันทึกไฟล์ csmile_export_${selectedDate}.xls แล้ว`,
    });
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const data = generateExportData();
    const text = data.map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(text);

    toast({
      title: '📋 คัดลอกแล้ว',
      description: 'คัดลอกข้อมูลไปยัง Clipboard แล้ว สามารถวางใน Excel ได้เลย',
    });
  };

  // Quick date filters
  const setToday = () => setSelectedDate(today);
  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="h-7 w-7 text-blue-600" />
            สรุปยอดส่งออกรายวัน
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            รวมบิลและส่งข้อมูลไป Csmile
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>วันที่ส่งออก</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex gap-2 pt-6">
              <Button onClick={setToday} variant="outline" size="sm">
                วันนี้
              </Button>
              <Button onClick={setYesterday} variant="outline" size="sm">
                เมื่อวาน
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ลูกค้า</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.selectedCustomers > 0 ? (
                      <span>{summary.selectedCustomers} / {summary.totalCustomers}</span>
                    ) : (
                      summary.totalCustomers
                    )}
                  </p>
                )}
              </div>
              <User className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ใบกำกับภาษี</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.selectedInvoices > 0 ? (
                      <span>{summary.selectedInvoices} / {summary.totalInvoices}</span>
                    ) : (
                      summary.totalInvoices
                    )}
                  </p>
                )}
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">รายการสินค้า</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.selectedItems > 0 ? (
                      <span>{summary.selectedItems} / {summary.totalItems}</span>
                    ) : (
                      summary.totalItems
                    )}
                  </p>
                )}
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">จำนวนชิ้น</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.selectedQuantity > 0 ? (
                      <span>{summary.selectedQuantity.toLocaleString()}</span>
                    ) : (
                      summary.totalQuantity.toLocaleString()
                    )}
                  </p>
                )}
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              สรุปตามลูกค้า ({customerSummaries.length} ราย)
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                เลือกทั้งหมด
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                ยกเลิกทั้งหมด
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              <p className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">เกิดข้อผิดพลาด: {(error as Error).message}</p>
              <Button onClick={() => refetch()} variant="outline" className="mt-4">
                ลองอีกครั้ง
              </Button>
            </div>
          ) : customerSummaries.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">ไม่มีข้อมูลการส่งออกในวันนี้</p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {customerSummaries.map((customer) => (
                <AccordionItem value={customer.arcode} key={customer.arcode}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedCustomers.has(customer.arcode)}
                          onCheckedChange={() => toggleCustomer(customer.arcode)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="text-left">
                          <p className="font-semibold">{customer.arcode}</p>
                          <p className="text-sm text-gray-600">{customer.arname}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="font-semibold">{customer.invoiceCount} บิล</p>
                          <p className="text-xs text-gray-500">{customer.itemCount} รายการ</p>
                        </div>
                        <div>
                          <p className="font-semibold text-blue-600">{customer.totalQuantity.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">ชิ้น</p>
                        </div>
                        <Badge className={
                          customer.csmileStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                          customer.csmileStatus === 'exported' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {customer.csmileStatus === 'confirmed' ? '✅ ส่งแล้ว' :
                           customer.csmileStatus === 'exported' ? '📤 ส่งออกแล้ว' :
                           '⏳ รอส่ง'}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 pl-10">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>TAXNO</TableHead>
                            <TableHead>วันที่</TableHead>
                            <TableHead>DOCNO</TableHead>
                            <TableHead className="text-right">รายการ</TableHead>
                            <TableHead className="text-right">จำนวน</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customer.invoices.map((invoice, idx) => (
                            <Fragment key={invoice.TAXNO || idx}>
                              <TableRow>
                                <TableCell className="font-mono">{invoice.TAXNO}</TableCell>
                                <TableCell>{formatDate(invoice.TAXDATE)}</TableCell>
                                <TableCell className="font-mono">{invoice.DOCNO}</TableCell>
                                <TableCell className="text-right">{invoice.ITEM_COUNT}</TableCell>
                                <TableCell className="text-right font-semibold text-blue-600">
                                  {(invoice.ITEMS || []).reduce((sum, item) => sum + (item.QUANTITY || 0), 0).toLocaleString()}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell colSpan={5} className="bg-gray-50 p-3">
                                  <div className="space-y-1 text-xs text-gray-700">
                                    {(invoice.ITEMS || []).length > 0 ? (
                                      (invoice.ITEMS || []).map((item) => (
                                        <div
                                          key={item.LINEID}
                                          className="flex items-center justify-between gap-2"
                                        >
                                          <span className="font-mono text-[11px]">{item.PRODUCTCODE}</span>
                                          <span className="flex-1 truncate">{item.PRODUCTNAME}</span>
                                          <span className="text-right font-medium">
                                            {item.QUANTITY.toLocaleString()} {item.UNIT || 'ชิ้น'}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="italic text-gray-400">
                                        ไม่มีข้อมูลสินค้าในใบกำกับภาษีนี้จาก API
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            </Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Export Actions */}
      {selectedCustomers.size > 0 && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">
                  เลือกแล้ว {selectedCustomers.size} ลูกค้า ({summary.selectedInvoices} บิล, {summary.selectedQuantity.toLocaleString()} ชิ้น)
                </p>
                <p className="text-sm text-blue-700">พร้อมส่งออกไป Csmile</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPreviewDialog(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-2" />
                  คัดลอก
                </Button>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" onClick={exportToExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <Send className="h-4 w-4 mr-2" />
                  ส่งไป Csmile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview ข้อมูลที่จะส่ง Csmile
            </DialogTitle>
            <DialogDescription>
              ตรวจสอบข้อมูลก่อนส่งออก
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">สรุป:</p>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{selectedCustomers.size}</p>
                  <p className="text-xs text-gray-500">ลูกค้า</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.selectedInvoices}</p>
                  <p className="text-xs text-gray-500">บิล</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.selectedItems}</p>
                  <p className="text-xs text-gray-500">รายการ</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{summary.selectedQuantity.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">ชิ้น</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>ARCODE</TableHead>
                      <TableHead>TAXNO</TableHead>
                      <TableHead>PRODUCTCODE</TableHead>
                      <TableHead>PRODUCTNAME</TableHead>
                      <TableHead className="text-right">QUANTITY</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerSummaries
                      .filter(c => selectedCustomers.has(c.arcode))
                      .flatMap(customer => 
                        customer.invoices.flatMap(invoice =>
                          (invoice.ITEMS || []).map((item, idx) => (
                            <TableRow key={`${invoice.TAXNO}-${idx}`}>
                              <TableCell className="font-mono text-xs">{customer.arcode}</TableCell>
                              <TableCell className="font-mono text-xs">{invoice.TAXNO}</TableCell>
                              <TableCell className="font-mono text-xs">{item.PRODUCTCODE}</TableCell>
                              <TableCell className="text-xs">{item.PRODUCTNAME}</TableCell>
                              <TableCell className="text-right font-semibold">{item.QUANTITY.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )
                      )
                    }
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              ปิด
            </Button>
            <Button onClick={() => { exportToCSV(); setShowPreviewDialog(false); }}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyShipmentSummary;




