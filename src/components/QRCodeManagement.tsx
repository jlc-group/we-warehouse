import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QrCode, Download, Search, Plus, RefreshCw, Trash2, MapPin, Package, Eye, Archive } from 'lucide-react';
import { useLocationQR, type LocationQRCode } from '@/hooks/useLocationQR';
import type { InventoryItem } from '@/hooks/useInventory';

interface QRCodeManagementProps {
  items: InventoryItem[];
}

export function QRCodeManagement({ items }: QRCodeManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedQRCode, setSelectedQRCode] = useState<LocationQRCode | null>(null);

  const {
    qrCodes,
    loading,
    generateQRForLocation,
    bulkGenerateQR,
    deleteQRCode,
    refetch
  } = useLocationQR();

  // Get all unique locations from inventory
  const allLocations = useMemo(() => {
    const locations = [...new Set(items.map(item => item.location))].sort();
    return locations;
  }, [items]);

  // Get locations that don't have QR codes yet
  const locationsWithoutQR = useMemo(() => {
    const qrLocations = new Set(qrCodes.map(qr => qr.location));
    return allLocations.filter(location => !qrLocations.has(location));
  }, [allLocations, qrCodes]);

  // Filter QR codes based on search
  const filteredQRCodes = useMemo(() => {
    if (!searchQuery) return qrCodes;
    return qrCodes.filter(qr =>
      qr.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [qrCodes, searchQuery]);

  const handleGenerateQR = async (location: string) => {
    setIsGenerating(true);
    await generateQRForLocation(location, items);
    setIsGenerating(false);
  };

  const handleBulkGenerate = async () => {
    if (locationsWithoutQR.length === 0) return;
    setIsGenerating(true);
    await bulkGenerateQR(locationsWithoutQR, items);
    setIsGenerating(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            จัดการ QR Code สำหรับตำแหน่งคลัง
          </CardTitle>
        </CardHeader>
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
              onClick={refetch}
              variant="outline"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
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
            {searchQuery ? 'ไม่พบ QR Code ที่ค้นหา' : 'ยังไม่มี QR Code'}
          </div>
        ) : (
          filteredQRCodes.map((qrCode) => {
            const snapshot = qrCode.inventory_snapshot as any;

            return (
              <Card key={qrCode.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {qrCode.location}
                    </span>
                    <Badge variant={qrCode.is_active ? "default" : "secondary"}>
                      {qrCode.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </Badge>
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
                            <div><strong>สร้างเมื่อ:</strong> {formatDate(qrCode.generated_at)}</div>
                            <div><strong>อัพเดตล่าสุด:</strong> {formatDate(qrCode.last_updated)}</div>
                            <div><strong>URL:</strong> <code className="text-xs bg-gray-100 p-1 rounded">{qrCode.qr_code_data}</code></div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

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
    </div>
  );
}