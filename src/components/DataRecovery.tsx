import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Download, Upload, RefreshCw, AlertCircle, CheckCircle, Archive } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';

export function DataRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { 
    items, 
    loading, 
    loadSampleData, 
    clearAllData,
    emergencyRecovery,
    bulkUploadToSupabase,
    recoverUserData 
  } = useInventory();

  const handleEmergencyRecovery = async () => {
    setIsRecovering(true);
    setRecoveryStatus('idle');
    
    try {
      await emergencyRecovery();
      setRecoveryStatus('success');
    } catch (error) {
      console.error('Emergency recovery failed:', error);
      setRecoveryStatus('error');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleUserDataRecovery = async () => {
    setIsRecovering(true);
    setRecoveryStatus('idle');
    
    try {
      await recoverUserData();
      setRecoveryStatus('success');
    } catch (error) {
      console.error('User data recovery failed:', error);
      setRecoveryStatus('error');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleBulkUpload = async () => {
    if (items.length === 0) {
      setRecoveryStatus('error');
      return;
    }

    setIsRecovering(true);
    setRecoveryStatus('idle');
    
    try {
      const success = await bulkUploadToSupabase(items);
      setRecoveryStatus(success ? 'success' : 'error');
    } catch (error) {
      console.error('Bulk upload failed:', error);
      setRecoveryStatus('error');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            กู้คืนข้อมูลและการจัดการ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recoveryStatus === 'success' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ การดำเนินการสำเร็จ! ข้อมูลได้รับการกู้คืนเรียบร้อยแล้ว
                </AlertDescription>
              </Alert>
            )}

            {recoveryStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ❌ เกิดข้อผิดพลาดในการกู้คืนข้อมูล กรุณาลองใหม่อีกครั้ง
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">สถานะข้อมูลปัจจุบัน:</span>
                  <Badge variant={items.length > 0 ? "default" : "secondary"}>
                    {items.length} รายการ
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">สถานะการโหลด:</span>
                  <Badge variant={loading ? "secondary" : "default"}>
                    {loading ? "กำลังโหลด..." : "พร้อมใช้งาน"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Emergency Recovery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-600" />
              กู้คืนฉุกเฉิน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              กู้คืนข้อมูลจากฐานข้อมูลเมื่อระบบมีปัญหาหรือข้อมูลหายไป
            </p>
            <Button
              onClick={handleEmergencyRecovery}
              disabled={isRecovering}
              className="w-full"
              variant="outline"
            >
              {isRecovering ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              กู้คืนจากฐานข้อมูล
            </Button>
          </CardContent>
        </Card>

        {/* User Data Recovery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              กู้คืนข้อมูลจริง
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              กู้คืนข้อมูลจริงของคุณที่ได้ส่งมาก่อนหน้านี้
            </p>
            <Button
              onClick={handleUserDataRecovery}
              disabled={isRecovering}
              className="w-full"
              variant="default"
            >
              {isRecovering ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              กู้คืนข้อมูลจริง
            </Button>
          </CardContent>
        </Card>

        {/* Bulk Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-600" />
              อัพโหลดไป Supabase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              อัพโหลดข้อมูลทั้งหมดไปยังฐานข้อมูล Supabase
            </p>
            <Button
              onClick={handleBulkUpload}
              disabled={isRecovering || items.length === 0}
              className="w-full"
              variant="default"
            >
              {isRecovering ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              อัพโหลด ({items.length} รายการ)
            </Button>
          </CardContent>
        </Card>

        {/* Load Sample Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-purple-600" />
              รีเฟรชจากฐานข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              รีเฟรชข้อมูลจากฐานข้อมูล Supabase
            </p>
            <Button
              onClick={loadSampleData}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              รีเฟรชจากฐานข้อมูล
            </Button>
          </CardContent>
        </Card>

        {/* Clear All Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              ล้างข้อมูลทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ลบข้อมูลทั้งหมดออกจากระบบ (ใช้ด้วยความระมัดระวัง)
            </p>
            <Button
              onClick={clearAllData}
              disabled={loading || items.length === 0}
              className="w-full"
              variant="destructive"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              ล้างข้อมูลทั้งหมด
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">คำแนะนำการใช้งาน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <strong>กู้คืนฉุกเฉิน:</strong> ใช้เมื่อระบบมีปัญหาหรือข้อมูลหายไป จะดึงข้อมูลจากฐานข้อมูลจริง
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <strong>กู้คืนข้อมูลจริง:</strong> กู้คืนข้อมูลจริงของคุณที่เคยส่งมาก่อนหน้านี้
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <strong>อัพโหลดไป Supabase:</strong> ส่งข้อมูลทั้งหมดไปเก็บในฐานข้อมูล Supabase
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <strong>รีเฟรชจากฐานข้อมูล:</strong> ดึงข้อมูลล่าสุดจากฐานข้อมูล Supabase
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
