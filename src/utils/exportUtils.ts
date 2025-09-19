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

    return {
      sku_code: item.sku,
      product_name: item.product_name,
      row: row,
      level: level,
      position: position,
      location: item.location,
      lot: item.lot || '',
      mfd: item.mfd || '',
      quantity_boxes: (item as any).carton_quantity_legacy || 0,
      quantity_loose: (item as any).box_quantity_legacy || 0,
      total_quantity: ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0),
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

export const exportInventoryToCSV = (items: InventoryItem[]) => {
  const exportData = formatInventoryForExport(items);
  exportToCSV(exportData, 'warehouse_inventory');
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
    acc[key].total_boxes += ((item as any).carton_quantity_legacy || 0);
    acc[key].total_loose += ((item as any).box_quantity_legacy || 0);
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