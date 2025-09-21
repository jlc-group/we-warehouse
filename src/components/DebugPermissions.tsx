import { useAuth } from '@/contexts/AuthContextSimple';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function DebugPermissions() {
  const { user } = useAuth();
  const { permissions, accessSummary } = useDepartmentInventory();
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-yellow-100 border-yellow-300 text-yellow-800"
        >
          🔍 Debug Permissions
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="border-yellow-300 bg-yellow-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-yellow-800">🔍 Debug Permissions</CardTitle>
            <Button 
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* User Info */}
          <div>
            <div className="font-semibold text-yellow-800 mb-1">👤 User Info:</div>
            {user ? (
              <div className="space-y-1">
                <div>Email: {user.email}</div>
                <div>Department: <Badge variant="outline">{user.department}</Badge></div>
                <div>Role: <Badge variant="outline">{user.role}</Badge></div>
                <div>Role Level: <Badge variant="outline">{user.role_level}</Badge></div>
              </div>
            ) : (
              <div className="text-red-600">❌ No user logged in</div>
            )}
          </div>

          {/* Permissions */}
          <div>
            <div className="font-semibold text-yellow-800 mb-1">🔐 Permissions:</div>
            <div className="grid grid-cols-2 gap-1">
              <div>Add: {permissions.canAdd ? '✅' : '❌'}</div>
              <div>Edit: {permissions.canEdit ? '✅' : '❌'}</div>
              <div>Delete: {permissions.canDelete ? '✅' : '❌'}</div>
              <div>Reports: {permissions.canViewReports ? '✅' : '❌'}</div>
            </div>
          </div>

          {/* Access Summary */}
          <div>
            <div className="font-semibold text-yellow-800 mb-1">📊 Access Summary:</div>
            {accessSummary ? (
              <div className="space-y-1">
                <div>Items: {accessSummary.accessibleItems}/{accessSummary.totalItems}</div>
                <div>Access: {accessSummary.accessPercentage}%</div>
                <div>Full Access: {accessSummary.hasFullAccess ? '✅' : '❌'}</div>
              </div>
            ) : (
              <div className="text-red-600">❌ No access summary</div>
            )}
          </div>

          {/* Quick Login Buttons */}
          <div>
            <div className="font-semibold text-yellow-800 mb-1">🚀 Quick Login:</div>
            <div className="space-y-1">
              <Button 
                onClick={() => {
                  localStorage.setItem('warehouse_user', JSON.stringify({
                    id: 'admin-001',
                    email: 'admin@warehouse.com',
                    full_name: 'ผู้ดูแลระบบ',
                    department: 'ผู้บริหาร',
                    role: 'ผู้ดูแลระบบ',
                    role_level: 5,
                    employee_code: 'ADM001',
                    is_active: true,
                    last_login: new Date().toISOString()
                  }));
                  window.location.reload();
                }}
                size="sm"
                className="w-full text-xs h-6"
              >
                Login as Admin
              </Button>
              <Button 
                onClick={() => {
                  localStorage.setItem('warehouse_user', JSON.stringify({
                    id: 'mgr-001',
                    email: 'manager@warehouse.com',
                    full_name: 'หัวหน้าคลัง',
                    department: 'คลังสินค้า',
                    role: 'ผู้จัดการ',
                    role_level: 4,
                    employee_code: 'MGR001',
                    is_active: true,
                    last_login: new Date().toISOString()
                  }));
                  window.location.reload();
                }}
                size="sm"
                variant="outline"
                className="w-full text-xs h-6"
              >
                Login as Manager
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
