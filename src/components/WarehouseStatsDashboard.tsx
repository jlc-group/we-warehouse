import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Package, TrendingUp, ShoppingCart, FileSpreadsheet, Search, MoreHorizontal, MapPin } from 'lucide-react';
import { useProducts } from '@/contexts/ProductsContext';

export const WarehouseStatsDashboard = () => {
  const { products, loading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Sample data matching the second image
  const statsData = {
    totalProducts: 384,
    totalValue: 27065545,
    bestSellers: 154,
    newProducts: 129,
    totalRecords: 255
  };

  const detailData = [
    {
      id: '1',
      sku: 'SPOUT-S100',
      name: 'ชุด 5 ชิ้น.',
      category: 'PK',
      price: '3,799,000 ฿',
      quantity: '379 ชิ้น',
      locations: '10'
    },
    {
      id: '2', 
      sku: 'SCH-L10-7G_M01_NS',
      name: 'ชุดบรรจุ เจลเดอร์โลชั่น ขนาด สีฟ้า ขนาด SPF50+PA++++ 7 G- 30ชิ้นใน(ไม่มีกล่อง)',
      category: 'PK',
      price: '2,081,158 ฿', 
      quantity: '416 ชิ้น + 11 กล่อง + 58 ชิ้น',
      locations: '6'
    },
    {
      id: '3',
      sku: 'BOX-L10-7G_M01_WHT',
      name: 'กล่องบรรจุ เจลเดอร์โลชั่น ขนาด สีน้ำเงิน SPF50+PA++++ 7 กรัม - 30ชิ้นใน',
      category: 'PK', 
      price: '2,052,285 ฿',
      quantity: '2052 ชิ้น + 2 กล่อง + 85 ชิ้น',
      locations: '27'
    },
    {
      id: '4',
      sku: 'SCH-L4-8G_M01',
      name: 'ชุดบรรจุ ลิปบาล์ม แบบหลอด โลชั่น ขนาด 8G - ขาวใสใน(ไม่มีกล่อง)',
      category: 'PK',
      price: '1,255,241 ฿',
      quantity: '627 ชิ้น + 12 กล่อง + 41 ชิ้น', 
      locations: '22'
    },
    {
      id: '5',
      sku: 'L4-8G',
      name: 'ลิปบาล์ม แบบหลอด โลชั่น ขนาด 8g',
      category: 'FG',
      price: '1,065,726 ฿',
      quantity: '2114 ชิ้น + 45 กล่อง',
      locations: '63'
    },
    {
      id: '6', 
      sku: 'L10-7G',
      name: 'เจลเดอร์โลชั่น ขนาด สีฟ้า ขนาด SPF50+PA++++ 7 กรัม',
      category: 'FG',
      price: '865,872 ฿',
      quantity: '1718 ชิ้น',
      locations: '50'
    },
    {
      id: '7',
      sku: 'BOX-L6-48G_M01_WHT', 
      name: 'กล่องบรรจุ แครอท แครอท เจลใสใส ขนาด 48G-ขาวแสงแสงใส',
      category: 'PK',
      price: '690,692 ฿',
      quantity: '690 ชิ้น + 6 กล่อง + 62 ชิ้น',
      locations: '9'
    },
    {
      id: '8',
      sku: 'SCH-C3-7G_M01',
      name: 'ชุดบรรจุ เจลเมด์ ขิงสี ตู่ ขี่ เจลเมด์ SPF50+PA++++ 7g -ขาวแสงแสงใส',
      category: 'PK', 
      price: '686,148 ฿',
      quantity: '137 ชิ้น + 11 กล่อง + 48 ชิ้น',
      locations: '2'
    }
  ];

  // Filtered data
  const filteredData = useMemo(() => {
    return detailData.filter(item => {
      const matchesSearch = 
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || item.category === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [searchTerm, filterType]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('th-TH');
  };

  const getCategoryBadge = (category: string) => {
    return (
      <Badge variant={category === 'FG' ? 'default' : 'secondary'} className="font-medium">
        {category}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{statsData.totalProducts}</div>
              <div className="text-sm text-blue-800 font-medium">สินค้าทั้งหมด</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{formatNumber(statsData.totalValue)}</div>
              <div className="text-sm text-green-800 font-medium">ค่าขายรวม (บาท)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{statsData.bestSellers}</div>
              <div className="text-sm text-purple-800 font-medium">สินค้าที่ขายดี</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{statsData.newProducts}</div>
              <div className="text-sm text-orange-800 font-medium">สินค้าที่ใหม่ (FG)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{statsData.totalRecords}</div>
              <div className="text-sm text-indigo-800 font-medium">รายการทั้งหมด (PK)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              ตารางสรุปสินค้า
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="ประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="FG">FG</SelectItem>
                  <SelectItem value="PK">PK</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                ส่งออก CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา SKU หรือชื่อสินค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table Headers */}
          <div className="grid grid-cols-7 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              SKU
            </div>
            <div>ชื่อสินค้า</div>
            <div className="text-center">ประเภท</div>
            <div className="text-right">ค่าขาย (บาท)</div>
            <div className="text-center">จำนวน (หน่วยนับ)</div>
            <div className="flex items-center gap-1 justify-center">
              <MapPin className="h-4 w-4" />
              Locations
            </div>
            <div className="text-center">จัดการ</div>
          </div>

          {/* Table Data */}
          <div className="space-y-2">
            {filteredData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
              </div>
            ) : (
              filteredData.map((item) => (
                <div key={item.id} className="grid grid-cols-7 gap-4 py-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg">
                  <div className="font-mono font-medium text-blue-600">{item.sku}</div>
                  <div className="text-sm">
                    <div className="font-medium line-clamp-2">{item.name}</div>
                  </div>
                  <div className="flex justify-center">
                    {getCategoryBadge(item.category)}
                  </div>
                  <div className="text-right font-medium text-green-600">{item.price}</div>
                  <div className="text-center text-sm">{item.quantity}</div>
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {item.locations}
                    </Badge>
                  </div>
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>ดูรายละเอียด</DropdownMenuItem>
                        <DropdownMenuItem>แก้ไข</DropdownMenuItem>
                        <DropdownMenuItem>ส่งออก</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredData.length > 0 && (
            <div className="text-sm text-muted-foreground pt-4 border-t">
              แสดง {filteredData.length} จากทั้งหมด {detailData.length} รายการ
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
