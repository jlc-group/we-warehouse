import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRight, Package, TrendingUp, TrendingDown, Move, Settings,
  User, AlertTriangle, Info, Clock, Filter, Search, RefreshCw,
  MapPin, QrCode, ShoppingCart, FileText, Database, Bug
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useEventLogging, SystemEvent, EventType, EventStatus, EventSeverity } from '@/services/eventLoggingService';

interface EventLogFilters {
  event_type?: EventType;
  event_category?: string;
  status?: EventStatus;
  severity?: EventSeverity;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export function EnhancedEventLogs() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventLogFilters>({});
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();
  const { getEvents, getEventStats } = useEventLogging();

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      const result = await getEvents({
        ...filters,
        limit: 100
      });

      if (result.success && result.data) {
        setEvents(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดประวัติเหตุการณ์ได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, getEvents, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getEventStats('24h');
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [getEventStats]);

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, [fetchEvents, fetchStats]);

  const getEventIcon = (event: SystemEvent) => {
    const iconSize = "h-4 w-4";

    if (event.event_type === 'inventory') {
      switch (event.event_action) {
        case 'create':
        case 'in':
          return <TrendingUp className={`${iconSize} text-green-600`} />;
        case 'delete':
        case 'out':
          return <TrendingDown className={`${iconSize} text-red-600`} />;
        case 'transfer':
          return <Move className={`${iconSize} text-blue-600`} />;
        default:
          return <Settings className={`${iconSize} text-orange-600`} />;
      }
    }

    if (event.event_type === 'user_action') {
      if (event.event_category === 'qr_scanning') {
        return <QrCode className={`${iconSize} text-purple-600`} />;
      }
      return <User className={`${iconSize} text-indigo-600`} />;
    }

    if (event.event_type === 'business_process') {
      return <ShoppingCart className={`${iconSize} text-cyan-600`} />;
    }

    if (event.event_type === 'error') {
      return <AlertTriangle className={`${iconSize} text-red-600`} />;
    }

    if (event.event_type === 'system') {
      return <Database className={`${iconSize} text-gray-600`} />;
    }

    return <Info className={`${iconSize} text-gray-600`} />;
  };

  const getStatusBadgeVariant = (status: EventStatus) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSeverityBadgeVariant = (severity: EventSeverity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSeverityColor = (severity: EventSeverity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-800 bg-red-100';
      case 'high':
        return 'text-red-700 bg-red-50';
      case 'medium':
        return 'text-yellow-700 bg-yellow-50';
      case 'low':
        return 'text-blue-700 bg-blue-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  const getEventTypeText = (type: EventType) => {
    switch (type) {
      case 'inventory':
        return 'สต็อก';
      case 'user_action':
        return 'การใช้งาน';
      case 'business_process':
        return 'กระบวนการ';
      case 'error':
        return 'ข้อผิดพลาด';
      case 'system':
        return 'ระบบ';
      default:
        return type;
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  if (loading && events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ประวัติเหตุการณ์ระบบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">เหตุการณ์รวม</p>
                  <p className="text-2xl font-bold">{stats.total_events}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ข้อผิดพลาด</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.by_status?.error || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">การเคลื่อนไหวสต็อก</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.by_type?.inventory || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">การใช้งาน</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.by_type?.user_action || 0}
                  </p>
                </div>
                <User className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ประวัติเหตุการณ์ระบบ
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            อัปเดตล่าสุด: {format(new Date(), 'dd MMM yyyy HH:mm', { locale: th })}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" onClick={() => setFilters({})}>
                ทั้งหมด
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                onClick={() => setFilters({ event_type: 'inventory' })}
              >
                สต็อก
              </TabsTrigger>
              <TabsTrigger
                value="user_action"
                onClick={() => setFilters({ event_type: 'user_action' })}
              >
                การใช้งาน
              </TabsTrigger>
              <TabsTrigger
                value="error"
                onClick={() => setFilters({ status: 'error' })}
              >
                ข้อผิดพลาด
              </TabsTrigger>
              <TabsTrigger
                value="system"
                onClick={() => setFilters({ event_type: 'system' })}
              >
                ระบบ
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters(prev => ({
                    ...prev,
                    status: value === 'all' ? undefined : value as EventStatus
                  }))
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="success">สำเร็จ</SelectItem>
                  <SelectItem value="error">ข้อผิดพลาด</SelectItem>
                  <SelectItem value="warning">คำเตือน</SelectItem>
                  <SelectItem value="info">ข้อมูล</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.severity || 'all'}
                onValueChange={(value) =>
                  setFilters(prev => ({
                    ...prev,
                    severity: value === 'all' ? undefined : value as EventSeverity
                  }))
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="ระดับ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกระดับ</SelectItem>
                  <SelectItem value="critical">วิกฤต</SelectItem>
                  <SelectItem value="high">สูง</SelectItem>
                  <SelectItem value="medium">ปานกลาง</SelectItem>
                  <SelectItem value="low">ต่ำ</SelectItem>
                  <SelectItem value="info">ข้อมูล</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={fetchEvents} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>

              {Object.keys(filters).length > 0 && (
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  ล้างตัวกรอง
                </Button>
              )}
            </div>

            <TabsContent value="all" className="space-y-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      ไม่พบเหตุการณ์ที่ตรงกับเงื่อนไข
                    </div>
                  ) : (
                    events.map((event, index) => (
                      <div key={event.id}>
                        <Card className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {getEventIcon(event)}
                              </div>

                              <div className="flex-1 space-y-2">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant={getStatusBadgeVariant(event.status)}>
                                      {event.status}
                                    </Badge>
                                    <Badge variant="outline">
                                      {getEventTypeText(event.event_type)}
                                    </Badge>
                                    <Badge variant={getSeverityBadgeVariant(event.severity)} className={getSeverityColor(event.severity)}>
                                      {event.severity}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm')}
                                    </span>
                                  </div>
                                </div>

                                {/* Event Title & Description */}
                                <div>
                                  <h4 className="font-semibold text-sm">{event.event_title}</h4>
                                  {event.event_description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {event.event_description}
                                    </p>
                                  )}
                                </div>

                                {/* Event Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                  {event.entity_type && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">เอนทิตี:</span>
                                      <span className="font-mono bg-muted px-1 rounded">
                                        {event.entity_type}
                                      </span>
                                    </div>
                                  )}

                                  {event.location_context && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">ตำแหน่ง:</span>
                                      <span className="font-mono">{event.location_context}</span>
                                    </div>
                                  )}

                                  {event.event_category && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">หมวดหมู่:</span>
                                      <span className="text-sm">{event.event_category}</span>
                                    </div>
                                  )}

                                  {event.processing_time_ms && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">เวลาประมวลผล:</span>
                                      <span>{event.processing_time_ms}ms</span>
                                    </div>
                                  )}

                                  {event.api_endpoint && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">API:</span>
                                      <span className="font-mono text-xs bg-muted px-1 rounded">
                                        {event.http_method} {event.api_endpoint}
                                      </span>
                                    </div>
                                  )}

                                  {event.response_status && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">HTTP:</span>
                                      <span className={`font-mono text-xs px-1 rounded ${
                                        event.response_status >= 200 && event.response_status < 300
                                          ? 'bg-green-100 text-green-800'
                                          : event.response_status >= 400
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {event.response_status}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Changes (Before/After) */}
                                {(event.changes_before || event.changes_after) && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="text-xs font-medium text-muted-foreground mb-2">
                                      การเปลี่ยนแปลง:
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {event.changes_before && (
                                        <div>
                                          <div className="text-xs font-medium text-red-700 mb-1">ก่อน:</div>
                                          <pre className="text-xs bg-red-50 p-2 rounded border max-h-20 overflow-auto">
                                            {JSON.stringify(event.changes_before, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      {event.changes_after && (
                                        <div>
                                          <div className="text-xs font-medium text-green-700 mb-1">หลัง:</div>
                                          <pre className="text-xs bg-green-50 p-2 rounded border max-h-20 overflow-auto">
                                            {JSON.stringify(event.changes_after, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Event Data */}
                                {event.event_data && Object.keys(event.event_data).length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="text-xs font-medium text-muted-foreground mb-2">
                                      ข้อมูลเพิ่มเติม:
                                    </div>
                                    <pre className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
                                      {JSON.stringify(event.event_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {index < events.length - 1 && <Separator className="my-2" />}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}