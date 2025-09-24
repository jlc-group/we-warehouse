import type { Database } from '@/integrations/supabase/types';
import { PRODUCT_NAME_MAPPING } from '@/data/sampleInventory';

type Product = Database['public']['Tables']['products']['Row'];

// Helper functions for product data management
export const productHelpers = {
  /**
   * Get product by SKU code from database products
   */
  getProductBySkuCode(products: Product[], skuCode: string): Product | null {
    if (!skuCode?.trim()) return null;

    return products.find(
      product => product.sku_code.toLowerCase() === skuCode.toLowerCase()
    ) || null;
  },

  /**
   * Get product display name - prioritize database over mapping
   */
  getProductDisplayName(products: Product[], skuCode: string): string {
    if (!skuCode?.trim()) return '';

    // Try to get from database first
    const dbProduct = this.getProductBySkuCode(products, skuCode);
    if (dbProduct?.product_name) {
      return dbProduct.product_name;
    }

    // Fallback to mapping
    return PRODUCT_NAME_MAPPING[skuCode.toUpperCase()] || '';
  },

  /**
   * Get all available product codes from database and mapping combined
   */
  getAllProductCodes(products: Product[], productType?: string): string[] {
    // Get codes from database (prioritize database over mapping)
    let dbCodes = products.map(p => p.sku_code);

    // Filter by product type if specified
    if (productType) {
      dbCodes = products
        .filter(p => p.product_type === productType)
        .map(p => p.sku_code);
    }

    // Get codes from mapping as fallback (only if not filtering by type)
    const mappingCodes = productType ? [] : Object.keys(PRODUCT_NAME_MAPPING);

    // Combine and deduplicate, prioritizing database codes
    const allCodes = [...new Set([...dbCodes, ...mappingCodes])];
    return allCodes.sort();
  },

  /**
   * Filter products based on search query
   */
  filterProducts(products: Product[], searchQuery: string, productType?: string): Product[] {
    if (!searchQuery?.trim()) {
      return productType
        ? products.filter(p => p.product_type === productType)
        : products;
    }

    const query = searchQuery.toLowerCase();

    let filtered = products.filter(product => {
      const matchesSku = product.sku_code.toLowerCase().includes(query);
      const matchesName = product.product_name?.toLowerCase().includes(query);
      const matchesCategory = product.category?.toLowerCase().includes(query);
      const matchesBrand = product.brand?.toLowerCase().includes(query);

      // Also check mapping for additional matches
      const mappedName = PRODUCT_NAME_MAPPING[product.sku_code]?.toLowerCase();
      const matchesMapping = mappedName?.includes(query);

      return matchesSku || matchesName || matchesCategory || matchesBrand || matchesMapping;
    });

    // Filter by product type if specified
    if (productType) {
      filtered = filtered.filter(p => p.product_type === productType);
    }

    return filtered;
  },

  /**
   * Get product codes that match search query
   */
  getFilteredProductCodes(products: Product[], searchQuery: string, productType?: string): string[] {
    if (!searchQuery?.trim()) {
      return this.getAllProductCodes(products, productType);
    }

    const filteredProducts = this.filterProducts(products, searchQuery, productType);
    const dbCodes = filteredProducts.map(p => p.sku_code);

    // Include mapping codes only if not filtering by product type
    const query = searchQuery.toLowerCase();
    const mappingCodes = productType ? [] : Object.keys(PRODUCT_NAME_MAPPING).filter(code => {
      const name = PRODUCT_NAME_MAPPING[code]?.toLowerCase();
      return code.toLowerCase().includes(query) || name?.includes(query);
    });

    const allCodes = [...new Set([...dbCodes, ...mappingCodes])];
    return allCodes.sort();
  },

  /**
   * Check if product code exists in database or mapping
   */
  productExists(products: Product[], skuCode: string): boolean {
    if (!skuCode?.trim()) return false;

    const existsInDb = this.getProductBySkuCode(products, skuCode) !== null;
    const existsInMapping = !!PRODUCT_NAME_MAPPING[skuCode.toUpperCase()];

    return existsInDb || existsInMapping;
  },

  /**
   * Check if product is new (not in database or mapping)
   */
  isNewProduct(products: Product[], skuCode: string): boolean {
    return !this.productExists(products, skuCode);
  },

  /**
   * Get product display info for UI
   */
  getProductDisplayInfo(products: Product[], skuCode: string): {
    code: string;
    name: string;
    type?: string;
    category?: string;
    brand?: string;
    source: 'database' | 'mapping' | 'unknown';
  } {
    if (!skuCode?.trim()) {
      return {
        code: '',
        name: '',
        source: 'unknown'
      };
    }

    // Try database first
    const dbProduct = this.getProductBySkuCode(products, skuCode);
    if (dbProduct) {
      return {
        code: dbProduct.sku_code,
        name: dbProduct.product_name || '',
        type: dbProduct.product_type || undefined,
        category: dbProduct.category || undefined,
        brand: dbProduct.brand || undefined,
        source: 'database'
      };
    }

    // Try mapping
    const mappedName = PRODUCT_NAME_MAPPING[skuCode.toUpperCase()];
    if (mappedName) {
      return {
        code: skuCode.toUpperCase(),
        name: mappedName,
        source: 'mapping'
      };
    }

    return {
      code: skuCode,
      name: '',
      source: 'unknown'
    };
  },

  /**
   * Get product type from database (prioritize over static data)
   */
  getProductType(products: Product[], skuCode: string): string | null {
    if (!skuCode?.trim()) return null;

    const dbProduct = this.getProductBySkuCode(products, skuCode);
    if (dbProduct?.product_type) {
      return dbProduct.product_type;
    }

    return null;
  },

  /**
   * Get products by type from database
   */
  getProductsByType(products: Product[], productType: string): Product[] {
    return products.filter(p => p.product_type === productType);
  },

  /**
   * Get available product types from database
   */
  getAvailableProductTypes(products: Product[]): string[] {
    const types = [...new Set(products.map(p => p.product_type).filter(Boolean))];
    return types.sort();
  },

  /**
   * Check if product type exists in database
   */
  isValidProductType(products: Product[], productType: string): boolean {
    return products.some(p => p.product_type === productType);
  }
};