import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
  Calendar,
  CreditCard,
  FileText,
  Calculator,
  Users
} from 'lucide-react';
import {
  AccountingService,
  PaymentSummary,
  SalesBillWithPayment,
  CustomerPaymentSummary
} from '@/services/accountingService';
// FallbackWarehouseService removed - using 3-phase system only
import { useToast } from '@/hooks/use-toast';

export const AccountingDashboard = () => {
  const { toast } = useToast();

  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [salesBills, setSalesBills] = useState<SalesBillWithPayment[]>([]);
  const [customerSummary, setCustomerSummary] = useState<CustomerPaymentSummary[]>([]);
  const [overdueReports, setOverdueReports] = useState<SalesBillWithPayment[]>([]);
  const [agingReport, setAgingReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [use3PhaseSystem, setUse3PhaseSystem] = useState(true);
  const [migrationInfo, setMigrationInfo] = useState<any>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Payment form
  const [selectedBill, setSelectedBill] = useState<SalesBillWithPayment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    checkSystemAndLoadData();
  }, []);

  const checkSystemAndLoadData = async () => {
    try {
      // Always use 3-phase system since fallback service was removed
      setUse3PhaseSystem(true);
      await loadData(true);
    } catch (error) {
      console.error('Error checking system:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล",
        variant: "destructive",
      });
    }
  };

  const loadData = async (useThreePhase: boolean = use3PhaseSystem) => {
    setLoading(true);
    try {
      if (useThreePhase) {
        const [summary, bills, customers, overdue, aging] = await Promise.all([
          AccountingService.getPaymentSummary(dateFrom || undefined, dateTo || undefined),
          AccountingService.getSalesBillsWithPayment({
            payment_status: statusFilter !== 'all' ? statusFilter : undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined
          }),
          AccountingService.getCustomerPaymentSummary(),
          AccountingService.getOverdueBillsReport(),
          AccountingService.getAgingReport()
        ]);

        setPaymentSummary(summary);
        setSalesBills(bills);
        setCustomerSummary(customers);
        setOverdueReports(overdue);
        setAgingReport(aging);
      } else {
        // Fallback functionality removed - only using 3-phase system
        setSalesBills([]);
        setPaymentSummary({
          totalSales: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          overdueAmount: 0,
          collectionRate: 0
        });
        setCustomerSummary([]);
        setOverdueReports([]);
        setAgingReport(null);
      }
    } catch (error) {
      console.error('Error loading accounting data:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: useThreePhase ?
          "ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล" :
          "ไม่สามารถโหลดข้อมูลสำรองได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (fullPayment: boolean = false) => {
    if (!selectedBill) return;

    try {
      if (fullPayment) {
        await AccountingService.markAsPaid(
          selectedBill.id,
          selectedBill.total_amount,
          paymentForm.method,
          paymentForm.reference,
          paymentForm.date,
          paymentForm.notes
        );
      } else {
        await AccountingService.recordPartialPayment(
          selectedBill.id,
          paymentForm.amount,
          paymentForm.method,
          paymentForm.reference,
          paymentForm.date,
          paymentForm.notes
        );
      }

      toast({
        title: "บันทึกการชำระเงินสำเร็จ",
        description: fullPayment ? "ชำระเงินครบถ้วนแล้ว" : "บันทึกการชำระบางส่วนแล้ว",
      });

      setSelectedBill(null);
      setPaymentForm({
        amount: 0,
        method: '',
        reference: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการชำระเงินได้",
        variant: "destructive",
      });
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const config = AccountingService.getPaymentStatusColor(status);
    const text = AccountingService.getPaymentStatusText(status);
    return <Badge className={config}>{text}</Badge>;
  };

  const getDaysStatusBadge = (daysOverdue?: number) => {
    if (!daysOverdue || daysOverdue <= 0) return null;

    if (daysOverdue <= 7) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">เกิน {daysOverdue} วัน</Badge>;
    } else if (daysOverdue <= 30) {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800">เกิน {daysOverdue} วัน</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-100 text-red-800">เกิน {daysOverdue} วัน</Badge>;
    }
  };

  const filteredBills = salesBills.filter(bill => {
    const matchesSearch = !searchTerm ||
      bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customer_code.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const collectionRate = paymentSummary?.totalSales ?
    (paymentSummary.totalPaid / paymentSummary.totalSales) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Migration Banner */}
      {!use3PhaseSystem && migrationInfo && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <div className="flex flex-col gap-3">
            <div>
              <h4 className="font-semibold text-orange-800">ระบบ 3-Phase Sales Workflow ยังไม่พร้อม</h4>
              <p className="text-orange-700">{migrationInfo.message}</p>
            </div>
            <div className="bg-white p-3 rounded border text-sm">
              <p className="font-medium mb-2">วิธีการแก้ไข:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>เปิด Supabase Dashboard</li>
                <li>ไปที่ SQL Editor</li>
                <li>รันไฟล์: supabase/migrations/20250126_3phase_sales_workflow.sql</li>
                <li>รันไฟล์: supabase/migrations/20250927_add_payment_tracking.sql</li>
              </ol>
              <p className="mt-2 text-amber-600">ตอนนี้ระบบกำลังใช้โหมดสำรองที่จำกัดความสามารถ</p>
            </div>
          </div>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">บัญชีและการเงิน</h2>
          <p className="text-muted-foreground">
            ติดตามการชำระเงินและรายงานทางการเงิน
            {!use3PhaseSystem && (
              <span className="text-orange-600 font-medium"> (โหมดสำรอง)</span>
            )}
          </p>
        </div>
        <Button onClick={() => loadData()} disabled={loading}>
          {loading ? "กำลังโหลด..." : "รีเฟรช"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            ภาพรวม
          </TabsTrigger>
          <TabsTrigger value="bills" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            ใบแจ้งหนี้ ({salesBills.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            เกินกำหนด ({overdueReports.length})
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            ลูกค้า ({customerSummary.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            รายงาน
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-3 sm:space-y-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">ยอดขายรวม</CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-lg sm:text-2xl font-bold">
                  ฿{(paymentSummary?.totalSales || 0).toLocaleString()}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  จาก {(paymentSummary?.paidCount || 0) + (paymentSummary?.pendingCount || 0)} ใบ
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ยอดที่ได้รับแล้ว</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ฿{(paymentSummary?.totalPaid || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentSummary?.paidCount || 0} ใบที่ชำระแล้ว
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ยอดคงค้าง</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ฿{(paymentSummary?.totalOutstanding || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentSummary?.pendingCount || 0} ใบที่รอชำระ
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">เกินกำหนด</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ฿{(paymentSummary?.overdueAmount || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentSummary?.overdueCount || 0} ใบเกินกำหนด
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>อัตราการเก็บเงิน</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ความสำเร็จ</span>
                    <span>{collectionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={collectionRate} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    เก็บเงินได้ ฿{(paymentSummary?.totalPaid || 0).toLocaleString()}
                    จากยอดขายรวม ฿{(paymentSummary?.totalSales || 0).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>สถิติรวด เร็ว</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ใบแจ้งหนี้ทั้งหมด</span>
                    <span className="font-semibold">
                      {(paymentSummary?.paidCount || 0) + (paymentSummary?.pendingCount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ชำระแล้ว</span>
                    <span className="font-semibold text-green-600">{paymentSummary?.paidCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">รอชำระ</span>
                    <span className="font-semibold text-orange-600">{paymentSummary?.pendingCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">เกินกำหนด</span>
                    <span className="font-semibold text-red-600">{paymentSummary?.overdueCount || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Bills */}
        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>ใบแจ้งหนี้ทั้งหมด</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหาใบแจ้งหนี้, ลูกค้า..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสถานะ</SelectItem>
                      <SelectItem value="pending">รอชำระเงิน</SelectItem>
                      <SelectItem value="partial">ชำระบางส่วน</SelectItem>
                      <SelectItem value="paid">ชำระแล้ว</SelectItem>
                      <SelectItem value="overdue">เกินกำหนด</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredBills.map((bill) => (
                  <Card key={bill.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{bill.bill_number}</span>
                            {getPaymentStatusBadge(bill.payment_status)}
                            {getDaysStatusBadge(bill.days_overdue)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ลูกค้า: {bill.customer_name} ({bill.customer_code})
                          </p>
                          <p className="text-sm text-muted-foreground">
                            วันที่: {new Date(bill.bill_date).toLocaleDateString('th-TH')}
                            {bill.due_date && (
                              <> | กำหนดชำระ: {new Date(bill.due_date).toLocaleDateString('th-TH')}</>
                            )}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span>ยอดรวม: ฿{bill.total_amount.toLocaleString()}</span>
                            <span>ชำระแล้ว: ฿{bill.amount_paid.toLocaleString()}</span>
                            <span className="font-semibold">
                              คงเหลือ: ฿{(bill.total_amount - bill.amount_paid).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {bill.payment_status !== 'paid' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBill(bill);
                                    setPaymentForm(prev => ({
                                      ...prev,
                                      amount: bill.total_amount - bill.amount_paid
                                    }));
                                  }}
                                >
                                  บันทึกการชำระ
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>บันทึกการชำระเงิน - {bill.bill_number}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Alert>
                                    <CreditCard className="h-4 w-4" />
                                    <AlertDescription>
                                      ลูกค้า: {bill.customer_name} |
                                      ยอดคงเหลือ: ฿{(bill.total_amount - bill.amount_paid).toLocaleString()}
                                    </AlertDescription>
                                  </Alert>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>จำนวนเงิน</Label>
                                      <Input
                                        type="number"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm(prev => ({
                                          ...prev, amount: parseFloat(e.target.value) || 0
                                        }))}
                                      />
                                    </div>
                                    <div>
                                      <Label>วิธีการชำระ</Label>
                                      <Select
                                        value={paymentForm.method}
                                        onValueChange={(value) => setPaymentForm(prev => ({ ...prev, method: value }))}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="เลือกวิธีการชำระ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="cash">เงินสด</SelectItem>
                                          <SelectItem value="transfer">โอนเงิน</SelectItem>
                                          <SelectItem value="check">เช็ค</SelectItem>
                                          <SelectItem value="credit">เครดิต</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>เลขอ้างอิง</Label>
                                      <Input
                                        value={paymentForm.reference}
                                        onChange={(e) => setPaymentForm(prev => ({
                                          ...prev, reference: e.target.value
                                        }))}
                                        placeholder="เลขอ้างอิงการชำระ"
                                      />
                                    </div>
                                    <div>
                                      <Label>วันที่ชำระ</Label>
                                      <Input
                                        type="date"
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm(prev => ({
                                          ...prev, date: e.target.value
                                        }))}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <Label>หมายเหตุ</Label>
                                    <Input
                                      value={paymentForm.notes}
                                      onChange={(e) => setPaymentForm(prev => ({
                                        ...prev, notes: e.target.value
                                      }))}
                                      placeholder="หมายเหตุ (ถ้ามี)"
                                    />
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handlePayment(false)}
                                      variant="outline"
                                      className="flex-1"
                                    >
                                      บันทึกการชำระ
                                    </Button>
                                    <Button
                                      onClick={() => handlePayment(true)}
                                      className="flex-1"
                                    >
                                      ชำระครบถ้วน
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue Bills */}
        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                ใบแจ้งหนี้เกินกำหนด
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueReports.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <p className="text-muted-foreground">ไม่มีใบแจ้งหนี้เกินกำหนด</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {overdueReports.map((bill) => (
                    <Card key={bill.id} className="border-l-4 border-l-red-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{bill.bill_number}</span>
                              <Badge className="bg-red-100 text-red-800">
                                เกิน {bill.days_overdue} วัน
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              ลูกค้า: {bill.customer_name} ({bill.customer_code})
                            </p>
                            <p className="text-sm text-red-600">
                              ยอดค้าง: ฿{(bill.total_amount - bill.amount_paid).toLocaleString()}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            ส่งจดหมายเตือน
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                สรุปยอดลูกค้า
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerSummary.map((customer) => (
                  <Card key={customer.customer_id} className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{customer.customer_name}</span>
                            <Badge variant="outline">{customer.customer_code}</Badge>
                          </div>
                          <p className="text-sm">
                            ยอดค้างทั้งหมด: ฿{customer.total_outstanding.toLocaleString()}
                          </p>
                          {customer.overdue_amount > 0 && (
                            <p className="text-sm text-red-600">
                              เกินกำหนด: ฿{customer.overdue_amount.toLocaleString()}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            จำนวนใบ: {customer.bill_count} ใบ
                            {customer.last_payment_date && (
                              <> | ชำระล่าสุด: {new Date(customer.last_payment_date).toLocaleDateString('th-TH')}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>รายงานอายุหนี้</CardTitle>
              </CardHeader>
              <CardContent>
                {agingReport && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span>0-30 วัน</span>
                      <div className="text-right">
                        <p className="font-semibold">฿{agingReport.days_0_30.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{agingReport.days_0_30.count} ใบ</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                      <span>31-60 วัน</span>
                      <div className="text-right">
                        <p className="font-semibold">฿{agingReport.days_31_60.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{agingReport.days_31_60.count} ใบ</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                      <span>61-90 วัน</span>
                      <div className="text-right">
                        <p className="font-semibold">฿{agingReport.days_61_90.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{agingReport.days_61_90.count} ใบ</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                      <span>90+ วัน</span>
                      <div className="text-right">
                        <p className="font-semibold">฿{agingReport.days_90_plus.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{agingReport.days_90_plus.count} ใบ</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>สถิติการเก็บเงิน</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {collectionRate.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">อัตราการเก็บเงิน</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>เป้าหมาย</span>
                      <span>85%</span>
                    </div>
                    <Progress value={collectionRate} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {collectionRate >= 85 ? "เป้าหมายทำได้แล้ว! 🎉" : `ต้องการอีก ${(85 - collectionRate).toFixed(1)}% เพื่อบรรลุเป้าหมาย`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};