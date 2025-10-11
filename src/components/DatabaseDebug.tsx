import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Database, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DatabaseInfo {
  connected: boolean;
  tablesCount: number;
  inventoryCount: number;
  productsCount: number;
  error?: string;
}

export function DatabaseDebug() {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const checkDatabase = async () => {
    setLoading(true);
    try {
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('inventory_items')
        .select('count')
        .limit(1);

      if (testError) {
        setDbInfo({
          connected: false,
          tablesCount: 0,
          inventoryCount: 0,
          productsCount: 0,
          error: testError.message
        });
        return;
      }

      // Count inventory items
      const { count: inventoryCount, error: invError } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true });

      // Count products
      const { count: productsCount, error: prodError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      setDbInfo({
        connected: true,
        tablesCount: 2, // inventory_items + products
        inventoryCount: inventoryCount || 0,
        productsCount: productsCount || 0,
        error: invError?.message || prodError?.message
      });

    } catch (error: any) {
      setDbInfo({
        connected: false,
        tablesCount: 0,
        inventoryCount: 0,
        productsCount: 0,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  const getStatusIcon = () => {
    if (!dbInfo) return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    if (dbInfo.connected) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusColor = () => {
    if (!dbInfo) return 'bg-gray-100 text-gray-800';
    if (dbInfo.connected) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Debug Panel
          </div>
          <Button
            onClick={checkDatabase}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Refresh'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">Connection Status</span>
            </div>
            <Badge className={getStatusColor()}>
              {dbInfo?.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {/* Database Stats */}
          {dbInfo && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {dbInfo.inventoryCount}
                </div>
                <div className="text-sm text-blue-800">Inventory Items</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {dbInfo.productsCount}
                </div>
                <div className="text-sm text-purple-800">Products</div>
              </div>
            </div>
          )}

          {/* Environment Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm space-y-1">
              <div><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL?.substring(0, 50)}...</div>
              <div><strong>Environment:</strong> {import.meta.env.MODE}</div>
            </div>
          </div>

          {/* Error Display */}
          {dbInfo?.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <div className="text-sm text-red-800">
                <strong>Error:</strong> {dbInfo.error}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => console.log('Database Info:', dbInfo)}
              size="sm"
              variant="outline"
            >
              Log to Console
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(dbInfo, null, 2));
              }}
              size="sm"
              variant="outline"
            >
              Copy Info
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}