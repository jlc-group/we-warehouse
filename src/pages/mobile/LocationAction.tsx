import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardCheck, History, RefreshCw, MapPin, Clock, User } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { localDb } from '@/integrations/local/client';
import { LocationActivityService } from '@/services/locationActivityService';
import { useAuth } from '@/contexts/AuthContextSimple';
import { Badge } from '@/components/ui/badge';

/**
 * Mobile Location Action Page
 * หน้าจอหลักหลังสแกน QR Code ที่ location
 * แสดงสินค้าปัจจุบัน + เมนู action + ประวัติล่าสุด
 */
export default function LocationAction() {
  const { locationCode } = useParams<{ locationCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Convert URL format back: A3-2 → A3/2
  const location = (locationCode || '').replace(/-/g, '/');

  const [inventory, setInventory] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!location) return;

    try {
      // Fetch inventory at this location
      const { data: items } = await localDb
        .from('inventory_items')
        .select('id, sku, product_name, unit_level1_quantity, unit_level1_name, unit_level2_quantity, unit_level2_name, unit_level3_quantity, unit_level3_name, total_base_quantity, lot, mfd, expiry_date')
        .eq('location', location)
        .eq('is_deleted', false)
        .order('product_name');

      setInventory(items || []);

      // Fetch recent activity history
      const historyResult = await LocationActivityService.getLocationHistory(location, 10);
      setHistory(historyResult || []);
    } catch (e) {
      console.error('Error fetching location data:', e);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchData();

    // Log scan activity
    if (location && user) {
      LocationActivityService.logScan(location, user.email || user.id || 'unknown');
    }
  }, [fetchData, location, user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'MOVE_IN':
      case 'RECEIVE': return <ArrowDownToLine className="h-4 w-4 text-green-600" />;
      case 'MOVE_OUT':
      case 'SHIP_OUT': return <ArrowUpFromLine className="h-4 w-4 text-red-600" />;
      case 'TRANSFER': return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      case 'COUNT': return <ClipboardCheck className="h-4 w-4 text-purple-600" />;
      case 'SCAN': return <MapPin className="h-4 w-4 text-gray-400" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'MOVE_IN': return 'รับเข้า';
      case 'MOVE_OUT': return 'ส่งออก';
      case 'RECEIVE': return 'รับสินค้า';
      case 'SHIP_OUT': return 'จัดส่ง';
      case 'TRANSFER': return 'ย้าย';
      case 'COUNT': return 'นับสต็อก';
      case 'ADJUST': return 'ปรับปรุง';
      case 'SCAN': return 'สแกน';
      default: return type;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const formatQuantity = (item: any) => {
    const parts = [];
    if (item.unit_level1_quantity > 0) parts.push(`${item.unit_level1_quantity} ${item.unit_level1_name || 'ลัง'}`);
    if (item.unit_level2_quantity > 0) parts.push(`${item.unit_level2_quantity} ${item.unit_level2_name || 'กล่อง'}`);
    if (item.unit_level3_quantity > 0) parts.push(`${item.unit_level3_quantity} ${item.unit_level3_name || 'ชิ้น'}`);
    return parts.length > 0 ? parts.join(' ') : `${item.total_base_quantity || 0} ชิ้น`;
  };

  // Parse location parts for display
  const zone = location.match(/^([A-Z]+)/)?.[1] || '';
  const parts = location.split('/');
  const shelf = parts[0] || '';
  const level = parts[1] || '';

  const actions = [
    {
      label: 'รับเข้า',
      icon: ArrowDownToLine,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => navigate(`/mobile/receive`, { state: { prefilledLocation: location } })
    },
    {
      label: 'ส่งออก',
      icon: ArrowUpFromLine,
      color: 'bg-red-500 hover:bg-red-600',
      onClick: () => navigate(`/mobile/pick`, { state: { prefilledLocation: location } })
    },
    {
      label: 'ย้ายสินค้า',
      icon: ArrowLeftRight,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => navigate(`/mobile/move`, { state: { prefilledLocation: location } })
    },
    {
      label: 'นับสต็อก',
      icon: ClipboardCheck,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => navigate(`/mobile/count`, { state: { prefilledLocation: location } })
    }
  ];

  return (
    <MobileLayout title={`Location ${location}`} showBack helpTopic="location-action">
      <div className="p-4 space-y-4 pb-24">
        {/* Location Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <h1 className="text-2xl font-bold">{location}</h1>
              </div>
              <p className="text-blue-100 text-sm mt-1">
                Zone {zone} · ชั้น {shelf} · ระดับ {level}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-3 flex gap-3">
            <div className="bg-white/20 rounded-lg px-3 py-1 text-sm">
              <Package className="h-3.5 w-3.5 inline mr-1" />
              {inventory.length} รายการ
            </div>
            <div className="bg-white/20 rounded-lg px-3 py-1 text-sm">
              <History className="h-3.5 w-3.5 inline mr-1" />
              {history.length} กิจกรรม
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">เลือกการดำเนินการ</h2>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-md active:scale-95 transition-transform`}
              >
                <action.icon className="h-7 w-7" />
                <span className="font-medium text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Current Inventory */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
            สินค้าปัจจุบัน ({inventory.length})
          </h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">กำลังโหลด...</div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-400">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              ไม่มีสินค้าที่ตำแหน่งนี้
            </div>
          ) : (
            <div className="space-y-2">
              {inventory.map((item) => (
                <div key={item.id} className="bg-white border rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</p>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2 shrink-0">
                      {formatQuantity(item)}
                    </Badge>
                  </div>
                  {item.lot && (
                    <p className="text-xs text-gray-400 mt-1">Lot: {item.lot}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
            ประวัติล่าสุด
          </h2>
          {history.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-400">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              ยังไม่มีกิจกรรม
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((entry: any, i: number) => (
                <div key={entry.id || i} className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2">
                  {getActivityIcon(entry.activity_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{getActivityLabel(entry.activity_type)}</span>
                      {entry.product_name && (
                        <span className="text-xs text-gray-500 truncate">{entry.product_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <User className="h-3 w-3" />
                      <span>{entry.user_name || entry.user_id || '-'}</span>
                      <span>·</span>
                      <span>{formatTime(entry.created_at)}</span>
                    </div>
                  </div>
                  {entry.quantity && (
                    <span className="text-xs font-medium text-gray-600">
                      {entry.quantity > 0 ? '+' : ''}{entry.quantity} {entry.unit || ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
