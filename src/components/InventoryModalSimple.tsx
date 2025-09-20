import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Package, Hash, Calendar, MapPin, Calculator, Info, Check, ChevronsUpDown, Plus, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { normalizeLocation } from '@/utils/locationUtils';
import type { InventoryItem } from '@/hooks/useInventory';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

interface ConversionRate {
  sku: string;
  product_name: string;
  unit_level1_name?: string;
  unit_level1_rate: number;
  unit_level2_name?: string;
  unit_level2_rate: number;
  unit_level3_name: string;
}

interface InventoryModalSimpleProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: {
    product_name: string;
    product_code: string;
    location: string;
    lot?: string;
    mfd?: string;
    quantity_boxes: number;
    quantity_loose: number;
    unit?: string;
    // Multi-level unit data
    unit_level1_quantity?: number;
    unit_level2_quantity?: number;
    unit_level3_quantity?: number;
    unit_level1_name?: string | null;
    unit_level2_name?: string | null;
    unit_level3_name?: string;
    unit_level1_rate?: number;
    unit_level2_rate?: number;
  }) => void;
  location: string;
  existingItem?: InventoryItem;
  otherItemsAtLocation?: InventoryItem[];
}

// Product name mapping สำหรับรหัสสินค้าที่พบบ่อย
const PRODUCT_NAME_MAPPING: Record<string, string> = {
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

  // New product mappings
  'BC-0001-400G': 'ฝาปั๊มขวด ขนาด 400 กรัม',
  'BC-JHQ1-M01': 'แบล็คการ์ดวอเตอร์เมลอน อีอี คูชั่น แมต์ 01',
  'BC-JHQ2-M01': 'แบล็คการ์ดวอเตอร์เมลอน อีอี คูชั่น แมต์ 02',
  'BC-K3-30G': 'ฝาขวดกลูต้า-ไฮยา บูสเตอร์ เซรั่ม 30G',
  'BC-L7-30G_M01': 'ฝาเรด ออเร้นจ์ กลูต้า บูสเตอร์ เซรั่ม 30 G',
  'BC-T5A-2.5G_M01': 'แบล็คการ์ดวอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2.5 กรัม(สีชมพู)',
  'BC-T5A-2.5G_M02': 'แบล็คการ์ดวอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2.5 กรัม(สีชมพู) ไม่มีอิงฟ้า',
  'BC-T5B-2.5G_M01': 'แบล็คการ์ดวอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2.5 กรัม(สีแดง)',
  'BC-T5B-2.5G_M02': 'แบล็คการ์ดวอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2.5 กรัม(สีแดง) ไม่มีอิงฟ้า',
  'BC-T5C-2.5G_M01': 'แบล็คการ์ดวอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2.5 กรัม(สีส้ม)',
  'BC-T5C-2.5G_M02': 'แบล็คการ์ดวอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2.5 กรัม(สีส้ม) (ไม่มีอิงฟ้า)',

  // Boxes
  'BOX-C1-M01_WHT': 'กล่องบรรจุ คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 6 g - เจลแต้มสิวดอกดาวเรืองใหม่',
  'BOX-C1-M02_WHT': 'กล่องบรรจุ คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 6 g - เจลแต้มสิวดอกดาวเรืองใหม่',
  'BOX-C2-M01_WHT': 'กล่องบรรจุ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8G - เจลมะรุมเปปไทด์',
  'BOX-C2-M02_WHT': 'กล่องบรรจุ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8G - เจลมะรุมเปปไทด์',
  'BOX-C3-M01_WHT': 'กล่องบรรจุ เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++',
  'BOX-C4-M01_WHT': 'แบล็ค จิงเจอร์ พอร์เลส&ออยล์ เครียร์ เซรั่ม 8g- เซรั่มขิงดำซิงก์',
  'BOX-D2-70G_M1_WHT': 'กล่องบรรจุ เจเด้นท์ 3X เอ็กซ์ตร้า แคร์ ทูธเพสท์ 70 กรัม',
  'BOX-JH701-8GX6_WHT': 'กล่องบรรจุ แมริโกลด์ แอคแน่ เจล 8G - เจลดาวเรือง',
  'BOX-JH702-8GX6-M01_WHT': 'กล่องบรรจุ มอรินก้า รีแพร์ เจล 8G-เจลมะรุม',
  'BOX-JH703-40G_WHT': 'กล่องบรรจุ ดีดีครีม วอเตอร์เมลอน 40G - ครีมแตงโม',
  'BOX-JH703-40G-M01_WHT': 'กล่องบรรจุ ดีดีครีม วอเตอร์เมลอน 40G - ครีมแตงโม',
  'BOX-JH703-8GX6_WHT': 'กล่องบรรจุ ดีดีครีม วอเตอร์เมลอน 8G - ครีมแตงโม',
  'BOX-JH703-8GX6-M01_WHT': 'กล่องบรรจุ ดีดีครีม วอเตอร์เมลอน 8G - ครีมแตงโม',
  'BOX-JH703-8GX6-M02_WHT': 'กล่องบรรจุ ดีดีครีม วอเตอร์เมลอน 8G - ครีมแตงโม',
  'BOX-JH704-40G_WHT': 'กล่องบรรจุ ลองแกน เมลาสม่า เซรั่ม 40G - เซรั่มลำไย',
  'BOX-JH704-8GX6_WHT': 'กล่องบรรจุ ลองแกน เมลาสม่า เซรั่ม 8G - เซรั่มลำไย',
  'BOX-JH704-8GX6-M01_WHT': 'กล่องบรรจุ ลองแกน เมลาสม่า เซรั่ม 8G - เซรั่มลำไย',
  'BOX-JH704-8GX6-M02_WHT': 'กล่องบรรจุ ลองแกน เมลาสม่า เซรั่ม 8G - เซรั่มลำไย',
  'BOX-JH705-40G-M01_WHT': 'กล่องบรรจุ แมงโก้ โยเกิร์ต บูสเตอร์ เซรั่ม 40G - เซรั่มมะม่วง',
  'BOX-JH705-8GX6_WHT': 'กล่องบรรจุ แมงโก้ โยเกิร์ต บูสเตอร์ เซรั่ม 8G - เซรั่มมะม่วง',
  'BOX-JH706-40G-M01_WHT': 'กล่องบรรจุ แครอท เดลี่ เซรั่ม 40G-เซรั่มแครอท',
  'BOX-JH706-8GX6_WHT': 'กล่องบรรจุ แครอท เดลี่ เซรั่ม 8G - เซรั่มแครอท',
  'BOX-JH706-8GX6-M01_WHT': 'กล่องบรรจุ แครอท เดลี่ เซรั่ม 8G - เซรั่มแครอท',
  'BOX-JH706-8GX6-M02_WHT': 'กล่องบรรจุ แครอท เดลี่ เซรั่ม 8G - เซรั่มแครอท',
  'BOX-JH707-40G-M01_WHT': 'กล่องบรรจุ แบล็ค จิงเจอร์ ออลอินวัน เมน เซรั่ม 40G-เซรั่มขิงดำ',
  'BOX-JH707-8GX6_WHT': 'กล่องบรรจุ แบล็ค จิงเจอร์ ออลอินวัน เมน เซรั่ม 8G - เซรั่มขิงดำ',
  'BOX-JH707-8GX6-M01_WHT': 'กล่องบรรจุ แบล็ค จิงเจอร์ ออลอินวัน เมน เซรั่ม 8G - เซรั่มขิงดำ',
  'BOX-JH707-8GX6-M02_WHT': 'กล่องบรรจุ แบล็ค จิงเจอร์ ออลอินวัน เมน เซรั่ม 8G - เซรั่มขิงดำ',
  'BOX-JH707-8GX6-M03_WHT': 'กล่องบรรจุ แบล็ค จิงเจอร์ ออลอินวัน เมน เซรั่ม 8G - เซรั่มขิงดำ(เปลี่ยนกรัม)',
  'BOX-JH708-6GX6_WHT': 'กล่องบรรจุ วอเตอร์เมลอน อีอี คูชั่น 6G - อีอีคูชั่นแตงโม',
  'BOX-JH708-6GX6-M01_WHT': 'กล่องบรรจุ วอเตอร์เมลอน อีอี คูชั่น 6G - อีอีคูชั่นแตงโม',
  'BOX-JH708-6GX6-M02_WHT': 'กล่องบรรจุ วอเตอร์เมลอน อีอี คูชั่น 6G - อีอีคูชั่นแตงโม',
  'BOX-JH709-30GX6_WHT': 'กล่องบรรจุ เจลแอลกอฮอล์ 30G',
  'BOX-JHA1-M01_WHT': 'กล่องบรรจุ วอเตอร์เมลอน บีบี โลชั่น SPF30PA+++',
  'BOX-JHA1-M02_WHT': 'กล่องบรรจุ วอเตอร์เมลอน บีบี โลชั่น SPF30PA+++',
  'BOX-JHA1-M03_WHT': 'กล่องบรรจุ วอเตอร์เมลอน บีบี โลชั่น SPF30PA+++(เปลี่ยนกรัม)',
  'BOX-JHA2-M01_WHT': 'กล่องบรรจุ จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า บอมบ์ สครับ',
  'BOX-JHA2-M02_WHT': 'กล่องบรรจุ จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า บอมบ์ สครับ',

  // Bottles
  'BT-0001': 'ขวดดรอปเปอร์ 30 ml(สีขาว)',
  'BT-JHK5-90G': 'ขวดวอเตอร์เมลอน ไฮโดร ไวท์ เอสเซนส์ 90 กรัม',
  'BT-L11-400G': 'ขวด เรดออเร้นจ์ ออร่า ไบรท์ บอดี้ โลชั่น 400 กรัม',
  'BT-L7-30G_M01': 'ขวด เรด ออเร้นจ์ กลูต้า บูสเตอร์ เซรั่ม 30 G',
  'BT-R2-30G': 'ขวดปั้ม ซิก้า บาลานซ์ซิ่ง มอยส์เจอร์ เจล 30 กรัม',
  'BT-T5.1-2.5G_M01': 'ขวด วอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออล สวีท 2.5 กรัม(สีชมพู)',
  'BT-T5.2-2.5G_M01': 'ขวด วอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2.5 กรัม(สีแดง)',
  'BT-T5.3-2.5G_M01': 'ขวด วอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2.5 กรัม(สีส้ม)',

  // Caps
  'CAP-JHT-2G': 'ฝาวอเตอร์เมลอน เมจิค ลิป ทินท์ 2G',
  'CAP-T5-2G': 'ฝาวอเตอร์เมลอน แทททู ลิป เซรั่ม 2 G',
  'CAP-T5A-2.5G': 'ฝาวอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2.5 กรัม(สีชมพู)',
  'CAP-T5B-2.5G': 'ฝาวอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2.5 กรัม(สีแดง)',
  'CAP-T5C-2.5G': 'ฝาวอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2.5 กรัม(สีส้ม)',

  // Cases and Containers
  'CA-T6A-10G_M01': 'ตลับ วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ คอนโทรล พาวเดอร์ 10 กรัม',
  'CA-T6A-5G_M01': 'ตลับ วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ คอนโทรล พาวเดอร์ 5 กรัม',
  'CT-JHK4-48G': 'กระปุก อโวคาโด ไฮโดร ล็อก มอยส์เจอร์ ครีม 48 กรัม',
  'CT-L19-48G': 'กระปุก วอเตอร์ ลิลี่ อัลตร้า บูสต์ มอยส์เจอร์ เจล 48 กรัม',

  // Packaging
  'PK007': 'จานวีใส่ตลับ 3.8 กรัม',
  'PK008': 'ตลับรีฟิว 3.8 กรัม',

  // Sachets (SCH) - Sample selection
  'SCH-C1_15G-M01': 'ซองบรรจุ คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 15 g- เจลแต้มสิวดอกดาวเรืองใหม่',
  'SCH-C1-M01': 'ซองบรรจุ คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 6 g- เจลแต้มสิวดอกดาวเรืองใหม่',
  'SCH-C2_35G-M01': 'ซองบรรจุ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35g - เซรั่มมะรุมเปปไทด์',
  'SCH-C2-M01': 'ซองบรรจุ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8G - เซรั่มมะรุมเปปไทด์',
  'SCH-C3-30G_M01': 'ซองบรรจุ เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 30g -กันแดดน้ำนม',
  'SCH-C3-7G_M01': 'ซองบรรจุ เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 7g -กันแดดน้ำนม',
  'SCH-C4-35G_M01': 'ซองบรรจุ แบล็ก จิงเจอร์ พอร์เลส&ออยล์ เครียร์ เซรั่ม 35 g- เซรั่มขิงดำซิงก์',
  'SCH-C4-M01': 'ซองบรรจุ แบล็ก จิงเจอร์ พอร์เลส&ออยล์ เครียร์ เซรั่ม 8g- เซรั่มขิงดำซิงก์',
  'SCH-JH701-8G': 'ซองบรรจุ แมริโกลด์ แอคแน่ เจล 8G - เจลดาวเรือง',
  'SCH-JH702-M01': 'ซองบรรจุ มอรินก้า รีแพร์ เจล 8 G-เจลมะรุม',
  'SCH-JH703-8G': 'ซองบรรจุ ดีดีครีม วอเตอร์เมลอน 8G - ครีมแตงโม',
  'SCH-JH704-8G': 'ซองบรรจุ ลองแกน เมลาสม่า เซรั่ม 8G - เซรั่มลำไย',
  'SCH-JH705-8G': 'ซองบรรจุ แมงโก้ โยเกิร์ต บูสเตอร์ เซรั่ม 8G - เซรั่มมะม่วง',
  'SCH-JH706-8G': 'ซองบรรจุ แครอท เดลี่ เซรั่ม 8G - เซรั่มแครอท',
  'SCH-JH707-8G': 'ซองบรรจุ แบล็ค จิงเจอร์ ออลอินวัน เมน เซรั่ม 8G - เซรั่มขิงดำ',
  'SCH-JH708-6G': 'ซองบรรจุ วอเตอร์เมลอน อีอี คูชั่น 6G - อีอีคูชั่นแตงโม',
  'SCH-JH709-30G': 'ซองบรรจุ เจลแอลกอฮอล์ 30G',
  'SCH-JHA1-40G_NS': 'ซองบรรจุ วอเตอร์เมลอน บีบี โลชั่น SPF50PA+++(ไม่มีจุก)',
  'SCH-JHA2-40G': 'ซองบรรจุ จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า บอมบ์ สครับ',
  'SCH-JHD1-M01': 'ซองบรรจุ เจเด้นท์ 3 in 1 เฮอร์เบิลไวท์ ทูธเพสท์ 12 กรัม',
  'SCH-JHK1-M01': 'ซองบรรจุ แมริโกลด์ อินเทนซีฟ เคลียร์ เจล 8G - เจลดาวเรืองใหม่',
  'SCH-JHK2-M01': 'ซองบรรจุ มอรินก้า แอดวานซ์ รี 8G - เจลดมะรุมใหม่',
  'SCH-JHK3-M01': 'ซองบรรจุ กลูต้า-ไฮยา บูสเตอร์ เซรั่ม 6G',
  'SCH-JHK4-M01_NS': 'ซอง อโวคาโด ไฮโดร ล็อก มอยส์เจอร์ ครีม 8กรัม ไม่ติดจุก',
  'SCH-JHK5-M01': 'ซองวอเตอร์เมลอน ไฮโดร ไวท์ เอสเซนส์ 15 กรัม',
  'SCH-JHK6-M01_NS': 'ซองบรรจุจุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ SPF50PA++++(ไม่มีจุก)',
  'SCH-JHM2-M01_NS': 'ซอง24เค โกลด์ ลองแกน เฟซ มาสก์ 4g (ไม่ติดจุก)',
  'SCH-JHT01-M01': 'ซองบรรจุ วอเตอร์เมลอน เมจิค ลิป ทินท์ 2G  -01โกลเด้นควีน',
  'SCH-JHT02-M01': 'ซองบรรจุ วอเตอร์เมลอน เมจิค ลิป ทินท์ 2G - 02ซูการ์เบบี้',
  'SCH-JHT03-M01': 'ซองบรรจุ วอเตอร์เมลอน เมจิค ลิป ทินท์ 2G - 03ซันออเรนจ์',

  // Slide Packs
  'SP-JHQ1-M01': 'สไลด์แพค วอเตอร์เมลอน อีอีคูชั่น แมตต์',
  'SP-T5-2.5G_M01': 'สไลด์แพควอเตอร์เมลอน แทททู ลิป เซรั่ม',

  // Spouts and Stoppers
  'SPOUT-S100': 'จุก 5 มม.',
  'STOPPER-T5-2.5G': 'จุกพลาสติกวอเตอร์เมลอน แทททู ลิป เซรั่ม 2.5G',

  // Stickers
  'STK-R1-30G': 'สติ๊กเกอร์ขวด ไลโปโซม เรตินอล สมูท แอนด์ เฟิร์ม ไนท์ เซรั่ม 30 กรัม',

  // Tubes (TB) - Sample selection
  'TB-C1-15G': 'หลอดบรรจุ คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 15 กรัม-เจลแต้มสิวดอกดาวเรือง',
  'TB-C2-35G': 'หลอดบรรจุ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35G - เซรั่มมะรุมเปปไทด์',
  'TB-C3-30G': 'หลอดบรรจุ เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 30G - กันแดดน้ำนม',
  'TB-C4-35G': 'หลอดบรรจุ แบล็ก จิงเจอร์ พอร์เลส&ออยล์ เครียร์ เซรั่ม 35g- เซรั่มขิงดำซิงก์',
  'TB-D2-70G_M01': 'หลอดบรรจุ เจเด้นท์ 3X เอ็กซ์ตร้า แคร์ ทูธเพสท์ 70 กรัม',
  'TB-D3-70G_M01': 'หลอดบรรจุ เจเด้นท์ 3 in 1 เฮอร์เบิลไวท์ ทูธเพสท์+ 70 กรัม',
  'TB-JH702-40G': 'หลอดบรรจุ มอรินก้า รีแพร์ เจล 40G - เจลมะรุม',
  'TB-JH703-40G': 'หลอดบรรจุ ดีดีครีม วอเตอร์เมลอน 40G - ครีมแตงโม',
  'TB-JH704-40G': 'หลอดบรรจุ ลองแกน เมลาสม่า เซรั่ม 40G - เซรั่มลำไย',
  'TB-JH705-40G': 'หลอดบรรจุ แมงโก้ โยเกิร์ต บูสเตอร์ เซรั่ม 40G - เซรั่มมะม่วง',
  'TB-JH707-40G': 'หลอดบรรจุ แบล็ค จิงเจอร์ ออล อิน วัน เมน เซรั่ม 40 มล.',
  'TB-JHD1-70G': 'หลอดบรรจุ เจเด้นท์ 3 in 1 เฮอร์เบิลไวท์ ทูธเพสท์',
  'TB-JHD1-70G_M02': 'หลอดบรรจุ เจเด้นท์ 3 in 1 เฮอร์เบิลไวท์ ทูธเพสท์ 70 กรัม ใหม่',
  'TB-JHK1-40G': 'หลอดบรรจุ แมริโกลด์ อินเทนซีฟ เคลียร์ เจล 40G',
  'TB-JHK2-40G': 'หลอดบรรจุ มอรินก้า แอดวานซ์ รีแพร์ เจล 40G',
  'TB-JHM1-120G': 'หลอดบรรจุ มะหาด บอดี้ เซรั่ม อินเทนซีฟ ไวท์ 120 G',
  'TB-JHM2-30G': 'หลอดบรรจุ โกลด์ ลองแกน เฟซ มาสก์ 30g',
  'TB-JHQ1-30G': 'หลอดบรรจุ วอเตอร์เมลอน อีอี แมท คูชั่น 30 กรัม(01 Light)',
  'TB-JHQ2-30G': 'หลอดบรรจุ วอเตอร์เมลอน อีอี แมท คูชั่น 30 กรัม(2 Natural)',
  'TB-L10-30G': 'หลอดบรรจุ วอเตอร์เมลอน ทรีดี ออร่า ซัน การ์ด SPF50+PA++++ 30 กรัม',
  'TB-L1-150G': 'หลอดบรรจุ วอเตอร์เมลอน บีบี บอดี้โลชั่น พลัส SPF30PA+++ 150g',
  'TB-L3-40G': 'หลอดบรรจุ ดีดีครีม วอเตอร์เมลอน ซันสกรีน 40G - ครีมแตงโมใหม่',
  'TB-L4-40G': 'หลอดบรรจุ ลองแกน เมลาสม่า โปร เซรั่ม 40G - เซรั่มลำไยใหม่',
  'TB-L6-40G': 'หลอดบรรจุ แครอท เอจจิ้ง เพอร์เฟค เซรั่ม 40 มล.-ครีมแครอทใหม่',
  'TB-L8A-30G_M1': 'หลอดบรรจุ วอเตอร์เมลอน อีอี คูชั่น แมตต์ SPF50PA+++(01 Light)',
  'TB-L8B-30G_M1': 'หลอดบรรจุ วอเตอร์เมลอน อีอี คูชั่น แมตต์ SPF50PA+++(2 Natural)',

  // New soap products
  'JH906-70G': 'จุฬาเฮิร์บ ลองแกน เมลาสม่า โซฟ 70 กรัม',
  'JH904-70G': 'จุฬาเฮิร์บ แมริโกลด์ แอคเน่ โซฟ 70กรัม',
  'JH905-70G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า โซฟ 70กรัม'
};

export function InventoryModalSimple({ isOpen, onClose, onSave, location, existingItem, otherItemsAtLocation }: InventoryModalSimpleProps) {
  // Form state
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductCodeOpen, setIsProductCodeOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productCodeInputValue, setProductCodeInputValue] = useState('');

  // Conversion rates
  const [conversionRate, setConversionRate] = useState<ConversionRate | null>(null);
  const [loadingConversion, setLoadingConversion] = useState(false);

  // Simple unit quantities
  const [level1Quantity, setLevel1Quantity] = useState(0);
  const [level2Quantity, setLevel2Quantity] = useState(0);
  const [level3Quantity, setLevel3Quantity] = useState(0);

  // Load products from database
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes or when existingItem changes
  useEffect(() => {
    if (isOpen) {
      if (existingItem) {
        // Editing existing item
        setProductName(existingItem.product_name);
        setProductCode(existingItem.sku);
        setProductCodeInputValue(existingItem.sku);
        setLot(existingItem.lot || '');
        setMfd(existingItem.mfd || '');

        // Load quantities
        const extendedItem = existingItem as any;
        setLevel1Quantity(extendedItem.unit_level1_quantity || 0);
        setLevel2Quantity(extendedItem.unit_level2_quantity || 0);
        setLevel3Quantity(extendedItem.unit_level3_quantity || 0);

        loadConversionRate(existingItem.sku);
      } else {
        // Adding new item
        setProductName('');
        setProductCode('');
        setProductCodeInputValue('');
        setLot('');
        setMfd('');
        setLevel1Quantity(0);
        setLevel2Quantity(0);
        setLevel3Quantity(0);
        setConversionRate(null);
      }
    }
  }, [isOpen, existingItem]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sku_code');

      if (error) {
        console.error('Error loading products:', error);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadConversionRate = async (sku: string) => {
    if (!sku.trim()) {
      setConversionRate(null);
      return;
    }

    try {
      setLoadingConversion(true);
      // For now, use a mock data structure since product_conversion_rates table doesn't exist
      const mockData: ConversionRate = {
        sku: sku.toUpperCase(),
        product_name: productName || '',
        unit_level1_name: 'ลัง',
        unit_level1_rate: 100,
        unit_level2_name: 'กล่อง',
        unit_level2_rate: 10,
        unit_level3_name: 'ชิ้น',
      };

      // For L-series products, use specific rates
      if (sku.startsWith('L')) {
        mockData.unit_level1_rate = 504; // 1 ลัง = 504 ชิ้น
        mockData.unit_level2_rate = 6;   // 1 กล่อง = 6 ชิ้น
      }

      setConversionRate(mockData);
    } catch (error) {
      console.error('Error loading conversion rate:', error);
    } finally {
      setLoadingConversion(false);
    }
  };

  // Get all available product codes
  const allProductCodes = useMemo(() => {
    const mappingCodes = Object.keys(PRODUCT_NAME_MAPPING);
    const dbCodes = products.map(p => p.sku_code);
    const allCodes = [...new Set([...mappingCodes, ...dbCodes])];
    return allCodes.sort();
  }, [products]);

  // Filter product codes based on search
  const filteredProductCodes = useMemo(() => {
    if (!productCodeInputValue) return allProductCodes;
    return allProductCodes.filter(code =>
      code.toLowerCase().includes(productCodeInputValue.toLowerCase()) ||
      PRODUCT_NAME_MAPPING[code]?.toLowerCase().includes(productCodeInputValue.toLowerCase())
    );
  }, [allProductCodes, productCodeInputValue]);

  // Auto-fill product name when product code changes
  const handleProductCodeChange = (value: string) => {
    setProductCode(value);

    // Load conversion rate
    loadConversionRate(value);

    // Find product name from mapping first
    const mappedName = PRODUCT_NAME_MAPPING[value.toUpperCase()];
    if (mappedName) {
      setProductName(mappedName);
      return;
    }

    // Find from products database
    const foundProduct = products.find(
      product => product.sku_code.toLowerCase() === value.toLowerCase()
    );

    if (foundProduct) {
      setProductName(foundProduct.product_name);
    } else if (value === '') {
      setProductName('');
    }
  };

  // Check if product code is new (not in mapping or DB)
  const checkIfNewProduct = (code: string) => {
    if (!code.trim()) return false;
    const existsInMapping = !!PRODUCT_NAME_MAPPING[code.toUpperCase()];
    const existsInDatabase = products.some(
      product => product.sku_code.toLowerCase() === code.toLowerCase()
    );
    return !existsInMapping && !existsInDatabase;
  };

  // Handle free typing in product code input
  const handleProductCodeInputChange = (value: string) => {
    setProductCodeInputValue(value);
    handleProductCodeChange(value);
    setIsNewProduct(checkIfNewProduct(value));
  };

  // Handle selecting a code from the suggestion list
  const handleProductCodeSelect = (value: string) => {
    setIsProductCodeOpen(false);
    setProductCodeInputValue(value);
    handleProductCodeChange(value);
    setIsNewProduct(checkIfNewProduct(value));
  };

  // Keyboard handler for product code input
  const handleProductCodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsProductCodeOpen(false);
      if (filteredProductCodes.length === 1) {
        handleProductCodeSelect(filteredProductCodes[0]);
      }
    } else if (e.key === 'Escape') {
      setIsProductCodeOpen(false);
    } else if (e.key === 'ArrowDown' && !isProductCodeOpen) {
      setIsProductCodeOpen(true);
    }
  };

  // Calculate total base quantity
  const totalBaseQuantity = useMemo(() => {
    if (!conversionRate) return level3Quantity;

    const level1Total = level1Quantity * (conversionRate.unit_level1_rate || 0);
    const level2Total = level2Quantity * (conversionRate.unit_level2_rate || 0);
    const level3Total = level3Quantity;

    return level1Total + level2Total + level3Total;
  }, [level1Quantity, level2Quantity, level3Quantity, conversionRate]);

  // Format calculation display
  const calculationDisplay = useMemo(() => {
    if (!conversionRate) return `${level3Quantity} ${conversionRate?.unit_level3_name || 'ชิ้น'}`;

    const parts: string[] = [];

    if (level1Quantity > 0 && conversionRate.unit_level1_name) {
      parts.push(`${level1Quantity}×${conversionRate.unit_level1_rate}`);
    }
    if (level2Quantity > 0 && conversionRate.unit_level2_name) {
      parts.push(`${level2Quantity}×${conversionRate.unit_level2_rate}`);
    }
    if (level3Quantity > 0) {
      parts.push(`${level3Quantity}×1`);
    }

    const calculation = parts.length > 0 ? `(${parts.join(' + ')})` : '';
    return `${calculation} = ${totalBaseQuantity.toLocaleString('th-TH')} ${conversionRate.unit_level3_name}`;
  }, [level1Quantity, level2Quantity, level3Quantity, conversionRate, totalBaseQuantity]);

  const handleSave = () => {
    if (!productName.trim() || !productCode.trim()) {
      return;
    }

    const dataToSave = {
      product_name: productName.trim(),
      product_code: productCode.trim(),
      location: location,
      lot: lot.trim() || undefined,
      mfd: mfd || undefined,
      // Legacy fields for backward compatibility
      quantity_boxes: level1Quantity,  // Map level1 (ลัง) to legacy carton
      quantity_loose: level2Quantity,  // Map level2 (กล่อง) to legacy box
      quantity_pieces: level3Quantity, // Map level3 (ชิ้น) to legacy pieces
      unit: conversionRate?.unit_level3_name || 'ชิ้น',
      // Multi-level unit data - ข้อมูลหน่วยใหม่
      unit_level1_quantity: level1Quantity,
      unit_level2_quantity: level2Quantity,
      unit_level3_quantity: level3Quantity,
      unit_level1_name: conversionRate?.unit_level1_name || null,
      unit_level2_name: conversionRate?.unit_level2_name || null,
      unit_level3_name: conversionRate?.unit_level3_name || 'ชิ้น',
      // Add conversion rates for calculation
      unit_level1_rate: conversionRate?.unit_level1_rate || 0,
      unit_level2_rate: conversionRate?.unit_level2_rate || 0,
    };

    // Debug: แสดงข้อมูลที่จะส่งไป
    console.log('🔍 InventoryModalSimple Saving Data:', {
      sku: productCode.trim(),
      quantities: {
        level1: level1Quantity,
        level2: level2Quantity,
        level3: level3Quantity,
      },
      rates: {
        level1: conversionRate?.unit_level1_rate || 0,
        level2: conversionRate?.unit_level2_rate || 0,
      },
      conversionRateFound: !!conversionRate,
      conversionRateData: conversionRate,
      finalDataToSave: dataToSave
    });

    onSave(dataToSave);

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {existingItem ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
          </DialogTitle>
          <DialogDescription>
            {existingItem ? 'แก้ไขข้อมูลสินค้าในคลัง' : 'เพิ่มสินค้าใหม่เข้าสู่ระบบคลังสินค้า'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location Display */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-mono font-medium">ตำแหน่ง: {location}</span>
          </div>

          {/* Warning for Multiple Items at Location */}
          {otherItemsAtLocation && otherItemsAtLocation.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-yellow-800">
                    ⚠️ มีสินค้าอื่นในตำแหน่งนี้แล้ว
                  </div>
                  <div className="text-sm text-yellow-700">
                    พบ {otherItemsAtLocation.length} รายการสินค้าในตำแหน่ง {location}:
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {otherItemsAtLocation.map((item, index) => (
                      <div key={item.id} className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                        {index + 1}. {item.product_name} (SKU: {item.sku})
                        {item.lot && ` - LOT: ${item.lot}`}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-yellow-600 mt-2">
                    💡 การเพิ่มสินค้าใหม่จะไม่มีผลต่อสินค้าที่มีอยู่แล้ว
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Code */}
          <div className="space-y-2">
            <Label htmlFor="productCode" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              รหัสสินค้า *
            </Label>
            <div className="relative">
              <Input
                id="productCode"
                type="text"
                value={productCodeInputValue}
                onChange={(e) => {
                  handleProductCodeInputChange(e.target.value);
                  setIsProductCodeOpen(true);
                }}
                onFocus={() => setIsProductCodeOpen(true)}
                onKeyDown={handleProductCodeKeyDown}
                onBlur={(e) => {
                  setTimeout(() => {
                    if (e.currentTarget && document.activeElement && !e.currentTarget.contains(document.activeElement)) {
                      setIsProductCodeOpen(false);
                    }
                  }, 150);
                }}
                placeholder="กรอกรหัสสินค้า (เช่น L8A-40G)"
                className="font-mono pr-10"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setIsProductCodeOpen(!isProductCodeOpen)}
              >
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </Button>
              {(isProductCodeOpen && (filteredProductCodes.length > 0 || productCodeInputValue)) && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-md">
                  <Command shouldFilter={false}>
                    <CommandList className="max-h-60 overflow-auto">
                      {productCodeInputValue && filteredProductCodes.length === 0 && (
                        <CommandEmpty>
                          <div className="p-3">
                            <div className="flex items-center gap-2 text-sm text-green-700">
                              <Plus className="h-4 w-4" />
                              สร้างรหัสสินค้าใหม่:
                              <code className="font-mono font-bold bg-green-50 px-1 rounded">{productCodeInputValue}</code>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              กด Enter เพื่อใช้รหัสนี้
                            </div>
                          </div>
                        </CommandEmpty>
                      )}
                      {filteredProductCodes.length > 0 && (
                        <CommandGroup heading="รหัสสินค้าที่มีอยู่">
                          {filteredProductCodes.map((code) => (
                            <CommandItem
                              key={code}
                              value={code}
                              onSelect={() => {
                                handleProductCodeSelect(code);
                                setIsProductCodeOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  productCodeInputValue === code ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-mono font-medium">{code}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
            {isNewProduct && (
              <p className="text-xs text-orange-600">
                💡 สินค้าใหม่ที่ยังไม่มีในระบบ กรุณากรอกชื่อสินค้า
              </p>
            )}
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="productName" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              ชื่อสินค้า *
            </Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="กรอกชื่อสินค้า"
            />
          </div>

          {/* LOT */}
          <div className="space-y-2">
            <Label htmlFor="lot">LOT</Label>
            <Input
              id="lot"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              placeholder="กรอก LOT (ถ้ามี)"
            />
          </div>

          {/* MFD */}
          <div className="space-y-2">
            <Label htmlFor="mfd" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              วันที่ผลิต (MFD)
            </Label>
            <Input
              id="mfd"
              type="date"
              value={mfd}
              onChange={(e) => setMfd(e.target.value)}
            />
          </div>

          {/* Unit Quantities */}
          {conversionRate ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4" />
                  จำนวนสินค้า
                </CardTitle>
                {loadingConversion && (
                  <div className="text-sm text-muted-foreground">
                    กำลังโหลดการตั้งค่าอัตราแปลง...
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Level 1 Unit */}
                  {conversionRate.unit_level1_name && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {conversionRate.unit_level1_name}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={level1Quantity}
                        onChange={(e) => setLevel1Quantity(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="text-center"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        1 {conversionRate.unit_level1_name} = {conversionRate.unit_level1_rate.toLocaleString('th-TH')} {conversionRate.unit_level3_name}
                      </div>
                    </div>
                  )}

                  {/* Level 2 Unit */}
                  {conversionRate.unit_level2_name && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {conversionRate.unit_level2_name}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={level2Quantity}
                        onChange={(e) => setLevel2Quantity(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="text-center"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        1 {conversionRate.unit_level2_name} = {conversionRate.unit_level2_rate.toLocaleString('th-TH')} {conversionRate.unit_level3_name}
                      </div>
                    </div>
                  )}

                  {/* Level 3 Unit (Base) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {conversionRate.unit_level3_name} (หลวม)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={level3Quantity}
                      onChange={(e) => setLevel3Quantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center"
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      หน่วยพื้นฐาน
                    </div>
                  </div>
                </div>

                {/* Calculation Display */}
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      <span className="font-medium">การคำนวณ:</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{calculationDisplay}</div>
                      <div className="text-lg font-bold text-primary">
                        รวม: {totalBaseQuantity.toLocaleString('th-TH')} {conversionRate.unit_level3_name}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Manual input for all 3 levels when no conversion rate */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  จำนวนสินค้า
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  ไม่พบการตั้งค่าอัตราแปลง - กรอกจำนวนแยกตามหน่วย
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ลัง */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">ลัง</Label>
                    <Input
                      type="number"
                      min="0"
                      value={level1Quantity}
                      onChange={(e) => setLevel1Quantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center"
                    />
                  </div>

                  {/* กล่อง */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">กล่อง</Label>
                    <Input
                      type="number"
                      min="0"
                      value={level2Quantity}
                      onChange={(e) => setLevel2Quantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center"
                    />
                  </div>

                  {/* ชิ้น */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">ชิ้น</Label>
                    <Input
                      type="number"
                      min="0"
                      value={level3Quantity}
                      onChange={(e) => setLevel3Quantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center"
                    />
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground text-center">
                  สามารถไปตั้งค่าอัตราแปลงหน่วยได้ที่แท็บ "ตั้งค่า" เพื่อการคำนวณอัตโนมัติ
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={!productName.trim() || !productCode.trim()}
          >
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}