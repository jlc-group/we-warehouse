import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useProducts } from '@/contexts/ProductsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Package,
  MapPin,
  Plus,
  Truck,
  QrCode,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Grid3X3,
  Monitor,
  Settings,
  Palette,
  Filter,
  X,
  Search,
  Send,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { ShelfGrid } from './ShelfGrid';
import { MonitorDashboardSimple } from './MonitorDashboardSimple';
import { SKUDisplay, SKUGrid } from './SKUDisplay';
import { LotBadge, LotGroup } from './LotBadge';
import type { InventoryItem } from '@/hooks/useInventory';
import { useLocationQR } from '@/hooks/useLocationQR';
import { useToast } from '@/hooks/use-toast';
import { normalizeLocation, displayLocation } from '@/utils/locationUtils';
import { supabase } from '@/integrations/supabase/client';
import { ProductTypeBadge, ProductTypeFilter } from '@/components/ProductTypeBadge';
import { getProductType } from '@/data/sampleInventory';

interface EnhancedOverviewProps {
  items: InventoryItem[];
  warehouseId?: string;
  onShelfClick: (location: string, item?: InventoryItem) => void;
  onAddItem: () => void;
  onTransferItem: () => void;
  onWarehouseTransfer: (items: any) => void;
  onExportItem: (id: string, cartonQty: number, boxQty: number, looseQty: number, destination: string, notes?: string) => Promise<void>;
  onScanQR: () => void;
  onBulkExport?: () => void;
  loading?: boolean;
}

interface ActivityItem {
  id: string;
  type: 'add' | 'update' | 'transfer' | 'remove';
  location: string;
  description: string;
  timestamp: Date;
}

// CRITICAL: Memoized component to prevent unnecessary re-renders
export const EnhancedOverview = memo(({
  items,
  warehouseId,
  onShelfClick,
  onAddItem,
  onTransferItem,
  onWarehouseTransfer,
  onExportItem,
  onScanQR,
  onBulkExport,
  loading = false
}: EnhancedOverviewProps) => {
  const { toast } = useToast();
  const { products: productsFromContext, loading: productsLoading } = useProducts();
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [viewMode, setViewMode] = useState<'work' | 'monitor'>('work');
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [selectedMfds, setSelectedMfds] = useState<string[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeProductTypeFilter, setActiveProductTypeFilter] = useState<string[]>([]);
  const [customRows, setCustomRows] = useState<string[]>([]);
  const [newRowName, setNewRowName] = useState('');
  const [showAddRowDialog, setShowAddRowDialog] = useState(false);
  const [rowGroups, setRowGroups] = useState<{[key: string]: {name: string, color: string, rows: string[]}}>({});
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedItemForExport, setSelectedItemForExport] = useState<InventoryItem | null>(null);
  const [selectedSkuForExport, setSelectedSkuForExport] = useState('');
  const [selectedLocationForExport, setSelectedLocationForExport] = useState('');
  const [exportDestination, setExportDestination] = useState('');
  const [exportCartonQty, setExportCartonQty] = useState(0);
  const [exportBoxQty, setExportBoxQty] = useState(0);
  const [exportLooseQty, setExportLooseQty] = useState(0);
  const [exportNotes, setExportNotes] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedRowsForGroup, setSelectedRowsForGroup] = useState<string[]>([]);
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [showSkuResults, setShowSkuResults] = useState(false);
  const [products, setProducts] = useState<Array<{sku_code: string, product_type: string, category: string | null}>>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Group items by SKU for export selection
  const skuOptions = useMemo(() => {
    const grouped = new Map<string, {
      sku: string;
      productName: string;
      items: InventoryItem[];
      totalCarton: number;
      totalBox: number;
      totalLoose: number;
    }>();

    items.forEach(item => {
      const sku = item.sku || 'N/A';
      const existing = grouped.get(sku) || {
        sku,
        productName: item.product_name || 'Unknown Product',
        items: [],
        totalCarton: 0,
        totalBox: 0,
        totalLoose: 0
      };

      existing.items.push(item);
      existing.totalCarton += Number(item.unit_level1_quantity) || 0;
      existing.totalBox += Number(item.unit_level2_quantity) || 0;
      existing.totalLoose += Number(item.unit_level3_quantity) || 0;

      grouped.set(sku, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => a.sku.localeCompare(b.sku));
  }, [items]);

  // Get location options for selected SKU
  const locationOptionsForSku = useMemo(() => {
    if (!selectedSkuForExport) return [];

    const skuData = skuOptions.find(opt => opt.sku === selectedSkuForExport);
    if (!skuData) return [];

    const locationMap = new Map<string, {
      location: string;
      items: InventoryItem[];
      totalCarton: number;
      totalBox: number;
      totalLoose: number;
    }>();

    skuData.items.forEach(item => {
      const existing = locationMap.get(item.location) || {
        location: item.location,
        items: [],
        totalCarton: 0,
        totalBox: 0,
        totalLoose: 0
      };

      existing.items.push(item);
      existing.totalCarton += item.unit_level1_quantity || 0;
      existing.totalBox += item.unit_level2_quantity || 0;
      existing.totalLoose += item.unit_level3_quantity || 0;

      locationMap.set(item.location, existing);
    });

    return Array.from(locationMap.values()).sort((a, b) => a.location.localeCompare(b.location));
  }, [selectedSkuForExport, skuOptions]);

  // Create products map for filtering
  const productsMap = useMemo(() => {
    const map = new Map<string, {product_type: string, category: string | null}>();
    products.forEach(product => {
      map.set(product.sku_code, {
        product_type: product.product_type,
        category: product.category
      });
    });
    return map;
  }, [products]);

  // Get all available product types
  const allProductTypes = useMemo(() => {
    const types = new Set<string>();
    products.forEach(product => {
      if (product.product_type) {
        types.add(product.product_type);
      }
    });
    return Array.from(types).sort();
  }, [products]);

  // Get all available categories
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    products.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    return Array.from(categories).sort();
  }, [products]);

  const previousItemsRef = useRef<Map<string, InventoryItem>>(new Map());
  const { generateQRForLocation, bulkGenerateQR, getQRByLocation, loading: qrLoading } = useLocationQR();
  const [bulkLoading, setBulkLoading] = useState(false);

  // Helpers for quantity fields across schemas
  const getCartonQty = (item: any) => Number(item.unit_level1_quantity ?? item.carton_quantity_legacy ?? 0) || 0;
  const getBoxQty = (item: any) => Number(item.unit_level2_quantity ?? item.box_quantity_legacy ?? 0) || 0;

  // SKU to Product Name mapping - wrapped in useMemo for performance
  const skuProductMapping = useMemo(() => ({
    'A1-40G': 'จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง',
    'L13-10G': 'จุฬาเฮิร์บ บลูโรส ไวท์เทนนิ่ง อันเดอร์อาร์มครีม10ก',
    'L8A-6G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง',
    'L8B-6G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 6 ก.รุ่นซอง',
    'L8A-30G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 30 ก.รุ่นหลอด',
    'L3-40G': 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 40ก',
    'L7-6G': 'จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 6ก',
    'L4-40G': 'จุฬาเฮิร์บ ลองแกน เมลาสม่า เซรั่ม 40 ก.รุ่นหลอด',
    'L10-7G': 'จุฬาเฮิร์บ วอเตอร์เมลอน 3D ออร่า ซันการ์ด 7ก',
    'L3-8G': 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 8ก',
    'L11-40G': 'จุฬาเฮิร์บ เรด ออเรนจ์ ออร่า ไบรท์ บอดี้ โลชั่น 40ก',
    'L14-40G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า คลีนซิ่ง วิป โฟม 40ก',
    'L4-8G': 'จุฬาเฮิร์บ ลองแกน เมลาสม่า เซรั่ม 8 ก.รุ่นซอง',
    'T6A-10G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ฟีลเตอร์ ฟิต พาวเดอร์ 10ก',
    'T6A-5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ฟีลเตอร์ ฟิต พาวเดอร์ 5ก',
    'L5-15G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ไฮโดร ไวท์ เอสเซนส์ 15 ก.',
    'S3-70G': 'จุฬาเฮิร์บ ลองแกน เมลาสม่า โซฟ 70 กรัม',
    'C4-40G': 'จุฬาเฮิร์บ แบล็ก จิงเจอร์ เคลีย เซรั่ม 40 กรัม',
    'L6-8G': 'จุฬาเฮิร์บ แครอท เอจจิ้ง เพอร์เฟค เซรั่ม 8 ก.',
    'J8-40G': 'จุฬาเฮิร์บ แมงโก้ เซรั่ม',
    'T5A-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป 01 ออล สวีท 2ก',
    'T5B-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป02เบอร์กันดี 2ก',
    'C3-7G': 'จุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ 7 ก.',
    'L6-40G': 'จุฬาเฮิร์บ แครอท เอจจิ้ง เพอร์เฟค เซรั่ม 40 ก.',
    'J3-8G': 'จุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ 7 ก.',
    'L10-30G': 'จุฬาเฮิร์บ วอเตอร์เมลอน 3D ออร่า ซันการ์ด 30ก',
    'C3-30G': 'จุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ 30 ก',
    'C1-6G': 'จุฬาเฮิร์บ คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 6 ก',
    'L9-8G': 'จุฬาเฮิร์บ อโวคาโด มอยส์เจอร์ ครีม 8 ก. รุ่นซอง',
    'C4-8G': 'จุฬาเฮิร์บ แบล็คจิงเจอร์ เคลีย เซรั่ม 8 ก',
    'L8B-30G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 30 ก.หลอด',
    'S1-70G': 'จุฬาเฮิร์บ แมริโกลด์ แอคเน่ โซฟ 70กรัม',
    'C4-35G': 'จุฬาเฮิร์บ แบล็ก จิงเจอร์ เคลีย เซรั่ม 35ก หลอด',
    'S2-70G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า โซฟ 70กรัม',
    'T5A-2.5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป 01 ออล สวีท 2.5ก',
    'L7-30G': 'จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 30 ก ขวด',
    'M2-4G': 'จุฬาเฮิร์บ มาสก์ ลำไยทองคำ 24 ก.',
    'T5B-2.5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป02เบอร์กันดี 2.5ก',
    'A2-40G': 'จุฬาเฮิร์บ วอเตอร์เมลอน สครับ',
    'K3-6G': 'จุฬาเฮิร์บ กลูต้า ไฮยา เซรั่ม',
    'C2-35G': 'จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35ก.',
    'C2-8G': 'จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8 ก. ซอง',
    'T5C-2G': 'จุฬาเฮิร์บวอเตอร์เมลอนแทททูลิป03ลิตเติ้ลดาร์ลิ่ง2ก',
    'C2-40G': 'จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 40ก.',
    'D3-70G': 'จุฬาเฮิร์บ เจเด้นท์ 3 อิน 1 เฮอร์เบิล ไวท์ทูธเพสท์ออริจินัลเฟรช (ใหม่)',
    'D2-70G': 'จุฬาเฮิร์บ เจเด้นท์ทรีเอ็กซ์เอ็กซ์ตร้า แคร์ทูธเพสท์',
    'JDH1-70G': 'จุฬาเฮิร์บ เจเด้นท์ 3 อิน 1 เฮอร์เบิล ไวท์ทูธเพสท์ออริจินัลเฟรช',
    'T5C-2.5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป 01 ลิตเติ้ล ดาร์ลิ่ง 2.5ก',
    'T1-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน เมจิก ลิป ทินท์ 01 โกเด้นท์ควีน 2ก',
    'T2-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน เมจิก ลิป ทินท์ 02 ชูก้าร์ เบบี้ 2ก',
    'T3-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน เมจิก ลิป ทินท์ 03 ซัน ออเรนท์ 2ก'
  }), []);

  // Function to get product name from SKU
  const getProductName = useCallback((sku: string): string => {
    return skuProductMapping[sku] || sku;
  }, [skuProductMapping]);

  // Function to get display name (product name + SKU)
  const getDisplayName = (sku: string): string => {
    const productName = skuProductMapping[sku];
    return productName ? `${productName} - ${sku}` : sku;
  };

  // สร้างสีตาม SKU เฉพาะ (hash-based color generation)
  const getSKUColor = (sku: string) => {
    if (!sku) return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' };

    // สร้าง hash จาก SKU string
    let hash = 0;
    for (let i = 0; i < sku.length; i++) {
      hash = sku.charCodeAt(i) + ((hash << 5) - hash);
    }

    // แปลง hash เป็น HSL สีพาสเทลที่อ่อนกว่า เหมาะสำหรับปริ้น
    const hue = Math.abs(hash % 360);
    const saturation = 35 + (Math.abs(hash >> 8) % 20); // 35-55% (ลดลงจาก 65-90%)
    const lightness = 75 + (Math.abs(hash >> 16) % 15); // 75-90% (เพิ่มขึ้นจาก 45-65%)

    return {
      bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      border: `hsl(${hue}, ${saturation + 15}%, ${lightness - 25}%)`,
      text: '#1f2937' // ใช้สีดำเสมอเพราะพื้นหลังอ่อนแล้ว
    };
  };

  // รายการ SKU ทั้งหมด
  const allSkus = useMemo(() => {
    const skuSet = new Set<string>();
    items.forEach(item => {
      if (item.sku) skuSet.add(item.sku);
    });
    return Array.from(skuSet).sort();
  }, [items]);

  // รายการ SKU ที่ผ่านการค้นหา
  const filteredSkus = useMemo(() => {
    if (!skuSearchQuery.trim()) return allSkus;
    const query = skuSearchQuery.toLowerCase();
    return allSkus.filter(sku => {
      const productName = getProductName(sku).toLowerCase();
      return sku.toLowerCase().includes(query) || productName.includes(query);
    });
  }, [allSkus, skuSearchQuery, getProductName]);

  // รายการแถวทั้งหมด A-Z และแถวที่เพิ่มเติม (ป้องกัน duplicate keys)
  const allRows = useMemo(() => {
    const defaultRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    // ใช้ Set เพื่อรับประกันความเป็น unique และป้องกัน React key duplication
    return [...new Set([...defaultRows, ...customRows])];
  }, [customRows]);

  // รายการ MFD ทั้งหมด
  const allMfds = useMemo(() => {
    const mfdSet = new Set<string>();
    items.forEach(item => {
      if (item.mfd) mfdSet.add(item.mfd);
    });
    return Array.from(mfdSet).sort();
  }, [items]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalItems = items.length;
    const occupiedLocations = new Set(items.map(item => normalizeLocation(item.location))).size;
    const totalQuantity = items.reduce((sum, item) => sum + getCartonQty(item) + getBoxQty(item), 0);

    // Count FG and PK items
    let fgCount = 0;
    let pkCount = 0;
    let unknownCount = 0;

    items.forEach(item => {
      const productType = getProductType(item.sku || '');
      if (productType === 'FG') fgCount++;
      else if (productType === 'PK') pkCount++;
      else unknownCount++;
    });

    return {
      totalItems,
      occupiedLocations,
      totalQuantity,
      availableLocations: 2080 - occupiedLocations, // A-Z (26) * 4 levels * 20 positions
      fgCount,
      pkCount,
      unknownCount
    };
  }, [items]);

  // Load custom rows from localStorage on mount
  useEffect(() => {
    const savedRows = localStorage.getItem('warehouse-custom-rows');
    if (savedRows) {
      try {
        const parsed = JSON.parse(savedRows);
        if (Array.isArray(parsed)) {
          setCustomRows(parsed);
        }
      } catch (error) {
        console.error('Failed to parse saved custom rows:', error);
      }
    }

    // Load row groups
    const savedGroups = localStorage.getItem('warehouse-row-groups');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        if (typeof parsed === 'object') {
          setRowGroups(parsed);
        }
      } catch (error) {
        console.error('Failed to parse saved row groups:', error);
      }
    }
  }, []);

  // Use products data from context for filtering
  useEffect(() => {
    if (productsFromContext && productsFromContext.length > 0) {
      const productsForFiltering = productsFromContext.map(p => ({
        sku_code: p.sku_code,
        product_type: p.product_type,
        category: p.category
      }));
      setProducts(productsForFiltering);
      setProductsLoaded(true);
      console.log('EnhancedOverview: Using products from context:', productsForFiltering.length);
    }
  }, [productsFromContext]);

  // Save custom rows to localStorage when changed
  useEffect(() => {
    if (customRows.length > 0) {
      localStorage.setItem('warehouse-custom-rows', JSON.stringify(customRows));
    }
  }, [customRows, items]);

  // Save row groups to localStorage when changed
  useEffect(() => {
    localStorage.setItem('warehouse-row-groups', JSON.stringify(rowGroups));
  }, [rowGroups, items]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.sku-search-container')) {
        setShowSkuResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to add new row (ป้องกัน duplicate keys)
  const addNewRow = () => {
    const trimmedName = newRowName.trim().toUpperCase();
    const defaultRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    // ตรวจสอบไม่ให้เพิ่มตัวอักษรที่มีอยู่แล้วทั้งใน defaultRows และ customRows
    if (trimmedName &&
        !defaultRows.includes(trimmedName) &&
        !customRows.includes(trimmedName) &&
        trimmedName.length === 1 &&
        /^[A-Z]$/.test(trimmedName)) {
      setCustomRows(prev => [...prev, trimmedName].sort());
      setNewRowName('');
      setShowAddRowDialog(false);
    }
  };

  // Function to create new group
  const createGroup = () => {
    if (newGroupName.trim() && selectedRowsForGroup.length > 0) {
      const groupId = Date.now().toString();
      setRowGroups(prev => ({
        ...prev,
        [groupId]: {
          name: newGroupName.trim(),
          color: newGroupColor,
          rows: selectedRowsForGroup
        }
      }));
      setNewGroupName('');
      setSelectedRowsForGroup([]);
      setNewGroupColor('#3B82F6');
      setShowGroupDialog(false);
    }
  };

  // Function to get group for a row
  const getRowGroup = (row: string) => {
    return Object.entries(rowGroups).find(([, group]) => group.rows.includes(row));
  };

  // Function to remove group
  const removeGroup = (groupId: string) => {
    setRowGroups(prev => {
      const newGroups = { ...prev };
      delete newGroups[groupId];
      return newGroups;
    });
  };

  // Export Grid to Excel
  const exportGridToExcel = () => {
    try {
      // Create grid data structure
      const gridData: any[][] = [];
      
      // Header row
      const headerRow = ['แถว/ชั้น', ...Array.from({length: 20}, (_, i) => String(i + 1).padStart(2, '0'))];
      gridData.push(headerRow);
      
      // Data rows for each shelf (A-Z) and levels (1-4)
      allRows.forEach(row => {
        for (let level = 4; level >= 1; level--) {
          const rowData = [`${row}/${level}`];
          
          // For each position 01-20
          for (let pos = 1; pos <= 20; pos++) {
            const location = `${row}/${level}/${String(pos).padStart(2, '0')}`;
            const locationItems = items.filter(item => 
              normalizeLocation(item.location) === normalizeLocation(location)
            );
            
            if (locationItems.length > 0) {
              const item = locationItems[0];
              const sku = item.sku || 'N/A';
              const productName = getProductName(sku);
              const cartonQty = getCartonQty(item);
              const boxQty = getBoxQty(item);
              
              rowData.push(`${sku}\n${productName}\nลัง:${cartonQty} กล่อง:${boxQty}`);
            } else {
              rowData.push('ว่าง');
            }
          }
          
          gridData.push(rowData);
        }
      });
      
      // Convert to CSV format
      const csvContent = gridData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Create and download file
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `warehouse-grid-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: '✅ Export สำเร็จ',
        description: 'ไฟล์ Grid ถูกดาวน์โหลดแล้ว (CSV format)',
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: '❌ Export ล้มเหลว',
        description: 'เกิดข้อผิดพลาดในการ Export ข้อมูล',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Export Grid to PDF with complete data like in the image
  const exportGridToPDF = () => {
    try {
      // Create a completely isolated window
      const printWindow = window.open('about:blank', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no');
      if (!printWindow) {
        toast({
          title: '❌ ไม่สามารถเปิดหน้าต่างได้',
          description: 'กรุณาอนุญาตให้เปิด popup window',
          variant: 'destructive',
          duration: 3000,
        });
        return;
      }

      // Clear any existing content and prevent external interference
      printWindow.document.open();
      printWindow.document.clear();

      // Generate SKU colors
      const skuColors = new Map();
      items.forEach(item => {
        if (item.sku && !skuColors.has(item.sku)) {
          const colors = getSKUColor(item.sku);
          skuColors.set(item.sku, colors);
        }
      });

      // Generate CSS for SKU colors
      let skuStyles = '';
      skuColors.forEach((colors, sku) => {
        const safeClass = sku.replace(/[^a-zA-Z0-9]/g, '_');
        skuStyles += `.sku-${safeClass} { background: ${colors.bg} !important; border-left: 3px solid ${colors.border} !important; color: ${colors.text} !important; }\n`;
      });

      // Create complete grid sections for all rows A-Z
      const createSectionHTML = (sectionRows) => {
        console.log('Creating sections for rows:', sectionRows);
        let sectionHTML = '';
        
        sectionRows.forEach((row, index) => {
          console.log(`Generating section ${index + 1}: Row ${row}`);
          
          sectionHTML += `
            <div class="section" id="section-${row}">
              <div class="section-header">แถว ${row}</div>
              <div class="section-subtitle">ระดับ 1-4 | ตำแหน่ง 01-20</div>
              <div class="grid-container">
                <div class="grid-header">ชั้น</div>`;
          
          // Column headers 01-20
          for (let i = 1; i <= 20; i++) {
            sectionHTML += `<div class="grid-header">${String(i).padStart(2, '0')}</div>`;
          }
          
          // Rows for levels 4 down to 1
          for (let level = 4; level >= 1; level--) {
            sectionHTML += `<div class="row-label">${level}</div>`;
            
            for (let pos = 1; pos <= 20; pos++) {
              const location = `${row}/${level}/${String(pos).padStart(2, '0')}`;
              const locationItems = items.filter(item => 
                normalizeLocation(item.location) === normalizeLocation(location)
              );
              
              if (locationItems.length > 0) {
                const item = locationItems[0];
                const sku = item.sku || 'N/A';
                const cartonQty = getCartonQty(item);
                const boxQty = getBoxQty(item);
                const looseQty = item.unit_level3_quantity || 0;
                const skuClass = sku.replace(/[^a-zA-Z0-9]/g, '_');
                
                sectionHTML += `<div class="grid-cell sku-${skuClass}">
                  <div class="sku-code">${sku}</div>
                  <div class="product-info">${getProductName(sku).substring(0, 15)}${getProductName(sku).length > 15 ? '...' : ''}</div>
                  ${item.lot ? `<div class="lot-info">Lot: ${item.lot}</div>` : ''}
                  ${item.mfd ? `<div class="mfd-info">MFD: ${item.mfd}</div>` : ''}
                  <div class="quantity-info">
                    ${cartonQty > 0 ? `<div>ลัง: ${cartonQty}</div>` : ''}
                    ${boxQty > 0 ? `<div>กล่อง: ${boxQty}</div>` : ''}
                    ${looseQty > 0 ? `<div>ชิ้น: ${looseQty}</div>` : ''}
                  </div>
                </div>`;
              } else {
                sectionHTML += '<div class="grid-cell empty">ว่าง</div>';
              }
            }
          }
          
          sectionHTML += `</div></div>`;
          
          // Add page break after every 3 sections for better layout
          if ((index + 1) % 3 === 0 && index < sectionRows.length - 1) {
            sectionHTML += `<div class="page-break" style="page-break-after: always; height: 0; visibility: hidden;"></div>`;
          }
        });
        
        console.log('Total sections generated:', sectionRows.length);
        return sectionHTML;
      };

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>แผนผังคลังสินค้า - ${new Date().toLocaleDateString('th-TH')}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset and isolation */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: 100%; 
      height: 100%; 
      overflow-x: auto; 
      background: white !important; 
      font-family: 'Sarabun', Arial, sans-serif !important;
    }
    
    /* Hide any external content */
    iframe, embed, object, applet, script[src*="ubersuggest"], 
    script[src*="analytics"], script[src*="gtag"], 
    div[id*="ubersuggest"], div[class*="ubersuggest"],
    .ubersuggest, #ubersuggest, [data-ubersuggest] { 
      display: none !important; 
      visibility: hidden !important; 
      opacity: 0 !important; 
    }
    
    @media print { 
      body { margin: 0 !important; } 
      .no-print { display: none !important; }
      iframe, embed, object { display: none !important; }
      .section { 
        page-break-inside: avoid !important; 
        display: block !important;
        visibility: visible !important;
      }
      .grid-container { 
        page-break-inside: avoid !important; 
        display: grid !important;
        visibility: visible !important;
      }
      .grid-cell {
        display: flex !important;
        visibility: visible !important;
      }
      * { 
        -webkit-print-color-adjust: exact !important; 
        color-adjust: exact !important; 
        print-color-adjust: exact !important;
      }
      html, body { height: auto !important; }
    }
    
    body { 
      margin: 10px; 
      background: white; 
      color: black; 
      position: relative;
      z-index: 999999;
    }
    
    .container {
      width: 100%;
      background: white;
      position: relative;
      z-index: 999999;
    }
    
    .header { 
      text-align: center; 
      margin-bottom: 15px; 
      padding: 10px; 
      background: #f8fafc; 
      border-radius: 8px; 
      border: 2px solid #e2e8f0;
    }
    .header h1 { margin: 0 0 5px 0; font-size: 20px; color: #1e40af; }
    .header .info { font-size: 10px; color: #475569; margin: 2px; }
    
    .section { 
      margin-bottom: 10px; 
      page-break-inside: avoid; 
      page-break-after: auto;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .section-header { 
      background: #e2e8f0; 
      padding: 8px; 
      font-weight: bold; 
      font-size: 16px; 
      color: #1e40af; 
    }
    .section-subtitle { 
      background: #f1f5f9; 
      padding: 4px 8px; 
      font-size: 12px; 
      color: #64748b; 
      margin-bottom: 5px; 
    }
    
    .grid-container {
      display: grid;
      grid-template-columns: 10px repeat(20, minmax(42px, 1fr));
      gap: 1px;
      border: 1px solid #cbd5e1;
      background: #cbd5e1;
      font-size: 7px;
      margin: 5px;
    }

    .grid-header {
      background: #3b82f6;
      color: white;
      font-weight: bold;
      text-align: center;
      padding: 4px 1px;
      font-size: 8px;
    }

    .row-label {
      background: #64748b;
      color: white;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
    }

    .grid-cell {
      background: white;
      padding: 2px;
      text-align: center;
      font-size: 6px;
      min-height: 50px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      overflow: hidden;
    }

    .empty {
      background: #f8fafc !important;
      color: #94a3b8;
      font-style: italic;
      justify-content: center;
      font-size: 7px;
    }

    .sku-code { font-weight: bold; font-size: 7px; margin-bottom: 0.5px; color: #111827; }
    .product-info { font-size: 5.5px; color: #374151; margin-bottom: 0.5px; line-height: 1.1; }
    .lot-info, .mfd-info { font-size: 5.5px; color: #4b5563; margin: 0.5px 0; }
    .quantity-info { font-size: 5.5px; color: #111827; margin-top: 0.5px; font-weight: 500; }
    .quantity-info div { margin: 0.5px 0; }
    
    .print-button { 
      position: fixed; 
      top: 10px; 
      right: 10px; 
      padding: 8px 16px; 
      background: #3b82f6; 
      color: white; 
      border: none; 
      border-radius: 4px; 
      cursor: pointer; 
      font-size: 11px; 
      z-index: 999999; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    ${skuStyles}
  </style>
</head>
<body>
  <div class="container">
    <button class="print-button no-print" onclick="cleanPrint()">🖨️ พิมพ์</button>
    <div class="header">
      <h1>แผนผังคลังสินค้า</h1>
      <div class="info">วันที่: ${new Date().toLocaleDateString('th-TH')} | เวลา: ${new Date().toLocaleTimeString('th-TH')}</div>
      <div class="info">รายการสินค้า: ${items.length} รายการ | ตำแหน่งที่ใช้งาน: ${new Set(items.map(item => item.location)).size} ตำแหน่ง</div>
    </div>
    ${createSectionHTML(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'])}
  
  <script>
    // Log the generated content for debugging
    console.log('Generated sections:', document.querySelectorAll('.section').length);
    console.log('Generated cells:', document.querySelectorAll('.grid-cell').length);
  </script>
  </div>
  
  <script>
    // Completely isolate this window
    (function() {
      // Remove any external scripts or elements
      function cleanDocument() {
        const externalElements = document.querySelectorAll('iframe, embed, object, applet, script[src], link[href*="ubersuggest"]');
        externalElements.forEach(el => {
          if (el.src && (el.src.includes('ubersuggest') || el.src.includes('analytics'))) {
            el.remove();
          }
        });
        
        // Remove any divs with ubersuggest
        const ubersuggestDivs = document.querySelectorAll('div[id*="ubersuggest"], div[class*="ubersuggest"], .ubersuggest');
        ubersuggestDivs.forEach(el => el.remove());
      }
      
      // Enhanced print function with data verification (single execution)
      let printInProgress = false;
      
      function cleanPrint(isAutoCall = false) {
        if (printInProgress) {
          console.log('Print already in progress, skipping...');
          return;
        }
        
        printInProgress = true;
        cleanDocument();
        
        // Verify data is loaded
        const gridCells = document.querySelectorAll('.grid-cell');
        const sections = document.querySelectorAll('.section');
        
        console.log('Grid cells found:', gridCells.length);
        console.log('Sections found:', sections.length);
        
        if (gridCells.length === 0 || sections.length === 0) {
          if (!isAutoCall) {
            alert('ข้อมูลยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่');
          }
          printInProgress = false; // Reset flag
          return;
        }
        
        // Add print styles to ensure everything prints
        const printStyle = document.createElement('style');
        printStyle.textContent = \`
          @media print {
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
            .section { page-break-inside: avoid !important; }
            .grid-container { page-break-inside: avoid !important; }
            body { font-size: 8px !important; }
            .no-print { display: none !important; }
          }
        \`;
        document.head.appendChild(printStyle);
        
        console.log('Starting print process...');
        
        // Print and reset flag after completion
        window.print();
        
        // Reset flag after print dialog
        setTimeout(() => {
          printInProgress = false;
          console.log('Print process completed');
        }, 2000);
      }
      
      // Make cleanPrint available globally
      window.cleanPrint = cleanPrint;
      
      // Auto focus and clean
      window.focus();
      cleanDocument();
      
      // Wait for complete data loading before printing (single execution)
      let loadAttempts = 0;
      let dataCheckAnimationId;
      let printExecuted = false; // Flag to prevent multiple prints
      let lastDataCheck = 0;

      // Cache DOM elements to avoid repeated queries (prevents forced reflows)
      let cachedPrintButton = null;
      let lastSectionCount = 0;
      let lastContainerCount = 0;

      function checkDataLoaded(timestamp) {
        if (printExecuted) return; // Exit if already printed

        // Only check every 500ms to reduce CPU usage (instead of 300ms)
        if (timestamp - lastDataCheck < 500) {
          dataCheckAnimationId = requestAnimationFrame(checkDataLoaded);
          return;
        }
        lastDataCheck = timestamp;

        try {
          // Cache print button on first access to avoid repeated queries
          if (!cachedPrintButton) {
            cachedPrintButton = document.querySelector('.print-button');
          }

          // Use more efficient counting with minimal DOM queries
          const sections = document.querySelectorAll('.section');
          const gridContainers = document.querySelectorAll('.grid-container');

          // Only query cells if needed for debugging (avoid frequent queries)
          const sectionsCount = sections.length;
          const containersCount = gridContainers.length;

          // Only log if counts changed to reduce console spam
          if (sectionsCount !== lastSectionCount || containersCount !== lastContainerCount) {
            console.log('=== Data Check ===');
            console.log('Sections found:', sectionsCount);
            console.log('Grid containers:', containersCount);
            lastSectionCount = sectionsCount;
            lastContainerCount = containersCount;
          }

          // We expect 26 sections (A-Z), each with grid content
          const expectedSections = 26;
          const hasAllSections = sectionsCount >= expectedSections;
          const hasGridContent = containersCount >= expectedSections;

          if (hasAllSections && hasGridContent) {
            console.log('✅ All sections and grids loaded - Auto printing!');
            if (cachedPrintButton) {
              cachedPrintButton.style.background = '#10b981';
              cachedPrintButton.textContent = '🖨️ กำลังพิมพ์...';
            }

            // Set flag and clear animation immediately
            printExecuted = true;
            if (dataCheckAnimationId) {
              cancelAnimationFrame(dataCheckAnimationId);
            }

            // Print once only
            setTimeout(() => {
              cleanPrint(true);
            }, 800);

          } else if (loadAttempts < 20) {
            loadAttempts++;
            // Only log progress every 5 attempts to reduce console spam
            if (loadAttempts % 5 === 0) {
              console.log(\`❌ Data incomplete (attempt \${loadAttempts}/20)\`);
              console.log(\`   - Sections: \${sectionsCount}/\${expectedSections}\`);
              console.log(\`   - Grid containers: \${containersCount}/\${expectedSections}\`);
            }
            if (cachedPrintButton) {
              cachedPrintButton.textContent = \`🖨️ โหลด... (\${loadAttempts}/20)\`;
            }

            // Continue checking
            dataCheckAnimationId = requestAnimationFrame(checkDataLoaded);
          } else {
            console.log('⚠️ Max attempts reached - printing anyway');
            if (cachedPrintButton) {
              cachedPrintButton.textContent = '🖨️ กำลังพิมพ์...';
            }

            // Set flag and clear animation
            printExecuted = true;
            if (dataCheckAnimationId) {
              cancelAnimationFrame(dataCheckAnimationId);
            }

            setTimeout(() => {
              cleanPrint(true);
            }, 500);
          }
        } catch (error) {
          console.warn('Data check failed:', error);
          // Continue checking even if there's an error
          if (!printExecuted && loadAttempts < 20) {
            dataCheckAnimationId = requestAnimationFrame(checkDataLoaded);
          }
        }
      }

      // Start checking with single execution protection
      setTimeout(() => {
        cleanDocument();
        if (!printExecuted) {
          dataCheckAnimationId = requestAnimationFrame(checkDataLoaded);
        }
      }, 500);
      
      // Block external scripts
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) {
              if (node.tagName === 'SCRIPT' && node.src && 
                  (node.src.includes('ubersuggest') || node.src.includes('analytics'))) {
                node.remove();
              }
              if (node.id && node.id.includes('ubersuggest')) {
                node.remove();
              }
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    })();
  </script>
</body>
</html>`;
      
      // Write content in chunks to ensure it's fully loaded
      try {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        console.log('HTML content written, length:', htmlContent.length);
        
        // Force focus and wait for content to be ready
        printWindow.focus();
        
        // Verify content was written correctly
        setTimeout(() => {
          const allSections = printWindow.document.querySelectorAll('.section');
          const allCells = printWindow.document.querySelectorAll('.grid-cell');
          const allContainers = printWindow.document.querySelectorAll('.grid-container');
          
          console.log('=== Content Verification ===');
          console.log('HTML length:', htmlContent.length);
          console.log('Sections found:', allSections.length);
          console.log('Grid containers:', allContainers.length);
          console.log('Grid cells:', allCells.length);
          
          // Log each section
          allSections.forEach((section, index) => {
            const sectionId = section.id || `section-${index}`;
            const sectionCells = section.querySelectorAll('.grid-cell');
            console.log(`${sectionId}: ${sectionCells.length} cells`);
          });
          
          if (allSections.length < 14) {
            console.error('❌ Missing sections! Expected 14, got', allSections.length);
            console.log('HTML content preview:', htmlContent.substring(0, 1000));
          } else {
            console.log('✅ All sections loaded correctly');
          }
        }, 200);
        
      } catch (error) {
        console.error('Error writing HTML content:', error);
      }
      
      toast({
        title: '📄 Export PDF สำเร็จ',
        description: 'แสดงข้อมูลครบถ้วนเหมือนในรูปแล้ว',
        duration: 3000,
      });
      
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: '❌ Export PDF ล้มเหลว',
        description: 'เกิดข้อผิดพลาดในการสร้าง PDF',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Export detailed inventory list to Excel
  const exportInventoryToExcel = () => {
    try {
      // Create detailed inventory data
      const inventoryData: any[][] = [];
      
      // Header row
      const headerRow = [
        'ตำแหน่ง',
        'SKU',
        'ชื่อสินค้า',
        'Lot',
        'MFD',
        'จำนวนลัง',
        'จำนวนกล่อง',
        'จำนวนชิ้น',
        'หน่วย',
        'วันที่เพิ่ม'
      ];
      inventoryData.push(headerRow);
      
      // Data rows
      items.forEach(item => {
        const row = [
          item.location,
          item.sku || 'N/A',
          getProductName(item.sku || ''),
          item.lot || '-',
          item.mfd || '-',
          getCartonQty(item),
          getBoxQty(item),
          item.unit_level3_quantity || 0,
          item.unit_level3_name || '-',
          new Date(item.created_at).toLocaleDateString('th-TH')
        ];
        inventoryData.push(row);
      });
      
      // Convert to CSV format
      const csvContent = inventoryData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Create and download file
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory-details-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: '✅ Export รายละเอียดสำเร็จ',
        description: 'ไฟล์รายละเอียดสินค้าถูกดาวน์โหลดแล้ว',
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Inventory export error:', error);
      toast({
        title: '❌ Export ล้มเหลว',
        description: 'เกิดข้อผิดพลาดในการ Export รายละเอียด',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Track changes for activity feed (only show when there are actual changes)
  useEffect(() => {
    // Don't track changes on initial load
    if (previousItemsRef.current.size === 0 && items.length > 0) {
      previousItemsRef.current = new Map(items.map(item => [item.id, item]));
      return;
    }

    const currentItems = new Map(items.map(item => [item.id, item]));
    const previousItems = previousItemsRef.current;
    const newActivities: ActivityItem[] = [];

    // Only track actual changes after initial load
    if (previousItems.size > 0) {
      // Check for new items
      currentItems.forEach((item, id) => {
        if (!previousItems.has(id)) {
          newActivities.push({
            id: `${id}-${Date.now()}`,
            type: 'add',
            location: item.location,
            description: `เพิ่มสินค้า: ${item.product_name}`,
            timestamp: new Date()
          });
        } else {
          // Check for updates
          const prevItem = previousItems.get(id);
          if (prevItem && (
            getCartonQty(prevItem) !== getCartonQty(item) ||
            getBoxQty(prevItem) !== getBoxQty(item) ||
            prevItem.location !== item.location
          )) {
            const isTransfer = prevItem.location !== item.location;
            newActivities.push({
              id: `${id}-${Date.now()}`,
              type: isTransfer ? 'transfer' : 'update',
              location: item.location,
              description: isTransfer
                ? `ย้ายสินค้าจาก ${prevItem.location} ไป ${item.location}`
                : `อัปเดตจำนวน: ${item.product_name}`,
              timestamp: new Date()
            });
          }
        }
      });

      // Check for removed items
      previousItems.forEach((item, id) => {
        if (!currentItems.has(id)) {
          newActivities.push({
            id: `${id}-${Date.now()}`,
            type: 'remove',
            location: item.location,
            description: `ลบสินค้า: ${item.product_name}`,
            timestamp: new Date()
          });
        }
      });

      if (newActivities.length > 0) {
        setRecentActivity(prev => [
          ...newActivities,
          ...prev.slice(0, 19) // Keep only 20 recent items
        ]);
      }
    }

    // Update ref for next comparison
    previousItemsRef.current = new Map(items.map(item => [item.id, item]));
  }, [items]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'add': return <Plus className="h-4 w-4 text-green-600" />;
      case 'update': return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'transfer': return <Truck className="h-4 w-4 text-orange-600" />;
      case 'remove': return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} วินาทีที่แล้ว`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    return date.toLocaleDateString('th-TH');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mode Selector - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as 'work' | 'monitor')}>
          <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
            <TabsTrigger value="work" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              โหมดใช้งาน
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />
              โหมดมอนิเตอร์
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="hidden lg:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportInventoryToExcel()}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export รายละเอียด
          </Button>

          <Badge variant="outline" className="flex items-center gap-1">
            <Palette className="h-3 w-3" />
            แยกสีตามประเภท
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
เรียลไทม์
          </Badge>
        </div>
      </div>

      {viewMode === 'monitor' ? (
        <MonitorDashboardSimple items={items} warehouseId={warehouseId} onLocationClick={onShelfClick} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Visual Grid - Main Area */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <Tabs defaultValue="grid" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-10 sm:h-auto">
              <TabsTrigger value="grid" className="text-xs sm:text-sm">แผนผังคลัง</TabsTrigger>
              <TabsTrigger value="table" className="text-xs sm:text-sm">ตารางรายการ</TabsTrigger>
            </TabsList>

            <TabsContent value="grid">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5" />
                      แผนผังคลัง
                      <Badge variant="outline" className="text-xs">
                        เรียลไทม์
                      </Badge>
                    </CardTitle>

                    <div className="hidden lg:flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGridToExcel()}
                        className="flex items-center gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Export Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGridToPDF()}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p>กำลังโหลดข้อมูล...</p>
                      </div>
                    </div>
                  ) : (
                    <ShelfGrid
                      items={items}
                      warehouseId={warehouseId}
                      onShelfClick={onShelfClick}
                      onQRCodeClick={async (location) => {
                        if (!getQRByLocation(location)) {
                          await generateQRForLocation(location, items);
                        }
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="table">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden sm:inline">ตารางภาพรวมตำแหน่ง</span>
                      <span className="sm:hidden">ตารางตำแหน่ง</span>
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {stats.occupiedLocations}/{2080}
                      </Badge>
                    </CardTitle>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGridToExcel()}
                        className="flex items-center gap-1 sm:gap-2 h-9 sm:h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                      >
                        <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Export Excel</span>
                        <span className="sm:hidden">Excel</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGridToPDF()}
                        className="flex items-center gap-1 sm:gap-2 h-9 sm:h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Export PDF</span>
                        <span className="sm:hidden">PDF</span>
                      </Button>
                      
                      <Dialog open={showAddRowDialog} onOpenChange={setShowAddRowDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-1 sm:gap-2 h-9 sm:h-8 text-xs sm:text-sm hidden sm:flex">
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                            เพิ่มแถว
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-base sm:text-lg">เพิ่มแถวใหม่</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                          <div className="space-y-2">
                            <Label htmlFor="rowName" className="text-xs sm:text-sm">ชื่อแถว (ตัวอักษร A-Z เท่านั้น)</Label>
                            <Input
                              id="rowName"
                              placeholder="เช่น O, P, Q..."
                              value={newRowName}
                              onChange={(e) => setNewRowName(e.target.value.toUpperCase())}
                              maxLength={1}
                              className="text-center font-mono text-base sm:text-lg h-11 sm:h-10"
                            />
                          </div>
                          {newRowName && (() => {
                            const defaultRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
                            return defaultRows.includes(newRowName.toUpperCase()) || customRows.includes(newRowName.toUpperCase());
                          })() && (
                            <p className="text-sm text-red-600">แถว {newRowName.toUpperCase()} มีอยู่แล้ว</p>
                          )}
                          {newRowName && !/^[A-Z]$/.test(newRowName.toUpperCase()) && (
                            <p className="text-sm text-red-600">กรุณาใส่ตัวอักษรภาษาอังกฤษ A-Z เพียงตัวเดียว</p>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowAddRowDialog(false);
                                setNewRowName('');
                              }}
                            >
                              ยกเลิก
                            </Button>
                            <Button
                              onClick={addNewRow}
                              disabled={(() => {
                                const trimmedName = newRowName.trim().toUpperCase();
                                const defaultRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
                                return !trimmedName ||
                                       defaultRows.includes(trimmedName) ||
                                       customRows.includes(trimmedName) ||
                                       !/^[A-Z]$/.test(trimmedName);
                              })()}
                            >
                              เพิ่ม
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          จัดกรุ๊ป
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>จัดกรุ๊ปแถว</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="groupName">ชื่อกรุ๊ป</Label>
                            <Input
                              id="groupName"
                              placeholder="เช่น โซนหน้า, โซนสินค้าใหม่"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="groupColor">สีกรุ๊ป</Label>
                            <Input
                              id="groupColor"
                              type="color"
                              value={newGroupColor}
                              onChange={(e) => setNewGroupColor(e.target.value)}
                              className="w-20 h-10"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>เลือกแถว</Label>
                            <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto">
                              {allRows.map(row => (
                                <label key={row} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedRowsForGroup.includes(row)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedRowsForGroup(prev => [...prev, row]);
                                      } else {
                                        setSelectedRowsForGroup(prev => prev.filter(r => r !== row));
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span className="font-mono text-sm">{row}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowGroupDialog(false);
                                setNewGroupName('');
                                setSelectedRowsForGroup([]);
                                setNewGroupColor('#3B82F6');
                              }}
                            >
                              ยกเลิก
                            </Button>
                            <Button
                              onClick={createGroup}
                              disabled={!newGroupName.trim() || selectedRowsForGroup.length === 0}
                            >
                              สร้างกรุ๊ป
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Export Dialog */}
                    <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>ส่งสินค้าออกนอกคลัง</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          {/* SKU Selection */}
                          <div className="space-y-2">
                            <Label htmlFor="exportSku">เลือกสินค้า</Label>
                            <Select
                              value={selectedSkuForExport}
                              onValueChange={(sku) => {
                                setSelectedSkuForExport(sku);
                                setSelectedLocationForExport('');
                                setSelectedItemForExport(null);
                                setExportCartonQty(0);
                                setExportBoxQty(0);
                                setExportLooseQty(0);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกรหัสสินค้า..." />
                              </SelectTrigger>
                              <SelectContent>
                                {skuOptions.map((option) => (
                                  <SelectItem key={option.sku} value={option.sku}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{option.sku}</span>
                                      <span className="text-sm text-muted-foreground">{option.productName}</span>
                                      <span className="text-xs text-gray-500">
                                        รวม: {option.totalCarton} ลัง, {option.totalBox} กล่อง, {option.totalLoose} ชิ้น
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Location Selection */}
                          {selectedSkuForExport && locationOptionsForSku.length > 0 && (
                            <div className="space-y-2">
                              <Label htmlFor="exportLocation">เลือกตำแหน่งที่จะส่งออก</Label>
                              <Select
                                value={selectedLocationForExport}
                                onValueChange={(location) => {
                                  setSelectedLocationForExport(location);
                                  const locationData = locationOptionsForSku.find(opt => opt.location === location);
                                  if (locationData && locationData.items.length > 0) {
                                    setSelectedItemForExport(locationData.items[0]);
                                  }
                                  setExportCartonQty(0);
                                  setExportBoxQty(0);
                                  setExportLooseQty(0);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="เลือกตำแหน่ง..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {locationOptionsForSku.map((locationOption) => (
                                    <SelectItem key={locationOption.location} value={locationOption.location}>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{displayLocation(locationOption.location)}</span>
                                        <span className="text-xs text-gray-500">
                                          สต็อก: {locationOption.totalCarton} ลัง, {locationOption.totalBox} กล่อง, {locationOption.totalLoose} ชิ้น
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {selectedLocationForExport && selectedItemForExport && (
                            <>
                              {/* Current Stock Display for Selected Location */}
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h4 className="font-medium mb-2">สต็อกปัจจุบัน ณ ตำแหน่ง {selectedLocationForExport}</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span>📦 ลัง:</span>
                                    <span className="font-medium">{locationOptionsForSku.find(opt => opt.location === selectedLocationForExport)?.totalCarton || 0} หน่วย</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>📦 กล่อง:</span>
                                    <span className="font-medium">{locationOptionsForSku.find(opt => opt.location === selectedLocationForExport)?.totalBox || 0} หน่วย</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>📦 ชิ้น:</span>
                                    <span className="font-medium">{locationOptionsForSku.find(opt => opt.location === selectedLocationForExport)?.totalLoose || 0} หน่วย</span>
                                  </div>
                                </div>
                              </div>

                              {/* Quantity Selection */}
                              <div className="space-y-3">
                                <Label>จำนวนที่ส่งออก</Label>

                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <Label htmlFor="exportCarton" className="text-xs">ลัง</Label>
                                    <Input
                                      id="exportCarton"
                                      type="number"
                                      min="0"
                                      max={locationOptionsForSku.find(opt => opt.location === selectedLocationForExport)?.totalCarton || 0}
                                      value={exportCartonQty}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        const maxValue = locationOptionsForSku.find(opt => opt.location === selectedLocationForExport)?.totalCarton || 0;
                                        setExportCartonQty(Math.min(value, maxValue));
                                      }}
                                      placeholder="0"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <Label htmlFor="exportBox" className="text-xs">กล่อง</Label>
                                    <Input
                                      id="exportBox"
                                      type="number"
                                      min="0"
                                      max={locationOptionsForSku.find(opt => opt.location === selectedLocationForExport)?.totalBox || 0}
                                      value={exportBoxQty}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        const maxValue = locationOptionsForSku.find(opt => opt.location === selectedLocationForExport)?.totalBox || 0;
                                        setExportBoxQty(Math.min(value, maxValue));
                                      }}
                                      placeholder="0"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <Label htmlFor="exportLoose" className="text-xs">ชิ้น</Label>
                                    <Input
                                      id="exportLoose"
                                      type="number"
                                      min="0"
                                      max={locationOptionsForSku.find(opt => opt.location === selectedLocationForExport)?.totalLoose || 0}
                                      value={exportLooseQty}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        const maxValue = locationOptionsForSku.find(opt => opt.location === selectedLocationForExport)?.totalLoose || 0;
                                        setExportLooseQty(Math.min(value, maxValue));
                                      }}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="exportDestination">ปลายทาง</Label>
                            <Input
                              id="exportDestination"
                              placeholder="เช่น ลูกค้า A, สาขา B, ร้านค้า C"
                              value={exportDestination}
                              onChange={(e) => setExportDestination(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="exportNotes">หมายเหตุ (ไม่บังคับ)</Label>
                            <Input
                              id="exportNotes"
                              placeholder="หมายเหตุเพิ่มเติม..."
                              value={exportNotes}
                              onChange={(e) => setExportNotes(e.target.value)}
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowExportDialog(false);
                                setSelectedItemForExport(null);
                                setSelectedSkuForExport('');
                                setSelectedLocationForExport('');
                                setExportDestination('');
                                setExportCartonQty(0);
                                setExportBoxQty(0);
                                setExportLooseQty(0);
                                setExportNotes('');
                              }}
                            >
                              ยกเลิก
                            </Button>
                            <Button
                              onClick={async () => {
                                try {
                                  if (selectedItemForExport) {
                                    await onExportItem(selectedItemForExport.id, exportCartonQty, exportBoxQty, exportLooseQty, exportDestination, exportNotes);
                                    // แสดงข้อความสำเร็จ
                                    toast({
                                      title: "✅ ส่งออกสินค้าสำเร็จ",
                                      description: `ส่งออก ${selectedSkuForExport} จาก ${selectedLocationForExport} ไปยัง ${exportDestination}`,
                                    });
                                  }
                                  setShowExportDialog(false);
                                  setSelectedItemForExport(null);
                                  setSelectedSkuForExport('');
                                  setSelectedLocationForExport('');
                                  setExportDestination('');
                                  setExportCartonQty(0);
                                  setExportBoxQty(0);
                                  setExportLooseQty(0);
                                  setExportNotes('');
                                } catch (error) {
                                  console.error('Export failed:', error);
                                  // แสดงข้อความข้อผิดพลาด
                                  toast({
                                    title: "❌ การส่งออกล้มเหลว",
                                    description: error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={
                                !selectedItemForExport ||
                                !selectedSkuForExport ||
                                !selectedLocationForExport ||
                                !exportDestination.trim() ||
                                (exportCartonQty + exportBoxQty + exportLooseQty) <= 0
                              }
                            >
                              ส่งออก
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                    {/* Simple Filter */}
                    <div className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          ฟิลเตอร์
                        </h4>
                        {(selectedSkus.length > 0 || selectedMfds.length > 0 || selectedProductTypes.length > 0 || selectedCategories.length > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSkus([]);
                              setSelectedMfds([]);
                              setSelectedProductTypes([]);
                              setSelectedCategories([]);
                            }}
                            className="h-8 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            ล้างทั้งหมด
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* SKU Search */}
                        <div className="relative sku-search-container">
                          <label className="text-sm font-medium text-gray-700 mb-2 block">ค้นหา SKU / ชื่อสินค้า</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="พิมพ์ค้นหา SKU หรือชื่อสินค้า..."
                              value={skuSearchQuery}
                              onChange={(e) => {
                                setSkuSearchQuery(e.target.value);
                                setShowSkuResults(e.target.value.length > 0);
                              }}
                              className="pl-10"
                              onFocus={() => setShowSkuResults(skuSearchQuery.length > 0)}
                            />
                            {skuSearchQuery && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                onClick={() => {
                                  setSkuSearchQuery('');
                                  setShowSkuResults(false);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>

                          {/* Search Results */}
                          {showSkuResults && filteredSkus.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {filteredSkus.slice(0, 10).map(sku => {
                                const itemCount = items.filter(item => item.sku === sku).length;
                                const isSelected = selectedSkus.includes(sku);
                                const displayName = getDisplayName(sku);
                                return (
                                  <div
                                    key={sku}
                                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                      isSelected ? 'bg-blue-50 border-blue-200' : ''
                                    }`}
                                    onClick={() => {
                                      if (!isSelected) {
                                        setSelectedSkus(prev => [...prev, sku]);
                                      }
                                      setSkuSearchQuery('');
                                      setShowSkuResults(false);
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm text-gray-900">
                                          {getProductName(sku)}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">
                                          {sku}
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500 ml-2">
                                        {itemCount} รายการ
                                      </div>
                                      {isSelected && (
                                        <div className="ml-2">
                                          <CheckCircle className="h-4 w-4 text-blue-500" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {filteredSkus.length > 10 && (
                                <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                                  แสดง 10 จาก {filteredSkus.length} รายการ - พิมพ์เพิ่มเติมเพื่อแสดงผลที่ตรงกว่า
                                </div>
                              )}
                            </div>
                          )}

                          {/* No Results */}
                          {showSkuResults && skuSearchQuery.length > 0 && filteredSkus.length === 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-gray-500 text-sm">
                              ไม่พบ SKU หรือสินค้าที่ตรงกับ "{skuSearchQuery}"
                            </div>
                          )}
                        </div>

                        {/* MFD Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">MFD (วันที่ผลิต)</label>
                          <Select
                            value=""
                            onValueChange={(mfd) => {
                              if (mfd && !selectedMfds.includes(mfd)) {
                                setSelectedMfds(prev => [...prev, mfd]);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือก MFD..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-48">
                              {allMfds.map(mfd => {
                                const itemCount = items.filter(item => item.mfd === mfd).length;
                                const isSelected = selectedMfds.includes(mfd);
                                return (
                                  <SelectItem
                                    key={mfd}
                                    value={mfd}
                                    disabled={isSelected}
                                    className="text-sm"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{mfd}</span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        {itemCount} รายการ
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Product Type Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">ประเภทสินค้า</label>
                          <Select
                            value=""
                            onValueChange={(productType) => {
                              if (productType && !selectedProductTypes.includes(productType)) {
                                setSelectedProductTypes(prev => [...prev, productType]);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกประเภท..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-48">
                              {allProductTypes.map(productType => {
                                const itemCount = items.filter(item => {
                                  const product = productsMap.get(item.sku || '');
                                  return product && product.product_type === productType;
                                }).length;
                                const isSelected = selectedProductTypes.includes(productType);
                                const displayName = productType === 'FG' ? 'FG - สินค้าสำเร็จรูป' : 'PK - วัสดุบรรจุภัณฑ์';
                                return (
                                  <SelectItem
                                    key={productType}
                                    value={productType}
                                    disabled={isSelected}
                                    className="text-sm"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{displayName}</span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        {itemCount} รายการ
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Category Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">หมวดหมู่สินค้า</label>
                          <Select
                            value=""
                            onValueChange={(category) => {
                              if (category && !selectedCategories.includes(category)) {
                                setSelectedCategories(prev => [...prev, category]);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกหมวดหมู่..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-48">
                              {allCategories.map(category => {
                                const itemCount = items.filter(item => {
                                  const product = productsMap.get(item.sku || '');
                                  return product && product.category === category;
                                }).length;
                                const isSelected = selectedCategories.includes(category);
                                return (
                                  <SelectItem
                                    key={category}
                                    value={category}
                                    disabled={isSelected}
                                    className="text-sm"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{category}</span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        {itemCount} รายการ
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Selected Filters */}
                      {(selectedSkus.length > 0 || selectedMfds.length > 0 || selectedProductTypes.length > 0 || selectedCategories.length > 0) && (
                        <div className="mt-4 space-y-2">
                          {selectedSkus.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-600 mb-1">SKU ที่เลือก:</div>
                              <div className="flex flex-wrap gap-1">
                                {selectedSkus.map(sku => (
                                  <span
                                    key={sku}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs max-w-xs"
                                    title={getDisplayName(sku)}
                                  >
                                    <span className="truncate">{getProductName(sku)} ({sku})</span>
                                    <button
                                      onClick={() => setSelectedSkus(prev => prev.filter(s => s !== sku))}
                                      className="hover:bg-blue-200 rounded flex-shrink-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedMfds.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-600 mb-1">MFD ที่เลือก:</div>
                              <div className="flex flex-wrap gap-1">
                                {selectedMfds.map(mfd => (
                                  <span
                                    key={mfd}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                                  >
                                    {mfd}
                                    <button
                                      onClick={() => setSelectedMfds(prev => prev.filter(m => m !== mfd))}
                                      className="hover:bg-green-200 rounded"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedProductTypes.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-600 mb-1">ประเภทสินค้าที่เลือก:</div>
                              <div className="flex flex-wrap gap-1">
                                {selectedProductTypes.map(productType => (
                                  <span
                                    key={productType}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                                  >
                                    {productType === 'FG' ? 'FG - สินค้าสำเร็จรูป' : 'PK - วัสดุบรรจุภัณฑ์'}
                                    <button
                                      onClick={() => setSelectedProductTypes(prev => prev.filter(p => p !== productType))}
                                      className="hover:bg-purple-200 rounded"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedCategories.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-600 mb-1">หมวดหมู่ที่เลือก:</div>
                              <div className="flex flex-wrap gap-1">
                                {selectedCategories.map(category => (
                                  <span
                                    key={category}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs"
                                  >
                                    {category}
                                    <button
                                      onClick={() => setSelectedCategories(prev => prev.filter(c => c !== category))}
                                      className="hover:bg-orange-200 rounded"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Legend - SKU Based */}
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <h5 className="font-medium text-gray-700 mb-2 text-sm">คำอธิบาย:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-white border border-gray-400 rounded flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                          </div>
                          <span>ตำแหน่งว่าง</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-400 border border-gray-400 rounded"></div>
                          <span>สีตาม SKU (แต่ละ SKU มีสีเฉพาะ)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 border border-gray-400 rounded"></div>
                          <span>หลาย SKU ในตำแหน่งเดียวกัน</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-white px-1 border rounded">2</span>
                          <span>เลขแสดงจำนวนรายการ</span>
                        </div>
                      </div>
                    </div>

                    {/* Row Groups Display */}
                    {Object.keys(rowGroups).length > 0 && (
                      <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-blue-800 text-sm flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            กรุ๊ปแถว ({Object.keys(rowGroups).length} กรุ๊ป)
                          </h5>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(rowGroups).map(([groupId, group]) => (
                            <div key={groupId} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded border-2"
                                  style={{ backgroundColor: group.color, borderColor: group.color }}
                                ></div>
                                <span className="font-medium text-sm">{group.name}</span>
                                <span className="text-xs text-gray-600">
                                  ({group.rows.join(', ')})
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGroup(groupId)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grid Table - Individual Row Tables with White Background */}
                    <div className="space-y-4">
                      {allRows.map(row => {
                        // คำนวณข้อมูลสำหรับแถวนี้
                        const itemsByLocation = items.reduce((acc, item) => {
                          const normalized = normalizeLocation(item.location);
                          if (!acc[normalized]) acc[normalized] = [];
                          acc[normalized].push(item);
                          return acc;
                        }, {} as Record<string, typeof items>);

                        // ฟิลเตอร์รายการตาม SKU, MFD, Product Type และ Category ที่เลือก
                        const filteredItemsByLocation = Object.entries(itemsByLocation).reduce((acc, [location, locationItems]) => {
                          let filtered = locationItems;

                          // ฟิลเตอร์ตาม SKU
                          if (selectedSkus.length > 0) {
                            filtered = filtered.filter(item => selectedSkus.includes(item.sku || ''));
                          }

                          // ฟิลเตอร์ตาม MFD
                          if (selectedMfds.length > 0) {
                            filtered = filtered.filter(item => selectedMfds.includes(item.mfd || ''));
                          }

                          // ฟิลเตอร์ตาม Product Type
                          if (selectedProductTypes.length > 0) {
                            filtered = filtered.filter(item => {
                              const product = productsMap.get(item.sku || '');
                              return product && selectedProductTypes.includes(product.product_type);
                            });
                          }

                          // ฟิลเตอร์ตาม Category
                          if (selectedCategories.length > 0) {
                            filtered = filtered.filter(item => {
                              const product = productsMap.get(item.sku || '');
                              return product && product.category && selectedCategories.includes(product.category);
                            });
                          }

                          if (filtered.length > 0) {
                            acc[location] = filtered;
                          }
                          return acc;
                        }, {} as Record<string, typeof items>);

                        const rowGroup = getRowGroup(row);

                        return (
                          <div key={row} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            {/* Row Header */}
                            <div
                              className="border-b border-gray-200 px-4 py-3"
                              style={{
                                backgroundColor: rowGroup ? `${rowGroup[1].color}20` : '#f3f4f6',
                                borderLeftColor: rowGroup ? rowGroup[1].color : '#d1d5db',
                                borderLeftWidth: '4px'
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-bold text-gray-800">แถว {row}</h3>
                                  <div className="text-sm text-gray-600">
                                    ระดับ 1-4 | ตำแหน่ง 01-20
                                  </div>
                                </div>
                                {rowGroup && (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: rowGroup[1].color }}
                                    ></div>
                                    <span className="text-sm font-medium text-gray-700">
                                      {rowGroup[1].name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="w-8 px-1 py-2 bg-gray-100 text-gray-700 text-center font-bold text-sm border-r border-gray-200">
                                      ชั้น
                                    </th>
                                    {Array.from({ length: 20 }, (_, i) => (
                                      <th key={i + 1} className="px-2 py-2 bg-gray-100 text-gray-700 text-center font-mono text-xs font-bold border-r border-gray-200 last:border-r-0">
                                        {(i + 1).toString().padStart(2, '0')}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                                  {[4, 3, 2, 1].map(level => (
                                    <tr key={`${row}-${level}`} className="border-b border-gray-200 last:border-b-0">
                                      <td className="w-8 px-1 py-2 bg-gray-50 text-gray-700 text-center font-bold font-mono text-sm border-r border-gray-200">
                                        {level}
                                      </td>
                                      {Array.from({ length: 20 }, (_, i) => {
                                        const position = (i + 1).toString().padStart(2, '0');
                                        const location = `${row}/${level}/${position}`;
                                        const normalizedLocation = normalizeLocation(location);
                                        const originalItems = itemsByLocation[normalizedLocation] || [];
                                        const locationItems = filteredItemsByLocation[normalizedLocation] || [];
                                        const itemCount = locationItems.length;
                                        const totalQty = locationItems.reduce((sum, item) =>
                                          sum + getCartonQty(item) + getBoxQty(item), 0
                                        );

                                        // เก็บ SKU ทั้งหมดในตำแหน่งนี้
                                        const skusInLocation = [...new Set(locationItems.map(item => item.sku).filter(Boolean))];

                                        // ตรวจสอบว่าตำแหน่งนี้ควรแสดงหรือไม่
                                        const shouldShow = (selectedSkus.length === 0 && selectedMfds.length === 0 && selectedProductTypes.length === 0 && selectedCategories.length === 0) ||
                                                          locationItems.length > 0;

                                        // กำหนดสีและรูปแบบ
                                        let cellStyle: any = {};
                                        const opacity = shouldShow ? 1 : 0.2;

                                        if (itemCount === 0) {
                                          // ตำแหน่งว่าง
                                          cellStyle = {
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e5e7eb'
                                          };
                                        } else if (skusInLocation.length === 1) {
                                          // SKU เดียว
                                          const color = getSKUColor(skusInLocation[0]);
                                          cellStyle = {
                                            backgroundColor: color.bg,
                                            border: `1px solid ${color.border}`,
                                            color: color.text
                                          };
                                        } else {
                                          // หลาย SKU - สร้าง gradient
                                          const colors = skusInLocation.slice(0, 4).map(sku => getSKUColor(sku).bg);
                                          cellStyle = {
                                            background: colors.length > 1
                                              ? `linear-gradient(45deg, ${colors.join(', ')})`
                                              : colors[0],
                                            border: '1px solid #6b7280',
                                            color: '#ffffff'
                                          };
                                        }

                                        return (
                                          <td
                                            key={position}
                                            className="w-8 h-8 cursor-pointer hover:scale-105 transition-all duration-200 relative border-r border-gray-200 last:border-r-0"
                                            style={{ ...cellStyle, opacity }}
                                            onClick={() => onShelfClick(normalizeLocation(location), originalItems[0])}
                                            title={
                                              itemCount === 0
                                                ? `${displayLocation(location)} - ว่าง`
                                                : `${displayLocation(location)} - ${locationItems.length} รายการ (${totalQty} หน่วย)\n\nสินค้าในตำแหน่งนี้:\n${locationItems.map(item => `• ${item.product_name}\n  รหัส: ${item.sku} | Lot: ${item.lot || '-'}`).join('\n')}`
                                            }
                                          >
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                              {itemCount === 0 ? (
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full opacity-50"></div>
                                              ) : (
                                                <span className="drop-shadow-sm">{locationItems.length > 9 ? '9+' : locationItems.length}</span>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Enhanced Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
                      <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        วิธีใช้งาน
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                        <div className="space-y-1">
                          <p>• <strong>เลือกฟิลเตอร์ SKU และ MFD</strong> ข้างบนเพื่อดูเฉพาะรายการที่สนใจ</p>
                          <p>• <strong>คลิกที่ตำแหน่ง</strong> เพื่อดูรายละเอียดหรือแก้ไขสินค้า</p>
                          <p>• <strong>วางเมาส์</strong> เพื่อดูรายชื่อสินค้าและ SKU ในตำแหน่งนั้น</p>
                        </div>
                        <div className="space-y-1">
                          <p>• <strong>สีแต่ละช่อง</strong>: แสดงสีตาม SKU เฉพาะ (แต่ละ SKU มีสีเฉพาะตัว)</p>
                          <p>• <strong>สีเกรเดียน</strong>: หลาย SKU ในตำแหน่งเดียวกัน</p>
                          <p>• <strong>เลขในช่อง</strong>: จำนวนรายการสินค้าทั้งหมดในตำแหน่งนั้น</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar - Hidden on mobile */}
        <div className="hidden lg:block space-y-6 order-1 lg:order-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🎛️ การดำเนินการด่วน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={onAddItem}
                className="w-full justify-start"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มสินค้า
              </Button>

              <Button
                onClick={onTransferItem}
                className="w-full justify-start"
                variant="outline"
              >
                <Truck className="h-4 w-4 mr-2" />
                ย้ายสินค้า
              </Button>

              <Button
                onClick={() => {
                  setShowExportDialog(true);
                  setSelectedItemForExport(null);
                  setSelectedSkuForExport('');
                  setSelectedLocationForExport('');
                  setExportCartonQty(0);
                  setExportBoxQty(0);
                  setExportLooseQty(0);
                  setExportDestination('');
                  setExportNotes('');
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <Send className="h-4 w-4 mr-2" />
                สินค้าส่งออก
              </Button>

              <Button
                onClick={onScanQR}
                className="w-full justify-start"
                variant="outline"
              >
                <QrCode className="h-4 w-4 mr-2" />
                สแกน QR Code
              </Button>

              {onBulkExport && (
                <Button
                  onClick={onBulkExport}
                  className="w-full justify-start bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  variant="default"
                >
                  <Send className="h-4 w-4 mr-2" />
                  ส่งออกหลายรายการ
                </Button>
              )}

              <Button
                onClick={async () => {
                  try {
                    setBulkLoading(true);
                    // generate QR for locations that are missing
                    const rows = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
                    const levels = [4,3,2,1];
                    const positions = Array.from({ length: 20 }, (_, i) => (i + 1).toString().padStart(2, '0'));
                    const allLocs: string[] = [];
                    rows.forEach(r => levels.forEach(l => positions.forEach(p => allLocs.push(`${r}/${l}/${p}`))));
                    const missing = allLocs.filter(loc => !getQRByLocation(loc));
                    if (missing.length > 0) {
                      await bulkGenerateQR(missing, items);
                    }
                  } finally {
                    setBulkLoading(false);
                  }
                }}
                className="w-full justify-start"
                variant="outline"
                disabled={qrLoading || bulkLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${qrLoading || bulkLoading ? 'animate-spin' : ''}`} />
                สร้าง QR ให้ครบทุกตำแหน่ง
              </Button>
            </CardContent>
          </Card>

          {/* Statistics Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                📊 สถิติภาพรวม
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg border">
                    <div className="text-lg font-bold text-blue-700">{stats.totalItems}</div>
                    <div className="text-xs text-blue-600">รายการทั้งหมด</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg border">
                    <div className="text-lg font-bold text-purple-700">{stats.occupiedLocations}</div>
                    <div className="text-xs text-purple-600">ตำแหน่งที่ใช้</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h6 className="text-sm font-medium text-gray-700">ประเภทสินค้า</h6>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg border">
                      <div className="text-lg font-bold text-green-700">{stats.fgCount}</div>
                      <div className="text-xs text-green-600">FG (สำเร็จรูป)</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg border">
                      <div className="text-lg font-bold text-blue-700">{stats.pkCount}</div>
                      <div className="text-xs text-blue-600">PK (บรรจุภัณฑ์)</div>
                    </div>
                  </div>
                  {stats.unknownCount > 0 && (
                    <div className="text-center p-2 bg-gray-50 rounded border">
                      <div className="text-sm font-semibold text-gray-700">{stats.unknownCount}</div>
                      <div className="text-xs text-gray-500">ไม่ระบุประเภท</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Type Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                🏷️ ฟิลเตอร์ประเภทสินค้า
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductTypeFilter
                selectedTypes={activeProductTypeFilter}
                onTypeChange={setActiveProductTypeFilter}
              />
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                🔔 กิจกรรมล่าสุด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">ไม่มีกิจกรรมล่าสุด</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => onShelfClick(normalizeLocation(activity.location))}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {activity.location}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}); // End memo

EnhancedOverview.displayName = 'EnhancedOverview';