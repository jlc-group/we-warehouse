import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PackageCheck, PackageX, TruckIcon, Factory, Building2, Users2,
  Construction, ArrowDownToLine, ArrowUpFromLine, FileCheck,
  Barcode, ClipboardCheck, List
} from 'lucide-react';
import { InboundReceiptModal } from '@/components/InboundReceiptModal';
import { InboundReceiptList } from '@/components/InboundReceiptList';

/**
 * InboundOutboundDashboard - Placeholder for Inbound/Outbound operations
 *
 * This component manages receiving and shipping operations for different warehouse types.
 *
 * Workflows:
 * - FG (Finished Goods):
 *   - Inbound: Receive from Factory (with PO)
 *   - Outbound: Ship to Customer
 *
 * - PK (Packaging):
 *   - Inbound: Receive from Supplier
 *   - Outbound: Ship to Factory
 *
 * TODO:
 * - Create inbound_receipts table
 * - Create outbound_shipments table
 * - Integrate with existing BulkExportModal for outbound
 * - Add PO integration for inbound tracking
 */
export function InboundOutboundDashboard() {
  // State for modals
  const [showInboundFGModal, setShowInboundFGModal] = useState(false);
  const [showInboundPKModal, setShowInboundPKModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'operations' | 'history'>('operations');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">การรับเข้า-ส่งออกสินค้า</h2>
          <p className="text-muted-foreground">จัดการการรับเข้าและส่งออกสินค้าจาก/ไปยังแหล่งต่างๆ</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'operations' ? 'default' : 'outline'}
            onClick={() => setActiveTab('operations')}
          >
            <PackageCheck className="h-4 w-4 mr-2" />
            ดำเนินการ
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
          >
            <List className="h-4 w-4 mr-2" />
            ประวัติ
          </Button>
        </div>
      </div>

      {/* Conditional View */}
      {activeTab === 'operations' ? (
        <>
          {/* Success Notice */}
          <Alert className="border-green-200 bg-green-50">
            <PackageCheck className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">ระบบรับเข้าสินค้าพร้อมใช้งาน ✅</AlertTitle>
            <AlertDescription className="text-green-700">
              สามารถบันทึกการรับเข้าสินค้าจากโรงงาน/ซัพพลายเออร์ได้แล้ว
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="inbound" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
          <TabsTrigger value="inbound" className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            รับเข้า (Inbound)
          </TabsTrigger>
          <TabsTrigger value="outbound" className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4" />
            ส่งออก (Outbound)
          </TabsTrigger>
        </TabsList>

        {/* Inbound Tab */}
        <TabsContent value="inbound" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FG Inbound */}
            <Card className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Factory className="h-5 w-5" />
                  FG: รับจากโรงงาน
                </CardTitle>
                <CardDescription>
                  รับสินค้าสำเร็จรูป (Finished Goods) จากโรงงาน
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <FileCheck className="h-4 w-4" />
                  <AlertTitle>มี PO อ้างอิง</AlertTitle>
                  <AlertDescription>
                    ต้องมีใบสั่งซื้อ (Purchase Order) เพื่อตรวจสอบจำนวนสินค้าที่จะรับเข้า
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">ขั้นตอนการรับเข้า:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal ml-5">
                    <li>เลือก PO ที่ต้องการรับสินค้า</li>
                    <li>สแกน Barcode หรือนับสินค้าที่ได้รับ</li>
                    <li>ตรวจสอบความถูกต้องกับ PO</li>
                    <li>บันทึกข้อมูลเข้าระบบพร้อมตำแหน่ง</li>
                    <li>พิมพ์ใบรับสินค้า (Goods Receipt)</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setShowInboundFGModal(true)} className="flex-1">
                    <PackageCheck className="h-4 w-4 mr-2" />
                    รับสินค้าจากโรงงาน
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* PK Inbound */}
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <TruckIcon className="h-5 w-5" />
                  PK: รับจากซัพพลายเออร์
                </CardTitle>
                <CardDescription>
                  รับวัสดุบรรจุภัณฑ์ (Packaging) จากซัพพลายเออร์
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <ClipboardCheck className="h-4 w-4" />
                  <AlertTitle>ตรวจรับคุณภาพ</AlertTitle>
                  <AlertDescription>
                    ตรวจสอบคุณภาพและจำนวนวัสดุบรรจุภัณฑ์ก่อนรับเข้าคลัง
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">ขั้นตอนการรับเข้า:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal ml-5">
                    <li>บันทึกข้อมูลซัพพลายเออร์และใบส่งสินค้า</li>
                    <li>ตรวจนับและตรวจสอบคุณภาพ</li>
                    <li>สแกน Barcode หรือระบุรหัสสินค้า</li>
                    <li>บันทึกข้อมูลเข้าระบบพร้อม Lot/MFD</li>
                    <li>จัดเก็บในตำแหน่งที่กำหนด</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setShowInboundPKModal(true)} className="flex-1">
                    <PackageCheck className="h-4 w-4 mr-2" />
                    รับสินค้าจากซัพพลายเออร์
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Outbound Tab */}
        <TabsContent value="outbound" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FG Outbound */}
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Users2 className="h-5 w-5" />
                  FG: ส่งไปลูกค้า
                </CardTitle>
                <CardDescription>
                  ส่งสินค้าสำเร็จรูปไปยังลูกค้า
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Barcode className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">ใช้ระบบที่มีอยู่</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    สามารถใช้ระบบ "PO & จัดสินค้า" และ "Bulk Export" ที่มีอยู่แล้ว
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">ขั้นตอนการส่งออก:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal ml-5">
                    <li>เลือกออเดอร์ลูกค้าที่ต้องจัดส่ง</li>
                    <li>จัดเตรียมสินค้าตามรายการ (Picking)</li>
                    <li>ตรวจสอบความถูกต้อง (Quality Check)</li>
                    <li>บรรจุและติดป้ายส่งสินค้า</li>
                    <li>ส่งมอบให้ขนส่งหรือลูกค้า</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <Button disabled className="flex-1">
                    <PackageX className="h-4 w-4 mr-2" />
                    ส่งสินค้าไปลูกค้า
                  </Button>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>คำแนะนำ:</strong> ใช้แท็บ "PO & จัดสินค้า" เพื่อดูออเดอร์และจัดการการส่งสินค้า
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* PK Outbound */}
            <Card className="border-2 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <Factory className="h-5 w-5" />
                  PK: ส่งไปโรงงาน
                </CardTitle>
                <CardDescription>
                  ส่งวัสดุบรรจุภัณฑ์ไปยังโรงงาน
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <FileCheck className="h-4 w-4" />
                  <AlertTitle>ตามคำสั่งผลิต</AlertTitle>
                  <AlertDescription>
                    ส่งวัสดุบรรจุภัณฑ์ตามคำสั่งผลิตของโรงงาน
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">ขั้นตอนการส่งออก:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal ml-5">
                    <li>รับคำสั่งผลิตจากโรงงาน</li>
                    <li>จัดเตรียมวัสดุบรรจุภัณฑ์ตามรายการ</li>
                    <li>ตรวจนับและบันทึกจำนวน</li>
                    <li>บรรจุและขนส่งไปโรงงาน</li>
                    <li>บันทึกการส่งมอบในระบบ</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <Button disabled className="flex-1">
                    <PackageX className="h-4 w-4 mr-2" />
                    ส่งสินค้าไปโรงงาน
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Statistics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>สรุปการดำเนินงาน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">-</p>
              <p className="text-sm text-muted-foreground">รับเข้าวันนี้</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">-</p>
              <p className="text-sm text-muted-foreground">ส่งออกวันนี้</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">-</p>
              <p className="text-sm text-muted-foreground">รอดำเนินการ</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-700">-</p>
              <p className="text-sm text-muted-foreground">เดือนนี้</p>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      ) : (
        /* History View */
        <InboundReceiptList />
      )}

      {/* Modals */}
      <InboundReceiptModal
        isOpen={showInboundFGModal}
        onClose={() => setShowInboundFGModal(false)}
        onSuccess={() => {
          setShowInboundFGModal(false);
          // Refresh data if needed
        }}
      />

      <InboundReceiptModal
        isOpen={showInboundPKModal}
        onClose={() => setShowInboundPKModal(false)}
        onSuccess={() => {
          setShowInboundPKModal(false);
          // Refresh data if needed
        }}
      />
    </div>
  );
}
