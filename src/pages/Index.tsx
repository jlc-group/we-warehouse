import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Warehouse, BarChart3, Table, Search, Package, LogIn } from 'lucide-react';
import { ShelfGrid } from '@/components/ShelfGrid';
import { InventoryModal } from '@/components/InventoryModal';
import { InventorySearch } from '@/components/InventorySearch';
import { InventoryAnalytics } from '@/components/InventoryAnalytics';
import { InventoryTable } from '@/components/InventoryTable';
import { useInventory, InventoryItem } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const Index = () => {
  const { items, loading, saveItem } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();
  const [user, setUser] = useState<any>(null);

  // Check auth status
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleShelfClick = (location: string, item?: InventoryItem) => {
    if (!user) {
      alert('กรุณาเข้าสู่ระบบก่อนใช้งาน');
      return;
    }
    setSelectedLocation(location);
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleAuth = async () => {
    if (user) {
      await supabase.auth.signOut();
    } else {
      // Simple sign up for demo - in real app, use proper auth flow
      const email = prompt('Email:');
      const password = prompt('Password:');
      if (email && password) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) {
          alert('Error: ' + error.message);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-lg">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-3xl font-bold text-white">Inventory Warehouse</h1>
                <p className="text-white/80">ระบบจัดการคลังสินค้า</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-white/80 text-sm">
                จำนวนสินค้า: {items.length} รายการ
              </div>
              <Button
                onClick={handleAuth}
                variant="secondary"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {user ? `${user.email} (ออกจากระบบ)` : 'เข้าสู่ระบบ'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!user && (
          <Card className="mb-6 border-warning bg-warning/10">
            <CardContent className="p-4">
              <p className="text-warning-foreground">
                <strong>หมายเหตุ:</strong> กรุณาเข้าสู่ระบบเพื่อใช้งานระบบจัดการคลังสินค้าเต็มรูปแบบ
              </p>
            </CardContent>
          </Card>
        )}

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
                  items={items} 
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
                  items={items}
                  onItemSelect={(item) => handleShelfClick(item.location, item)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table">
            <InventoryTable items={items} />
          </TabsContent>

          <TabsContent value="analytics">
            <InventoryAnalytics items={items} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal */}
      <InventoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={saveItem}
        location={selectedLocation}
        existingItem={selectedItem}
      />
    </div>
  );
};

export default Index;