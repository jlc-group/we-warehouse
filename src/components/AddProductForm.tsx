import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
import { Package, Hash, Save, RotateCcw, Settings, Search, X, ChevronDown } from 'lucide-react';
import { ProductSummaryTable } from '@/components/ProductSummaryTable';
import UnitConversionSettings from '@/components/UnitConversionSettings';
import { supabase } from '@/integrations/supabase/client';

type ProductType = 'FG' | 'PK';

interface ProductFormData {
  product_name: string;
  sku_code: string;
  product_type: ProductType;
  unit_of_measure: string;
}

interface Product {
  id: string;
  product_name: string;
  sku_code: string;
  product_type: ProductType;
  unit_of_measure: string;
  is_active: boolean;
  created_at: string;
}

interface SearchResult {
  product: Product;
  tab: 'add-product' | 'product-summary' | 'unit-conversion';
}

export function AddProductForm() {
  const { addProduct, checkSKUExists } = useProducts();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // SKU Validation State
  const [skuValidation, setSkuValidation] = useState<{
    exists: boolean;
    message: string;
    checking: boolean;
  }>({
    exists: false,
    message: '',
    checking: false
  });

  const { register, handleSubmit, control, reset, formState: { errors }, setValue } = useForm<ProductFormData>({
    defaultValues: {
      product_name: '',
      sku_code: '',
      product_type: 'FG',
      unit_of_measure: 'ชิ้น'
    }
  });

  // Fetch all products for search
  useEffect(() => {
    const fetchProducts = async () => {
      console.log('🔄 [DEBUG] Starting to fetch products...');
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, product_name, sku_code, product_type, unit_of_measure, is_active, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        console.log('🔍 [DEBUG] Supabase response:', { data, error });

        if (error) {
          console.error('❌ [DEBUG] Error fetching products:', error);
        } else {
          console.log(`✅ [DEBUG] Successfully fetched ${data?.length || 0} products`);
          console.table(data?.slice(0, 5) || []);
          setAllProducts(data || []);
        }
      } catch (error) {
        console.error('❌ [DEBUG] Error in fetchProducts:', error);
      }
    };

    fetchProducts();
  }, []);

  // Search functionality with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('🔍 [DEBUG] Search triggered with query:', searchQuery);
      console.log('🔍 [DEBUG] Available products count:', allProducts.length);

      if (searchQuery.trim()) {
        const filtered = allProducts.filter(product =>
          product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.product_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.unit_of_measure.toLowerCase().includes(searchQuery.toLowerCase())
        );
        console.log('✅ [DEBUG] Found', filtered.length, 'matching products');
        console.table(filtered.slice(0, 3));
        setSearchResults(filtered.slice(0, 8)); // Limit to 8 results
      } else {
        console.log('📭 [DEBUG] Clearing search results (empty query)');
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, allProducts]);

  // Handle product selection from search
  const handleProductSelect = (product: Product) => {
    // Close search dropdown
    setIsSearchOpen(false);
    setSearchQuery('');

    // Switch to product-summary tab to view the product
    const tabsContainer = document.querySelector('[role="tablist"]');
    const summaryTab = document.querySelector('[value="product-summary"]') as HTMLElement;
    if (summaryTab) {
      summaryTab.click();
    }

    toast({
      title: '🔍 ค้นพบสินค้า',
      description: `เลือก "${product.product_name}" (${product.sku_code})`,
    });
  };

  // Real-time SKU validation
  const validateSKU = async (sku: string) => {
    if (!sku.trim()) {
      setSkuValidation({ exists: false, message: '', checking: false });
      return;
    }

    setSkuValidation({ exists: false, message: 'กำลังตรวจสอบ...', checking: true });

    try {
      const exists = await checkSKUExists(sku);
      if (exists) {
        setSkuValidation({
          exists: true,
          message: '❌ รหัสสินค้านี้มีอยู่แล้ว',
          checking: false
        });
      } else {
        setSkuValidation({
          exists: false,
          message: '✅ สามารถใช้รหัสสินค้านี้ได้',
          checking: false
        });
      }
    } catch (error) {
      setSkuValidation({
        exists: false,
        message: '❌ ไม่สามารถตรวจสอบได้',
        checking: false
      });
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      console.log('🚀 [DEBUG] Form submission started with data:', data);
      setIsSubmitting(true);

      // Check if SKU already exists
      console.log('🔍 [DEBUG] Checking if SKU exists:', data.sku_code);
      const skuExists = await checkSKUExists(data.sku_code);
      console.log('✅ [DEBUG] SKU exists check result:', skuExists);

      if (skuExists) {
        console.log('❌ [DEBUG] SKU already exists, showing error');
        toast({
          title: '❌ รหัสสินค้าซ้ำ',
          description: `รหัสสินค้า "${data.sku_code}" มีอยู่ในระบบแล้ว`,
          variant: 'destructive',
        });
        return;
      }

      // Prepare data for database
      const productData = {
        product_name: data.product_name,
        sku_code: data.sku_code,
        product_type: data.product_type,
        unit_of_measure: data.unit_of_measure,
        is_active: true
      };

      console.log('💾 [DEBUG] Attempting to add product with data:', productData);
      const result = await addProduct(productData);
      console.log('✅ [DEBUG] Add product result:', result);

      if (result) {
        // Create default conversion rate for the new product
        console.log('✅ Product added, creating default conversion rate...');
        try {
          // Get the product_id from the newly created product
          const { data: newProduct, error: fetchError } = await supabase
            .from('products')
            .select('id, sku_code, product_name, product_type')
            .eq('sku_code', data.sku_code)
            .single();

          if (fetchError || !newProduct) {
            console.warn('⚠️ Could not fetch new product:', fetchError);
            throw new Error('Failed to fetch product ID');
          }

          // Insert conversion rate with all required fields
          const { error: conversionError } = await supabase
            .from('product_conversion_rates')
            .insert({
              product_id: newProduct.id,
              sku: newProduct.sku_code,
              product_name: newProduct.product_name,
              product_type: newProduct.product_type,
              unit_level1_name: 'ลัง',
              unit_level1_rate: 144,
              unit_level2_name: 'กล่อง',
              unit_level2_rate: 12,
              unit_level3_name: 'ชิ้น'
            });

          if (conversionError) {
            console.warn('⚠️ Could not create default conversion rate:', conversionError);
            toast({
              title: '⚠️ คำเตือน',
              description: 'เพิ่มสินค้าสำเร็จแล้ว แต่ยังไม่ได้ตั้งค่าการแปลงหน่วย กรุณาไปตั้งค่าในแท็บ "การแปลงหน่วย"',
              variant: 'default',
            });
          } else {
            console.log('✅ Default conversion rate created successfully');
            toast({
              title: '✅ สำเร็จ',
              description: `เพิ่มสินค้า "${data.product_name}" และสร้างการแปลงหน่วยเริ่มต้นเรียบร้อย (ใช้ product_id ไม่ซ้ำซ้อน)`,
            });
          }
        } catch (convError) {
          console.error('❌ Error creating conversion rate:', convError);
        }

        // Reset form
        reset();
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเพิ่มข้อมูลสินค้าได้ กรุณาลองใหม่',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    toast({
      title: '🔄 ล้างข้อมูลแล้ว',
      description: 'กรอกข้อมูลสินค้าใหม่ได้เลย',
    });
  };

  return (
    <div className="space-y-6">
      {/* Global Search Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="ค้นหาสินค้าจากชื่อ, SKU, ประเภท..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => {
                  // Delay closing to allow click on results
                  setTimeout(() => setIsSearchOpen(false), 200);
                }}
                className="pl-10 pr-10 border-blue-300 focus:border-blue-500 focus:ring-blue-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{product.product_name}</div>
                        <div className="text-sm text-gray-500">SKU: {product.sku_code}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          product.product_type === 'FG'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {product.product_type === 'FG' ? '🏷️ FG' : '📦 PK'}
                        </span>
                        <span className="text-gray-400">{product.unit_of_measure}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {isSearchOpen && searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                <div className="text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>ไม่พบสินค้าที่ตรงกับ "{searchQuery}"</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Management Tabs */}
      <Tabs
        defaultValue="add-product"
        className="space-y-4"
        onValueChange={(value) => {
          console.log('📑 AddProductForm: Tab changed to:', value);
        }}
      >
        <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
          <TabsTrigger value="add-product" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            เพิ่มสินค้า
          </TabsTrigger>
          <TabsTrigger value="product-summary" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            รหัสสินค้า
          </TabsTrigger>
          <TabsTrigger value="unit-conversion" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            การแปลงหน่วย
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add-product" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Package className="h-5 w-5 text-primary" />
                เพิ่มสินค้าใหม่
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                กรอกข้อมูลพื้นฐานของสินค้าเพื่อเพิ่มเข้าระบบ
              </p>

              {/* Quick Find Section */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
                  <Search className="h-4 w-4" />
                  <span className="font-medium">ค้นหาสินค้าที่มีอยู่แล้ว</span>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="ค้นหาจากชื่อหรือ SKU..."
                    className="text-sm"
                    onChange={(e) => {
                      const query = e.target.value.toLowerCase();
                      if (query.trim()) {
                        const existingProduct = allProducts.find(product =>
                          product.product_name.toLowerCase().includes(query) ||
                          product.sku_code.toLowerCase().includes(query)
                        );
                        if (existingProduct) {
                          // Show toast notification
                          toast({
                            title: '🔍 พบสินค้าที่มีอยู่แล้ว',
                            description: `"${existingProduct.product_name}" (${existingProduct.sku_code})`,
                            variant: 'default',
                          });
                          // Pre-fill form with existing data
                          setValue('product_name', existingProduct.product_name);
                          setValue('sku_code', `${existingProduct.sku_code}_COPY`);
                          setValue('product_type', existingProduct.product_type);
                          setValue('unit_of_measure', existingProduct.unit_of_measure);
                        }
                      }
                    }}
                  />
                  <small className="text-xs text-gray-500">
                    เริ่มพิมพ์เพื่อค้นหา และสร้างสินค้าใหม่โดยอัตโนมัติ
                  </small>
                </div>
              </div>
            </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Product Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="product_name" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  ชื่อสินค้า *
                </Label>
                <Input
                  id="product_name"
                  {...register('product_name', { required: 'กรุณากรอกชื่อสินค้า' })}
                  placeholder="เช่น ซองบรรจุเซรั่ม"
                  className={errors.product_name ? 'border-red-500' : ''}
                />
                {errors.product_name && (
                  <p className="text-sm text-red-500">{errors.product_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku_code" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  รหัสสินค้า (SKU) *
                </Label>
                <Input
                  id="sku_code"
                  {...register('sku_code', {
                    required: 'กรุณากรอกรหัสสินค้า',
                    onChange: (e) => {
                      validateSKU(e.target.value);
                    }
                  })}
                  placeholder="เช่น SCH-L4-8G_M01"
                  className={`font-mono ${
                    errors.sku_code
                      ? 'border-red-500'
                      : skuValidation.exists
                        ? 'border-orange-500'
                        : skuValidation.checking
                          ? 'border-yellow-500'
                          : ''
                  }`}
                />

                {/* SKU Validation Status */}
                {skuValidation.message && (
                  <div className={`text-sm flex items-center gap-1 ${
                    skuValidation.exists
                      ? 'text-orange-600'
                      : skuValidation.checking
                        ? 'text-yellow-600'
                        : 'text-green-600'
                  }`}>
                    {skuValidation.checking && (
                      <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                    )}
                    {skuValidation.message}
                  </div>
                )}

                {errors.sku_code && (
                  <p className="text-sm text-red-500">{errors.sku_code.message}</p>
                )}

                {/* Quick SKU Suggestions */}
                <div className="flex flex-wrap gap-1">
                  {['FG-', 'PK-', 'SCH-', 'WH-', 'QC-'].map((prefix) => (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => {
                        const currentSKU = document.getElementById('sku_code') as HTMLInputElement;
                        if (currentSKU && !currentSKU.value.startsWith(prefix)) {
                          const newValue = prefix + currentSKU.value;
                          currentSKU.value = newValue;
                          validateSKU(newValue);
                        }
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                    >
                      {prefix}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Type and Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>ประเภทสินค้า *</Label>
                <Controller
                  name="product_type"
                  control={control}
                  rules={{ required: 'กรุณาเลือกประเภทสินค้า' }}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.product_type ? 'border-red-500' : ''}>
                        <SelectValue placeholder="เลือกประเภทสินค้า" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FG">
                          🏷️ FG - สินค้าสำเร็จรูป
                        </SelectItem>
                        <SelectItem value="PK">
                          📦 PK - วัสดุบรรจุภัณฑ์
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.product_type && (
                  <p className="text-sm text-red-500">{errors.product_type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">หน่วยนับ *</Label>
                <Input
                  id="unit_of_measure"
                  {...register('unit_of_measure', { required: 'กรุณาระบุหน่วยนับ' })}
                  placeholder="เช่น ชิ้น, กิโลกรัม, ลิตร"
                  className={errors.unit_of_measure ? 'border-red-500' : ''}
                />
                {errors.unit_of_measure && (
                  <p className="text-sm text-red-500">{errors.unit_of_measure.message}</p>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                ล้างข้อมูล
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="product-summary" className="space-y-4">
          <ProductSummaryTable />
        </TabsContent>

        <TabsContent value="unit-conversion" className="space-y-4">
          <UnitConversionSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}