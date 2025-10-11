import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomerExportService } from '@/services/customerExportService';

export function DebugExportData() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRawData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading raw data from customer_exports...');
      const { data, error } = await supabase
        .from('customer_exports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      console.log('✅ Raw data loaded:', data);
      setRawData(data || []);
    } catch (err: any) {
      console.error('❌ Error loading raw data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading data via CustomerExportService...');
      const stats = await CustomerExportService.getCustomerExportStats();
      console.log('✅ Service data loaded:', stats);
      setServiceData(stats);
    } catch (err: any) {
      console.error('❌ Error loading service data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRawData();
    loadServiceData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🐛 Debug: Customer Exports</h1>
        <div className="space-x-2">
          <Button onClick={loadRawData} disabled={loading}>
            Reload Raw Data
          </Button>
          <Button onClick={loadServiceData} disabled={loading}>
            Reload Service Data
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">❌ Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{error}</pre>
          </CardContent>
        </Card>
      )}

      {/* Raw Data */}
      <Card>
        <CardHeader>
          <CardTitle>1️⃣ Raw Data from customer_exports table</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <p className="mb-4 font-semibold">
                Total Records: {rawData.length}
              </p>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {rawData.slice(0, 10).map((record, idx) => (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg bg-slate-50"
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-semibold">#{idx + 1} Customer:</span>{' '}
                        {record.customer_name}
                      </div>
                      <div>
                        <span className="font-semibold">Product:</span>{' '}
                        {record.product_name}
                      </div>
                      <div>
                        <span className="font-semibold">Quantity:</span>{' '}
                        {record.quantity_exported}
                      </div>
                      <div>
                        <span className="font-semibold">Unit Price:</span>{' '}
                        {record.unit_price || 'NULL'} ฿
                      </div>
                      <div>
                        <span className="font-semibold">Total Value:</span>{' '}
                        {record.total_value || 0} ฿
                      </div>
                      <div>
                        <span className="font-semibold">Date:</span>{' '}
                        {new Date(record.created_at).toLocaleString('th-TH')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {rawData.length === 0 && (
                <p className="text-red-600 font-semibold">
                  ⚠️ No records found in customer_exports table!
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Service Data */}
      <Card>
        <CardHeader>
          <CardTitle>2️⃣ Data from CustomerExportService</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <p className="mb-4 font-semibold">
                Total Customers with Exports: {serviceData.length}
              </p>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {serviceData.map((customer, idx) => (
                  <div
                    key={customer.customer_id}
                    className="p-4 border rounded-lg bg-blue-50"
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="col-span-2">
                        <span className="font-semibold text-lg">
                          #{idx + 1} {customer.customer_name}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          ({customer.customer_code})
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold">Total Orders:</span>{' '}
                        {customer.total_orders}
                      </div>
                      <div>
                        <span className="font-semibold">Total Items:</span>{' '}
                        {customer.total_items}
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold">Total Amount:</span>{' '}
                        <span
                          className={
                            customer.total_amount === 0
                              ? 'text-red-600 font-bold'
                              : 'text-green-600 font-bold'
                          }
                        >
                          {customer.total_amount.toLocaleString()} ฿
                        </span>
                        {customer.total_amount === 0 && (
                          <span className="ml-2 text-red-600">
                            ⚠️ No pricing data!
                          </span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold">Last Export:</span>{' '}
                        {customer.last_order_date || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {serviceData.length === 0 && (
                <p className="text-red-600 font-semibold">
                  ⚠️ No customers with exports found!
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Console Log Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>3️⃣ Console Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Check your browser console (F12) for detailed logs
          </p>
          <div className="mt-4 p-4 bg-slate-100 rounded font-mono text-xs">
            <p>Open DevTools Console (F12) to see:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>🔍 Loading raw data from customer_exports...</li>
              <li>✅ Raw data loaded: (array)</li>
              <li>🔍 Loading data via CustomerExportService...</li>
              <li>✅ Service data loaded: (array)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
