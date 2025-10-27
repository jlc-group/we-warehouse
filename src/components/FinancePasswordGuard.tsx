import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface FinancePasswordGuardProps {
  children: React.ReactNode;
}

const CORRECT_PASSWORD = 'P@ssword';
const SESSION_KEY = 'finance_access';

export function FinancePasswordGuard({ children }: FinancePasswordGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check session on mount
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session === 'granted') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'granted');
      setIsAuthenticated(true);
      setError('');
      setPassword('');
    } else {
      setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
      setPassword('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">กำลังตรวจสอบ...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[500px] p-4">
        <Card className="w-full max-w-md border-2 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">🔒 ป้อนรหัสผ่าน</CardTitle>
            <p className="text-gray-600 mt-2">เพื่อเข้าถึงหน้าการเงิน</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="กรอกรหัสผ่าน"
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!password}
              >
                <Lock className="h-4 w-4 mr-2" />
                เข้าสู่ระบบ
              </Button>

              <div className="text-center text-xs text-gray-500 mt-4">
                <p>💡 ติดต่อผู้ดูแลระบบหากลืมรหัสผ่าน</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
