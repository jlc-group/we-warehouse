import { AlertCircle, Database, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SetupInstructions() {
  const sqlContent = `-- เนื้อหาจากไฟล์ apply_fulfillment_system.sql
-- คัดลอกทั้งหมดไปรันใน Supabase SQL Editor`;

  const handleCopySQL = () => {
    const sqlElement = document.getElementById('sql-content');
    if (sqlElement) {
      navigator.clipboard.writeText(sqlElement.textContent || '');
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard/project/ogrcpzzmmudztwjfwjvu/sql/new', '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Alert variant="destructive">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">ต้องตั้งค่าฐานข้อมูลก่อนใช้งาน</AlertTitle>
        <AlertDescription className="mt-2">
          ระบบ Fulfillment ต้องการตารางฐานข้อมูลเพิ่มเติม กรุณาทำตามขั้นตอนด้านล่าง
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            ขั้นตอนการตั้งค่าฐานข้อมูล
          </CardTitle>
          <CardDescription>
            รันคำสั่ง SQL เพื่อสร้างตาราง fulfillment_tasks และ fulfillment_items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">เปิด Supabase SQL Editor</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={openSupabase}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  เปิด SQL Editor
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">คัดลอกไฟล์ SQL</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ไฟล์: <code className="bg-background px-1 py-0.5 rounded">apply_fulfillment_system.sql</code>
                </p>
                <p className="text-sm text-muted-foreground">
                  ตำแหน่ง: โฟลเดอร์ root ของโปรเจ็กต์
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">วางและรันคำสั่ง SQL</p>
                <p className="text-sm text-muted-foreground mt-1">
                  วางเนื้อหาไฟล์ใน SQL Editor แล้วกดปุ่ม RUN
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                4
              </div>
              <div className="flex-1">
                <p className="font-medium">Refresh หน้าเว็บ</p>
                <p className="text-sm text-muted-foreground mt-1">
                  หลังจากรันสำเร็จ กดรีเฟรชหน้าเว็บนี้
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  รีเฟรชหน้าเว็บ
                </Button>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>หมายเหตุ:</strong> คำสั่ง SQL ปลอดภัยในการรัน จะไม่ลบหรือแก้ไขข้อมูลที่มีอยู่ในระบบ
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">สิ่งที่คำสั่ง SQL จะทำ</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              สร้างตาราง <code>fulfillment_tasks</code> สำหรับเก็บงานจัดสินค้า
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              สร้างตาราง <code>fulfillment_items</code> สำหรับเก็บรายการสินค้าในแต่ละงาน
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              สร้าง Indexes เพื่อเพิ่มประสิทธิภาพการค้นหา
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              ตั้งค่า RLS (Row Level Security) และ Triggers
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
