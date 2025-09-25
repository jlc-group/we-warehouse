import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Building2, Shield } from 'lucide-react';

export function DisabledUserProfile() {
  const mockUser = {
    full_name: 'Admin User',
    email: 'admin@warehouse.com',
    department: 'คลังสินค้า',
    role: 'admin',
    role_level: 5,
    employee_code: 'ADM001'
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
            <CardTitle className="flex items-center gap-3">
              <User className="h-6 w-6 text-blue-600" />
              ข้อมูลโปรไฟล์ส่วนตัว
            </CardTitle>
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
                <AvatarFallback className="text-lg bg-blue-100 text-blue-800">
                  {getInitials(mockUser.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{mockUser.full_name}</h3>
                <p className="text-sm text-gray-600">{mockUser.email}</p>

                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {mockUser.department}
                  </Badge>
                  <Badge variant="outline" className={getRoleBadgeColor(mockUser.role_level)}>
                    {mockUser.role} (Level {mockUser.role_level})
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Information */}
          <div className="lg:col-span-2 space-y-6">
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
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4" />
                      ชื่อ-นามสกุล
                    </div>
                    <p className="text-sm p-2 bg-gray-50 rounded border">
                      {mockUser.full_name}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4" />
                      อีเมล
                    </div>
                    <p className="text-sm p-2 bg-gray-50 rounded border">
                      {mockUser.email}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4" />
                      แผนก
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {mockUser.department}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Shield className="h-4 w-4" />
                      สิทธิ์การใช้งาน
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <Badge variant="outline" className={getRoleBadgeColor(mockUser.role_level)}>
                        {mockUser.role} (Level {mockUser.role_level})
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}