import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

function UserManagementDisabled() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          จัดการผู้ใช้งาน
        </CardTitle>
        <CardDescription>
          ฟีเจอร์นี้จะพร้อมใช้งานในเร็วๆ นี้ เมื่อตาราง users ถูกสร้างขึ้น
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>ฟีเจอร์ยังไม่พร้อมใช้งาน</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserManagementDisabled;