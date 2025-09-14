import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Warehouse, BarChart3, Table, Search, Package } from 'lucide-react';
import { ShelfGrid, InventoryItem } from '@/components/ShelfGrid';
import { InventoryModal } from '@/components/InventoryModal';
import { InventorySearch } from '@/components/InventorySearch';
import { InventoryAnalytics } from '@/components/InventoryAnalytics';
import { InventoryTable } from '@/components/InventoryTable';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    // Sample data
    {
      id: '1',
      location: 'A1/1',
      productName: 'สบู่ยันฮี',
      productCode: 'YH001',
      lot: 'L240815',
      mfd: '2024-08-15',
      quantityBoxes: 25,
      quantityLoose: 3,
      updatedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      location: 'A2/2',
      productName: 'แชมพูซันซิล',
      productCode: 'SS102',
      lot: 'L240920',
      mfd: '2024-09-20',
      quantityBoxes: 15,
      quantityLoose: 8,
      updatedAt: new Date('2024-01-14')
    },
    {
      id: '3',
      location: 'B3/1',
      productName: 'ครีมกันแดด',
      productCode: 'SC203',
      lot: 'L241001',
      mfd: '2024-10-01',
      quantityBoxes: 40,
      quantityLoose: 2,
      updatedAt: new Date('2024-01-13')
    }
  ]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();
  const { toast } = useToast();

  const handleShelfClick = (location: string, item?: InventoryItem) => {
    setSelectedLocation(location);
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = (itemData: Omit<InventoryItem, 'id' | 'updatedAt'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: selectedItem?.id || `item-${Date.now()}`,
      updatedAt: new Date()
    };

    if (selectedItem) {
      // Update existing item
      setInventoryItems(prev => 
        prev.map(item => item.id === selectedItem.id ? newItem : item)
      );
      toast({
        title: "อัปเดตสำเร็จ",
        description: `อัปเดตข้อมูลสินค้า ${itemData.productName} แล้ว`,
      });
    } else {
      // Add new item
      setInventoryItems(prev => [...prev, newItem]);
      toast({
        title: "บันทึกสำเร็จ",
        description: `เพิ่มสินค้า ${itemData.productName} แล้ว`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-warehouse shadow-warehouse">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Warehouse className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">ระบบจัดการคลังสินค้า</h1>
                <p className="text-white/80">Warehouse Inventory Management System</p>
              </div>
            </div>
            <div className="text-white/80 text-sm">
              จำนวนสินค้า: {inventoryItems.length} รายการ
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="grid" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              กราฟชั้นวาง
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              ค้นหาสินค้า
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              ตารางสรุป
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              กราฟวิเคราะห์
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  แผนผังชั้นวางสินค้า
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  คลิกที่ช่องต่าง ๆ เพื่อเพิ่มหรือแก้ไขข้อมูลสินค้า
                </p>
              </CardHeader>
              <CardContent>
                <ShelfGrid 
                  items={inventoryItems} 
                  onShelfClick={handleShelfClick}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  ค้นหาสินค้า
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InventorySearch 
                  items={inventoryItems}
                  onItemSelect={(item) => handleShelfClick(item.location, item)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table">
            <InventoryTable items={inventoryItems} />
          </TabsContent>

          <TabsContent value="analytics">
            <InventoryAnalytics items={inventoryItems} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal */}
      <InventoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        location={selectedLocation}
        existingItem={selectedItem}
      />
    </div>
  );
};

export default Index;
