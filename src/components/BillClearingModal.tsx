import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign,
  FileText,
  User,
  Calendar,
  Package,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Receipt
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useClearBill,
  getOrderStatusColor,
  getOrderStatusLabel,
  type ClearableOrder
} from '@/hooks/useBillClearing';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContextSimple';

interface BillClearingModalProps {
  open: boolean;
  onClose: () => void;
  order: ClearableOrder | null;
  canClear: boolean;
}

const clearBillSchema = z.object({
  clearedAmount: z.number().min(0, 'จำนวนเงินต้องไม่ติดลบ').optional(),
  notes: z.string().optional(),
});

type ClearBillForm = z.infer<typeof clearBillSchema>;

export function BillClearingModal({ open, onClose, order, canClear }: BillClearingModalProps) {
  const { user } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const clearBill = useClearBill();

  const form = useForm<ClearBillForm>({
    resolver: zodResolver(clearBillSchema),
    defaultValues: {
      clearedAmount: order?.total_amount || 0,
      notes: '',
    },
  });

  const handleSubmit = async (data: ClearBillForm) => {
    if (!order || !user) return;

    try {
      await clearBill.mutateAsync({
        orderId: order.id,
        clearedBy: user.id,
        clearedAmount: data.clearedAmount,
        notes: data.notes,
      });

      setIsConfirming(false);
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error clearing bill:', error);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '฿0.00';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  if (!order) return null;

  const isCleared = order.is_cleared;
  const isOverdue = !isCleared && order.days_since_created && order.days_since_created > 30;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {isCleared ? 'ข้อมูลบิลที่เคลียร์แล้ว' : 'เคลียร์บิลขาย'}
          </DialogTitle>
          <DialogDescription>
            {isCleared
              ? 'ดูรายละเอียดบิลที่เคลียร์แล้ว'
              : 'ตรวจสอบข้อมูลและดำเนินการเคลียร์บิลขาย'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    ข้อมูลบิล
                  </span>
                  <Badge className={getOrderStatusColor(order.status)}>
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">เลขที่บิล</Label>
                    <p className="font-mono text-sm">{order.order_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">ลูกค้า</Label>
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{order.customer_code}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">คลังสินค้า</Label>
                    <p>{order.warehouse_name || 'ไม่ระบุ'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">วันที่สร้างบิล</Label>
                    <p>{new Date(order.created_at).toLocaleDateString('th-TH')}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: th })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">จำนวนเงิน</Label>
                    <p className="font-semibold text-lg">{formatCurrency(order.total_amount)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">สถานะการชำระ</Label>
                    <Badge
                      className={
                        order.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : order.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {order.payment_status === 'paid' ? 'ชำระแล้ว' :
                       order.payment_status === 'pending' ? 'รอชำระ' :
                       order.payment_status === 'partial' ? 'ชำระบางส่วน' : order.payment_status}
                    </Badge>
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {isOverdue && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      เกินกำหนด {Math.floor(order.days_since_created || 0)} วัน
                    </Badge>
                  )}
                  {order.approval_required && !order.is_approved_for_clearing && (
                    <Badge className="bg-orange-100 text-orange-800">
                      <Clock className="h-3 w-3 mr-1" />
                      ต้องอนุมัติก่อนเคลียร์
                    </Badge>
                  )}
                  {order.is_approved_for_clearing && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      อนุมัติแล้ว
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Clearing Information */}
            {isCleared ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    ข้อมูลการเคลียร์บิล
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">วันที่เคลียร์</Label>
                      <p>{order.cleared_at ? new Date(order.cleared_at).toLocaleDateString('th-TH') : '-'}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.cleared_at && formatDistanceToNow(new Date(order.cleared_at), { addSuffix: true, locale: th })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">จำนวนที่เคลียร์</Label>
                      <p className="font-semibold text-lg text-green-600">
                        {formatCurrency(order.cleared_amount)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">ผู้เคลียร์บิล</Label>
                      <p>{order.cleared_by || '-'}</p>
                    </div>
                  </div>
                  {order.cleared_notes && (
                    <div>
                      <Label className="text-sm text-muted-foreground">หมายเหตุการเคลียร์</Label>
                      <p className="text-sm bg-muted p-3 rounded-md">{order.cleared_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Clearing Form */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-4 w-4" />
                    ดำเนินการเคลียร์บิล
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!canClear ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">ไม่มีสิทธิ์เคลียร์บิล</h3>
                      <p className="text-muted-foreground mb-4">
                        คุณไม่มีสิทธิ์ในการเคลียร์บิลขาย กรุณาติดต่อผู้ดูแลระบบ
                      </p>
                      <Badge className="bg-red-100 text-red-800">
                        <Users className="h-3 w-3 mr-1" />
                        ต้องการสิทธิ์: Bill Clearer
                      </Badge>
                    </div>
                  ) : (
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="clearedAmount">จำนวนเงินที่เคลียร์ (฿)</Label>
                          <Input
                            id="clearedAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            {...form.register('clearedAmount', { valueAsNumber: true })}
                            placeholder="0.00"
                          />
                          {form.formState.errors.clearedAmount && (
                            <p className="text-sm text-red-500 mt-1">
                              {form.formState.errors.clearedAmount.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col justify-end">
                          <Label className="text-sm text-muted-foreground mb-2">จำนวนเงินต้นฉบับ</Label>
                          <p className="text-lg font-semibold p-2 bg-muted rounded">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="notes">หมายเหตุการเคลียร์ (ไม่บังคับ)</Label>
                        <Textarea
                          id="notes"
                          {...form.register('notes')}
                          placeholder="ระบุหมายเหตุเพิ่มเติมเกี่ยวกับการเคลียร์บิลนี้..."
                          rows={3}
                        />
                      </div>

                      {/* Confirmation step */}
                      {!isConfirming ? (
                        <Button
                          type="button"
                          onClick={() => setIsConfirming(true)}
                          className="w-full"
                          disabled={clearBill.isPending}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          ตรวจสอบและเคลียร์บิล
                        </Button>
                      ) : (
                        <div className="space-y-4 p-4 border rounded-lg bg-yellow-50">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-yellow-800">ยืนยันการเคลียร์บิล</h4>
                              <p className="text-sm text-yellow-700 mt-1">
                                การดำเนินการนี้จะไม่สามารถยกเลิกได้ กรุณาตรวจสอบข้อมูลให้ถูกต้อง
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsConfirming(false)}
                              disabled={clearBill.isPending}
                            >
                              ยกเลิก
                            </Button>
                            <Button
                              type="submit"
                              className="bg-red-600 hover:bg-red-700"
                              disabled={clearBill.isPending}
                            >
                              {clearBill.isPending ? (
                                <>กำลังดำเนินการ...</>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  ยืนยันเคลียร์บิล
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {isCleared ? 'ปิด' : 'ยกเลิก'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}