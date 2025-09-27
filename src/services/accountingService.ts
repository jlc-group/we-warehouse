// Accounting Service - Payment Tracking and Financial Reporting
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentStatus {
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  amount_paid?: number;
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
}

export interface PaymentSummary {
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueAmount: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
}

export interface CustomerPaymentSummary {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  total_outstanding: number;
  overdue_amount: number;
  last_payment_date?: string;
  bill_count: number;
}

export interface SalesBillWithPayment {
  id: string;
  bill_number: string;
  bill_date: string;
  customer_name: string;
  customer_code: string;
  total_amount: number;
  payment_status: string;
  payment_date?: string;
  amount_paid?: number;
  due_date?: string;
  days_overdue?: number;
  payment_method?: string;
  payment_reference?: string;
  payment_notes?: string;
}

export class AccountingService {

  // =====================================================
  // Payment Status Management
  // =====================================================

  /**
   * Update payment status for a sales bill
   */
  static async updatePaymentStatus(
    salesBillId: string,
    paymentData: PaymentStatus,
    updatedBy?: string
  ): Promise<void> {
    console.log('💰 Updating payment status for sales bill:', salesBillId, paymentData);

    const { error } = await supabase
      .from('sales_bills')
      .update({
        payment_status: paymentData.status,
        amount_paid: paymentData.amount_paid,
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference,
        payment_notes: paymentData.notes,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy
      })
      .eq('id', salesBillId);

    if (error) {
      console.error('❌ Error updating payment status:', error);
      throw error;
    }

    console.log('✅ Payment status updated');
    toast.success('อัปเดตสถานะการชำระเงิน', {
      description: `เปลี่ยนสถานะเป็น ${this.getPaymentStatusText(paymentData.status)}`
    });
  }

  /**
   * Mark bill as fully paid
   */
  static async markAsPaid(
    salesBillId: string,
    totalAmount: number,
    paymentMethod: string,
    paymentReference?: string,
    paymentDate?: string,
    notes?: string
  ): Promise<void> {
    console.log('💰 Marking sales bill as paid:', salesBillId);

    await this.updatePaymentStatus(salesBillId, {
      status: 'paid',
      amount_paid: totalAmount,
      payment_date: paymentDate || new Date().toISOString(),
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      notes: notes
    });
  }

  /**
   * Record partial payment
   */
  static async recordPartialPayment(
    salesBillId: string,
    partialAmount: number,
    paymentMethod: string,
    paymentReference?: string,
    paymentDate?: string,
    notes?: string
  ): Promise<void> {
    console.log('💰 Recording partial payment:', salesBillId, partialAmount);

    // Get current amount paid
    const { data: bill, error } = await supabase
      .from('sales_bills')
      .select('amount_paid, total_amount')
      .eq('id', salesBillId)
      .single();

    if (error) throw error;

    const currentPaid = bill.amount_paid || 0;
    const newTotalPaid = currentPaid + partialAmount;
    const status = newTotalPaid >= bill.total_amount ? 'paid' : 'partial';

    await this.updatePaymentStatus(salesBillId, {
      status,
      amount_paid: newTotalPaid,
      payment_date: paymentDate || new Date().toISOString(),
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      notes: notes
    });
  }

  // =====================================================
  // Payment Queries and Reports
  // =====================================================

  /**
   * Get sales bills with payment information
   */
  static async getSalesBillsWithPayment(
    filters?: {
      payment_status?: string;
      customer_id?: string;
      date_from?: string;
      date_to?: string;
      overdue_only?: boolean;
    }
  ): Promise<SalesBillWithPayment[]> {
    console.log('📊 Fetching sales bills with payment info', filters);

    let query = supabase
      .from('sales_bills')
      .select(`
        id,
        bill_number,
        bill_date,
        total_amount,
        payment_status,
        payment_date,
        amount_paid,
        due_date,
        payment_method,
        payment_reference,
        payment_notes,
        customer:customers(
          id,
          customer_name,
          customer_code
        )
      `)
      .order('bill_date', { ascending: false });

    // Apply filters
    if (filters?.payment_status) {
      query = query.eq('payment_status', filters.payment_status);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters?.date_from) {
      query = query.gte('bill_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('bill_date', filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching sales bills with payment:', error);
      throw error;
    }

    // Transform and calculate overdue days
    const result: SalesBillWithPayment[] = data.map(bill => {
      const customer = Array.isArray(bill.customer) ? bill.customer[0] : bill.customer;
      const daysOverdue = bill.due_date && bill.payment_status !== 'paid'
        ? Math.max(0, Math.floor((Date.now() - new Date(bill.due_date).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        id: bill.id,
        bill_number: bill.bill_number,
        bill_date: bill.bill_date,
        customer_name: customer?.customer_name || 'Unknown',
        customer_code: customer?.customer_code || 'Unknown',
        total_amount: bill.total_amount || 0,
        payment_status: bill.payment_status || 'pending',
        payment_date: bill.payment_date,
        amount_paid: bill.amount_paid || 0,
        due_date: bill.due_date,
        days_overdue: daysOverdue,
        payment_method: bill.payment_method,
        payment_reference: bill.payment_reference,
        payment_notes: bill.payment_notes
      };
    });

    // Filter overdue if requested
    if (filters?.overdue_only) {
      return result.filter(bill => (bill.days_overdue || 0) > 0);
    }

    console.log(`✅ Found ${result.length} sales bills`);
    return result;
  }

  /**
   * Get payment summary statistics
   */
  static async getPaymentSummary(
    dateFrom?: string,
    dateTo?: string
  ): Promise<PaymentSummary> {
    console.log('📊 Fetching payment summary statistics');

    let query = supabase
      .from('sales_bills')
      .select('total_amount, amount_paid, payment_status, due_date');

    if (dateFrom) {
      query = query.gte('bill_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('bill_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching payment summary:', error);
      throw error;
    }

    const summary = data.reduce((acc, bill) => {
      const totalAmount = bill.total_amount || 0;
      const paidAmount = bill.amount_paid || 0;
      const outstanding = totalAmount - paidAmount;

      acc.totalSales += totalAmount;
      acc.totalPaid += paidAmount;
      acc.totalOutstanding += outstanding;

      // Count by status
      if (bill.payment_status === 'paid') {
        acc.paidCount++;
      } else {
        acc.pendingCount++;

        // Check if overdue
        if (bill.due_date && new Date(bill.due_date) < new Date()) {
          acc.overdueCount++;
          acc.overdueAmount += outstanding;
        }
      }

      return acc;
    }, {
      totalSales: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      overdueAmount: 0,
      pendingCount: 0,
      paidCount: 0,
      overdueCount: 0
    });

    console.log('✅ Payment summary calculated');
    return summary;
  }

  /**
   * Get customer payment summary
   */
  static async getCustomerPaymentSummary(): Promise<CustomerPaymentSummary[]> {
    console.log('📊 Fetching customer payment summary');

    const { data, error } = await supabase
      .from('sales_bills')
      .select(`
        customer_id,
        total_amount,
        amount_paid,
        payment_status,
        payment_date,
        due_date,
        customer:customers(
          customer_name,
          customer_code
        )
      `);

    if (error) {
      console.error('❌ Error fetching customer payment summary:', error);
      throw error;
    }

    // Group by customer
    const customerMap = new Map<string, {
      customer_name: string;
      customer_code: string;
      total_outstanding: number;
      overdue_amount: number;
      last_payment_date?: string;
      bill_count: number;
    }>();

    data.forEach(bill => {
      const customer = Array.isArray(bill.customer) ? bill.customer[0] : bill.customer;
      const customerId = bill.customer_id;
      const outstanding = (bill.total_amount || 0) - (bill.amount_paid || 0);
      const isOverdue = bill.due_date && new Date(bill.due_date) < new Date() && bill.payment_status !== 'paid';

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer_name: customer?.customer_name || 'Unknown',
          customer_code: customer?.customer_code || 'Unknown',
          total_outstanding: 0,
          overdue_amount: 0,
          last_payment_date: undefined,
          bill_count: 0
        });
      }

      const customerData = customerMap.get(customerId)!;
      customerData.total_outstanding += outstanding;
      customerData.bill_count++;

      if (isOverdue) {
        customerData.overdue_amount += outstanding;
      }

      // Track latest payment date
      if (bill.payment_date && (!customerData.last_payment_date || bill.payment_date > customerData.last_payment_date)) {
        customerData.last_payment_date = bill.payment_date;
      }
    });

    const result: CustomerPaymentSummary[] = Array.from(customerMap.entries()).map(([customer_id, data]) => ({
      customer_id,
      ...data
    })).filter(customer => customer.total_outstanding > 0); // Only customers with outstanding amounts

    console.log(`✅ Found ${result.length} customers with outstanding amounts`);
    return result;
  }

  /**
   * Get overdue bills report
   */
  static async getOverdueBillsReport(): Promise<SalesBillWithPayment[]> {
    console.log('📊 Fetching overdue bills report');

    return this.getSalesBillsWithPayment({ overdue_only: true });
  }

  /**
   * Get aging report (30, 60, 90+ days)
   */
  static async getAgingReport() {
    console.log('📊 Fetching aging report');

    const overdueBills = await this.getOverdueBillsReport();

    const aging = overdueBills.reduce((acc, bill) => {
      const daysOverdue = bill.days_overdue || 0;
      const outstanding = bill.total_amount - bill.amount_paid;

      if (daysOverdue <= 30) {
        acc.days_0_30.count++;
        acc.days_0_30.amount += outstanding;
      } else if (daysOverdue <= 60) {
        acc.days_31_60.count++;
        acc.days_31_60.amount += outstanding;
      } else if (daysOverdue <= 90) {
        acc.days_61_90.count++;
        acc.days_61_90.amount += outstanding;
      } else {
        acc.days_90_plus.count++;
        acc.days_90_plus.amount += outstanding;
      }

      return acc;
    }, {
      days_0_30: { count: 0, amount: 0 },
      days_31_60: { count: 0, amount: 0 },
      days_61_90: { count: 0, amount: 0 },
      days_90_plus: { count: 0, amount: 0 }
    });

    console.log('✅ Aging report calculated');
    return aging;
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * Get payment status text in Thai
   */
  static getPaymentStatusText(status: string): string {
    const statusMap = {
      pending: 'รอชำระเงิน',
      partial: 'ชำระบางส่วน',
      paid: 'ชำระแล้ว',
      overdue: 'เกินกำหนด',
      cancelled: 'ยกเลิก'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }

  /**
   * Get payment status color
   */
  static getPaymentStatusColor(status: string): string {
    const colorMap = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Calculate days until due or overdue
   */
  static calculateDaysStatus(dueDate?: string): {
    status: 'current' | 'due_soon' | 'overdue';
    days: number;
    text: string;
  } {
    if (!dueDate) {
      return { status: 'current', days: 0, text: 'ไม่มีกำหนด' };
    }

    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'overdue',
        days: Math.abs(diffDays),
        text: `เกินกำหนด ${Math.abs(diffDays)} วัน`
      };
    } else if (diffDays <= 7) {
      return {
        status: 'due_soon',
        days: diffDays,
        text: diffDays === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${diffDays} วัน`
      };
    } else {
      return {
        status: 'current',
        days: diffDays,
        text: `เหลือ ${diffDays} วัน`
      };
    }
  }

  /**
   * Generate payment reminder message
   */
  static generatePaymentReminder(bill: SalesBillWithPayment): string {
    const outstanding = bill.total_amount - bill.amount_paid;
    const daysStatus = this.calculateDaysStatus(bill.due_date);

    return `เรียนคุณลูกค้า ${bill.customer_name},

ใบแจ้งหนี้เลขที่ ${bill.bill_number}
จำนวนเงิน ${outstanding.toLocaleString()} บาท
${daysStatus.text}

กรุณาดำเนินการชำระเงินโดยเร็วที่สุด

ขอบพระคุณครับ`;
  }
}