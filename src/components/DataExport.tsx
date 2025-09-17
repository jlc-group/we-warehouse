import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, FileText, Database, AlertCircle, CheckCircle } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface DataExportProps {
  items: InventoryItem[];
  onImportData: (data: InventoryItem[]) => void;
  onUploadToSupabase: (data: InventoryItem[]) => Promise<boolean>;
}

export function DataExport({ items, onImportData, onUploadToSupabase }: DataExportProps) {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);

  const exportToJSON = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (items.length === 0) return;

    const headers = [
      'ID', 'Product Name', 'SKU', 'Location', 'Lot', 'MFD', 
      'Box Quantity', 'Loose Quantity', 'Category', 'Cost Per Unit',
      'Created At', 'Updated At'
    ];

    const csvContent = [
      headers.join(','),
      ...items.map(item => [
        item.id,
        `"${item.product_name}"`,
        item.sku,
        item.location,
        item.lot || '',
        item.mfd || '',
        item.box_quantity || 0,
        item.loose_quantity || 0,
        item.category || '',
        item.cost_per_unit || 0,
        item.created_at,
        item.updated_at
      ].join(','))
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedData: InventoryItem[];

        if (file.name.endsWith('.json')) {
          importedData = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].split(',');
          importedData = lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',');
            return {
              id: values[0],
              product_name: values[1].replace(/"/g, ''),
              sku: values[2],
              location: values[3],
              lot: values[4] || null,
              mfd: values[5] || null,
              box_quantity: parseInt(values[6]) || 0,
              loose_quantity: parseInt(values[7]) || 0,
              category: values[8] || null,
              cost_per_unit: parseFloat(values[9]) || 0,
              created_at: values[10],
              updated_at: values[11],
              user_id: '00000000-0000-0000-0000-000000000000'
            } as InventoryItem;
          });
        } else {
          throw new Error('รองรับเฉพาะไฟล์ .json และ .csv เท่านั้น');
        }

        onImportData(importedData);
        setImportStatus('success');
      } catch (error) {
        console.error('Import error:', error);
        setImportStatus('error');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleUploadToSupabase = async () => {
    if (items.length === 0) {
      setImportStatus('error');
      return;
    }

    setIsUploading(true);
    setImportStatus('idle');

    try {
      const success = await onUploadToSupabase(items);
      setImportStatus(success ? 'success' : 'error');
    } catch (error) {
      console.error('Upload error:', error);
      setImportStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export และ Import ข้อมูล
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {importStatus === 'success' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ การดำเนินการสำเร็จ!
                </AlertDescription>
              </Alert>
            )}

            {importStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ❌ เกิดข้อผิดพลาด กรุณาตรวจสอบไฟล์และลองใหม่อีกครั้ง
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ข้อมูลปัจจุบัน:</span>
              <Badge variant={items.length > 0 ? "default" : "secondary"}>
                {items.length} รายการ
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Export ข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ดาวน์โหลดข้อมูลสินค้าทั้งหมดในรูปแบบต่างๆ
            </p>

            <div className="space-y-3">
              <Button
                onClick={exportToJSON}
                disabled={items.length === 0}
                className="w-full justify-start"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export เป็น JSON
              </Button>

              <Button
                onClick={exportToCSV}
                disabled={items.length === 0}
                className="w-full justify-start"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export เป็น CSV
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              • JSON: เหมาะสำหรับการ backup และ restore<br/>
              • CSV: เหมาะสำหรับการวิเคราะห์ใน Excel
            </div>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Import ข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              อัพโหลดไฟล์ข้อมูลเพื่อนำเข้าสู่ระบบ
            </p>

            <div className="space-y-3">
              <div>
                <Label htmlFor="file-import">เลือกไฟล์</Label>
                <Input
                  id="file-import"
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileImport}
                  className="cursor-pointer"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                รองรับไฟล์: .json, .csv
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload to Supabase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            อัพโหลดไปยัง Supabase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            อัพโหลดข้อมูลทั้งหมดไปยังฐานข้อมูล Supabase เพื่อการ sync และ backup
          </p>

          <Button
            onClick={handleUploadToSupabase}
            disabled={isUploading || items.length === 0}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Database className="h-4 w-4 mr-2 animate-pulse" />
                กำลังอัพโหลด...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                อัพโหลดไป Supabase ({items.length} รายการ)
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground">
            ⚠️ การอัพโหลดจะเขียนทับข้อมูลเดิมในฐานข้อมูล
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">คำแนะนำการใช้งาน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Export</Badge>
              <div>
                ใช้สำหรับการสำรองข้อมูล หรือการนำข้อมูลไปใช้ในโปรแกรมอื่น
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Import</Badge>
              <div>
                ใช้สำหรับการนำข้อมูลจากไฟล์เข้าสู่ระบบ (จะเพิ่มเข้าไปในข้อมูลเดิม)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Upload</Badge>
              <div>
                ใช้สำหรับการส่งข้อมูลไปเก็บในฐานข้อมูล Supabase เพื่อการ sync
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
