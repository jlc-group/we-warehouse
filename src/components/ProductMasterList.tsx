import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { ProductEditModal } from './ProductEditModal';
import { Pencil, Search, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ProductTypeBadge } from './ProductTypeBadge';

interface Product {
  id: string;
  sku_code: string;
  product_name: string;
  product_type: string;
  unit_level1_name?: string;
  unit_level2_name?: string;
  unit_level3_name?: string;
  created_at: string;
  updated_at: string;
}

interface ConversionRate {
  product_id: string;
  unit_level1_rate: number;
  unit_level2_rate: number;
  updated_at: string;
}

export function ProductMasterList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch products
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['products-master-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch conversion rates
  const { data: conversionRates } = useQuery({
    queryKey: ['product-conversion-rates-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_conversion_rates')
        .select('product_id, unit_level1_rate, unit_level2_rate, updated_at');

      if (error) throw error;
      return data as ConversionRate[];
    },
  });

  // Create a map of conversion rates by product_id
  const conversionRateMap = new Map<string, ConversionRate>();
  conversionRates?.forEach(rate => {
    conversionRateMap.set(rate.product_id, rate);
  });

  // Filter products based on search
  const filteredProducts = products?.filter(product => {
    const query = searchQuery.toLowerCase();
    return (
      product.sku_code.toLowerCase().includes(query) ||
      product.product_name.toLowerCase().includes(query) ||
      product.product_type.toLowerCase().includes(query)
    );
  });

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    refetchProducts();
    setIsEditModalOpen(false);
    setSelectedProduct(null);
  };

  if (productsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">กำลังโหลดข้อมูลสินค้า...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              รายการสินค้าทั้งหมด
              <Badge variant="secondary" className="ml-2">
                {filteredProducts?.length || 0} รายการ
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาด้วย SKU, ชื่อสินค้า, หรือประเภท..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>หน่วย</TableHead>
                  <TableHead>อัตราแปลง</TableHead>
                  <TableHead>สร้างเมื่อ</TableHead>
                  <TableHead>แก้ไขล่าสุด</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts && filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const conversionRate = conversionRateMap.get(product.id);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono font-semibold">
                          {product.sku_code}
                        </TableCell>
                        <TableCell>{product.product_name}</TableCell>
                        <TableCell>
                          <ProductTypeBadge sku={product.sku_code} showIcon={true} />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            {product.unit_level1_name && (
                              <div>{product.unit_level1_name}</div>
                            )}
                            {product.unit_level2_name && (
                              <div className="text-muted-foreground">
                                → {product.unit_level2_name}
                              </div>
                            )}
                            {product.unit_level3_name && (
                              <div className="text-muted-foreground">
                                → → {product.unit_level3_name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {conversionRate ? (
                            <div className="text-sm space-y-0.5">
                              <div>1:{conversionRate.unit_level1_rate}</div>
                              <div className="text-muted-foreground">
                                1:{conversionRate.unit_level2_rate}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(product.created_at), 'dd MMM yyyy', { locale: th })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(product.updated_at), 'dd MMM yyyy HH:mm', { locale: th })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(product)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้าในระบบ'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {selectedProduct && (
        <ProductEditModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          product={selectedProduct}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
