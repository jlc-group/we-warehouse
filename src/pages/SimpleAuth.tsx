import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// EMERGENCY FALLBACK AUTH PAGE - NO CONTEXTS, NO AUTO-REFRESH
const SimpleAuth: React.FC = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simple authentication without context dependencies
      console.log('🔐 SimpleAuth: Login attempt', credentials.username);

      // Set simple localStorage auth flag
      localStorage.setItem('simple-auth', JSON.stringify({
        isAuthenticated: true,
        username: credentials.username,
        timestamp: Date.now()
      }));

      console.log('✅ SimpleAuth: Login successful');
      navigate('/');
    } catch (error) {
      console.error('❌ SimpleAuth: Login failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Emergency Login</CardTitle>
          <CardDescription>
            Simplified login page without auto-refresh issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !credentials.username}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-medium text-yellow-800 mb-2">Emergency Access</h4>
            <p className="text-sm text-yellow-700">
              This is a simplified login page that bypasses complex contexts to avoid auto-refresh issues.
              Enter any username to proceed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAuth;