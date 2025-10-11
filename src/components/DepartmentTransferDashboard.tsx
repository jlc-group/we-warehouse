import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, ArrowRightLeft, Construction,
  Package, TrendingUp, Clock, CheckCircle2
} from 'lucide-react';

interface DepartmentTransferDashboardProps {
  onCreateTransfer?: () => void;
}

/**
 * DepartmentTransferDashboard - Placeholder component for department-to-department transfers
 *
 * This component is ready for integration with department transfer backend.
 * Current features:
 * - UI structure matching WarehouseTransferDashboard
 * - Placeholder for statistics
 * - Ready for hook integration when database tables are created
 *
 * TODO:
 * - Create department_transfers table
 * - Create department_transfer_items table
 * - Create useDepartmentTransfer hook
 * - Implement full CRUD operations
 */
export function DepartmentTransferDashboard({ onCreateTransfer }: DepartmentTransferDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">การย้ายสินค้าข้ามแผนก</h2>
          <p className="text-muted-foreground">จัดการการย้ายสินค้าระหว่างแผนกต่างๆ</p>
        </div>
        {onCreateTransfer && (
          <Button onClick={onCreateTransfer} className="flex items-center gap-2" disabled>
            <ArrowRightLeft className="h-4 w-4" />
            สร้างใบย้ายใหม่
          </Button>
        )}
      </div>

      {/* Development Notice */}
      <Alert className="border-orange-200 bg-orange-50">
        <Construction className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800">ระบบกำลังพัฒนา</AlertTitle>
        <AlertDescription className="text-orange-700">
          ระบบการย้ายสินค้าข้ามแผนกอยู่ระหว่างการพัฒนา ฟังก์ชันนี้จะพร้อมใช้งานในเร็วๆ นี้
          <div className="mt-2 text-sm">
            <strong>ฟีเจอร์ที่กำลังพัฒนา:</strong>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>ย้ายสินค้าระหว่างแผนก (Warehouse → Purchase → QC → Finance → Admin)</li>
              <li>ติดตามสถานะการย้ายแบบ real-time</li>
              <li>ระบบอนุมัติการย้ายข้ามแผนก</li>
              <li>บันทึกประวัติการย้ายทั้งหมด</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Statistics Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowRightLeft className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ใบย้ายทั้งหมด</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">รอการอนุมัติ</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">เสร็จสิ้นแล้ว</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">เดือนนี้</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            แผนกในระบบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: 'คลังสินค้า', code: 'warehouse', icon: Package, color: 'blue' },
              { name: 'จัดซื้อ', code: 'purchase', icon: Building2, color: 'green' },
              { name: 'ควบคุมคุณภาพ', code: 'qc', icon: CheckCircle2, color: 'purple' },
              { name: 'การเงิน', code: 'finance', icon: TrendingUp, color: 'orange' },
              { name: 'ผู้บริหาร', code: 'admin', icon: Users, color: 'red' }
            ].map((dept) => {
              const Icon = dept.icon;
              return (
                <Card key={dept.code} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`p-3 bg-${dept.color}-100 rounded-lg`}>
                        <Icon className={`h-6 w-6 text-${dept.color}-600`} />
                      </div>
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {dept.code}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <Card>
        <CardHeader>
          <CardTitle>ฟีเจอร์ที่จะมาเร็วๆ นี้</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg mt-0.5">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">ระบบย้ายสินค้าข้ามแผนก</h4>
                <p className="text-sm text-muted-foreground">
                  สร้างใบย้ายสินค้าระหว่างแผนก พร้อมระบบอนุมัติและติดตามสถานะ
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg mt-0.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">ระบบอนุมัติหลายระดับ</h4>
                <p className="text-sm text-muted-foreground">
                  อนุมัติการย้ายสินค้าตามลำดับชั้น เพื่อความปลอดภัยและควบคุม
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg mt-0.5">
                <Package className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">ติดตามสินค้าแบบ Real-time</h4>
                <p className="text-sm text-muted-foreground">
                  ดูสถานะและตำแหน่งสินค้าได้ตลอดเวลา พร้อม notification เมื่อมีการเปลี่ยนแปลง
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg mt-0.5">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium">รายงานและสถิติ</h4>
                <p className="text-sm text-muted-foreground">
                  วิเคราะห์การย้ายสินค้าระหว่างแผนก ดูแนวโน้มและประสิทธิภาพ
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
