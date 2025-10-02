import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Package,
  TrendingUp,
  TrendingDown,
  Move,
  User,
  MapPin,
  Calendar,
  FileText,
  Clock,
  Database,
  Hash,
  Building2,
  Boxes,
  ArrowRight,
  ClipboardCheck
} from 'lucide-react';

interface EventDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any; // SystemEvent or WarehouseTransfer
}

export function EventDetailModal({ open, onOpenChange, event }: EventDetailModalProps) {
  if (!event) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'ERROR':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'WARNING':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'INFO':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'ERROR':
        return <Badge variant="destructive">❌ ข้อผิดพลาด</Badge>;
      case 'WARNING':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">⚠️ คำเตือน</Badge>;
      case 'SUCCESS':
        return <Badge className="bg-green-500 hover:bg-green-600">✅ สำเร็จ</Badge>;
      case 'INFO':
      default:
        return <Badge variant="secondary">ℹ️ ข้อมูล</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'inventory':
      case 'stock_movement':
        return <Package className="h-4 w-4" />;
      case 'warehouse_transfer':
        return <Move className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // ตรวจสอบว่าเป็น warehouse transfer หรือ system event
  const isTransfer = event.transfer_number !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className={`p-2 rounded-lg ${
              isTransfer
                ? 'bg-blue-100 text-blue-700'
                : event.severity_level === 'ERROR'
                  ? 'bg-red-100 text-red-700'
                  : event.severity_level === 'SUCCESS'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
            }`}>
              {isTransfer ? <Move className="h-6 w-6" /> : getSeverityIcon(event.severity_level)}
            </div>
            <span>{isTransfer ? 'รายละเอียดการย้ายสินค้า' : 'รายละเอียดเหตุการณ์ระบบ'}</span>
          </DialogTitle>
          <DialogDescription className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {format(new Date(event.created_at), 'dd MMMM yyyy เวลา HH:mm:ss น.', { locale: th })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-160px)] pr-4">
          <div className="space-y-5">
            {/* Main Info Card */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  ข้อมูลหลัก
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ประเภทเหตุการณ์</p>
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                      {getCategoryIcon(isTransfer ? 'warehouse_transfer' : event.event_category)}
                      <span className="text-sm font-medium">
                        {isTransfer ? 'การย้ายสินค้า Warehouse' : event.event_category || event.event_type}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">สถานะ</p>
                    <div className="flex items-center">
                      {isTransfer ? (
                        <Badge className="text-sm py-1.5 px-3" variant={event.status === 'completed' ? 'default' : 'outline'}>
                          {event.status === 'completed' && '✅ '}
                          {event.status === 'in_progress' && '🔄 '}
                          {event.status === 'pending' && '⏳ '}
                          {event.status === 'cancelled' && '❌ '}
                          {event.status}
                        </Badge>
                      ) : (
                        getSeverityBadge(event.severity_level)
                      )}
                    </div>
                  </div>

                  {isTransfer && event.transfer_number && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">เลขที่การย้าย</p>
                      <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
                        <Hash className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-mono font-semibold text-blue-900">
                          {event.transfer_number}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Title & Description */}
                <div className="space-y-2">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {isTransfer ? event.title : (event.event_title || event.description)}
                  </h3>
                  {(isTransfer ? event.description : event.event_description) && (
                    <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                      {isTransfer ? event.description : event.event_description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Warehouse Transfer Specific Info */}
            {isTransfer && (
              <Card className="border-2 border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    รายละเอียดการย้ายคลังสินค้า
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Warehouse Transfer Flow */}
                  <div className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">คลังต้นทาง</p>
                      <div className="flex items-center gap-2 bg-red-50 rounded-lg p-3">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-bold text-sm text-red-900">
                            {event.source_warehouse_name || 'N/A'}
                          </p>
                          {event.source_warehouse_code && (
                            <p className="text-xs text-red-600 font-mono">
                              ({event.source_warehouse_code})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="h-8 w-8 text-blue-500 flex-shrink-0" />

                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">คลังปลายทาง</p>
                      <div className="flex items-center gap-2 bg-green-50 rounded-lg p-3">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-bold text-sm text-green-900">
                            {event.target_warehouse_name || 'N/A'}
                          </p>
                          {event.target_warehouse_code && (
                            <p className="text-xs text-green-600 font-mono">
                              ({event.target_warehouse_code})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Boxes className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase">จำนวนรายการ</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{event.total_items || 0}</p>
                      <p className="text-xs text-muted-foreground">รายการสินค้า</p>
                    </div>

                    {event.priority && (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase">ความสำคัญ</span>
                        </div>
                        <Badge
                          className="text-base py-1 px-3"
                          variant={event.priority === 'urgent' ? 'destructive' : 'secondary'}
                        >
                          {event.priority === 'urgent' && '🔥 '}
                          {event.priority === 'high' && '⚡ '}
                          {event.priority === 'normal' && '📋 '}
                          {event.priority === 'low' && '📝 '}
                          {event.priority}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location Context */}
            {event.location_context && (
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 bg-amber-50 rounded-lg p-4">
                    <MapPin className="h-6 w-6 text-amber-600" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">ตำแหน่งที่เกี่ยวข้อง</p>
                      <p className="text-base font-bold text-amber-900">{event.location_context}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <Card className="border-2 border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-600" />
                    ข้อมูล Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <div className="flex-shrink-0 w-1 h-full bg-purple-400 rounded-full mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">
                            {key}
                          </p>
                          <div className="bg-gray-50 rounded-md p-2 font-mono text-xs break-all">
                            {typeof value === 'object' ? (
                              <pre className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                            ) : (
                              <span>{String(value)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {event.notes && (
              <Card className="border-2 border-orange-200 bg-orange-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-orange-600" />
                    หมายเหตุ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed bg-white rounded-lg p-4 shadow-sm whitespace-pre-wrap">
                    {event.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <Card className="border-2 border-indigo-200 bg-indigo-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  ไทม์ไลน์เหตุการณ์
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-indigo-500">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">สร้างเมื่อ</p>
                    </div>
                    <p className="text-base font-bold text-gray-900">
                      {format(new Date(event.created_at), 'dd MMMM yyyy', { locale: th })}
                    </p>
                    <p className="text-sm text-gray-600">
                      เวลา {format(new Date(event.created_at), 'HH:mm:ss น.', { locale: th })}
                    </p>
                  </div>

                  {event.updated_at && event.updated_at !== event.created_at && (
                    <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-400">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">อัปเดตล่าสุด</p>
                      </div>
                      <p className="text-base font-bold text-gray-900">
                        {format(new Date(event.updated_at), 'dd MMMM yyyy', { locale: th })}
                      </p>
                      <p className="text-sm text-gray-600">
                        เวลา {format(new Date(event.updated_at), 'HH:mm:ss น.', { locale: th })}
                      </p>
                    </div>
                  )}

                  {isTransfer && event.approved_at && (
                    <div className="bg-green-50 rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wide">อนุมัติเมื่อ</p>
                      </div>
                      <p className="text-base font-bold text-green-900">
                        {format(new Date(event.approved_at), 'dd MMMM yyyy', { locale: th })}
                      </p>
                      <p className="text-sm text-green-700">
                        เวลา {format(new Date(event.approved_at), 'HH:mm:ss น.', { locale: th })}
                      </p>
                    </div>
                  )}

                  {isTransfer && event.completed_at && (
                    <div className="bg-blue-50 rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardCheck className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">เสร็จสิ้นเมื่อ</p>
                      </div>
                      <p className="text-base font-bold text-blue-900">
                        {format(new Date(event.completed_at), 'dd MMMM yyyy', { locale: th })}
                      </p>
                      <p className="text-sm text-blue-700">
                        เวลา {format(new Date(event.completed_at), 'HH:mm:ss น.', { locale: th })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User Info */}
            {(event.created_by || event.user_id) && (
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
                    <User className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">ผู้ดำเนินการ</p>
                      <code className="text-sm font-mono font-bold bg-gray-200 px-3 py-1 rounded">
                        {event.created_by || event.user_id}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
