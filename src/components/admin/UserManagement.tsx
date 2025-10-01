import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  UserPlus,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useToggleUserStatus,
  getUserRoleColor,
  getPermissionLabels,
  getDepartments,
  getRoles,
  type User,
  type UserInsert,
  type UserUpdate,
} from '@/hooks/useUsers';

// Form interfaces for dialogs
interface NewUserForm {
  email: string;
  full_name: string;
  department: string;
  role: string;
  role_level: number;
  employee_code: string;
  phone: string;
  password_hash?: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

  // New user form state
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    full_name: '',
    department: '',
    role: '',
    role_level: 4,
    employee_code: '',
    phone: '',
  });

  // Database hooks
  const { data: users = [], isLoading, error, refetch } = useUsers();

  // Debug logs
  console.log('🔍 Users debug:', { users, isLoading, error });
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const toggleStatusMutation = useToggleUserStatus();

  // Get unique departments and roles from database data
  const departments = getDepartments();
  const roles = getRoles();

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === '' ||
        (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (user.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

      const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && user.is_active) ||
        (filterStatus === 'inactive' && !user.is_active);

      return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterDepartment, filterRole, filterStatus]);

  const handleUserAction = (action: string, user: User) => {
    switch (action) {
      case 'edit':
        setSelectedUser(user);
        setIsEditModalOpen(true);
        break;
      case 'toggle_status':
        toggleStatusMutation.mutate({
          userId: user.id,
          isActive: !user.is_active
        });
        break;
      case 'reset_password':
        toast({
          title: 'รีเซ็ตรหัสผ่าน',
          description: `ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${user.email} แล้ว`,
        });
        break;
      case 'delete':
        if (confirm(`ต้องการลบผู้ใช้ ${user.full_name} หรือไม่?`)) {
          deleteUserMutation.mutate(user.id);
        }
        break;
    }
  };

  const getPermissionBadge = (roleLevel: number) => {
    const permissions = getPermissionLabels(roleLevel);
    const permissionMap = {
      'ผู้ดูแล': { color: 'bg-red-100 text-red-800' },
      'อ่าน': { color: 'bg-blue-100 text-blue-800' },
      'เขียน': { color: 'bg-green-100 text-green-800' },
      'ลบ': { color: 'bg-red-100 text-red-800' },
      'จัดการคลัง': { color: 'bg-purple-100 text-purple-800' }
    };

    return permissions.map(permission => {
      const perm = permissionMap[permission as keyof typeof permissionMap];
      if (!perm) return null;

      return (
        <Badge key={permission} className={`text-xs ${perm.color}`}>
          {permission}
        </Badge>
      );
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600" />
            จัดการผู้ใช้งานระบบ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading and Error States */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>กำลังโหลดข้อมูลผู้ใช้...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div className="text-red-800">
                  <strong>เกิดข้อผิดพลาด:</strong> {error.message}
                  <div className="text-sm mt-1">
                    ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาตรวจสอบการตั้งค่า Supabase
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="mt-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ลองใหม่
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ผู้ใช้ทั้งหมด</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">กำลังใช้งาน</p>
                    <p className="text-2xl font-bold text-green-600">
                      {users.filter(u => u.is_active).length}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ปิดใช้งาน</p>
                    <p className="text-2xl font-bold text-red-600">
                      {users.filter(u => !u.is_active).length}
                    </p>
                  </div>
                  <EyeOff className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ผู้ดูแลระบบ</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {users.filter(u => u.role === 'ผู้ดูแลระบบ').length}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหาอีเมล, ชื่อจริง, หรือรหัสพนักงาน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="แผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">แผนก: ทั้งหมด</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ตำแหน่ง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ตำแหน่ง: ทั้งหมด</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isNewUserModalOpen} onOpenChange={setIsNewUserModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มผู้ใช้
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="ชื่อจริง"
                      value={newUserForm.full_name}
                      onChange={(e) => setNewUserForm({...newUserForm, full_name: e.target.value})}
                    />
                    <Input
                      placeholder="อีเมล"
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                    />
                    <Input
                      placeholder="รหัสพนักงาน"
                      value={newUserForm.employee_code}
                      onChange={(e) => setNewUserForm({...newUserForm, employee_code: e.target.value})}
                    />
                    <Input
                      placeholder="เบอร์โทรศัพท์"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({...newUserForm, phone: e.target.value})}
                    />
                    <Select value={newUserForm.department} onValueChange={(value) => setNewUserForm({...newUserForm, department: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกแผนก" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm({...newUserForm, role: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกตำแหน่ง" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 pt-4">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          createUserMutation.mutate(newUserForm);
                          setIsNewUserModalOpen(false);
                          setNewUserForm({
                            email: '',
                            full_name: '',
                            department: '',
                            role: '',
                            role_level: 4,
                            employee_code: '',
                            phone: '',
                          });
                        }}
                        disabled={!newUserForm.email || !newUserForm.full_name || !newUserForm.department || !newUserForm.role}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        เพิ่มผู้ใช้
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้ใช้</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>ตำแหน่ง</TableHead>
                  <TableHead>สิทธิ์</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>เข้าใช้ล่าสุด</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.employee_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.department}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getUserRoleColor(user.role_level)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getPermissionBadge(user.role_level)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.last_login ? new Date(user.last_login).toLocaleString('th-TH') : 'ไม่เคยเข้าใช้'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction('edit', user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction('toggle_status', user)}
                        >
                          {user.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction('reset_password', user)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        {user.role !== 'ผู้ดูแลระบบ' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUserAction('delete', user)}
                            className="text-red-600 hover:text-red-700"
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
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>ไม่พบผู้ใช้ที่ค้นหา</p>
            </div>
          )}
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}