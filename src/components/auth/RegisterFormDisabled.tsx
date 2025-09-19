import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

function RegisterFormDisabled() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <UserPlus className="h-5 w-5" />
          สมัครสมาชิก
        </CardTitle>
        <CardDescription className="text-center">
          ระบบสมัครสมาชิกยังไม่พร้อมใช้งาน
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>กรุณาติดต่อผู้ดูแลระบบเพื่อสร้างบัญชีใหม่</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default RegisterFormDisabled;