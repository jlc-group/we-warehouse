/**
 * External Sales Details Modal
 * แสดงรายละเอียดเอกสารขาย + รายการสินค้า (CSSALE + CSSALESUB)
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  FileText,
  User,
  Calendar,
  DollarSign,
  Package,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useExternalSalesOrderDetails } from '@/hooks/useExternalSalesOrders';

interface ExternalSalesDetailsModalProps {
  docno: string;
  open: boolean;
  onClose: () => void;
}

export const ExternalSalesDetailsModal = ({
  docno,
  open,
  onClose
}: ExternalSalesDetailsModalProps) => {
  const { data, isLoading, error } = useExternalSalesOrderDetails(docno);

  const sale = data?.data;
  const items = sale?.items || [];

  const formatCurrency = (value: number | null) => {
    if (!value) return '฿0';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: Date | null | string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            รายละเอียดเอกสารขาย: {docno}
          </DialogTitle>
          <DialogDescription>
            ข้อมูลจาก External Database (SQL Server)
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
            <p className="text-gray-600 text-sm">{error.message}</p>
          </div>
        ) : !sale ? (
          <div className="text-center py-12">
            <p className="text-gray-600">ไม่พบข้อมูลเอกสาร</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    ข้อมูลเอกสาร
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">เลขที่เอกสาร:</span>
                    <span className="text-sm font-semibold">{sale.DOCNO}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ประเภท:</span>
                    <span className="text-sm">{sale.DOCTYPE || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">วันที่เอกสาร:</span>
                    <span className="text-sm">{formatDate(sale.DOCDATE)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">วันที่ใบกำกับภาษี:</span>
                    <span className="text-sm">{formatDate(sale.TAXDATE)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">เลขที่ใบกำกับภาษี:</span>
                    <span className="text-sm">{sale.TAXNO || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">สถานะ:</span>
                    <Badge variant={sale.CLOSEFLAG === 'Y' ? 'secondary' : 'default'}>
                      {sale.CLOSEFLAG === 'Y' ? 'ปิดแล้ว' : 'เปิดอยู่'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    ข้อมูลลูกค้า
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">รหัสลูกค้า:</span>
                    <span className="text-sm font-semibold">{sale.ARCODE}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ชื่อลูกค้า:</span>
                    <span className="text-sm">{sale.ARNAME || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">ที่อยู่:</span>
                    <span className="text-sm text-gray-900">{sale.BILLADDR || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">เลขประจำตัวผู้เสียภาษี:</span>
                    <span className="text-sm">{sale.TAXID || '-'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  สรุปยอดเงิน
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">ยอดรวมก่อนส่วนลด</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(sale.SUMAMOUNT1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">ส่วนลดรวม</p>
                    <p className="text-lg font-semibold text-red-600">
                      - {formatCurrency((sale.DISCAMOUNT || 0) + (sale.DISCAMOUNT2 || 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">ภาษีมูลค่าเพิ่ม ({((sale.TAXRATE || 0) * 100).toFixed(0)}%)</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(sale.TAXAMOUNT)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">ยอดรวมสุทธิ</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(sale.TOTALAMOUNT)}</p>
                  </div>
                </div>

                {sale.DEBTAMOUNT != null && sale.DEBTAMOUNT > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">ยอดหนี้</p>
                        <p className="text-lg font-semibold text-orange-600">{formatCurrency(sale.DEBTAMOUNT)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">ยอดหนี้คงเหลือ</p>
                        <p className="text-lg font-semibold text-red-600">{formatCurrency(sale.DEBTBALANCE)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  รายการสินค้า ({sale.itemCount || 0} รายการ)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    ไม่มีรายการสินค้า
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>รหัสสินค้า</TableHead>
                        <TableHead>ชื่อสินค้า</TableHead>
                        <TableHead className="text-center">จำนวน</TableHead>
                        <TableHead className="text-center">หน่วย</TableHead>
                        <TableHead className="text-right">ราคา/หน่วย</TableHead>
                        <TableHead className="text-right">ส่วนลด</TableHead>
                        <TableHead className="text-right">ยอดรวม</TableHead>
                        <TableHead>คลัง</TableHead>
                        <TableHead>ตำแหน่ง</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={item.LINEID}>
                          <TableCell className="text-gray-500">{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.PRODUCTCODE}</TableCell>
                          <TableCell className="max-w-xs truncate">{item.PRODUCTNAME}</TableCell>
                          <TableCell className="text-center font-semibold">{item.QUANTITY}</TableCell>
                          <TableCell className="text-center">{item.UNITNAME || item.UNITCODE || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.UNITPRICE)}</TableCell>
                          <TableCell className="text-right text-red-600">
                            {item.DISCAMOUNT ? `- ${formatCurrency(item.DISCAMOUNT)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(item.NETAMOUNT)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.WAREHOUSE || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">{item.LOCATION || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Additional Info */}
            {(sale.REMARK || sale.SALECODE || sale.DEPARTMENT) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    ข้อมูลเพิ่มเติม
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sale.SALECODE && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">พนักงานขาย:</span>
                      <span className="text-sm">{sale.SALECODE}</span>
                    </div>
                  )}
                  {sale.DEPARTMENT && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">แผนก:</span>
                      <span className="text-sm">{sale.DEPARTMENT}</span>
                    </div>
                  )}
                  {sale.PROJECT && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">โครงการ:</span>
                      <span className="text-sm">{sale.PROJECT}</span>
                    </div>
                  )}
                  {sale.REMARK && (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-600">หมายเหตุ:</span>
                      <span className="text-sm text-gray-900">{sale.REMARK}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
