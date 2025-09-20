import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Download, Search, Plus, RefreshCw, Trash2, MapPin, Package, Eye, Archive, AlertCircle, Info, Scan, Grid3X3, Printer } from 'lucide-react';
import { useLocationQR, type LocationQRCode } from '@/hooks/useLocationQR';
import { QRScanner } from './QRScanner';
import { DatabaseTester } from './debug/DatabaseTester';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem } from '@/hooks/useInventory';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';

interface QRCodeManagementProps {
  items: InventoryItem[];
}

function QRCodeManagement({ items }: QRCodeManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedQRCode, setSelectedQRCode] = useState<LocationQRCode | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [warehouseLocations, setWarehouseLocations] = useState<string[]>([]);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [showRangeGenerator, setShowRangeGenerator] = useState(false);
  const [rangeConfig, setRangeConfig] = useState({
    startRow: 'A',
    endRow: 'Z',
    startLevel: 1,
    endLevel: 5,
    startPosition: 1,
    endPosition: 10,
  });
  const [activeTab, setActiveTab] = useState<'manage' | 'print' | 'debug'>('manage');

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { toast } = useToast();

  const {
    qrCodes,
    loading,
    generateQRForLocation,
    bulkGenerateQR,
    deleteQRCode,
    getQRByLocation,
    refetch
  } = useLocationQR();

  // Fetch warehouse locations
  useEffect(() => {
    const fetchWarehouseLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('warehouse_locations')
          .select('location_code')
          .eq('is_active', true)
          .order('location_code');

        if (error) {
          console.error('Error fetching warehouse locations:', error);
          return;
        }

        const locations = data?.map(loc => loc.location_code) || [];
        setWarehouseLocations(locations);
      } catch (error) {
        console.error('Error fetching warehouse locations:', error);
      }
    };

    fetchWarehouseLocations();
  }, []);

  // Get all unique locations from inventory + warehouse locations
  const allLocations = useMemo(() => {
    const inventoryLocations = [...new Set(items.map(item => item.location))];
    const combinedLocations = [...new Set([...inventoryLocations, ...warehouseLocations])];
    return combinedLocations.sort();
  }, [items, warehouseLocations]);

  // Get locations that don't have QR codes yet
  const locationsWithoutQR = useMemo(() => {
    const qrLocations = new Set(qrCodes.map(qr => qr.location));
    const withoutQR = allLocations.filter(location => !qrLocations.has(location));
    return withoutQR;
  }, [allLocations, qrCodes]);

  // Filter QR codes based on search
  const filteredQRCodes = useMemo(() => {
    if (!debouncedSearchQuery) return qrCodes;
    return qrCodes.filter(qr =>
      qr.location.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [qrCodes, debouncedSearchQuery]);

  const handleGenerateQR = async (location: string) => {
    setIsGenerating(true);
    await generateQRForLocation(location, items);
    setIsGenerating(false);
  };

  const handleBulkGenerate = async () => {
    if (locationsWithoutQR.length === 0) return;
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: locationsWithoutQR.length });

    try {
      let successCount = 0;
      for (let i = 0; i < locationsWithoutQR.length; i++) {
        const location = locationsWithoutQR[i];
        setGenerationProgress({ current: i + 1, total: locationsWithoutQR.length });

        const result = await generateQRForLocation(location, items);
        if (result) successCount++;

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: 'สร้าง QR Code เสร็จสิ้น',
        description: `สร้างสำเร็จ ${successCount}/${locationsWithoutQR.length} ตำแหน่ง`,
      });
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้าง QR Code ได้',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleRegenerateAll = async () => {
    if (allLocations.length === 0) return;
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: allLocations.length });

    try {
      let successCount = 0;
      for (let i = 0; i < allLocations.length; i++) {
        const location = allLocations[i];
        setGenerationProgress({ current: i + 1, total: allLocations.length });

        const result = await generateQRForLocation(location, items);
        if (result) successCount++;

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: 'สร้าง QR Code ใหม่เสร็จสิ้น',
        description: `สร้างสำเร็จ ${successCount}/${allLocations.length} ตำแหน่ง`,
      });
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้าง QR Code ใหม่ได้',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const generateLocationRange = (): string[] => {
    const locations: string[] = [];
    const { startRow, endRow, startLevel, endLevel, startPosition, endPosition } = rangeConfig;

    for (let row = startRow.charCodeAt(0); row <= endRow.charCodeAt(0); row++) {
      const rowChar = String.fromCharCode(row);
      for (let level = startLevel; level <= endLevel; level++) {
        for (let position = startPosition; position <= endPosition; position++) {
          locations.push(`${rowChar}/${level}/${position.toString().padStart(2, '0')}`);
        }
      }
    }

    return locations;
  };

  const handleGenerateFromRange = async () => {
    const rangeLocations = generateLocationRange();
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: rangeLocations.length });

    try {
      let successCount = 0;
      for (let i = 0; i < rangeLocations.length; i++) {
        const location = rangeLocations[i];
        setGenerationProgress({ current: i + 1, total: rangeLocations.length });

        const result = await generateQRForLocation(location, items);
        if (result) successCount++;

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      toast({
        title: 'สร้าง QR Code จาก Range เสร็จสิ้น',
        description: `สร้างสำเร็จ ${successCount}/${rangeLocations.length} ตำแหน่ง`,
      });
      setShowRangeGenerator(false);
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้าง QR Code จาก Range ได้',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleScanSuccess = (location: string, data: any) => {
    setShowScanner(false);

    // Find the scanned QR code in our list
    const qrCode = getQRByLocation(location);
    if (qrCode) {
      setSelectedQRCode(qrCode);
    }

    // Auto-redirect: Navigate to the scanned URL for seamless experience
    if (data.url && data.action === 'add') {
      window.location.href = data.url;
    } else if (location) {
      // Fallback: Navigate with URL parameters
      const params = new URLSearchParams();
      params.set('tab', 'overview');
      params.set('location', location);
      params.set('action', 'add');
      window.location.href = `${window.location.origin}?${params.toString()}`;
    }
  };

  const downloadQRCode = (qrCode: LocationQRCode) => {
    if (qrCode.qr_image_url) {
      const a = document.createElement('a');
      a.href = qrCode.qr_image_url;
      a.download = `qr-${qrCode.location.replace(/\//g, '-')}.png`;
      a.click();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH');
  };

  // Debug info for environment
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isProduction = currentUrl.includes('lovableproject.com') || currentUrl.includes('vercel.app');

  return (
    <div className="space-y-6">
      {/* Environment Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium text-blue-900">Environment Debug Info</div>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Current URL: <code className="bg-blue-100 px-1 rounded">{currentUrl}</code></div>
                <div>Environment: <Badge variant={isProduction ? "default" : "secondary"}>{isProduction ? "Production" : "Development"}</Badge></div>
                <div>QR Codes in DB: {qrCodes.length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            จัดการ QR Code สำหรับตำแหน่งคลัง
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manage' | 'print' | 'debug')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            จัดการ QR Code
          </TabsTrigger>
          <TabsTrigger value="print" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            พิมพ์ QR Code ({filteredQRCodes.length})
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Debug & Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{qrCodes.length}</div>
              <div className="text-sm text-gray-600">QR Codes ทั้งหมด</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{allLocations.length}</div>
              <div className="text-sm text-gray-600">ตำแหน่งทั้งหมด</div>
              <div className="text-xs text-gray-500">({warehouseLocations.length} warehouse)</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{locationsWithoutQR.length}</div>
              <div className="text-sm text-gray-600">ยังไม่มี QR</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{Math.round((qrCodes.length / Math.max(allLocations.length, 1)) * 100)}%</div>
              <div className="text-sm text-gray-600">ความครอบคลุม</div>
            </div>
          </div>

          {/* Progress Bar */}
          {generationProgress && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">กำลังสร้าง QR Code...</span>
                <span className="text-sm text-gray-600">
                  {generationProgress.current}/{generationProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleBulkGenerate}
              disabled={isGenerating || locationsWithoutQR.length === 0}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              สร้าง QR ทั้งหมด ({locationsWithoutQR.length})
            </Button>

            <Button
              onClick={handleRegenerateAll}
              disabled={isGenerating || allLocations.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              สร้าง QR ใหม่ทั้งหมด
            </Button>

            <Button
              onClick={() => setShowRangeGenerator(true)}
              disabled={isGenerating}
              variant="outline"
              className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
            >
              <Grid3X3 className="h-4 w-4" />
              สร้างจาก Range
            </Button>

            <Button
              onClick={refetch}
              variant="outline"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>

            <Button
              onClick={() => setShowScanner(true)}
              variant="default"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Scan className="h-4 w-4" />
              สแกน QR Code
            </Button>

            {/* Single location generation */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  สร้าง QR ตำแหน่งเดียว
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>สร้าง QR Code สำหรับตำแหน่งเดียว</DialogTitle>
                  <DialogDescription>
                    เลือกตำแหน่งที่ต้องการสร้าง QR Code
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกตำแหน่ง" />
                    </SelectTrigger>
                    <SelectContent>
                      {allLocations.map(location => (
                        <SelectItem key={location} value={location}>
                          {location} {qrCodes.some(qr => qr.location === location) && '(มี QR แล้ว)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedLocation) {
                        handleGenerateQR(selectedLocation);
                        setSelectedLocation('');
                      }
                    }}
                    disabled={!selectedLocation || isGenerating}
                    className="w-full"
                  >
                    สร้าง QR Code
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="ค้นหาตำแหน่ง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* QR Codes List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            กำลังโหลด QR Codes...
          </div>
        ) : filteredQRCodes.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {debouncedSearchQuery ? 'ไม่พบ QR Code ที่ค้นหา' : (
              <div className="space-y-4">
                <div>ยังไม่มี QR Code</div>
                <div className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                  <AlertCircle className="h-4 w-4 inline-block mr-2" />
                  ต้องสร้าง QR Code ก่อนใช้งาน กดปุ่ม "สร้าง QR ทั้งหมด" ด้านบน
                </div>
              </div>
            )}
          </div>
        ) : (
          filteredQRCodes.map((qrCode) => {
            const snapshot = qrCode.inventory_snapshot as any;
            const isUrlFormat = qrCode.qr_code_data.startsWith('http');

            return (
              <Card key={qrCode.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {qrCode.location}
                    </span>
                    <div className="flex gap-2">
                      <Badge variant={qrCode.is_active ? "default" : "secondary"}>
                        {qrCode.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </Badge>
                      <Badge variant={isUrlFormat ? "default" : "destructive"}>
                        {isUrlFormat ? "URL" : "JSON"}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* QR Code Image */}
                  {qrCode.qr_image_url && (
                    <div className="flex justify-center">
                      <img
                        src={qrCode.qr_image_url}
                        alt={`QR Code for ${qrCode.location}`}
                        className="w-32 h-32 border rounded"
                      />
                    </div>
                  )}

                  {/* Warning for old JSON QR codes */}
                  {!isUrlFormat && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-2 text-sm text-orange-800">
                      <AlertCircle className="h-4 w-4 inline-block mr-1" />
                      QR Code รูปแบบเก่า (JSON) - ไม่เปิดหน้าเพิ่มสินค้าได้
                    </div>
                  )}

                  {/* Summary */}
                  {snapshot?.summary && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {snapshot.summary.total_items} รายการ
                      </div>
                      <div>{snapshot.summary.total_boxes} ลัง</div>
                      <div>{snapshot.summary.total_loose} เศษ</div>
                      <div>{snapshot.summary.product_types} ประเภท</div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>สร้าง: {formatDate(qrCode.generated_at)}</div>
                    <div>อัพเดต: {formatDate(qrCode.last_updated)}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => downloadQRCode(qrCode)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      ดาวน์โหลด
                    </Button>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedQRCode(qrCode)}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>QR Code - {qrCode.location}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {qrCode.qr_image_url && (
                            <div className="flex justify-center">
                              <img
                                src={qrCode.qr_image_url}
                                alt={`QR Code for ${qrCode.location}`}
                                className="w-48 h-48 border rounded"
                              />
                            </div>
                          )}
                          <div className="text-sm space-y-2">
                            <div><strong>ตำแหน่ง:</strong> {qrCode.location}</div>
                            <div><strong>สถานะ:</strong> {qrCode.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}</div>
                            <div><strong>รูปแบบ:</strong> {isUrlFormat ? 'URL (ใหม่)' : 'JSON (เก่า)'}</div>
                            <div><strong>สร้างเมื่อ:</strong> {formatDate(qrCode.generated_at)}</div>
                            <div><strong>อัพเดตล่าสุด:</strong> {formatDate(qrCode.last_updated)}</div>
                            <div className="break-all"><strong>ข้อมูล:</strong> <code className="text-xs bg-gray-100 p-1 rounded">{qrCode.qr_code_data.substring(0, 100)}...</code></div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      onClick={() => handleGenerateQR(qrCode.location)}
                      size="sm"
                      variant="secondary"
                      disabled={isGenerating}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>

                    <Button
                      onClick={() => deleteQRCode(qrCode.id)}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Locations without QR */}
      {locationsWithoutQR.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              ตำแหน่งที่ยังไม่มี QR Code ({locationsWithoutQR.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {locationsWithoutQR.map(location => (
                <Badge
                  key={location}
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={() => handleGenerateQR(location)}
                >
                  {location}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Scanner */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Range Generator Dialog */}
      <Dialog open={showRangeGenerator} onOpenChange={setShowRangeGenerator}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              สร้าง QR Code จาก Range
            </DialogTitle>
            <DialogDescription>
              กำหนดช่วงของตำแหน่งที่ต้องการสร้าง QR Code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Row Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">แถวเริ่มต้น</label>
                <Input
                  value={rangeConfig.startRow}
                  onChange={(e) => setRangeConfig(prev => ({ ...prev, startRow: e.target.value.toUpperCase() }))}
                  placeholder="A"
                  maxLength={1}
                />
              </div>
              <div>
                <label className="text-sm font-medium">แถวสุดท้าย</label>
                <Input
                  value={rangeConfig.endRow}
                  onChange={(e) => setRangeConfig(prev => ({ ...prev, endRow: e.target.value.toUpperCase() }))}
                  placeholder="Z"
                  maxLength={1}
                />
              </div>
            </div>

            {/* Level Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">ชั้นเริ่มต้น</label>
                <Input
                  type="number"
                  value={rangeConfig.startLevel}
                  onChange={(e) => setRangeConfig(prev => ({ ...prev, startLevel: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={10}
                />
              </div>
              <div>
                <label className="text-sm font-medium">ชั้นสุดท้าย</label>
                <Input
                  type="number"
                  value={rangeConfig.endLevel}
                  onChange={(e) => setRangeConfig(prev => ({ ...prev, endLevel: parseInt(e.target.value) || 5 }))}
                  min={1}
                  max={10}
                />
              </div>
            </div>

            {/* Position Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">ตำแหน่งเริ่มต้น</label>
                <Input
                  type="number"
                  value={rangeConfig.startPosition}
                  onChange={(e) => setRangeConfig(prev => ({ ...prev, startPosition: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={99}
                />
              </div>
              <div>
                <label className="text-sm font-medium">ตำแหน่งสุดท้าย</label>
                <Input
                  type="number"
                  value={rangeConfig.endPosition}
                  onChange={(e) => setRangeConfig(prev => ({ ...prev, endPosition: parseInt(e.target.value) || 10 }))}
                  min={1}
                  max={99}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-2">ตัวอย่าง:</div>
              <div className="text-sm text-gray-600">
                จะสร้าง {generateLocationRange().length} ตำแหน่ง
              </div>
              <div className="text-xs text-gray-500 mt-1">
                เช่น: {generateLocationRange().slice(0, 3).join(', ')}...
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowRangeGenerator(false)}
                variant="outline"
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleGenerateFromRange}
                disabled={isGenerating}
                className="flex-1"
              >
                สร้าง QR Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Print View Tab */}
        <TabsContent value="print" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                QR Code สำหรับพิมพ์
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาตำแหน่ง (เช่น A01-01)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => window.print()}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Printer className="h-4 w-4" />
                  พิมพ์หน้านี้
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredQRCodes.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'ไม่พบ QR Code ที่ตรงกับการค้นหา' : 'ไม่มี QR Code ที่พร้อมพิมพ์'}
                  </p>
                </div>
              ) : (
                <div className="print-container">
                  <style>
                    {`
                      @media print {
                        .print-container {
                          display: grid !important;
                          grid-template-columns: repeat(3, 1fr) !important;
                          gap: 15px !important;
                          padding: 0 !important;
                        }
                        .print-qr-card {
                          break-inside: avoid !important;
                          page-break-inside: avoid !important;
                          border: 1px solid #000 !important;
                          padding: 10px !important;
                          text-align: center !important;
                          background: white !important;
                        }
                        .print-qr-code {
                          margin: 0 auto 8px auto !important;
                          max-width: 80px !important;
                          max-height: 80px !important;
                        }
                        .print-location {
                          font-size: 12px !important;
                          font-weight: bold !important;
                          margin-bottom: 4px !important;
                        }
                        .print-url {
                          font-size: 8px !important;
                          word-break: break-all !important;
                          color: #666 !important;
                        }
                        body { margin: 0 !important; }
                        .no-print { display: none !important; }
                      }
                      .print-container {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                        gap: 20px;
                      }
                    `}
                  </style>
                  {filteredQRCodes.map((qrCode) => (
                    <div key={qrCode.location} className="print-qr-card border rounded-lg p-4 text-center bg-white">
                      <div className="print-qr-code mb-3 flex justify-center">
                        <img
                          src={qrCode.qr_code_data}
                          alt={`QR Code for ${qrCode.location}`}
                          className="w-24 h-24 mx-auto"
                        />
                      </div>
                      <div className="print-location text-lg font-bold mb-2">
                        {qrCode.location}
                      </div>
                      <div className="print-url text-xs text-muted-foreground break-all">
                        {qrCode.url}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ตำแหน่งคลังสินค้า
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredQRCodes.length > 0 && (
                <div className="no-print mt-6 pt-4 border-t text-center text-muted-foreground">
                  <p className="text-sm">
                    แสดง {filteredQRCodes.length} QR Code สำหรับพิมพ์
                  </p>
                  <p className="text-xs mt-1">
                    ใช้ปุ่ม "พิมพ์หน้านี้" ด้านบนหรือ Ctrl+P เพื่อพิมพ์
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debug & Test Tab */}
        <TabsContent value="debug" className="space-y-6">
          <DatabaseTester />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default QRCodeManagement;