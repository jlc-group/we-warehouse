/**
 * Reserved Stock Dashboard
 * Dashboard สำหรับดูและจัดการ Stock Reservations
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Package, MapPin, Calendar, User, XCircle, CheckCircle, Clock, Warehouse, RefreshCw } from 'lucide-react';
import { StockReservationService } from '@/services/stockReservationService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { StockReservation, ReservationSummary, ReservationWithProduct } from '@/types/reservation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ReservedStockDashboard() {
  const [activeReservations, setActiveReservations] = useState<ReservationWithProduct[]>([]);
  const [allReservations, setAllReservations] = useState<ReservationWithProduct[]>([]);
  const [summary, setSummary] = useState<ReservationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithProduct | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [active, all, summaryData] = await Promise.all([
        StockReservationService.queryReservations({ status: 'active' }),
        StockReservationService.queryReservations({}),
        StockReservationService.getReservationSummaryByWarehouse(),
      ]);

      setActiveReservations(active);
      setAllReservations(all);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูล reservations ได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!selectedReservation) return;

    try {
      const userId = '00000000-0000-0000-0000-000000000000';
      const result = await StockReservationService.cancelReservation({
        reservation_id: selectedReservation.id,
        cancelled_by: userId,
        reason: 'ยกเลิกด้วยตนเองจาก Dashboard',
      });

      if (result.success) {
        toast({
          title: '✅ ยกเลิกสำเร็จ',
          description: `ยกเลิกการจอง ${selectedReservation.product_name} แล้ว`,
        });
        loadData(); // Refresh data
      } else {
        throw new Error(result.error || 'ไม่สามารถยกเลิกได้');
      }
    } catch (error: any) {
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถยกเลิกการจองได้',
        variant: 'destructive',
      });
    } finally {
      setShowCancelDialog(false);
      setSelectedReservation(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: th });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">กำลังจอง</Badge>;
      case 'fulfilled':
        return <Badge className="bg-green-100 text-green-800 border-green-300">จัดส่งแล้ว</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">ยกเลิกแล้ว</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">การจองทั้งหมด</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{activeReservations.length}</div>
            <p className="text-xs text-muted-foreground">รายการที่กำลังจองอยู่</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สต็อกที่ถูกจอง</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {activeReservations.reduce((sum, r) => sum + r.reserved_total_quantity, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">ชิ้น (รวมทุกรายการ)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses ที่มีการจอง</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.length}</div>
            <p className="text-xs text-muted-foreground">คลังสินค้า</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary by Warehouse */}
      {summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              สรุปตาม Warehouse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Active Reservations</TableHead>
                  <TableHead className="text-right">Total Reserved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((item) => (
                  <TableRow key={item.warehouse_code}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                        Warehouse {item.warehouse_code}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{item.active_reservation_count}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-600">
                      {item.total_reserved_quantity.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Reservations Tabs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            รายการจอง
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">
                <Clock className="h-4 w-4 mr-2" />
                กำลังจอง ({activeReservations.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                <Package className="h-4 w-4 mr-2" />
                ทั้งหมด ({allReservations.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                <Calendar className="h-4 w-4 mr-2" />
                ประวัติ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              {activeReservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  ไม่มีการจองที่กำลังดำเนินการ
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead>วันที่จอง</TableHead>
                      <TableHead>ผู้จอง</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeReservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            {reservation.product_name || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{reservation.location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-orange-600">
                          {reservation.reserved_total_quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(reservation.reserved_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <User className="h-3 w-3 mr-1" />
                            System
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setShowCancelDialog(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            ยกเลิก
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สินค้า</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allReservations.slice(0, 50).map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">
                        {reservation.product_name || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {reservation.location}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {reservation.reserved_total_quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(reservation.reserved_at)}
                      </TableCell>
                      <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สินค้า</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead>วันที่จอง</TableHead>
                    <TableHead>วันที่จัดส่ง/ยกเลิก</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allReservations
                    .filter(r => r.status !== 'active')
                    .slice(0, 50)
                    .map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">
                          {reservation.product_name || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {reservation.location}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {reservation.reserved_total_quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(reservation.reserved_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {reservation.fulfilled_at
                            ? formatDate(reservation.fulfilled_at)
                            : reservation.cancelled_at
                            ? formatDate(reservation.cancelled_at)
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกการจอง</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedReservation && (
                <div className="space-y-2 mt-4">
                  <p><strong>สินค้า:</strong> {selectedReservation.product_name}</p>
                  <p><strong>Location:</strong> {selectedReservation.location}</p>
                  <p><strong>จำนวน:</strong> {selectedReservation.reserved_total_quantity} ชิ้น</p>
                  <p className="text-sm text-red-600 mt-4">
                    การยกเลิกจะคืนสต็อกกลับไปในระบบทันที
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ใช่</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelReservation} className="bg-red-600 hover:bg-red-700">
              ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
