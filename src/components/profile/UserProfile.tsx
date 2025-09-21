import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  User,
  Mail,
  Building2,
  Shield,
  Phone,
  IdCard,
  Calendar,
  Clock,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function UserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || ''
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('users')
        .update({
          full_name: editData.full_name,
          phone: editData.phone || null
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'สำเร็จ',
        description: 'อัพเดทข้อมูลโปรไฟล์เรียบร้อยแล้ว'
      });

      setIsEditing(false);

      // อัพเดท user context (ต้องรีเฟรชหน้าเพื่อโหลดข้อมูลใหม่)
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัพเดทข้อมูลได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      full_name: user.full_name,
      phone: user.phone || ''
    });
    setIsEditing(false);
  };

  const getRoleBadgeColor = (roleLevel: number) => {
    switch (roleLevel) {
      case 5: return 'bg-red-100 text-red-800 border-red-200';
      case 4: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 2: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <User className="h-6 w-6 text-blue-600" />
                ข้อมูลโปรไฟล์ส่วนตัว
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                disabled={loading}
                className="bg-white"
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    ยกเลิก
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    แก้ไข
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture & Basic Info */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-center">รูปโปรไฟล์</CardTitle>
            </CardHeader>
            <CardContent className="bg-white text-center space-y-4">
              <Avatar className="h-24 w-24 mx-auto">
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
                <AvatarFallback className="text-lg bg-blue-100 text-blue-800">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{user.full_name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>

                <div className="flex flex-wrap justify-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {user.department}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getRoleBadgeColor(user.role_level)}
                  >
                    {user.role} (Level {user.role_level})
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  ข้อมูลส่วนตัว
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      ชื่อ-นามสกุล
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editData.full_name}
                        onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="bg-white"
                      />
                    ) : (
                      <p className="text-sm p-2 bg-gray-50 rounded border">
                        {user.full_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      อีเมล
                    </Label>
                    <p className="text-sm p-2 bg-gray-50 rounded border">
                      {user.email}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      เบอร์โทรศัพท์
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editData.phone}
                        onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="08X-XXX-XXXX"
                        className="bg-white"
                      />
                    ) : (
                      <p className="text-sm p-2 bg-gray-50 rounded border">
                        {user.phone || 'ไม่ได้ระบุ'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <IdCard className="h-4 w-4" />
                      รหัสพนักงาน
                    </Label>
                    <p className="text-sm p-2 bg-gray-50 rounded border">
                      {user.employee_code || 'ไม่ได้ระบุ'}
                    </p>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          กำลังบันทึก...
                        </div>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          บันทึก
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Information */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  ข้อมูลการทำงาน
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      แผนก
                    </Label>
                    <div className="p-2 bg-gray-50 rounded border">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {user.department}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      สิทธิ์การใช้งาน
                    </Label>
                    <div className="p-2 bg-gray-50 rounded border">
                      <Badge
                        variant="outline"
                        className={getRoleBadgeColor(user.role_level)}
                      >
                        {user.role} (Level {user.role_level})
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      วันที่สมัครสมาชิก
                    </Label>
                    <p className="text-sm p-2 bg-gray-50 rounded border">
                      วันที่ {new Date(user.created_at || '').toLocaleDateString('th-TH')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      เข้าสู่ระบบล่าสุด
                    </Label>
                    <p className="text-sm p-2 bg-gray-50 rounded border">
                      {user.last_login ? (
                        new Date(user.last_login).toLocaleString('th-TH')
                      ) : (
                        'ยังไม่เคยเข้าระบบ'
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  สถานะบัญชี
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-green-800">บัญชีใช้งานได้</p>
                      <p className="text-sm text-green-600">
                        บัญชีของคุณสามารถใช้งานได้ปกติ
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}