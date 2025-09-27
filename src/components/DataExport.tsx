import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  FileText,
  Table,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { useCustomers } from '@/hooks/useCustomer';
import { useWarehouses } from '@/hooks/useWarehouse';
import { toast } from 'sonner';

interface ExportJob {
  id: string;
  type: 'inventory' | 'customers' | 'movements' | 'reports';
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileName: string;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  error?: string;
}

const mockExportJobs: ExportJob[] = [
  {
    id: '1',
    type: 'inventory',
    format: 'xlsx',
    status: 'completed',
    progress: 100,
    fileName: 'inventory_export_20241226.xlsx',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3000000).toISOString(),
    downloadUrl: '#'
  },
  {
    id: '2',
    type: 'customers',
    format: 'csv',
    status: 'processing',
    progress: 65,
    fileName: 'customers_export_20241226.csv',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

const getStatusBadge = (status: ExportJob['status']) => {
  const config = {
    pending: { label: 'รอดำเนินการ', className: 'bg-gray-100 text-gray-800', icon: Clock },
    processing: { label: 'กำลังประมวลผล', className: 'bg-blue-100 text-blue-800', icon: Clock },
    completed: { label: 'สำเร็จ', className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    failed: { label: 'ล้มเหลว', className: 'bg-red-100 text-red-800', icon: AlertCircle },
  };

  const { label, className, icon: Icon } = config[status];
  return (
    <Badge className={`${className} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

const getTypeLabel = (type: ExportJob['type']) => {
  const labels = {
    inventory: 'ข้อมูลสต็อก',
    customers: 'ข้อมูลลูกค้า',
    movements: 'ประวัติการเคลื่อนไหว',
    reports: 'รายงานสรุป'
  };
  return labels[type];
};

const getFormatIcon = (format: ExportJob['format']) => {
  const icons = {
    csv: Table,
    xlsx: FileSpreadsheet,
    json: Database,
    pdf: FileText,
  };
  return icons[format];
};

export const DataExport = () => {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>(mockExportJobs);
  const [selectedType, setSelectedType] = useState<string>('inventory');
  const [selectedFormat, setSelectedFormat] = useState<string>('xlsx');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [includeFields, setIncludeFields] = useState<string[]>(['basic']);

  const { items: inventoryItems } = useDepartmentInventory();
  const { data: customers = [] } = useCustomers();
  const { data: warehouses = [] } = useWarehouses();

  const handleStartExport = () => {
    const newJob: ExportJob = {
      id: Date.now().toString(),
      type: selectedType as ExportJob['type'],
      format: selectedFormat as ExportJob['format'],
      status: 'pending',
      progress: 0,
      fileName: `${selectedType}_export_${new Date().toISOString().split('T')[0]}.${selectedFormat}`,
      createdAt: new Date().toISOString(),
    };

    setExportJobs(prev => [newJob, ...prev]);

    // Simulate export process
    setTimeout(() => {
      setExportJobs(prev => prev.map(job =>
        job.id === newJob.id
          ? { ...job, status: 'processing', progress: 20 }
          : job
      ));

      // Progress simulation
      let progress = 20;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setExportJobs(prev => prev.map(job =>
            job.id === newJob.id
              ? {
                  ...job,
                  status: 'completed',
                  progress: 100,
                  completedAt: new Date().toISOString(),
                  downloadUrl: '#'
                }
              : job
          ));
          toast.success(`ส่งออกข้อมูล ${getTypeLabel(newJob.type)} สำเร็จ`);
        } else {
          setExportJobs(prev => prev.map(job =>
            job.id === newJob.id
              ? { ...job, progress: Math.floor(progress) }
              : job
          ));
        }
      }, 1000);
    }, 1000);

    toast.success('เริ่มต้นการส่งออกข้อมูลแล้ว');
  };

  const handleDownload = (job: ExportJob) => {
    // Simulate download
    const link = document.createElement('a');
    link.download = job.fileName;
    link.href = '#'; // In real implementation, this would be the actual file URL
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`เริ่มดาวน์โหลด ${job.fileName}`);
  };

  const getExportDataSummary = () => {
    const summaries = {
      inventory: `${inventoryItems?.length || 0} รายการสต็อก`,
      customers: `${customers.length} รายการลูกค้า`,
      movements: 'ประวัติการเคลื่อนไหวทั้งหมด',
      reports: 'รายงานสรุปทั้งหมด'
    };
    return summaries[selectedType as keyof typeof summaries] || '';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">ส่งออกข้อมูล</TabsTrigger>
          <TabsTrigger value="history">ประวัติการส่งออก</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                ส่งออกข้อมูล
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>ประเภทข้อมูล</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inventory">ข้อมูลสต็อกสินค้า</SelectItem>
                        <SelectItem value="customers">ข้อมูลลูกค้า</SelectItem>
                        <SelectItem value="movements">ประวัติการเคลื่อนไหวสต็อก</SelectItem>
                        <SelectItem value="reports">รายงานสรุป</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>รูปแบบไฟล์</Label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                        <SelectItem value="json">JSON (.json)</SelectItem>
                        <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>คลังสินค้า</Label>
                    <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} ({warehouse.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>ช่วงวันที่</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                          placeholder="จากวันที่"
                        />
                      </div>
                      <div>
                        <Input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                          placeholder="ถึงวันที่"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>ฟิลด์ที่ต้องการ</Label>
                    <Select value={includeFields[0]} onValueChange={(value) => setIncludeFields([value])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">ข้อมูลพื้นฐาน</SelectItem>
                        <SelectItem value="detailed">ข้อมูลรายละเอียด</SelectItem>
                        <SelectItem value="full">ข้อมูลทั้งหมด</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data Summary */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">ข้อมูลที่จะส่งออก:</h4>
                    <p className="text-sm text-muted-foreground">
                      {getExportDataSummary()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      รูปแบบ: {selectedFormat.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleStartExport} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  เริ่มส่งออกข้อมูล
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                ประวัติการส่งออก
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exportJobs.map((job) => {
                  const FormatIcon = getFormatIcon(job.format);
                  return (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <FormatIcon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{job.fileName}</h4>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getTypeLabel(job.type)} • {job.format.toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            สร้างเมื่อ: {new Date(job.createdAt).toLocaleString('th-TH')}
                            {job.completedAt && (
                              <span> • เสร็จสิ้น: {new Date(job.completedAt).toLocaleString('th-TH')}</span>
                            )}
                          </p>
                          {job.status === 'processing' && (
                            <div className="space-y-1">
                              <Progress value={job.progress} className="w-48" />
                              <p className="text-xs text-muted-foreground">{job.progress}% เสร็จสิ้น</p>
                            </div>
                          )}
                          {job.error && (
                            <p className="text-sm text-red-600">{job.error}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {job.status === 'completed' && job.downloadUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(job)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            ดาวน์โหลด
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {exportJobs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    ยังไม่มีประวัติการส่งออกข้อมูล
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};