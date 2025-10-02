import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  FileText
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
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTransfer ? <Move className="h-5 w-5" /> : getSeverityIcon(event.severity_level)}
            {isTransfer ? 'รายละเอียดการย้ายสินค้า' : 'รายละเอียดเหตุการณ์'}
          </DialogTitle>
          <DialogDescription>
            {isTransfer
              ? `เลขที่การย้าย: ${event.transfer_number}`
              : format(new Date(event.created_at), 'dd MMM yyyy HH:mm:ss', { locale: th })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="space-y-4 pr-4">
            {/* Header Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ประเภท</p>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(isTransfer ? 'warehouse_transfer' : event.event_category)}
                    <span className="text-sm font-medium">
                      {isTransfer ? 'การย้ายสินค้า Warehouse' : event.event_category || event.event_type}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">สถานะ</p>
                  {isTransfer ? (
                    <Badge variant={event.status === 'completed' ? 'default' : 'outline'}>
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
            </div>

            <Separator />

            {/* Title & Description */}
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {isTransfer ? event.title : (event.event_title || event.description)}
              </h3>
              {(isTransfer ? event.description : event.event_description) && (
                <p className="text-sm text-muted-foreground">
                  {isTransfer ? event.description : event.event_description}
                </p>
              )}
            </div>

            {/* Warehouse Transfer Specific Info */}
            {isTransfer && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="font-medium">จาก:</span>
                      <span>{event.source_warehouse_name || event.source_warehouse_code || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">ไปยัง:</span>
                      <span>{event.target_warehouse_name || event.target_warehouse_code || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">จำนวนรายการ:</span>
                      <Badge variant="outline">{event.total_items || 0}</Badge>
                    </div>
                    {event.priority && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">ความสำคัญ:</span>
                        <Badge variant={event.priority === 'urgent' ? 'destructive' : 'secondary'}>
                          {event.priority}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Location Context */}
            {event.location_context && (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">ตำแหน่ง:</span>
                  <Badge variant="outline">{event.location_context}</Badge>
                </div>
              </>
            )}

            {/* Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    ข้อมูลเพิ่มเติม
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground min-w-[120px] font-medium">
                          {key}:
                        </span>
                        <span className="flex-1 break-all">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {event.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">หมายเหตุ</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {event.notes}
                  </p>
                </div>
              </>
            )}

            {/* Timestamps */}
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                ประวัติเวลา
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">สร้างเมื่อ</p>
                  <p className="font-medium">
                    {format(new Date(event.created_at), 'dd MMM yyyy HH:mm:ss', { locale: th })}
                  </p>
                </div>

                {event.updated_at && event.updated_at !== event.created_at && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">อัปเดตล่าสุด</p>
                    <p className="font-medium">
                      {format(new Date(event.updated_at), 'dd MMM yyyy HH:mm:ss', { locale: th })}
                    </p>
                  </div>
                )}

                {isTransfer && event.approved_at && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-700 mb-1">อนุมัติเมื่อ</p>
                    <p className="font-medium text-green-900">
                      {format(new Date(event.approved_at), 'dd MMM yyyy HH:mm:ss', { locale: th })}
                    </p>
                  </div>
                )}

                {isTransfer && event.completed_at && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-700 mb-1">เสร็จสิ้นเมื่อ</p>
                    <p className="font-medium text-blue-900">
                      {format(new Date(event.completed_at), 'dd MMM yyyy HH:mm:ss', { locale: th })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            {(event.created_by || event.user_id) && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">ผู้ดำเนินการ:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {event.created_by || event.user_id}
                  </code>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
