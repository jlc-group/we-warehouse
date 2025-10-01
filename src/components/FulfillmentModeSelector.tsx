
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Plus, FileText, Users } from 'lucide-react';

interface FulfillmentModeSelectorProps {
  onSelectPOMode: () => void;
  onSelectManualMode: () => void;
}

export const FulfillmentModeSelector: React.FC<FulfillmentModeSelectorProps> = ({
  onSelectPOMode,
  onSelectManualMode
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>เลือกโหมดการจัดสินค้า</CardTitle>
          <CardDescription>
            เลือกวิธีการสร้างงานจัดสินค้า
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* โหมด 1: จัดตาม PO */}
            <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer" onClick={onSelectPOMode}>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-2">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">จัดสินค้าตาม PO</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      เลือก PO ที่มีอยู่แล้วจากระบบ
                      <br />
                      (จาก JLC API)
                    </p>
                  </div>
                  <Button className="w-full" size="lg" onClick={onSelectPOMode}>
                    <Package className="h-4 w-4 mr-2" />
                    เลือก PO จากระบบ
                  </Button>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      <span>มีรายการสินค้าครบ</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      <span>มีข้อมูลลูกค้าแล้ว</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      <span>จัดได้ทันที</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* โหมด 2: สร้างใบจัดเอง */}
            <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors cursor-pointer" onClick={onSelectManualMode}>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-2">
                    <Plus className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">สร้างใบจัดสินค้าเอง</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      สร้างงานจัดสินค้าแบบ Manual
                      <br />
                      (ยังไม่มี PO ในระบบ)
                    </p>
                  </div>
                  <Button className="w-full" size="lg" variant="secondary" onClick={onSelectManualMode}>
                    <Users className="h-4 w-4 mr-2" />
                    สร้างใบจัดเอง
                  </Button>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                      <span>เลือกลูกค้าเอง</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                      <span>ระบุ PO Number เอง</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                      <span>เลือกสินค้าและจำนวนเอง</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* คำอธิบายเพิ่มเติม */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 คำแนะนำ</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>จัดตาม PO:</strong> ใช้เมื่อมี PO จากระบบแล้ว (ดึงข้อมูลอัตโนมัติ)</li>
              <li>• <strong>สร้างเอง:</strong> ใช้เมื่อยังไม่มี PO หรือต้องการจัดสินค้านอกระบบ</li>
              <li>• ทั้ง 2 โหมดจะสร้างงานเข้าคิวเหมือนกัน</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FulfillmentModeSelector;