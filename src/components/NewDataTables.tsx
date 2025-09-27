import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Hash, Search, Download, QrCode, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

interface InventoryLocation {
  id: string;
  product_name: string;
  sku_code: string;
  location: string;
  has_qr: boolean;
  lot: string;
  mfd: string;
  unit_display: string;
  total_pieces: number;
  calculation_display: string;
  status: 'สูง' | 'หมด' | 'ต่ำ';
  shelf_level: number;
}

interface ProductSummary {
  sku: string;
  product_name: string;
  product_type: 'FG' | 'PK';
  total_pieces: number;
  unit_display: string;
  locations_count: number;
}

// Sample data for inventory locations (from your example)
const sampleInventoryLocations: InventoryLocation[] = [
  {
    id: '1',
    product_name: 'ดีดีครีมวอเตอร์เมลอนซันสกรีน 8g',
    sku_code: 'L3-8G',
    location: 'A1/1',
    has_qr: true,
    lot: '008/25',
    mfd: '1/8/2568',
    unit_display: '32 ลัง',
    total_pieces: 16128,
    calculation_display: 'คำนวณ: (32×504)',
    status: 'สูง',
    shelf_level: 1
  },
  {
    id: '2',
    product_name: 'ดีดีครีมวอเตอร์เมลอนซันสกรีน 8g',
    sku_code: 'L3-8G',
    location: 'A2/1',
    has_qr: true,
    lot: '008/25',
    mfd: '1/8/2568',
    unit_display: '32 ลัง',
    total_pieces: 16128,
    calculation_display: 'คำนวณ: (32×504)',
    status: 'สูง',
    shelf_level: 1
  },
  {
    id: '3',
    product_name: 'เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 7G',
    sku_code: 'C3-7G',
    location: 'A20/1',
    has_qr: true,
    lot: '-',
    mfd: '-',
    unit_display: 'ไม่มีข้อมูล',
    total_pieces: 0,
    calculation_display: '',
    status: 'หมด',
    shelf_level: 1
  },
  {
    id: '4',
    product_name: 'ดีดีครีมวอเตอร์เมลอนซันสกรีน 8g',
    sku_code: 'L3-8G',
    location: 'A3/1',
    has_qr: true,
    lot: '009/25',
    mfd: '1/9/2568',
    unit_display: '10 ลัง',
    total_pieces: 5040,
    calculation_display: 'คำนวณ: (10×504)',
    status: 'สูง',
    shelf_level: 1
  },
  {
    id: '5',
    product_name: 'ลองแกน เมลาสม่า โปร เซรั่ม 8g',
    sku_code: 'L4-8G',
    location: 'B1/1',
    has_qr: true,
    lot: 'L008/25',
    mfd: '1/8/2568',
    unit_display: '32 ลัง',
    total_pieces: 2688,
    calculation_display: 'คำนวณ: (32×84)',
    status: 'สูง',
    shelf_level: 1
  },
  {
    id: '6',
    product_name: 'ลองแกน เมลาสม่า โปร เซรั่ม 8g',
    sku_code: 'L4-8G',
    location: 'B17/1',
    has_qr: true,
    lot: '008/25',
    mfd: '1/8/2568',
    unit_display: '20 ลัง + 45 กล่อง',
    total_pieces: 10350,
    calculation_display: 'คำนวณ: (20×504 + 45×6)',
    status: 'สูง',
    shelf_level: 1
  }
];

// Sample data for product summary
const sampleProductSummary: ProductSummary[] = [
  {
    sku: 'SPOUT-S100',
    product_name: 'จุก 5 มม.',
    product_type: 'PK',
    total_pieces: 3790000,
    unit_display: '379 ลัง',
    locations_count: 10
  },
  {
    sku: 'SCH-L10-7G_M01_NS',
    product_name: 'ซองบรรจุ วอเตอร์เมลอน ทรีดี ออร่า ซัน การ์ด SPF50+PA++++ 7 G- 3Dแตงโม(ไม่มีจุก)',
    product_type: 'PK',
    total_pieces: 2081158,
    unit_display: '416 ลัง + 11 กล่อง + 58 ชิ้น',
    locations_count: 6
  },
  {
    sku: 'BOX-L10-7G_M01_WHT',
    product_name: 'กล่องบรรจุ วอเตอร์เมลอน ทรีดี ออร่า ซัน การ์ด SPF50+PA++++ 7 กรัม - 3Dแตงโม',
    product_type: 'PK',
    total_pieces: 2052285,
    unit_display: '2052 ลัง + 2 กล่อง + 85 ชิ้น',
    locations_count: 27
  },
  {
    sku: 'L4-8G',
    product_name: 'ลองแกน เมลาสม่า โปร เซรั่ม 8g',
    product_type: 'FG',
    total_pieces: 1065726,
    unit_display: '2114 ลัง + 45 กล่อง',
    locations_count: 63
  },
  {
    sku: 'L10-7G',
    product_name: 'วอเตอร์เมลอน ทรีดี ออร่า ซัน การ์ด SPF50+PA++++ 7 กรัม',
    product_type: 'FG',
    total_pieces: 865872,
    unit_display: '1718 ลัง',
    locations_count: 50
  }
];

export const NewDataTables = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredInventoryLocations = useMemo(() => {
    return sampleInventoryLocations.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [searchTerm]);

  const filteredProductSummary = useMemo(() => {
    return sampleProductSummary.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'all' || item.product_type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [searchTerm, selectedType]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'สูง':
        return <Badge className="bg-green-100 text-green-800 border-green-300">สูง</Badge>;
      case 'หมด':
        return <Badge className="bg-red-100 text-red-800 border-red-300">หมด</Badge>;
      case 'ต่ำ':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">ต่ำ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalItems = activeTab === 'inventory' ? 816 : 384;
  const totalPieces = activeTab === 'inventory' ? null : '27,076,285';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              {activeTab === 'inventory' ? (
                <>
                  <Package className="h-6 w-6 text-blue-600" />
                  ตารางสรุปสินค้าในคลัง
                </>
              ) : (
                <>
                  <Hash className="h-6 w-6 text-purple-600" />
                  ตารางสรุปสินค้า
                </>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export สรุปตำแหน่ง
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export ข้อมูลทั้งหมด
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>{totalItems} รายการ</span>
            {totalPieces && (
              <>
                <span>{totalPieces} จำนวนรวม (ชิ้น)</span>
                <span>154 สินค้าที่มีสต็อก</span>
                <span>129 สินค้าสำเร็จรูป (FG)</span>
                <span>255 วัสดุบรรจุ (PK)</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                รายการสต็อก
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                สรุปสินค้า
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={activeTab === 'inventory' ? "ค้นหาด้วย SKU, ชื่อสินค้า, หรือตำแหน่ง..." : "ค้นหาด้วย SKU หรือชื่อสินค้า..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 max-w-md"
                />
              </div>
              {activeTab === 'products' && (
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกประเภท</SelectItem>
                    <SelectItem value="FG">สินค้าสำเร็จรูป</SelectItem>
                    <SelectItem value="PK">วัสดุบรรจุ</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button>
                <Download className="h-4 w-4 mr-2" />
                ส่งออก CSV
              </Button>
            </div>

            <TabsContent value="inventory" className="space-y-4">
              {activeTab === 'inventory' && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                    <Package className="h-4 w-4" />
                    ชั้นที่ 1
                  </div>
                  <div className="text-xs text-blue-600">
                    แสดงรายการสต็อกตามตำแหน่งจัดเก็บในคลัง
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead className="min-w-[250px]">ชื่อสินค้า</TableHead>
                      <TableHead>รหัสสินค้า</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                      <TableHead>QR</TableHead>
                      <TableHead>LOT</TableHead>
                      <TableHead>MFD</TableHead>
                      <TableHead>หน่วยสินค้า</TableHead>
                      <TableHead>รวมทั้งหมด</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>Export</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventoryLocations.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm text-gray-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.product_name}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-blue-600">
                          {item.sku_code}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{item.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {item.has_qr ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="text-sm">
                              {item.has_qr ? 'มี' : 'ไม่มี'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.lot}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.mfd}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{item.unit_display}</div>
                            {item.calculation_display && (
                              <div className="text-xs text-gray-500">
                                {item.calculation_display}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {item.total_pieces > 0 ? item.total_pieces.toLocaleString() : '-'} ชิ้น
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(item.status)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead className="min-w-[250px]">ชื่อสินค้า</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>จำนวนรวม</TableHead>
                      <TableHead>จำนวน (แปลงหน่วย)</TableHead>
                      <TableHead>Locations</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProductSummary.map((item, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm font-medium text-blue-600">
                          {item.sku}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.product_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.product_type === 'FG' ? 'default' : 'secondary'}
                          >
                            {item.product_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {item.total_pieces.toLocaleString()}
                            <div className="text-sm text-gray-500">ชิ้น</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-green-600">
                            {item.unit_display}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{item.locations_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Package className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-500">
                  แสดง 1-50 จาก 384 รายการ
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    ก่อนหน้า
                  </Button>
                  <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600">
                    หน้า 1 จาก 8
                  </Button>
                  <Button variant="outline" size="sm">
                    ถัดไป
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};