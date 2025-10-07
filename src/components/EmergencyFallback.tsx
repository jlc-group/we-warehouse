import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Database,
  ExternalLink,
  RefreshCw,
  Terminal,
  Wrench
} from 'lucide-react';

interface EmergencyFallbackProps {
  title?: string;
  description?: string;
  error?: string;
  showDatabaseGuide?: boolean;
  onRetry?: () => void;
  className?: string;
}

// Emergency fallback component สำหรับกรณีที่ระบบมีปัญหา
export const EmergencyFallback = ({
  title = "ระบบไม่พร้อมใช้งาน",
  description = "กรุณาติดตั้งฐานข้อมูลก่อนใช้งาน",
  error,
  showDatabaseGuide = true,
  onRetry,
  className = ""
}) => {
  const isDatabaseError = error?.includes('404') || error?.includes('does not exist') ||
                         error?.includes('400') || error?.includes('relationship');

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-lg font-semibold">{title}</AlertTitle>
        <AlertDescription className="mt-2">{description}</AlertDescription>
      </Alert>

      {/* Error Details */}
      {error && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              รายละเอียดข้อผิดพลาด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-red-50 border border-red-200 rounded font-mono text-sm text-red-700">
              {error}
            </div>
            {isDatabaseError && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="destructive">Database Error</Badge>
                <span className="text-sm text-muted-foreground">
                  ตารางฐานข้อมูลยังไม่ถูกสร้าง
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Database Setup Guide */}
      {showDatabaseGuide && isDatabaseError && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              วิธีแก้ไขปัญหา
            </CardTitle>
            <CardDescription>
              ติดตั้งฐานข้อมูลสำหรับระบบขาย
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                <div>
                  <p className="font-medium">เปิด Supabase Dashboard</p>
                  <p className="text-sm text-muted-foreground">ไปที่ project ของคุณและเข้าสู่ SQL Editor</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                <div>
                  <p className="font-medium">Apply Migration Scripts</p>
                  <p className="text-sm text-muted-foreground">รัน migration scripts เพื่อสร้างตารางที่จำเป็น</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                <div>
                  <p className="font-medium">ทดสอบระบบ</p>
                  <p className="text-sm text-muted-foreground">Refresh หน้าเพื่อตรวจสอบการเชื่อมต่อ</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t space-y-2">
              <Button asChild variant="default" className="w-full">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  เปิด Supabase Dashboard
                </a>
              </Button>

              {onRetry && (
                <Button onClick={onRetry} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  ลองใหม่อีกครั้ง
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Actions */}
      {!showDatabaseGuide && onRetry && (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={onRetry} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              ลองใหม่อีกครั้ง
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Development Note */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Wrench className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">หมายเหตุสำหรับนักพัฒนา:</p>
            <p>ระบบกำลังใช้ fallback mode เพื่อป้องกันการ crash ของแอปพลิเคชัน</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook สำหรับตรวจสอบสถานะฐานข้อมูล
export const useEmergencyFallback = (error: any) => {
  const isDatabaseError = useMemo(() => {
    if (!error) return false;
    const errorMessage = error.message || error.toString();
    return errorMessage.includes('404') ||
           errorMessage.includes('does not exist') ||
           errorMessage.includes('400') ||
           errorMessage.includes('relationship') ||
           errorMessage.includes('Bad Request');
  }, [error]);

  const shouldShowFallback = useMemo(() => {
    return !!error && isDatabaseError;
  }, [error, isDatabaseError]);

  return {
    isDatabaseError,
    shouldShowFallback,
    errorMessage: error?.message || error?.toString()
  };
};

export default EmergencyFallback;