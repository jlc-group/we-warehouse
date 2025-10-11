import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, List } from 'lucide-react';
import { AddProductForm } from '@/components/AddProductForm';
import { ProductMasterList } from '@/components/ProductMasterList';

/**
 * ProductManagementPage - ระบบจัดการข้อมูลสินค้าแบบรวมศูนย์
 *
 * รวมฟังก์ชันหลักทั้งหมดในหน้าเดียว:
 * 1. เพิ่มสินค้าใหม่ (รวมตั้งค่าหน่วยและอัตราแปลงตอนเพิ่ม)
 * 2. ดูและแก้ไขรายการสินค้าทั้งหมด (รวมแก้ไขหน่วยและอัตราแปลง)
 */
export function ProductManagementPage() {
  const [activeTab, setActiveTab] = useState('add');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>จัดการข้อมูลสินค้า</CardTitle>
          <CardDescription>
            เพิ่มสินค้าใหม่และจัดการข้อมูลสินค้าทั้งหมด รวมถึงการตั้งค่าหน่วยและอัตราแปลง
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
              <TabsTrigger value="add" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                เพิ่มสินค้า
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                รายการสินค้าทั้งหมด
              </TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4">
              <AddProductForm />
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <ProductMasterList />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
