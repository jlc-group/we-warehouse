import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FallbackBannerProps {
  show: boolean;
  type?: 'info' | 'warning';
  title?: string;
  description?: string;
  showMigrationButton?: boolean;
}

export function FallbackBanner({
  show,
  type = 'info',
  title = 'ระบบกำลังใช้โหมดสำรอง',
  description = 'ฐานข้อมูลยังไม่มีตารางสำหรับระบบ Bill Clearing ข้อมูลบางส่วนจะแสดงเป็นค่าเริ่มต้น',
  showMigrationButton = true
}: FallbackBannerProps) {
  if (!show) return null;

  const Icon = type === 'warning' ? AlertTriangle : InfoIcon;
  const alertClass = type === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50';

  return (
    <Alert className={`mb-4 ${alertClass}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {description}
        {showMigrationButton && (
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => {
              console.log('Migration information displayed');
              alert('ติดต่อผู้ดูแลระบบเพื่อ apply migration file: 20250925000000_create_bill_clearing_system.sql');
            }}>
              ข้อมูลเพิ่มเติมเกี่ยวกับ Migration
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}