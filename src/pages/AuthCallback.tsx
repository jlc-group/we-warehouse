/**
 * SSO Callback Handler
 *
 * Handles redirect from JLC SSO Server after social/SSO login.
 * Receives either a legacy JWT token or social_code in the URL
 * and exchanges it for a WeWarehouse session.
 *
 * Flow:
 * 1. User clicks "Login with Google/LINE" on login page
 * 2. User is redirected to SSO server
 * 3. After login, SSO redirects to /auth/callback?social_code=<CODE>
 * 4. This component exchanges the callback data with backend auth endpoints
 * 5. Backend verifies token and returns WeWarehouse session
 * 6. Frontend saves session and redirects to dashboard
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react';

// Backend API base URL
function getBackendRoot(): string {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  if (backendUrl) {
    return backendUrl.replace(/\/api\/local\/?$/, '').replace(/\/api\/?$/, '') || backendUrl;
  }
  const salesUrl = import.meta.env.VITE_SALES_API_URL || '';
  if (salesUrl) {
    return salesUrl.replace(/\/api\/?$/, '') || salesUrl;
  }
  return import.meta.env.VITE_BACKEND_URL?.replace('/api/local', '') || 'http://localhost:3015';
}

const API_BASE = getBackendRoot();

// Deduplication: prevent double exchange on React strict mode / refresh
const inFlightExchanges = new Map<string, Promise<any>>();
const completedExchanges = new Set<string>();

interface UserRole {
  id: string;
  code: string;
  name: string;
}

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get('token');
        const socialCode = searchParams.get('social_code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle error from SSO
        if (errorParam) {
          setError(errorDescription || errorParam);
          setProcessing(false);
          return;
        }

        if (!token && !socialCode) {
          setError('ไม่พบข้อมูลยืนยันตัวตนจาก SSO Server');
          setProcessing(false);
          return;
        }

        const callbackKey = socialCode ? `social:${socialCode}` : `token:${token}`;

        // Already completed this exchange
        if (completedExchanges.has(callbackKey)) {
          if (localStorage.getItem('warehouse_token')) {
            window.location.href = '/';
            return;
          }
          setError('ลิงก์เข้าสู่ระบบนี้ถูกใช้งานแล้ว กรุณาเริ่มเข้าสู่ระบบใหม่');
          setProcessing(false);
          return;
        }

        // Reuse in-flight promise if already started
        let exchangePromise = inFlightExchanges.get(callbackKey);
        if (!exchangePromise) {
          const endpoint = socialCode ? '/api/auth/social-login' : '/api/auth/sso';
          const body = socialCode ? { code: socialCode } : { token };

          exchangePromise = fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).then(async (res) => {
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'SSO Login failed');
            }
            return res.json();
          });

          inFlightExchanges.set(callbackKey, exchangePromise);
        }

        const data = await exchangePromise;
        completedExchanges.add(callbackKey);
        inFlightExchanges.delete(callbackKey);

        // Build user object compatible with AuthContextSimple
        const userData = {
          ...data.user,
          role: data.user.roles?.[0]?.name || 'พนักงาน',
          role_level: data.user.roles?.some((r: UserRole) => r.code === 'super_admin') ? 5
            : data.user.roles?.some((r: UserRole) => r.code === 'manager') ? 4
              : data.user.roles?.some((r: UserRole) => r.code === 'supervisor') ? 3
                : 2,
          department: data.user.department?.name || 'ทั่วไป',
          dept: data.user.department,
        };

        // Save session
        localStorage.setItem('warehouse_token', data.access_token);
        localStorage.setItem('warehouse_user', JSON.stringify(userData));

        // Redirect to dashboard
        window.location.href = '/';

      } catch (err: unknown) {
        const token = searchParams.get('token');
        const socialCode = searchParams.get('social_code');
        const callbackKey = socialCode ? `social:${socialCode}` : token ? `token:${token}` : null;
        if (callbackKey) {
          inFlightExchanges.delete(callbackKey);
        }
        const errorMessage = err instanceof Error ? err.message : 'SSO Login failed';
        setError(errorMessage);
        setProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>SSO Login</CardTitle>
        </CardHeader>

        <CardContent>
          {processing ? (
            <div className="py-8">
              <div
                className="w-10 h-10 mx-auto mb-5 border-3 border-muted border-t-primary rounded-full animate-spin"
                style={{ borderWidth: '3px' }}
              />
              <p className="text-muted-foreground">กำลังตรวจสอบข้อมูล...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                กลับไปหน้า Login
              </Button>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground mt-6 pt-4 border-t">
            WeWarehouse - JLC Group
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
