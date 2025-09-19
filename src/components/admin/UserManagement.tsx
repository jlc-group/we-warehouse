import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContextSimple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Users, Plus, Edit, Trash2, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: string;
  role_level: number;
  employee_code?: string;
  phone?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  department: string;
  role: string;
  role_level: number;
  employee_code: string;
  phone: string;
  is_active: boolean;
}

const departments = [
  'คลังสินค้า',
  'จัดซื้อ',
  'ควบคุมคุณภาพ',
  'การเงิน',
  'ผู้บริหาร'
];

const roles = [
  { name: 'อ่านอย่างเดียว', level: 1 },
  { name: 'พนักงาน', level: 2 },
  { name: 'หัวหน้างาน', level: 3 },
  { name: 'ผู้จัดการ', level: 4 },
  { name: 'ผู้ดูแลระบบ', level: 5 }
];

function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    department: 'คลังสินค้า',
    role: 'พนักงาน',
    role_level: 2,
    employee_code: '',
    phone: '',
    is_active: true
  });

  // ตรวจสอบสิทธิ์ Admin
  if (!user || user.role_level < 4) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md bg-white">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-600 p-3 rounded-full">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-center">ไม่มีสิทธิ์เข้าถึง</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                คุณต้องมีสิทธิ์ผู้จัดการขึ้นไปเพื่อเข้าถึงหน้านี้
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // โหลดข้อมูล users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      department: 'คลังสินค้า',
      role: 'พนักงาน',
      role_level: 2,
      employee_code: '',
      phone: '',
      is_active: true
    });
    setEditingUser(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (userToEdit: User) => {
    setFormData({
      email: userToEdit.email,
      password: '', // ไม่แสดง password เดิม
      full_name: userToEdit.full_name,
      department: userToEdit.department,
      role: userToEdit.role,
      role_level: userToEdit.role_level,
      employee_code: userToEdit.employee_code || '',
      phone: userToEdit.phone || '',
      is_active: userToEdit.is_active
    });
    setEditingUser(userToEdit);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          full_name: formData.full_name,
          department: formData.department,
          role: formData.role,
          role_level: formData.role_level,
          employee_code: formData.employee_code || null,
          phone: formData.phone || null,
          is_active: formData.is_active
        };

        // Update password if provided
        if (formData.password) {
          const { data: hashData, error: hashError } = await supabase.rpc('hash_password', {
            password: formData.password
          });
          if (hashError) throw hashError;
          updateData.password_hash = hashData;
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;

        toast({
          title: 'สำเร็จ',
          description: 'อัพเดทข้อมูลผู้ใช้เรียบร้อยแล้ว'
        });
      } else {
        // Create new user
        if (!formData.password) {
          toast({
            title: 'เกิดข้อผิดพลาด',
            description: 'กรุณากรอกรหัสผ่าน',
            variant: 'destructive'
          });
          return;
        }

        const { data: hashData, error: hashError } = await supabase.rpc('hash_password', {
          password: formData.password
        });
        if (hashError) throw hashError;

        const { error } = await supabase
          .from('users')
          .insert({
            email: formData.email,
            password_hash: hashData,
            full_name: formData.full_name,
            department: formData.department,
            role: formData.role,
            role_level: formData.role_level,
            employee_code: formData.employee_code || null,
            phone: formData.phone || null,
            is_active: formData.is_active
          });

        if (error) throw error;

        toast({
          title: 'สำเร็จ',
          description: 'สร้างผู้ใช้ใหม่เรียบร้อยแล้ว'
        });
      }

      setIsDialogOpen(false);
      fetchUsers();
      resetForm();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'สำเร็จ',
        description: 'ลบผู้ใช้เรียบร้อยแล้ว'
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบผู้ใช้ได้',
        variant: 'destructive'
      });
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle>จัดการผู้ใช้งาน</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    จัดการข้อมูลผู้ใช้งานและสิทธิ์การเข้าถึงระบบ
                  </p>
                </div>
              </div>
              <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มผู้ใช้ใหม่
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Users Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle>รายชื่อผู้ใช้งาน ({users.length} คน)</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>ข้อมูลผู้ใช้</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>สิทธิ์</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="bg-white">
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        {user.employee_code && (
                          <div className="text-sm text-gray-500">รหัส: {user.employee_code}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {user.department}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getRoleBadgeColor(user.role_level)}
                      >
                        {user.role} (Level {user.role_level})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.is_active ? "default" : "secondary"}
                        className={user.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                      >
                        {user.is_active ? 'ใช้งานได้' : 'ปิดใช้งาน'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login ? (
                        <div className="text-sm">
                          {new Date(user.last_login).toLocaleString('th-TH')}
                        </div>
                      ) : (
                        <span className="text-gray-400">ยังไม่เคยเข้าระบบ</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.id !== user?.id && ( // ป้องกันลบตัวเอง
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            className="hover:bg-red-50 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add/Edit User Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? 'แก้ไขข้อมูลและสิทธิการเข้าถึงของผู้ใช้' : 'สร้างบัญชีผู้ใช้ใหม่และกำหนดสิทธิการเข้าถึง'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 bg-white">
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!!editingUser}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  รหัสผ่าน {editingUser ? '(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)' : '*'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-white pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">ชื่อ-นามสกุล *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_code">รหัสพนักงาน</Label>
                <Input
                  id="employee_code"
                  value={formData.employee_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_code: e.target.value }))}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">แผนก *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">สิทธิ์ *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => {
                    const selectedRole = roles.find(r => r.name === value);
                    setFormData(prev => ({
                      ...prev,
                      role: value,
                      role_level: selectedRole?.level || 2
                    }));
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {roles.map((role) => (
                      <SelectItem key={role.name} value={role.name}>
                        {role.name} (Level {role.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">เปิดใช้งาน</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  {editingUser ? 'อัพเดท' : 'สร้าง'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default UserManagement;