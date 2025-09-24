import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { performanceMonitor } from '@/utils/performanceMonitor';
import type { Database } from '@/integrations/supabase/types';
import { secureGatewayClient } from '@/utils/secureGatewayClient';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

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

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(productsReducer, initialState);
  const isFetchingRef = useRef<boolean>(false);
  const stateRef = useRef(state);
  const { toast } = useToast();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchProducts = useCallback(async (force = false) => {
    const endpoint = 'products-fetch';

    // Rate limiting check
    if (!performanceMonitor.shouldAllowRequest(endpoint)) {
      return;
    }

    // Prevent concurrent requests
    if (isFetchingRef.current && !force) {
      return;
    }

    // Cache check: Don't fetch if data is fresh (within 30 seconds)
    const { lastFetchTime, products } = stateRef.current;
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    if (!force && timeSinceLastFetch < 30000 && products.length > 0) {
      return;
    }

    const startTime = performance.now();
    let success = false;

    try {
      isFetchingRef.current = true;
      dispatch({ type: 'FETCH_START' });

      const response = await secureGatewayClient.get<Product[]>('products');

      // Transform data to match Product type - handle optional fields safely
      const transformedData = (response.data ?? []).map(item => ({
        ...item,
        dimensions: (item as any).dimensions || null,
        manufacturing_country: (item as any).manufacturing_country || 'Thailand',
        max_stock_level: (item as any).max_stock_level || 100,
        reorder_level: (item as any).reorder_level || 10,
        subcategory: item.subcategory || null,
        unit_cost: (item as any).unit_cost || null,
        weight: (item as any).weight || null,
        storage_conditions: (item as any).storage_conditions || 'อุณหภูมิห้อง'
      }));
      
      dispatch({ type: 'FETCH_SUCCESS', payload: transformedData });
      success = true;
      console.log('ProductsContext: Successfully loaded', response.data?.length || 0, 'products');
    } catch (err: any) {
      // Don't show error if request was aborted
      if (err.name === 'AbortError') {
        return;
      }

      console.error('ProductsContext: Error loading products (fallback handled by secureGatewayClient):', {
        error: err,
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint
      });

      // Show user-friendly message since fallback should have been attempted
      dispatch({ type: 'FETCH_ERROR', payload: 'Unable to load products. Please check your connection and try again.' });
    } finally {
      const duration = performance.now() - startTime;
      performanceMonitor.logRequest(endpoint, duration, success);
      isFetchingRef.current = false;
    }
  }, []);

  const addProduct = async (productData: ProductInsert): Promise<Product | null> => {
    try {
      const response = await secureGatewayClient.mutate<Product>('createProduct', productData);

      if (response.data) {
        const product = response.data as Product;
        dispatch({ type: 'ADD_PRODUCT', payload: product });
        toast({
          title: '✅ เพิ่มสินค้าสำเร็จ',
          description: `เพิ่มสินค้า "${product.product_name}" ลงในระบบแล้ว`,
        });
        return product;
      }

      return null;
    } catch (err: any) {
      console.error('Error adding product:', err);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเพิ่มสินค้าได้ กรุณาลองใหม่',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateProduct = async (id: string, updates: ProductUpdate): Promise<Product | null> => {
    try {
      const response = await secureGatewayClient.mutate<Product>('updateProduct', { id, updates });

      if (response.data) {
        const product = response.data as Product;
        dispatch({ type: 'UPDATE_PRODUCT', payload: product });
        toast({
          title: '✅ อัพเดตสินค้าสำเร็จ',
          description: `อัพเดตข้อมูลสินค้า "${product.product_name}" เรียบร้อยแล้ว`,
        });
        return product;
      }

      return null;
    } catch (err: any) {
      console.error('Error updating product:', err);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัพเดตข้อมูลสินค้าได้ กรุณาลองใหม่',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      // Get product info before deletion for toast message
      const product = state.products.find(p => p.id === id);

      await secureGatewayClient.delete('products', { id });

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
  };

  const checkSKUExists = async (sku: string, excludeId?: string): Promise<boolean> => {
    try {
      const response = await secureGatewayClient.get<{ exists: boolean }>('skuExists', {
        sku,
        excludeId,
      });

      return response.data?.exists ?? false;
    } catch (err: any) {
      return false;
    }
  };

  const getProductBySKU = async (sku: string): Promise<Product | null> => {
    try {
      const response = await secureGatewayClient.get<Product>('productBySku', { sku });

      return response.data ?? null;
    } catch (err: any) {
      return null;
    }
  };

  // Fetch products once when provider mounts and setup auto-refresh
  useEffect(() => {
    fetchProducts();

    // Auto-refresh every 5 minutes if data is stale
    const refreshInterval = setInterval(() => {
      const { lastFetchTime } = stateRef.current;
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime;
      const FIVE_MINUTES = 5 * 60 * 1000;

      if (timeSinceLastFetch > FIVE_MINUTES) {
        console.log('ProductsContext: Auto-refreshing products data');
        fetchProducts();
      }
    }, 60000); // Check every minute

    // Cleanup function
    return () => {
      clearInterval(refreshInterval);
      isFetchingRef.current = false;
    };
  }, [fetchProducts]);

  const contextValue: ProductsContextType = {
    ...state,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    checkSKUExists,
    getProductBySKU,
  };

  return (
    <ProductsContext.Provider value={contextValue}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}