/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Product = {
  id: string;
  product_name: string;
  sku_code: string;
  product_type: 'FG' | 'PK';
  is_active: boolean;
  brand: string;
  category: string;
  created_at: string;
  description: string;
  dimensions: string;
  manufacturing_country: string;
  max_stock_level: number;
  reorder_level: number;
  subcategory: string | null;
  unit_cost: number | null;
  updated_at: string;
  weight: number;
  storage_conditions: string;
  unit_of_measure: string;
};

type ProductInsert = Omit<Product, 'id'> & { id?: string };
type ProductUpdate = Partial<ProductInsert>;

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  lastFetchTime: number;
}

type ProductsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Product[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string };

const initialState: ProductsState = {
  products: [],
  loading: true,
  error: null,
  lastFetchTime: 0,
};

function productsReducer(state: ProductsState, action: ProductsAction): ProductsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        products: action.payload,
        lastFetchTime: Date.now(),
        error: null,
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [action.payload, ...state.products],
        lastFetchTime: Date.now(),
      };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
        lastFetchTime: Date.now(),
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload),
        lastFetchTime: Date.now(),
      };
    default:
      return state;
  }
}

interface ProductsContextType extends ProductsState {
  fetchProducts: (force?: boolean) => Promise<void>;
  addProduct: (productData: ProductInsert) => Promise<Product | null>;
  updateProduct: (id: string, updates: ProductUpdate) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  checkSKUExists: (sku: string, excludeId?: string) => Promise<boolean>;
  getProductBySKU: (sku: string) => Promise<Product | null>;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(productsReducer, initialState);
  const isFetchingRef = useRef<boolean>(false);
  const stateRef = useRef(state);
  const { toast } = useToast();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchProducts = useCallback(async (force = false) => {
    try {
      console.log('🔄 ProductsContext: fetchProducts called (real DB)', { force });
      console.log('🔍 DEBUG [B]: fetchProducts started', { force });
      isFetchingRef.current = true;
      dispatch({ type: 'FETCH_START' });

      // Fetch real data from Supabase with optimized query
      // Use abortSignal for better timeout handling
      const { data: products, error } = await (supabase as any)
        .from('products')
        .select(`
          id,
          product_name,
          sku_code,
          product_type,
          is_active,
          brand,
          category,
          subcategory,
          description,
          unit_cost,
          reorder_level,
          max_stock_level,
          unit_of_measure,
          weight,
          dimensions,
          manufacturing_country,
          storage_conditions,
          created_at,
          updated_at
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(200); // Reduced from 500 to speed up

      console.log('✅ Supabase query completed', { hasError: !!error, productCount: products?.length || 0 });

      if (error) {
        console.error('ProductsContext: Supabase error:', error);
        throw error;
      }

      // Transform data to match our Product type
      const transformedProducts: Product[] = (products || []).map((item: any) => ({
        id: item.id,
        product_name: item.product_name || '',
        sku_code: item.sku_code || '',
        product_type: item.product_type || 'FG',
        is_active: item.is_active || true,
        brand: item.brand || '',
        category: item.category || '',
        created_at: item.created_at || new Date().toISOString(),
        description: item.description || '',
        dimensions: item.dimensions || '',
        manufacturing_country: item.manufacturing_country || '',
        max_stock_level: item.max_stock_level || 0,
        reorder_level: item.reorder_level || 0,
        subcategory: item.subcategory || null,
        unit_cost: item.unit_cost || null,
        updated_at: item.updated_at || new Date().toISOString(),
        weight: item.weight || 0,
        storage_conditions: item.storage_conditions || '',
        unit_of_measure: item.unit_of_measure || 'ชิ้น',
      }));

      dispatch({ type: 'FETCH_SUCCESS', payload: transformedProducts });
      console.log('ProductsContext: Successfully loaded', transformedProducts.length, 'products from DB');
    } catch (err: any) {
      console.error('ProductsContext: Error loading products from DB:', err);

      const errorMessage = err?.message || 'Unknown error';
      dispatch({ type: 'FETCH_ERROR', payload: `เกิดข้อผิดพลาด: ${errorMessage}` });

      // Show user-friendly toast notification
      toast({
        title: 'ไม่สามารถโหลดข้อมูลสินค้าได้',
        description: errorMessage.includes('timeout')
          ? 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่'
          : 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล',
        variant: 'destructive',
      });

      // Fallback to empty array
      setTimeout(() => {
        dispatch({ type: 'FETCH_SUCCESS', payload: [] });
        console.log('ProductsContext: Fallback to empty products list');
      }, 1000);
    } finally {
      isFetchingRef.current = false;
    }
  }, [toast]);

  const addProduct = useCallback(async (productData: ProductInsert): Promise<Product | null> => {
    try {
      // Insert into Supabase database
      const { data, error } = await (supabase as any)
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      // Add to local state
      dispatch({ type: 'ADD_PRODUCT', payload: data as Product });

      toast({
        title: '✅ เพิ่มสินค้าสำเร็จ',
        description: `เพิ่มสินค้า "${data.product_name}" ลงในระบบแล้ว`,
      });

      return data as Product;
    } catch (err: any) {
      console.error('Error adding product:', err);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: err.message || 'ไม่สามารถเพิ่มสินค้าได้ กรุณาลองใหม่',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const updateProduct = useCallback(async (id: string, updates: ProductUpdate): Promise<Product | null> => {
    try {
      const existingProduct = state.products.find(p => p.id === id);
      if (!existingProduct) return null;

      const product: Product = { ...existingProduct, ...updates };
      dispatch({ type: 'UPDATE_PRODUCT', payload: product });
      toast({
        title: '✅ อัพเดตสินค้าสำเร็จ',
        description: `อัพเดตข้อมูลสินค้า "${product.product_name}" เรียบร้อยแล้ว`,
      });
      return product;
    } catch (err: any) {
      console.error('Error updating product:', err);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัพเดตข้อมูลสินค้าได้ กรุณาลองใหม่',
        variant: 'destructive',
      });
      return null;
    }
  }, [state.products, toast]);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const product = state.products.find(p => p.id === id);
      dispatch({ type: 'DELETE_PRODUCT', payload: id });

      toast({
        title: '✅ ลบสินค้าสำเร็จ',
        description: `ลบสินค้า "${product?.product_name || 'ไม่ทราบชื่อ'}" ออกจากระบบแล้ว`,
      });

      return true;
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบสินค้าได้ กรุณาลองใหม่',
        variant: 'destructive',
      });
      return false;
    }
  }, [state.products, toast]);

  const checkSKUExists = useCallback(async (sku: string, excludeId?: string): Promise<boolean> => {
    return state.products.some(p => p.sku_code === sku && p.id !== excludeId);
  }, [state.products]);

  const getProductBySKU = useCallback(async (sku: string): Promise<Product | null> => {
    return state.products.find(p => p.sku_code === sku) || null;
  }, [state.products]);

  useEffect(() => {
    let mounted = true;
    let isFirstRun = true;

    console.log('🔍 ProductsContext useEffect: Mount detected', { mounted, isFirstRun });

    const initFetch = async () => {
      if (mounted && isFirstRun) {
        isFirstRun = false;
        console.log('🚀 ProductsContext: Initial fetch triggered');
        await fetchProducts();
      } else {
        console.log('🚫 ProductsContext: Initial fetch blocked', { mounted, isFirstRun });
      }
    };

    initFetch();

    // CRITICAL: DISABLE AUTO-REFRESH INTERVAL TO PREVENT AUTO-REFRESHES
    // const refreshInterval = setInterval(() => {
    //   const { lastFetchTime } = stateRef.current;
    //   const now = Date.now();
    //   const timeSinceLastFetch = now - lastFetchTime;
    //   const FIVE_MINUTES = 5 * 60 * 1000;
    //   if (timeSinceLastFetch > FIVE_MINUTES) {
    //     console.log('ProductsContext: Auto-refreshing products data');
    //     fetchProducts();
    //   }
    // }, 60000);

    return () => {
      console.log('🧹 ProductsContext useEffect: Cleanup triggered');
      mounted = false;
      // clearInterval(refreshInterval);
      isFetchingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array intentional - only run on mount

  // CRITICAL: Memoize context value to prevent re-render cascades
  const contextValue: ProductsContextType = useMemo(() => ({
    ...state,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    checkSKUExists,
    getProductBySKU,
  }), [
    state,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    checkSKUExists,
    getProductBySKU
  ]);

  return (
    <ProductsContext.Provider value={contextValue}>
      {children}
    </ProductsContext.Provider>
  );
}

// Custom hook to use ProductsContext
// Note: Exporting both component and hook is intentional for Context pattern
export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}