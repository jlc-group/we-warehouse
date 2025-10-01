import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, AlertCircle, CheckCircle, XCircle, Info, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface SystemEvent {
  id: string;
  event_type: string;
  event_category: string;
  event_action?: string;
  event_title?: string;
  event_description?: string;
  description?: string; // backward compatibility
  metadata?: any;
  user_id?: string;
  source_table?: string;
  source_id?: string;
  severity_level?: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  status?: string;
  location_context?: string;
  created_at: string;
}

export function EnhancedEventLogs() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (severityFilter !== 'ALL') {
        query = query.eq('severity_level', severityFilter);
      }

      if (categoryFilter !== 'ALL') {
        query = query.eq('event_category', categoryFilter);
      }

      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,event_title.ilike.%${searchTerm}%,event_description.ilike.%${searchTerm}%,event_type.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Fetch events error:', error);
        // If system_events table doesn't exist, create mock data
        if (error.code === '42P01') {
          console.log('system_events table not found, using mock data');
          const mockEvents: SystemEvent[] = [
            {
              id: '1',
              event_type: 'INVENTORY_UPDATE',
              event_category: 'INVENTORY',
              description: 'สต็อกสินค้าถูกอัปเดต',
              severity_level: 'INFO',
              created_at: new Date().toISOString(),
              metadata: { action: 'stock_update', items: 5 }
            },
            {
              id: '2',
              event_type: 'LOW_STOCK_WARNING',
              event_category: 'ALERT',
              description: 'สินค้าใกล้หมด: กระป๋องน้ำส้ม',
              severity_level: 'WARNING',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              metadata: { product: 'กระป๋องน้ำส้ม', remaining: 2 }
            },
            {
              id: '3',
              event_type: 'ORDER_FULFILLED',
              event_category: 'ORDER',
              description: 'ใบสั่งซื้อ #12345 ถูกจัดส่งเรียบร้อย',
              severity_level: 'SUCCESS',
              created_at: new Date(Date.now() - 7200000).toISOString(),
              metadata: { order_id: '12345', items: 3 }
            },
            {
              id: '4',
              event_type: 'DATABASE_ERROR',
              event_category: 'SYSTEM',
              description: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล',
              severity_level: 'ERROR',
              created_at: new Date(Date.now() - 10800000).toISOString(),
              metadata: { error_code: 'DB_CONN_FAIL' }
            }
          ];
          setEvents(mockEvents);
          return;
        }
        throw error;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching system events:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดประวัติเหตุการณ์ระบบได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, searchTerm, severityFilter, categoryFilter]);

  useEffect(() => {
    fetchEvents();

    // Real-time subscription for system events
    const channel = supabase
      .channel('system_events_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_events'
        },
        () => {
          fetchEvents(); // Refresh data on new event
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'WARNING':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'INFO':
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'SUCCESS':
        return 'default';
      case 'WARNING':
        return 'secondary';
      case 'ERROR':
        return 'destructive';
      case 'INFO':
      default:
        return 'outline';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'SUCCESS':
        return 'สำเร็จ';
      case 'WARNING':
        return 'เตือน';
      case 'ERROR':
        return 'ผิดพลาด';
      case 'INFO':
      default:
        return 'ข้อมูล';
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchTerm ||
      (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.event_title && event.event_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.event_description && event.event_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      event.event_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === 'ALL' || event.severity_level === severityFilter;
    const matchesCategory = categoryFilter === 'ALL' || event.event_category === categoryFilter;

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            ประวัติเหตุการณ์ระบบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
        </CardContent>
      </Card>
    );
  }

  const categories = [...new Set(events.map(e => e.event_category))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          ประวัติเหตุการณ์ระบบ
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          รายการ {filteredEvents.length} เหตุการณ์จากทั้งหมด {events.length} รายการ
        </p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาเหตุการณ์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="ระดับ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ทั้งหมด</SelectItem>
              <SelectItem value="SUCCESS">สำเร็จ</SelectItem>
              <SelectItem value="INFO">ข้อมูล</SelectItem>
              <SelectItem value="WARNING">เตือน</SelectItem>
              <SelectItem value="ERROR">ผิดพลาด</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ทั้งหมด</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || severityFilter !== 'ALL' || categoryFilter !== 'ALL'
                  ? 'ไม่พบเหตุการณ์ที่ตรงกับเงื่อนไข'
                  : 'ยังไม่มีประวัติเหตุการณ์ระบบ'
                }
              </div>
            ) : (
              filteredEvents.map((event, index) => (
                <div key={event.id}>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 mt-1">
                      {getSeverityIcon(event.severity_level)}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityBadgeVariant(event.severity_level)}>
                            {getSeverityText(event.severity_level)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {event.event_category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss')}
                          </span>
                        </div>
                      </div>

                      {event.event_title && (
                        <p className="text-sm font-semibold text-foreground">{event.event_title}</p>
                      )}
                      {event.event_description && (
                        <p className="text-sm text-muted-foreground">{event.event_description}</p>
                      )}
                      {!event.event_title && !event.event_description && event.description && (
                        <p className="text-sm font-medium">{event.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">ประเภท:</span>
                          <span className="font-mono text-xs">{event.event_type}</span>
                        </div>

                        {event.source_table && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">ตาราง:</span>
                            <span className="font-mono text-xs">{event.source_table}</span>
                          </div>
                        )}

                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="col-span-full">
                            <span className="text-muted-foreground text-xs">ข้อมูลเพิ่มเติม:</span>
                            <pre className="text-xs bg-muted/50 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {index < filteredEvents.length - 1 && <Separator className="my-2" />}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}