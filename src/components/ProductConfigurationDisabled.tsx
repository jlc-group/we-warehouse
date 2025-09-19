import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

function ProductConfigurationDisabled() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          ตั้งค่าอัตราแปลงหน่วยสินค้า
        </CardTitle>
        <CardDescription>
          ฟีเจอร์นี้จะพร้อมใช้งานในเร็วๆ นี้ เมื่อตาราง product_conversion_rates ถูกสร้างขึ้น
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>ฟีเจอร์ยังไม่พร้อมใช้งาน</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProductConfigurationDisabled;