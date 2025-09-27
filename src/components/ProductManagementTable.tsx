import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useProducts } from '@/contexts/ProductsContext';
import { toast } from 'sonner';

export const ProductManagementTable = () => {
  const { products, loading, error } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Sample data matching the image structure
  const sampleData = [
    {
      id: '1',
      sku: 'A1-48G',
      name: 'ชุดเซรั่ม ขวดเล็กสีขาว 40g+ซอง',
      type: 'N/A',
      unit1: 'ชิ้น',
      unit2: 'ชิ้น', 
      ratio12: '1:30',
      ratio23: '1:6',
      status: 'ใช้งาน',
      actions: 'แก้ไข'
    },
    {
      id: '2', 
      sku: 'BC-M001-48BG',
      name: 'ถ้วยครีม ขาว 400 กรัม',
      type: 'PK',
      unit1: 'ชิ้น',
      unit2: 'ชิ้น',
      ratio12: '1:600', 
      ratio23: '1:100',
      status: 'ใช้งาน',
      actions: 'แก้ไข'
    },
    {
      id: '3',
      sku: 'BC-JH01-M01',
      name: 'แปลงกรรมเลอร์สีเงิน FG ขนาด แพค 01',
      type: 'PK', 
      unit1: 'ชิ้น',
      unit2: 'ชิ้น',
      ratio12: '1:4000',
      ratio23: '1:100', 
      status: 'ใช้งาน',
      actions: 'แก้ไข'
    },
    {
      id: '4',
      sku: 'BC-JH02-M01', 
      name: 'แปลงกรรมเลอร์สีเงิน FG ขนาด แพค 02',
      type: 'PK',
      unit1: 'ชิ้น', 
      unit2: 'ชิ้น',
      ratio12: '1:4000',
      ratio23: '1:100',
      status: 'ใช้งาน', 
      actions: 'แก้ไข'
    },
    {
      id: '5',
      sku: 'BC-K3-30G',
      name: 'ครีมทาผิวกาย โลชั่น บุคเคอร์ ขนาด 30G',
      type: 'PK',
      unit1: 'ชิ้น',
      unit2: 'ชิ้น', 
      ratio12: '1:3120',
      ratio23: '1:100',
      status: 'ใช้งาน',
      actions: 'แก้ไข'
    }
  ];

  // Filtered data
  const filteredData = useMemo(() => {
    return sampleData.filter(item => {
      const matchesSearch = 
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || item.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [searchTerm, filterType]);

  const getTypeBadge = (type: string) => {
    if (type === 'N/A') {
      return <Badge variant="outline">N/A</Badge>;
    }
    return (
      <Badge variant={type === 'FG' ? 'default' : 'secondary'}>
        {type}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        ● {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            ตั้งค่าข้อมูลปลองป่อง
            <Badge variant="outline" className="ml-2">
              {filteredData.length} SKU
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              เพิ่ม SKU ใหม่
            </Button>
            <Button variant="outline">
              ดึงข้อมูล
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">
              i
            </div>
            <div className="text-sm text-blue-800">
              <strong>ค้นหาข้อมูลปลองป่อง:</strong> หากพบข้อมูลที่ต้องการแก้ไข ให้กดปุ่ม "แก้ไข" ในคอลัมน์ 1 หรือคอลัมน์ 2 ได้ทันที/ปุ่มกระทำ 2
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา SKU, ชื่อสินค้า, หรือ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="ประเภททั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ประเภททั้งหมด</SelectItem>
              <SelectItem value="FG">FG</SelectItem>
              <SelectItem value="PK">PK</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">ชื่อสินค้า</TableHead>
                <TableHead className="font-semibold">ประเภท</TableHead>
                <TableHead className="font-semibold">หน่วยนับ 1</TableHead>
                <TableHead className="font-semibold">หน่วยนับ 2</TableHead>
                <TableHead className="font-semibold">อัตราแลก 1+2</TableHead>
                <TableHead className="font-semibold">อัตราแลก 2+3</TableHead>
                <TableHead className="font-semibold">สถานะ</TableHead>
                <TableHead className="font-semibold">การกระทำ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="font-medium">{item.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(item.type)}
                    </TableCell>
                    <TableCell>{item.unit1}</TableCell>
                    <TableCell>{item.unit2}</TableCell>
                    <TableCell className="font-medium">{item.ratio12}</TableCell>
                    <TableCell className="font-medium">{item.ratio23}</TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                        <Edit className="h-4 w-4 mr-1" />
                        {item.actions}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredData.length > 0 && (
          <div className="text-sm text-muted-foreground">
            แสดง {filteredData.length} รายการ
          </div>
        )}
      </CardContent>
    </Card>
  );
};
