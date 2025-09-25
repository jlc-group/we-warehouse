import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(productsReducer, initialState);
  const isFetchingRef = useRef<boolean>(false);
  const stateRef = useRef(state);
  const { toast } = useToast();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchProducts = useCallback(async (force = false) => {
    try {
      isFetchingRef.current = true;
      dispatch({ type: 'FETCH_START' });

      // Mock data
      const mockProducts: Product[] = [
        {
          id: '1',
          product_name: 'ยาตัวอย่าง 1',
          sku_code: 'MED001',
          product_type: 'FG',
          is_active: true,
          brand: 'Brand A',
          category: 'Medicines',
          created_at: new Date().toISOString(),
          description: 'ยาตัวอย่างสำหรับการทดสอบ',
          dimensions: '10x5x2 cm',
          manufacturing_country: 'Thailand',
          max_stock_level: 100,
          reorder_level: 10,
          subcategory: null,
          unit_cost: 50,
          updated_at: new Date().toISOString(),
          weight: 0.1,
          storage_conditions: 'อุณหภูมิห้อง',
          unit_of_measure: 'ชิ้น',
        },
        {
          id: '2',
          product_name: 'อุปกรณ์ทางการแพทย์ 1',
          sku_code: 'DEV001',
          product_type: 'PK',
          is_active: true,
          brand: 'Brand B',
          category: 'Devices',
          created_at: new Date().toISOString(),
          description: 'อุปกรณ์ทางการแพทย์สำหรับการทดสอบ',
          dimensions: '15x10x5 cm',
          manufacturing_country: 'Thailand',
          max_stock_level: 50,
          reorder_level: 5,
          subcategory: null,
          unit_cost: 150,
          updated_at: new Date().toISOString(),
          weight: 0.5,
          storage_conditions: 'อุณหภูมิห้อง',
          unit_of_measure: 'ชิ้น',
        },
      ];
      
      dispatch({ type: 'FETCH_SUCCESS', payload: mockProducts });
      console.log('ProductsContext: Successfully loaded', mockProducts.length, 'products');
    } catch (err: any) {
      console.error('ProductsContext: Error loading products:', err);
      dispatch({ type: 'FETCH_ERROR', payload: 'Unable to load products.' });
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const addProduct = async (productData: ProductInsert): Promise<Product | null> => {
    try {
      const product: Product = {
        id: Date.now().toString(),
        ...productData,
      };
      
      dispatch({ type: 'ADD_PRODUCT', payload: product });
      toast({
        title: '✅ เพิ่มสินค้าสำเร็จ',
        description: `เพิ่มสินค้า "${product.product_name}" ลงในระบบแล้ว`,
      });
      return product;
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
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
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
  };

  const checkSKUExists = async (sku: string, excludeId?: string): Promise<boolean> => {
    return state.products.some(p => p.sku_code === sku && p.id !== excludeId);
  };

  const getProductBySKU = async (sku: string): Promise<Product | null> => {
    return state.products.find(p => p.sku_code === sku) || null;
  };

  useEffect(() => {
    fetchProducts();

    const refreshInterval = setInterval(() => {
      const { lastFetchTime } = stateRef.current;
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime;
      const FIVE_MINUTES = 5 * 60 * 1000;

      if (timeSinceLastFetch > FIVE_MINUTES) {
        console.log('ProductsContext: Auto-refreshing products data');
        fetchProducts();
      }
    }, 60000);

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