import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function WarehouseDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          แดชบอร์ดคลังสินค้า
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนา
        </div>
      </CardContent>
    </Card>
  );
}