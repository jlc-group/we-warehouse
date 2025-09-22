import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { performanceMonitor } from '@/utils/performanceMonitor';
import type { Database } from '@/integrations/supabase/types';

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const { toast } = useToast();

  const fetchProducts = async (force = false) => {
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
    const now = Date.now();
    const timeSinceLastFetch = now - state.lastFetchTime;
    if (!force && timeSinceLastFetch < 30000 && state.products.length > 0) {
      return;
    }

    const startTime = performance.now();
    let success = false;

    try {
      isFetchingRef.current = true;
      dispatch({ type: 'FETCH_START' });

      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(abortControllerRef.current.signal);

      if (error) {
        throw error;
      }

      dispatch({ type: 'FETCH_SUCCESS', payload: data || [] });
      success = true;
    } catch (err: any) {
      // Don't show error if request was aborted
      if (err.name === 'AbortError') {
        return;
      }

      dispatch({ type: 'FETCH_ERROR', payload: err.message });
    } finally {
      const duration = performance.now() - startTime;
      performanceMonitor.logRequest(endpoint, duration, success);
      isFetchingRef.current = false;
    }
  };

  const addProduct = async (productData: ProductInsert): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        dispatch({ type: 'ADD_PRODUCT', payload: data });
        toast({
          title: '✅ เพิ่มสินค้าสำเร็จ',
          description: `เพิ่มสินค้า "${data.product_name}" ลงในระบบแล้ว`,
        });
        return data;
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
      const { data, error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        dispatch({ type: 'UPDATE_PRODUCT', payload: data });
        toast({
          title: '✅ อัพเดตสินค้าสำเร็จ',
          description: `อัพเดตข้อมูลสินค้า "${data.product_name}" เรียบร้อยแล้ว`,
        });
        return data;
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

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

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
      // Create separate AbortController for this operation
      const checkController = new AbortController();
      const timeoutId = setTimeout(() => checkController.abort(), 5000); // 5 second timeout

      try {
        let query = supabase
          .from('products')
          .select('id')
          .eq('sku_code', sku)
          .abortSignal(checkController.signal);

        if (excludeId) {
          query = query.neq('id', excludeId);
        }

        const { data, error } = await query;
        clearTimeout(timeoutId);

        if (error) {
          throw error;
        }

        return (data && data.length > 0);
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          return false; // Treat timeout as "not exists"
        }
        throw err;
      }
    } catch (err: any) {
      return false;
    }
  };

  const getProductBySKU = async (sku: string): Promise<Product | null> => {
    try {
      // Create separate AbortController for this operation
      const getController = new AbortController();
      const timeoutId = setTimeout(() => getController.abort(), 5000); // 5 second timeout

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('sku_code', sku)
          .abortSignal(getController.signal)
          .single();

        clearTimeout(timeoutId);

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        return data || null;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          return null; // Treat timeout as "not found"
        }
        throw err;
      }
    } catch (err: any) {
      return null;
    }
  };

  // Fetch products once when provider mounts
  useEffect(() => {
    fetchProducts();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      isFetchingRef.current = false;
    };
  }, []); // Empty dependency array - only fetch once

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