import type { Database } from '@/integrations/supabase/types';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];

export interface ExportData {
  sku_code: string;
  product_name: string;
  row: string;
  level: number;
  position: number;
  location: string;
  lot: string;
  mfd: string;
  quantity_boxes: number;
  quantity_loose: number;
  total_quantity: number;
  created_at: string;
  updated_at: string;
}

export const formatInventoryForExport = (items: InventoryItem[]): ExportData[] => {
  return items.map(item => {
    const locationParts = item.location.split('/');
    const row = locationParts[0] || '';
    const level = parseInt(locationParts[1]) || 0;
    const position = parseInt(locationParts[2]) || 0;

    // Use multi-level system if available, fallback to legacy
    const extendedItem = item as any;
    const level1Qty = extendedItem.unit_level1_quantity || 0;
    const level2Qty = extendedItem.unit_level2_quantity || 0;
    const level3Qty = extendedItem.unit_level3_quantity || 0;
    const level1Rate = extendedItem.unit_level1_rate || 0;
    const level2Rate = extendedItem.unit_level2_rate || 0;

    let quantity_boxes = 0;
    let quantity_loose = 0;
    let total_quantity = 0;

    if (level1Qty > 0 || level2Qty > 0 || level3Qty > 0) {
      // Use multi-level data
      quantity_boxes = level1Qty + level2Qty; // Combined higher levels as "boxes"
      quantity_loose = level3Qty;

      // Calculate total with conversion if rates available
      if (level1Rate > 0 || level2Rate > 0) {
        total_quantity = (level1Qty * level1Rate) + (level2Qty * level2Rate) + level3Qty;
      } else {
        total_quantity = level1Qty + level2Qty + level3Qty;
      }
    } else {
      // Fallback to legacy data
      quantity_boxes = extendedItem.carton_quantity_legacy || 0;
      quantity_loose = extendedItem.box_quantity_legacy || 0;
      total_quantity = quantity_boxes + quantity_loose;
    }

    return {
      sku_code: item.sku,
      product_name: item.product_name,
      row: row,
      level: level,
      position: position,
      location: item.location,
      lot: item.lot || '',
      mfd: item.mfd || '',
      quantity_boxes,
      quantity_loose,
      total_quantity,
      created_at: new Date(item.created_at).toLocaleString('th-TH'),
      updated_at: new Date(item.updated_at).toLocaleString('th-TH')
    };
  });
};

export const exportToCSV = (data: ExportData[], filename: string = 'inventory_export') => {
  // Define CSV headers in Thai
  const headers = [
    'รหัส SKU',
    'ชื่อสินค้า',
    'แถว',
    'ชั้น',
    'ตำแหน่ง',
    'Location (Full)',
    'LOT',
    'วันที่ผลิต (MFD)',
    'จำนวนลัง',
    'จำนวนเศษ',
    'จำนวนรวม',
    'วันที่สร้าง',
    'วันที่อัพเดท'
  ];

  // Convert data to CSV format
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      `"${row.sku_code}"`,
      `"${row.product_name}"`,
      `"${row.row}"`,
      row.level,
      row.position,
      `"${row.location}"`,
      `"${row.lot}"`,
      `"${row.mfd}"`,
      row.quantity_boxes,
      row.quantity_loose,
      row.total_quantity,
      `"${row.created_at}"`,
      `"${row.updated_at}"`
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob(['\ufeff' + csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export const exportInventoryToCSV = (items: InventoryItem[], filename?: string) => {
  const exportData = formatInventoryForExport(items);
  exportToCSV(exportData, filename || 'warehouse_inventory');
};

// Export summary by location
export const exportLocationSummary = (items: InventoryItem[]) => {
  const locationSummary = items.reduce((acc, item) => {
    const key = item.location;
    if (!acc[key]) {
      acc[key] = {
        location: item.location,
        items_count: 0,
        total_boxes: 0,
        total_loose: 0,
        products: [] as string[]
      };
    }

    acc[key].items_count += 1;

    // Use multi-level system if available, fallback to legacy
    const extendedItem = item as any;
    const level1Qty = extendedItem.unit_level1_quantity || 0;
    const level2Qty = extendedItem.unit_level2_quantity || 0;
    const level3Qty = extendedItem.unit_level3_quantity || 0;

    if (level1Qty > 0 || level2Qty > 0 || level3Qty > 0) {
      acc[key].total_boxes += level1Qty + level2Qty;
      acc[key].total_loose += level3Qty;
    } else {
      acc[key].total_boxes += extendedItem.carton_quantity_legacy || 0;
      acc[key].total_loose += extendedItem.box_quantity_legacy || 0;
    }

    acc[key].products.push(item.product_name);

    return acc;
  }, {} as Record<string, any>);

  const summaryData = Object.values(locationSummary).map((summary: any) => ({
    location: summary.location,
    items_count: summary.items_count,
    total_boxes: summary.total_boxes,
    total_loose: summary.total_loose,
    total_quantity: summary.total_boxes + summary.total_loose,
    products: summary.products.join('; ')
  }));

  const headers = [
    'ตำแหน่ง',
    'จำนวนรายการ',
    'จำนวนลังรวม',
    'จำนวนเศษรวม',
    'จำนวนรวมทั้งหมด',
    'รายการสินค้า'
  ];

  const csvContent = [
    headers.join(','),
    ...summaryData.map(row => [
      `"${row.location}"`,
      row.items_count,
      row.total_boxes,
      row.total_loose,
      row.total_quantity,
      `"${row.products}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `location_summary_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// Export ProductSummary data interface
export interface ProductSummaryExportData {
  sku_code: string;
  product_name: string;
  product_type: string;
  category: string;
  brand: string;
  total_cartons: number;
  total_pieces: number;
  stock_status: string;
  location_count: number;
  unit_level1_name: string;
  unit_level2_name: string;
  unit_level3_name: string;
  last_updated: string;
}

// Import ProductSummary type
import type { ProductSummary } from '@/hooks/useProductsSummary';

export const formatProductSummaryForExport = (products: ProductSummary[]): ProductSummaryExportData[] => {
  return products.map(product => ({
    sku_code: product.sku || '',
    product_name: product.product_name || '',
    product_type: product.product_type || '',
    category: product.category || '',
    brand: product.brand || '',
    total_cartons: product.total_level1_quantity || 0,
    total_pieces: product.total_pieces || 0,
    stock_status: getStockStatusLabel(product.stock_status),
    location_count: product.location_count || 0,
    unit_level1_name: product.unit_level1_name || 'ลัง',
    unit_level2_name: product.unit_level2_name || 'กล่อง',
    unit_level3_name: product.unit_level3_name || 'ชิ้น',
    last_updated: product.last_updated ? new Date(product.last_updated).toLocaleString('th-TH') : new Date().toLocaleString('th-TH')
  }));
};

export const exportProductSummaryToCSV = (products: ProductSummary[], filename: string = 'products_summary') => {
  const exportData = formatProductSummaryForExport(products);

  // Define CSV headers in Thai
  const headers = [
    'รหัส SKU',
    'ชื่อสินค้า',
    'ประเภทสินค้า',
    'หมวดหมู่',
    'แบรนด์',
    'จำนวนลัง',
    'จำนวนชิ้นรวม',
    'สถานะสต็อก',
    'จำนวนตำแหน่ง',
    'หน่วยลัง',
    'หน่วยกล่อง',
    'หน่วยชิ้น',
    'อัปเดตล่าสุด'
  ];

  // Convert data to CSV format
  const csvContent = [
    headers.join(','),
    ...exportData.map(row => [
      `"${row.sku_code}"`,
      `"${row.product_name}"`,
      `"${row.product_type}"`,
      `"${row.category}"`,
      `"${row.brand}"`,
      row.total_cartons,
      row.total_pieces,
      `"${row.stock_status}"`,
      row.location_count,
      `"${row.unit_level1_name}"`,
      `"${row.unit_level2_name}"`,
      `"${row.unit_level3_name}"`,
      `"${row.last_updated}"`
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob(['\ufeff' + csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// Helper function to convert stock status to Thai
function getStockStatusLabel(status: string): string {
  switch (status) {
    case 'out_of_stock':
      return 'หมดสต็อก';
    case 'low_stock':
      return 'สต็อกต่ำ';
    case 'medium_stock':
      return 'สต็อกปานกลาง';
    case 'high_stock':
      return 'สต็อกสูง';
    default:
      return 'ไม่ทราบ';
  }
};