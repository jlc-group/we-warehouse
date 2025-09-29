import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Database,
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  RefreshCw,
  Settings,
  Wrench,
  Copy
} from 'lucide-react';
import { useProductsSummary } from '@/hooks/useProductsSummary';
import { applyProductsSummaryMigration, checkSQLExecutionCapability } from '@/utils/migrationUtils';
import { clearViewCache } from '@/utils/databaseViewUtils';

interface ProductSearchDebugPanelProps {
  className?: string;
}

export function ProductSearchDebugPanel({ className }: ProductSearchDebugPanelProps) {
  const { data: productsResult, isLoading, error, refetch } = useProductsSummary();
  const [isApplyingMigration, setIsApplyingMigration] = useState(false);
  const [canExecuteSQL, setCanExecuteSQL] = useState<boolean | null>(null);

  // Check SQL execution capability on mount
  React.useEffect(() => {
    checkSQLExecutionCapability().then(setCanExecuteSQL);
  }, []);

  if (!productsResult) {
    return null;
  }

  const { data: products, meta } = productsResult;

  const getStatusColor = () => {
    if (meta.isUsingFallback) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getStatusIcon = () => {
    if (meta.isUsingFallback) return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  // Handle applying migration
  const handleApplyMigration = async () => {
    setIsApplyingMigration(true);
    toast.info('🔧 กำลัง apply database view migration...');

    try {
      const result = await applyProductsSummaryMigration();

      if (result.success) {
        toast.success('✅ Database view ถูกสร้างเรียบร้อยแล้ว!');
        // Clear view cache and refetch data
        clearViewCache();
        setTimeout(() => {
          refetch();
        }, 1000);
      } else {
        toast.error(`❌ Migration ล้มเหลว: ${result.error}`);
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('❌ เกิดข้อผิดพลาดในการ apply migration');
    } finally {
      setIsApplyingMigration(false);
    }
  };

  // Copy SQL to clipboard
  const copySQL = () => {
    const sqlContent = `-- Copy this SQL and run it in Supabase Dashboard → SQL Editor

-- Drop existing views
DROP VIEW IF EXISTS public.available_products_for_sales;
DROP VIEW IF EXISTS public.products_summary;

-- Create products_summary view
CREATE OR REPLACE VIEW public.products_summary AS
SELECT
    p.id as product_id,
    p.sku_code as sku,
    p.product_name,
    p.category,
    p.subcategory,
    p.brand,
    p.product_type,
    p.unit_of_measure,
    p.unit_cost,
    p.description,
    COALESCE(SUM(inv.unit_level1_quantity), 0) as total_level1_quantity,
    COALESCE(SUM(inv.unit_level2_quantity), 0) as total_level2_quantity,
    COALESCE(SUM(inv.unit_level3_quantity), 0) as total_level3_quantity,
    COALESCE(
        SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0
    ) as total_pieces,
    COALESCE(pcr.unit_level1_name, 'ลัง') as unit_level1_name,
    COALESCE(pcr.unit_level2_name, 'กล่อง') as unit_level2_name,
    COALESCE(pcr.unit_level3_name, 'ชิ้น') as unit_level3_name,
    COALESCE(pcr.unit_level1_rate, 24) as unit_level1_rate,
    COALESCE(pcr.unit_level2_rate, 1) as unit_level2_rate,
    COUNT(DISTINCT inv.location) as location_count,
    (
        SELECT inv2.location
        FROM inventory_items inv2
        LEFT JOIN product_conversion_rates pcr2 ON inv2.sku = pcr2.sku
        WHERE inv2.sku = p.sku_code
        ORDER BY (
            (inv2.unit_level1_quantity * COALESCE(pcr2.unit_level1_rate, 24)) +
            (inv2.unit_level2_quantity * COALESCE(pcr2.unit_level2_rate, 1)) +
            inv2.unit_level3_quantity
        ) DESC
        LIMIT 1
    ) as primary_location,
    CASE
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 10 THEN 'low_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 50 THEN 'medium_stock'
        ELSE 'high_stock'
    END as stock_status,
    MAX(inv.updated_at) as last_updated,
    p.is_active
FROM public.products p
LEFT JOIN public.inventory_items inv ON p.sku_code = inv.sku
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
WHERE p.is_active = true
GROUP BY
    p.id, p.sku_code, p.product_name, p.category, p.subcategory,
    p.brand, p.product_type, p.unit_of_measure, p.unit_cost,
    p.description, p.is_active,
    pcr.unit_level1_name, pcr.unit_level2_name, pcr.unit_level3_name,
    pcr.unit_level1_rate, pcr.unit_level2_rate
ORDER BY p.product_type, p.product_name;

-- Create available_products_for_sales view
CREATE OR REPLACE VIEW public.available_products_for_sales AS
SELECT * FROM public.products_summary
WHERE total_pieces > 0
ORDER BY product_type, stock_status DESC, product_name;

-- Test the view
SELECT * FROM products_summary LIMIT 5;`;

    navigator.clipboard.writeText(sqlContent);
    toast.success('📋 SQL ถูก copy ไปยัง clipboard แล้ว!');
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Search className="h-4 w-4" />
          Product Search Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Database Status:</span>
            <Badge className={getStatusColor()}>
              {getStatusIcon()}
              <span className="ml-1">
                {meta.isUsingFallback ? 'Fallback Mode' : 'View Mode'}
              </span>
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Products Loaded:</span>
            <Badge variant="outline">
              {products.length} รายการ
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Updated:</span>
            <span className="text-xs text-muted-foreground">
              {new Date(meta.lastChecked).toLocaleTimeString('th-TH')}
            </span>
          </div>
        </div>

        {/* Status Messages */}
        {meta.isUsingFallback && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>⚠️ ปัญหาที่พบ:</strong> products_summary view ไม่พบในฐานข้อมูล<br/>
              <strong>ผลกระทบ:</strong> อาจเห็นสินค้าไม่ครบ เพราะใช้โหมด fallback ที่รวมข้อมูลจาก 3 ตาราง<br/>
              <strong>สาเหตุ:</strong> Database view ยังไม่ถูก apply หรือถูกลบไป
            </AlertDescription>
          </Alert>
        )}

        {!meta.viewExists && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm">
              <strong>🚨 ต้องแก้ไขทันที:</strong> Database view หายไป - ส่งผลให้ค้นหาสินค้าไม่ครบ<br/>
              <strong>วิธีแก้:</strong> Apply SQL migration ด้านล่าง หรือ copy SQL ไป run ใน Supabase Dashboard
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Error:</strong> {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log('📊 Current products data:', products)}
            >
              <Database className="h-3 w-3 mr-1" />
              Log Data
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={copySQL}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy SQL
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://supabase.com', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Supabase
            </Button>
          </div>

          {/* Migration Actions */}
          {meta.isUsingFallback && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">แก้ไขปัญหา:</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {canExecuteSQL && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApplyMigration}
                    disabled={isApplyingMigration}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    {isApplyingMigration ? 'กำลัง Apply...' : 'Auto-Fix: Apply Migration'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={copySQL}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Manual: Copy SQL
                </Button>
              </div>

              <div className="text-xs text-muted-foreground mt-2">
                {canExecuteSQL === false && (
                  <span className="text-orange-600">
                    ⚠️ Auto-fix ไม่พร้อมใช้งาน - กรุณา copy SQL และ run ใน Supabase Dashboard
                  </span>
                )}
                {canExecuteSQL === true && (
                  <span className="text-green-600">
                    ✅ Auto-fix พร้อมใช้งาน - คลิกปุ่มเพื่อแก้ไขปัญหาทันที
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sample Data */}
        {products.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-700 mb-2">Sample Products:</div>
            <div className="space-y-1">
              {products.slice(0, 3).map((product, idx) => (
                <div key={idx} className="text-xs text-gray-600 flex justify-between">
                  <span>{product.sku} - {product.product_name}</span>
                  <span>{product.total_pieces} ชิ้น</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}