import { useState, useEffect, useMemo, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  TrendingDown,
  Search,
  Calendar as CalendarIcon,
  Package,
  MapPin,
  User,
  FileText,
  Users,
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react';
import { localDb } from '@/integrations/local/client';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
interface CustomerExport {
  id: string;
  inventory_item_id: string;
  product_name: string;
  product_code: string;
  product_type?: string;
  customer_name: string;
  customer_code?: string;
  quantity_exported: number;
  quantity_level1?: number;
  quantity_level2?: number;
  quantity_level3?: number;
  unit_level1_name?: string;
  unit_level2_name?: string;
  unit_level3_name?: string;
  unit_level1_rate?: number;
  unit_level2_rate?: number;
  from_location: string;
  notes?: string;
  created_at: string;
  user_id?: string;
}

interface CustomerGroup {
  customer_name: string;
  customer_code: string;
  total_quantity: number;
  total_exports: number;
  last_export_date: string;
  exports: CustomerExport[];
}

type ViewMode = 'customer' | 'product' | 'timeline';

export function UnifiedExportHistory() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [exports, setExports] = useState<CustomerExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');

  useEffect(() => {
    loadExportData();
  }, [startDate, endDate]);

  const loadExportData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading export history from customer_exports...');

      // Load export data from customer_exports table
      let query = localDb
        .from('customer_exports')
        .select('*')
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDateTime.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      setExports(data || []);
      console.log(`✅ Loaded ${data?.length || 0} export records from customer_exports`);
    } catch (error) {
      console.error('❌ Error loading export data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลประวัติการส่งออกได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter exports by search term and customer
  const filteredExports = useMemo(() => {
    let filtered = exports;

    // Filter by customer
    if (selectedCustomer !== 'all') {
      filtered = filtered.filter(exp => exp.customer_name === selectedCustomer);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(exp =>
        exp.customer_name?.toLowerCase().includes(term) ||
        exp.product_name?.toLowerCase().includes(term) ||
        exp.product_code?.toLowerCase().includes(term) ||
        exp.from_location?.toLowerCase().includes(term) ||
        exp.notes?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [exports, searchTerm, selectedCustomer]);

  // Get unique customers for filter dropdown
  const uniqueCustomersList = useMemo(() => {
    const customers = new Set(exports.map(exp => exp.customer_name));
    return Array.from(customers).sort();
  }, [exports]);

  // Group by customer for customer view (from customer_exports)
  const customerGroups = useMemo(() => {
    const groups = new Map<string, CustomerExport[]>();

    filteredExports.forEach(exp => {
      const key = exp.customer_name;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(exp);
    });

    return Array.from(groups.entries()).map(([customerName, items]) => ({
      customer_name: customerName,
      customer_code: items[0].customer_code || '',
      total_quantity: items.reduce((sum, item) => sum + item.quantity_exported, 0),
      total_exports: items.length,
      last_export_date: items[0].created_at,
      exports: items,
    })).sort((a, b) => b.total_quantity - a.total_quantity);
  }, [filteredExports]);

  // Group by product for product view
  const productGroups = useMemo(() => {
    const groups = new Map<string, CustomerExport[]>();

    filteredExports.forEach(exp => {
      const key = `${exp.product_code}_${exp.product_name}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(exp);
    });

    return Array.from(groups.entries()).map(([key, items]) => ({
      product_code: items[0].product_code,
      product_name: items[0].product_name,
      product_type: items[0].product_type,
      total_quantity: items.reduce((sum, item) => sum + item.quantity_exported, 0),
      total_exports: items.length,
      exports: items,
    }));
  }, [filteredExports]);

  const formatQuantity = (exp: CustomerExport): string => {
    const level1 = exp.quantity_level1 || 0;
    const level2 = exp.quantity_level2 || 0;
    const level3 = exp.quantity_level3 || 0;

    const parts = [];
    if (level1 > 0) parts.push(`${level1} ${exp.unit_level1_name || 'ลัง'}`);
    if (level2 > 0) parts.push(`${level2} ${exp.unit_level2_name || 'กล่อง'}`);
    if (level3 > 0) parts.push(`${level3} ${exp.unit_level3_name || 'ชิ้น'}`);

    if (parts.length === 0) {
      return `${exp.quantity_exported.toLocaleString()} ${exp.unit_level3_name || 'ชิ้น'}`;
    }

    return parts.join(' + ');
  };

  const getProductTypeBadge = (productType?: string) => {
    if (!productType) return null;

    const types: Record<string, { label: string; className: string }> = {
      FG: { label: 'FG', className: 'bg-green-100 text-green-800 border-green-300' },
      PK: { label: 'PK', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      RM: { label: 'RM', className: 'bg-orange-100 text-orange-800 border-orange-300' },
    };

    const type = types[productType] || { label: productType, className: 'bg-gray-100 text-gray-700 border-gray-300' };

    return (
      <Badge variant="outline" className={cn('text-xs', type.className)}>
        {type.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'รอดำเนินการ', variant: 'outline' },
      confirmed: { label: 'ยืนยันแล้ว', variant: 'secondary' },
      shipped: { label: 'จัดส่งแล้ว', variant: 'default' },
      delivered: { label: 'ส่งถึงแล้ว', variant: 'default' },
      cancelled: { label: 'ยกเลิก', variant: 'destructive' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  // Summary stats
  const totalExports = filteredExports.length;
  const totalQuantity = filteredExports.reduce((sum, exp) => sum + exp.quantity_exported, 0);
  const uniqueCustomers = new Set(filteredExports.map(exp => exp.customer_name)).size;
  const uniqueProducts = new Set(filteredExports.map(exp => exp.product_code)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รายการส่งออก</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExports}</div>
            <p className="text-xs text-muted-foreground">รายการทั้งหมด</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">จำนวนรวม</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">ชิ้น</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ลูกค้า</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">รายการลูกค้า</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สินค้า</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">รายการสินค้า</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                ประวัติการส่งออกสินค้า
              </CardTitle>
              <CardDescription>
                รายการสินค้าที่ส่งออกไปยังลูกค้า
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadExportData}>
              รีเฟรช
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาลูกค้า, สินค้า, SKU, ตำแหน่ง..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(selectedCustomer === 'all' && 'text-muted-foreground')}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {selectedCustomer === 'all' ? 'ลูกค้าทั้งหมด' : selectedCustomer}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <div className="max-h-80 overflow-auto">
                    <Button
                      variant={selectedCustomer === 'all' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedCustomer('all')}
                    >
                      ลูกค้าทั้งหมด ({exports.length})
                    </Button>
                    {uniqueCustomersList.map((customer) => {
                      const count = exports.filter(e => e.customer_name === customer).length;
                      return (
                        <Button
                          key={customer}
                          variant={selectedCustomer === customer ? 'default' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <User className="mr-2 h-4 w-4" />
                          {customer} ({count})
                        </Button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(!startDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd MMM', { locale: th }) : 'เริ่มต้น'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(!endDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd MMM', { locale: th }) : 'สิ้นสุด'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {(startDate || endDate || searchTerm || selectedCustomer !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                    setSearchTerm('');
                    setSelectedCustomer('all');
                  }}
                >
                  ล้าง
                </Button>
              )}
            </div>
          </div>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                📅 ไทม์ไลน์
              </TabsTrigger>
              <TabsTrigger value="customer" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                👥 ตามลูกค้า
              </TabsTrigger>
              <TabsTrigger value="product" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                📦 ตามสินค้า
              </TabsTrigger>
            </TabsList>

            {/* Timeline View */}
            <TabsContent value="timeline" className="mt-4">
              {filteredExports.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">ไม่พบประวัติการส่งออก</p>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีการส่งออกสินค้า'}
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่/เวลา</TableHead>
                        <TableHead>สินค้า</TableHead>
                        <TableHead>จำนวน</TableHead>
                        <TableHead>จาก</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead>หมายเหตุ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExports.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {format(new Date(exp.created_at), 'dd MMM yyyy', { locale: th })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(exp.created_at), 'HH:mm')}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div>
                              <div className="font-medium">{exp.product_name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {exp.product_code}
                                </Badge>
                                {getProductTypeBadge(exp.product_type)}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div>
                              <div className="font-medium text-red-600">
                                {formatQuantity(exp)}
                              </div>
                              <div className="text-xs text-muted-foreground bg-slate-50 px-2 py-0.5 rounded mt-1 inline-block">
                                รวม: <span className="font-bold">{exp.quantity_exported.toLocaleString()}</span> ชิ้น
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span>{exp.from_location || '-'}</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">{exp.customer_name}</span>
                            </div>
                          </TableCell>

                          <TableCell className="max-w-xs">
                            {exp.notes && (
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2">{exp.notes}</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Customer View */}
            <TabsContent value="customer" className="mt-4">
              {customerGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">ไม่พบข้อมูลลูกค้า</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>รหัสลูกค้า</TableHead>
                        <TableHead>ชื่อลูกค้า</TableHead>
                        <TableHead className="text-right">จำนวนครั้ง</TableHead>
                        <TableHead className="text-right">จำนวนรวม</TableHead>
                        <TableHead>ส่งออกล่าสุด</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerGroups.map((group) => (
                        <Fragment key={group.customer_name}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedId(expandedId === group.customer_name ? null : group.customer_name)}
                          >
                            <TableCell>
                              {expandedId === group.customer_name ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{group.customer_code || '-'}</TableCell>
                            <TableCell>{group.customer_name}</TableCell>
                            <TableCell className="text-right">{group.total_exports}</TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {group.total_quantity.toLocaleString()} ชิ้น
                            </TableCell>
                            <TableCell>
                              {format(new Date(group.last_export_date), 'dd MMM yyyy', { locale: th })}
                            </TableCell>
                          </TableRow>

                          {expandedId === group.customer_name && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-muted/20 p-0">
                                <div className="p-4">
                                  <h4 className="font-semibold mb-3">รายละเอียดการส่งออก</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>วันที่</TableHead>
                                        <TableHead>สินค้า</TableHead>
                                        <TableHead>จำนวน</TableHead>
                                        <TableHead>จาก</TableHead>
                                        <TableHead>หมายเหตุ</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.exports.map((exp) => (
                                        <TableRow key={exp.id}>
                                          <TableCell>
                                            {format(new Date(exp.created_at), 'dd MMM yyyy HH:mm', { locale: th })}
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <div className="font-medium">{exp.product_name}</div>
                                              <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">{exp.product_code}</Badge>
                                                {getProductTypeBadge(exp.product_type)}
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <div className="font-medium text-red-600">
                                                {formatQuantity(exp)}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                ({exp.quantity_exported.toLocaleString()} ชิ้น)
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>{exp.from_location}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground">
                                            {exp.notes || '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Product View */}
            <TabsContent value="product" className="mt-4">
              {productGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">ไม่พบข้อมูลสินค้า</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>รหัสสินค้า</TableHead>
                        <TableHead>ชื่อสินค้า</TableHead>
                        <TableHead className="text-right">จำนวนครั้ง</TableHead>
                        <TableHead className="text-right">จำนวนรวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productGroups.map((group) => {
                        const groupKey = `${group.product_code}_${group.product_name}`;
                        return (
                          <Fragment key={groupKey}>
                            <TableRow
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedId(expandedId === groupKey ? null : groupKey)}
                            >
                              <TableCell>
                                {expandedId === groupKey ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{group.product_code}</Badge>
                                  {getProductTypeBadge(group.product_type)}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{group.product_name}</TableCell>
                              <TableCell className="text-right">{group.total_exports}</TableCell>
                              <TableCell className="text-right font-bold text-red-600">
                                {group.total_quantity.toLocaleString()} ชิ้น
                              </TableCell>
                            </TableRow>

                            {expandedId === groupKey && (
                              <TableRow>
                                <TableCell colSpan={5} className="bg-muted/20 p-0">
                                  <div className="p-4">
                                    <h4 className="font-semibold mb-3">รายละเอียดการส่งออก</h4>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>วันที่</TableHead>
                                          <TableHead>ลูกค้า</TableHead>
                                          <TableHead>จำนวน</TableHead>
                                          <TableHead>จาก</TableHead>
                                          <TableHead>หมายเหตุ</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {group.exports.map((exp) => (
                                          <TableRow key={exp.id}>
                                            <TableCell>
                                              {format(new Date(exp.created_at), 'dd MMM yyyy HH:mm', { locale: th })}
                                            </TableCell>
                                            <TableCell>{exp.customer_name}</TableCell>
                                            <TableCell>
                                              <div>
                                                <div className="font-medium text-red-600">
                                                  {formatQuantity(exp)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  ({exp.quantity_exported.toLocaleString()} ชิ้น)
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell>{exp.from_location}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                              {exp.notes || '-'}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
