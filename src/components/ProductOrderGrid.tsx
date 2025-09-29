import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  Hash,
  Calculator,
  ShoppingCart
} from 'lucide-react';
import { useAvailableProductsForSales } from '@/hooks/useProductsSummary';
import { getProductTypeDisplayName } from '@/data/sampleInventory';

export interface OrderItem {
  id: string; // Temporary ID for UI
  product_id: string;
  product_name: string;
  product_sku: string;
  product_type: string;
  unit_price: number;

  // จำนวนในแต่ละหน่วย
  quantity_cartons: number;
  quantity_boxes: number;
  quantity_pieces: number;

  // รวมเป็นชิ้น
  total_pieces: number;

  // ราคารวม
  line_total: number;

  // ข้อมูลการแปลงหน่วย
  unit_level1_rate: number; // ลัง -> ชิ้น
  unit_level2_rate: number; // กล่อง -> ชิ้น
  unit_level1_name: string;
  unit_level2_name: string;
  unit_level3_name: string;
}

interface ProductOrderGridProps {
  orderItems: OrderItem[];
  onOrderItemsChange: (items: OrderItem[]) => void;
  disabled?: boolean;
}

import type { ProductSummary } from '@/hooks/useProductsSummary';

export const ProductOrderGrid: React.FC<ProductOrderGridProps> = ({
  orderItems,
  onOrderItemsChange,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);
  const [unitPrice, setUnitPrice] = useState('0');

  const { data: products = [], isLoading, error } = useAvailableProductsForSales();

  // Debug logging
  React.useEffect(() => {
    console.log('🛒 ProductOrderGrid: Products state changed', {
      products: products.length,
      isLoading,
      error: error?.message,
      sampleProducts: products.slice(0, 3).map(p => ({ name: p.product_name, sku: p.sku, stock: p.total_pieces }))
    });
  }, [products, isLoading, error]);

  // กรองสินค้าตามคำค้นหา
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];

    return products.filter(product =>
      (product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    ).slice(0, 10); // จำกัด 10 รายการ
  }, [products, searchTerm]);

  // คำนวณจำนวนรวมเป็นชิ้น
  const calculateTotalPieces = (cartons: number, boxes: number, pieces: number, product: ProductSummary) => {
    const cartonsInPieces = cartons * (product.unit_level1_rate || 24);
    const boxesInPieces = boxes * (product.unit_level2_rate || 1);
    return cartonsInPieces + boxesInPieces + pieces;
  };

  // เพิ่มสินค้าในออเดอร์
  const addProductToOrder = () => {
    if (!selectedProduct) return;

    // ใช้ราคาจาก ProductSummary หรือให้ผู้ใช้กรอก
    const price = parseFloat(unitPrice) || selectedProduct.unit_price || selectedProduct.selling_price || 0;
    if (price <= 0) return;

    const newOrderItem: OrderItem = {
      id: Date.now().toString(), // Temporary ID
      product_id: selectedProduct.product_id,
      product_name: selectedProduct.product_name,
      product_sku: selectedProduct.sku,
      product_type: selectedProduct.product_type || 'FG',
      unit_price: price,
      quantity_cartons: 0,
      quantity_boxes: 0,
      quantity_pieces: 0,
      total_pieces: 0,
      line_total: 0,
      unit_level1_rate: selectedProduct.unit_level1_rate || 24,
      unit_level2_rate: selectedProduct.unit_level2_rate || 1,
      unit_level1_name: selectedProduct.unit_level1_name || 'ลัง',
      unit_level2_name: selectedProduct.unit_level2_name || 'กล่อง',
      unit_level3_name: selectedProduct.unit_level3_name || 'ชิ้น',
    };

    onOrderItemsChange([...orderItems, newOrderItem]);

    // รีเซ็ตฟอร์ม
    setSelectedProduct(null);
    setUnitPrice('');
    setSearchTerm('');
  };

  // อัพเดทจำนวนสินค้า
  const updateQuantity = (itemId: string, field: keyof Pick<OrderItem, 'quantity_cartons' | 'quantity_boxes' | 'quantity_pieces'>, value: number) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: Math.max(0, value) };

        // คำนวณจำนวนรวมและราคา
        updatedItem.total_pieces = calculateTotalPieces(
          updatedItem.quantity_cartons,
          updatedItem.quantity_boxes,
          updatedItem.quantity_pieces,
          {
            product_id: item.product_id,
            sku: item.product_sku,
            product_name: item.product_name,
            product_type: item.product_type,
            unit_level1_rate: item.unit_level1_rate,
            unit_level2_rate: item.unit_level2_rate,
            unit_level1_name: item.unit_level1_name,
            unit_level2_name: item.unit_level2_name,
            unit_level3_name: item.unit_level3_name,
            // Add required fields for ProductSummary
            total_level1_quantity: 0,
            total_level2_quantity: 0,
            total_level3_quantity: 0,
            total_pieces: 0,
            location_count: 0,
            stock_status: 'medium_stock' as const,
            is_active: true,
          }
        );
        updatedItem.line_total = updatedItem.total_pieces * updatedItem.unit_price;

        return updatedItem;
      }
      return item;
    });

    onOrderItemsChange(updatedItems);
  };

  // ลบสินค้าออกจากออเดอร์
  const removeOrderItem = (itemId: string) => {
    onOrderItemsChange(orderItems.filter(item => item.id !== itemId));
  };

  // อัพเดทราคาต่อหน่วย
  const updateUnitPrice = (itemId: string, price: number) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, unit_price: Math.max(0, price) };
        updatedItem.line_total = updatedItem.total_pieces * updatedItem.unit_price;
        return updatedItem;
      }
      return item;
    });

    onOrderItemsChange(updatedItems);
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.line_total, 0);
  const totalItems = orderItems.reduce((sum, item) => sum + item.total_pieces, 0);

  return (
    <div className="space-y-6">
      {/* การค้นหาและเพิ่มสินค้า */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            เพิ่มสินค้าในใบสั่งซื้อ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ค้นหาสินค้า */}
          <div className="space-y-2">
            <Label htmlFor="product-search">ค้นหาสินค้า</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="product-search"
                placeholder="ค้นหาชื่อสินค้าหรือรหัส SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={disabled}
              />
            </div>
          </div>

          {/* ข้อมูล Debug */}
          <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
            📊 สถานะข้อมูล: {isLoading ? 'กำลังโหลด...' : `${products.length} สินค้า`}
            {error && <span className="text-red-500 ml-2">❌ {error.message}</span>}
          </div>

          {/* ผลการค้นหา */}
          {searchTerm && (
            <div className="border rounded-lg max-h-40 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">กำลังค้นหา...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  ไม่พบสินค้าที่ค้นหา "{searchTerm}"
                  <div className="text-xs mt-1">
                    ({products.length} สินค้าทั้งหมดในระบบ)
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.product_id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setSearchTerm('');
                        // ตั้งราคาเริ่มต้นจาก ProductSummary
                        setUnitPrice(product.unit_price?.toString() || product.selling_price?.toString() || '');
                      }}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center justify-between"
                      disabled={disabled}
                    >
                      <div>
                        <div className="font-medium">{product.product_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Hash className="h-3 w-3" />
                          {product.sku}
                          <Badge variant="outline" className="text-xs">
                            {getProductTypeDisplayName(product.product_type as any)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {product.total_pieces || 0} ชิ้น
                        </div>
                        <Package className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* สินค้าที่เลือก */}
          {selectedProduct && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{selectedProduct.product_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      รหัส: {selectedProduct.sku} | ประเภท: {getProductTypeDisplayName(selectedProduct.product_type as any)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      หน่วย: 1 {selectedProduct.unit_level1_name} = {selectedProduct.unit_level1_rate} {selectedProduct.unit_level3_name},
                      1 {selectedProduct.unit_level2_name} = {selectedProduct.unit_level2_rate} {selectedProduct.unit_level3_name}
                    </p>
                    {selectedProduct.total_pieces > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        มีสต็อก: {selectedProduct.total_pieces.toLocaleString()} ชิ้น
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <Label htmlFor="unit-price" className="text-xs">ราคาต่อ {selectedProduct.unit_level3_name}</Label>
                      <Input
                        id="unit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="w-24 text-right"
                        placeholder="0.00"
                        disabled={disabled}
                      />
                    </div>
                    <Button
                      onClick={addProductToOrder}
                      disabled={disabled}
                      size="sm"
                    >
                      เพิ่ม
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* รายการสินค้าในใบสั่งซื้อ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              รายการสินค้าในใบสั่งซื้อ
            </div>
            <div className="text-sm font-normal text-muted-foreground">
              {orderItems.length} รายการ | {totalItems.toLocaleString()} ชิ้น
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>ยังไม่มีสินค้าในใบสั่งซื้อ</p>
              <p className="text-sm">ค้นหาและเพิ่มสินค้าด้านบน</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="text-center">ลัง</TableHead>
                      <TableHead className="text-center">กล่อง</TableHead>
                      <TableHead className="text-center">ชิ้น</TableHead>
                      <TableHead className="text-center">รวม (ชิ้น)</TableHead>
                      <TableHead className="text-right">ราคา/ชิ้น</TableHead>
                      <TableHead className="text-right">รวม</TableHead>
                      <TableHead className="text-center">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Hash className="h-3 w-3" />
                              {item.product_sku}
                              <Badge variant="outline" className="text-xs">
                                {getProductTypeDisplayName(item.product_type as any)}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 'quantity_cartons', item.quantity_cartons - 1)}
                              disabled={item.quantity_cartons <= 0 || disabled}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity_cartons}
                              onChange={(e) => updateQuantity(item.id, 'quantity_cartons', parseInt(e.target.value) || 0)}
                              className="w-16 text-center h-6"
                              disabled={disabled}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 'quantity_cartons', item.quantity_cartons + 1)}
                              disabled={disabled}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 'quantity_boxes', item.quantity_boxes - 1)}
                              disabled={item.quantity_boxes <= 0 || disabled}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity_boxes}
                              onChange={(e) => updateQuantity(item.id, 'quantity_boxes', parseInt(e.target.value) || 0)}
                              className="w-16 text-center h-6"
                              disabled={disabled}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 'quantity_boxes', item.quantity_boxes + 1)}
                              disabled={disabled}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 'quantity_pieces', item.quantity_pieces - 1)}
                              disabled={item.quantity_pieces <= 0 || disabled}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity_pieces}
                              onChange={(e) => updateQuantity(item.id, 'quantity_pieces', parseInt(e.target.value) || 0)}
                              className="w-16 text-center h-6"
                              disabled={disabled}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 'quantity_pieces', item.quantity_pieces + 1)}
                              disabled={disabled}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.total_pieces.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                            className="w-20 text-right"
                            disabled={disabled}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ฿{item.line_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeOrderItem(item.id)}
                            disabled={disabled}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* สรุปยอด */}
              <Card className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      <span className="font-medium">สรุปใบสั่งซื้อ</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        รวม {totalItems.toLocaleString()} ชิ้น จาก {orderItems.length} รายการ
                      </div>
                      <div className="text-xl font-bold">
                        ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductOrderGrid;