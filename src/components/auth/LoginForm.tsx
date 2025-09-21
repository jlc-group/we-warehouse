import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContextSimple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('กรุณากรอกอีเมลที่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showDemoInfo, setShowDemoInfo] = useState(false);

  const { signIn } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  const rememberValue = watch('remember');

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError('');

      await signIn(data.email, data.password);

      // Store remember preference
      if (data.remember) {
        localStorage.setItem('remember_user', data.email);
      } else {
        localStorage.removeItem('remember_user');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(
        error.message === 'Invalid login credentials'
          ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
          : error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remember_user');
    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setValue('remember', true);
    }
  }, [setValue]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            เข้าสู่ระบบจัดการคลัง
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            กรุณาเข้าสู่ระบบเพื่อจัดการคลังสินค้า
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                autoComplete="email"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberValue}
                onCheckedChange={(checked) => setValue('remember', !!checked)}
                disabled={isLoading}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer"
              >
                จำอีเมลนี้ไว้
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  กำลังเข้าสู่ระบบ...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  เข้าสู่ระบบ
                </div>
              )}
            </Button>

            {onSwitchToRegister && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  ยังไม่มีบัญชี?{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={onSwitchToRegister}
                    disabled={isLoading}
                  >
                    สมัครสมาชิก
                  </Button>
                </p>
              </div>
            )}

            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDemoInfo(!showDemoInfo)}
                disabled={isLoading}
                className="mb-2"
              >
                {showDemoInfo ? 'ซ่อน' : 'แสดง'}ข้อมูลผู้ใช้ทดสอบ
              </Button>

              {showDemoInfo && (
                <div className="bg-blue-50 p-3 rounded-lg text-left text-xs space-y-2 mb-2">
                  <p className="font-semibold text-blue-800">ผู้ใช้ทดสอบ (รหัสผ่าน: password)</p>
                  <div className="space-y-1">
                    <p><strong>admin@warehouse.com</strong> - ผู้ดูแลระบบ (ระดับ 5)</p>
                    <p><strong>manager@warehouse.com</strong> - หัวหน้าคลัง (ระดับ 4)</p>
                    <p><strong>qc@warehouse.com</strong> - หัวหน้า QC (ระดับ 3)</p>
                    <p><strong>staff@warehouse.com</strong> - พนักงานคลัง (ระดับ 2)</p>
                  </div>
                  <div className="mt-2 space-x-1">
                    {[
                      { email: 'admin@warehouse.com', label: 'Admin' },
                      { email: 'manager@warehouse.com', label: 'Manager' },
                      { email: 'qc@warehouse.com', label: 'QC' },
                      { email: 'staff@warehouse.com', label: 'Staff' }
                    ].map(({ email, label }) => (
                      <Button
                        key={email}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs px-2 py-1 h-auto"
                        onClick={() => {
                          setValue('email', email);
                          setValue('password', 'password');
                        }}
                        disabled={isLoading}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                ระบบจัดการคลังสินค้า v1.0
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}