import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Package, MapPin, Plus, Minus, Search, Hash, Check, ChevronsUpDown } from 'lucide-react';
import { normalizeLocation } from '@/utils/locationUtils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

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
  'TB-L8B-30G_M1': 'หลอดบรรจุ วอเตอร์เมลอน อีอี คูชั่น แมตต์ SPF50PA+++(2 Natural)'
};

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (locations: string[], itemData: {
    product_name: string;
    sku: string;
    lot?: string;
    mfd?: string;
    box_quantity: number;
    loose_quantity: number;
    pieces_quantity: number;
  }) => void;
  availableLocations: string[];
}

export function BulkAddModal({ isOpen, onClose, onSave, availableLocations }: BulkAddModalProps) {
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');
  const [quantityBoxes, setQuantityBoxes] = useState(0);
  const [quantityLoose, setQuantityLoose] = useState(0);
  const [quantityPieces, setQuantityPieces] = useState(0);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [customLocation, setCustomLocation] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  // Product management states
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductCodeOpen, setIsProductCodeOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productCodeInputValue, setProductCodeInputValue] = useState('');

  const resetForm = () => {
    setProductName('');
    setProductCode('');
    setLot('');
    setMfd('');
    setQuantityBoxes(0);
    setQuantityLoose(0);
    setQuantityPieces(0);
    setSelectedLocations(new Set());
    setCustomLocation('');
    setLocationSearch('');
    setProductCodeInputValue('');
    setIsProductCodeOpen(false);
    setIsNewProduct(false);
  };

  const handleLocationToggle = (location: string) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(location)) {
      newSelected.delete(location);
    } else {
      newSelected.add(location);
    }
    setSelectedLocations(newSelected);
  };

  const handleAddCustomLocation = () => {
    if (customLocation.trim()) {
      const newSelected = new Set(selectedLocations);
      newSelected.add(customLocation.trim());
      setSelectedLocations(newSelected);
      setCustomLocation('');
    }
  };

  const handleSave = () => {
    if (!productName.trim() || !productCode.trim() || selectedLocations.size === 0) {
      return;
    }

    onSave(Array.from(selectedLocations).map(loc => normalizeLocation(loc)), {
      product_name: productName.trim(),
      sku: productCode.trim(),
      lot: lot.trim() || undefined,
      mfd: mfd || undefined,
      box_quantity: quantityBoxes,
      loose_quantity: quantityLoose,
      pieces_quantity: quantityPieces,
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Fetch products data on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('product_name');

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

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
    setProductCodeInputValue(value);

    // Find product name from mapping first
    const mappedName = PRODUCT_NAME_MAPPING[value.toUpperCase()];
    if (mappedName) {
      setProductName(mappedName);
      setIsNewProduct(false);
      return;
    }

    // Find from products database
    const foundProduct = products.find(
      product => product.sku_code.toLowerCase() === value.toLowerCase()
    );

    if (foundProduct) {
      setProductName(foundProduct.product_name);
      setIsNewProduct(false);
    } else if (value === '') {
      setProductName('');
      setIsNewProduct(false);
    } else {
      // New product
      setIsNewProduct(true);
    }
  };

  // Handle product code select from dropdown
  const handleProductCodeSelect = (code: string) => {
    handleProductCodeChange(code);
    setIsProductCodeOpen(false);
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

  // Filter locations based on search
  const filteredLocations = availableLocations.filter(location =>
    location.toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            เพิ่มสินค้าหลายตำแหน่ง
          </DialogTitle>
          <DialogDescription>
            เพิ่มสินค้าชนิดเดียวกันในหลายตำแหน่งพร้อมกัน
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">ข้อมูลสินค้า</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={isNewProduct ? "border-orange-300 focus-visible:ring-orange-500" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productCode" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  รหัสสินค้า *
                </Label>
                <div className="relative">
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isProductCodeOpen}
                    className="w-full justify-between"
                    onClick={() => setIsProductCodeOpen(!isProductCodeOpen)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (productCodeInputValue && filteredProductCodes.length === 0) {
                          handleProductCodeChange(productCodeInputValue);
                          setIsProductCodeOpen(false);
                        }
                      }
                    }}
                  >
                    <span className={productCodeInputValue ? "font-mono" : "text-muted-foreground"}>
                      {productCodeInputValue || "เลือกรหัสสินค้า"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {(isProductCodeOpen && (filteredProductCodes.length > 0 || productCodeInputValue)) && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-md">
                      <Command shouldFilter={false}>
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <Input
                            placeholder="ค้นหารหัสสินค้า..."
                            value={productCodeInputValue}
                            onChange={(e) => {
                              setProductCodeInputValue(e.target.value);
                              setIsNewProduct(checkIfNewProduct(e.target.value));
                            }}
                            className="border-0 px-0 py-2 focus-visible:ring-0"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (productCodeInputValue && filteredProductCodes.length === 0) {
                                  handleProductCodeChange(productCodeInputValue);
                                  setIsProductCodeOpen(false);
                                }
                              }
                            }}
                          />
                        </div>
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
                                  onSelect={() => handleProductCodeSelect(code)}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      productCodeInputValue === code ? 'opacity-100' : 'opacity-0'
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-mono font-medium">{code}</span>
                                    {PRODUCT_NAME_MAPPING[code] && (
                                      <span className="text-xs text-muted-foreground">
                                        {PRODUCT_NAME_MAPPING[code]}
                                      </span>
                                    )}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lot">Lot</Label>
                <Input
                  id="lot"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  placeholder="กรอก Lot (ถ้ามี)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfd">MFD</Label>
                <Input
                  id="mfd"
                  type="date"
                  value={mfd}
                  onChange={(e) => setMfd(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityBoxes">จำนวนลัง</Label>
                <Input
                  id="quantityBoxes"
                  type="number"
                  min="0"
                  value={quantityBoxes}
                  onChange={(e) => setQuantityBoxes(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantityLoose">จำนวนกล่อง</Label>
                <Input
                  id="quantityLoose"
                  type="number"
                  min="0"
                  value={quantityLoose}
                  onChange={(e) => setQuantityLoose(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantityPieces">จำนวนชิ้น</Label>
                <Input
                  id="quantityPieces"
                  type="number"
                  min="0"
                  value={quantityPieces}
                  onChange={(e) => setQuantityPieces(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Location Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">เลือกตำแหน่ง</h3>
              <Badge variant="secondary">
                เลือกแล้ว {selectedLocations.size} ตำแหน่ง
              </Badge>
            </div>

            {/* Custom Location Input */}
            <div className="flex gap-2">
              <Input
                placeholder="เพิ่มตำแหน่งใหม่ (เช่น A/1/1)"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomLocation()}
              />
              <Button
                type="button"
                onClick={handleAddCustomLocation}
                disabled={!customLocation.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Locations */}
            {selectedLocations.size > 0 && (
              <div className="space-y-2">
                <Label>ตำแหน่งที่เลือก:</Label>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedLocations).map(location => (
                    <Badge
                      key={location}
                      variant="default"
                      className="cursor-pointer hover:bg-destructive"
                      onClick={() => handleLocationToggle(location)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {location}
                      <Minus className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available Locations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ตำแหน่งที่มีอยู่:</Label>
                <Badge variant="outline">
                  ทั้งหมด {availableLocations.length} ตำแหน่ง
                </Badge>
              </div>

              {/* Location Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาตำแหน่ง (เช่น A/1 หรือ A/1/1)"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map(location => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox
                          id={location}
                          checked={selectedLocations.has(location)}
                          onCheckedChange={() => handleLocationToggle(location)}
                        />
                        <Label
                          htmlFor={location}
                          className="text-sm font-mono cursor-pointer"
                        >
                          {location}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center text-muted-foreground py-4">
                      {locationSearch ? 'ไม่พบตำแหน่งที่ค้นหา' : 'ไม่มีตำแหน่งให้เลือก'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            ยกเลิก
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1"
            disabled={!productName.trim() || !productCode.trim() || selectedLocations.size === 0}
          >
            บันทึก ({selectedLocations.size} ตำแหน่ง)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
