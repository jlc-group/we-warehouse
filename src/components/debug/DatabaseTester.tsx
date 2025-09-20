import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Database, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

export function DatabaseTester() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        return [...prev];
      } else {
        return [...prev, { name, status, message, details }];
      }
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    const testSuite = [
      { name: 'Supabase Connection', test: testSupabaseConnection },
      { name: 'location_qr_codes Table', test: testQRTable },
      { name: 'Table Permissions', test: testTablePermissions },
      { name: 'Insert Test', test: testInsert },
      { name: 'Query Test', test: testQuery },
      { name: 'Cleanup', test: testCleanup }
    ];

    for (const { name, test } of testSuite) {
      updateTest(name, 'running', 'กำลังทดสอบ...');
      try {
        await test();
      } catch (error) {
        updateTest(name, 'error', `ผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setIsRunning(false);

    // Show summary toast
    const successCount = tests.filter(t => t.status === 'success').length;
    const totalCount = tests.length;

    toast({
      title: 'การทดสอบเสร็จสิ้น',
      description: `สำเร็จ ${successCount}/${totalCount} การทดสอบ`,
      variant: successCount === totalCount ? 'default' : 'destructive',
    });
  };

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      updateTest('Supabase Connection', 'success', 'เชื่อมต่อ Supabase สำเร็จ', {
        url: supabase.supabaseUrl,
        hasSession: !!data.session
      });
    } catch (error) {
      updateTest('Supabase Connection', 'error', `ไม่สามารถเชื่อมต่อ Supabase ได้: ${error}`);
    }
  };

  const testQRTable = async () => {
    try {
      // Try to query table structure
      const { data, error } = await supabase
        .from('location_qr_codes')
        .select('*')
        .limit(0);

      if (error) {
        if (error.code === '42P01') {
          updateTest('location_qr_codes Table', 'error', 'ตาราง location_qr_codes ไม่มีอยู่ - ต้องรัน migration script');
          return;
        }
        throw error;
      }

      updateTest('location_qr_codes Table', 'success', 'ตาราง location_qr_codes พร้อมใช้งาน');
    } catch (error) {
      updateTest('location_qr_codes Table', 'error', `ปัญหาตาราง: ${error}`);
    }
  };

  const testTablePermissions = async () => {
    try {
      // Test SELECT permission
      const { data: selectData, error: selectError } = await supabase
        .from('location_qr_codes')
        .select('id')
        .limit(1);

      if (selectError) throw new Error(`SELECT permission: ${selectError.message}`);

      updateTest('Table Permissions', 'success', 'สิทธิ์การเข้าถึงตารางถูกต้อง');
    } catch (error) {
      updateTest('Table Permissions', 'error', `ปัญหาสิทธิ์: ${error}`);
    }
  };

  const testInsert = async () => {
    try {
      const testData = {
        location: 'TEST_LOCATION_' + Date.now(),
        qr_code_data: 'test_qr_data',
        description: 'Test QR Code for database testing',
        is_active: true
      };

      const { data, error } = await supabase
        .from('location_qr_codes')
        .insert(testData)
        .select()
        .single();

      if (error) throw error;

      updateTest('Insert Test', 'success', 'สามารถเพิ่มข้อมูลได้', { insertedId: data.id });
    } catch (error) {
      updateTest('Insert Test', 'error', `ไม่สามารถเพิ่มข้อมูลได้: ${error}`);
    }
  };

  const testQuery = async () => {
    try {
      const { data, error } = await supabase
        .from('location_qr_codes')
        .select('*')
        .like('location', 'TEST_LOCATION_%')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      updateTest('Query Test', 'success', `สามารถค้นหาข้อมูลได้ - พบ ${data.length} รายการ`, {
        count: data.length,
        testRecords: data.map(r => r.location)
      });
    } catch (error) {
      updateTest('Query Test', 'error', `ไม่สามารถค้นหาข้อมูลได้: ${error}`);
    }
  };

  const testCleanup = async () => {
    try {
      const { error } = await supabase
        .from('location_qr_codes')
        .delete()
        .like('location', 'TEST_LOCATION_%');

      if (error) throw error;

      updateTest('Cleanup', 'success', 'ล้างข้อมูลทดสอบเรียบร้อย');
    } catch (error) {
      updateTest('Cleanup', 'error', `ไม่สามารถล้างข้อมูลทดสอบได้: ${error}`);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">สำเร็จ</Badge>;
      case 'error':
        return <Badge variant="destructive">ผิดพลาด</Badge>;
      case 'running':
        return <Badge variant="secondary">กำลังทดสอบ</Badge>;
      default:
        return <Badge variant="outline">รอ</Badge>;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Tester - ทดสอบการเชื่อมต่อ QR Database
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Control Panel */}
        <div className="flex items-center gap-4">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {isRunning ? 'กำลังทดสอบ...' : 'เริ่มทดสอบ'}
          </Button>

          {tests.length > 0 && (
            <div className="flex gap-2">
              <Badge variant="outline">
                ทั้งหมด: {tests.length}
              </Badge>
              <Badge variant="default" className="bg-green-100 text-green-800">
                สำเร็จ: {tests.filter(t => t.status === 'success').length}
              </Badge>
              <Badge variant="destructive">
                ผิดพลาด: {tests.filter(t => t.status === 'error').length}
              </Badge>
            </div>
          )}
        </div>

        {/* Test Results */}
        {tests.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">ผลการทดสอบ:</h3>
            {tests.map((test, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(test.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{test.name}</span>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-sm text-gray-600">{test.message}</p>
                  {test.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer">รายละเอียด</summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        {tests.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">วิธีใช้งาน:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. กดปุ่ม "เริ่มทดสอบ" เพื่อทดสอบการเชื่อมต่อ database</li>
              <li>2. ถ้าพบปัญหา "ตาราง location_qr_codes ไม่มีอยู่" ให้รัน migration script</li>
              <li>3. เปิด Supabase Dashboard → SQL Editor</li>
              <li>4. Copy script จากไฟล์ migrations/001_create_location_qr_codes.sql</li>
              <li>5. กด RUN และกลับมาทดสอบใหม่</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}