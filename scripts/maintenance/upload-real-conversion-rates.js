/**
 * Script to upload real conversion rates from user's data
 * This replaces mock data with actual conversion rates
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse conversion rate string (e.g., "1 : 250" -> 250)
function parseConversionRate(rateStr) {
  if (!rateStr || rateStr === '-') return 1;
  const match = rateStr.match(/1\s*:\s*(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

// Real conversion rates from user's data
const REAL_CONVERSION_RATES = [
  { sku: 'C1-15G', name: 'คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 15 กรัม', type: 'FG', level1_rate: '1 : 250', level2_rate: '1 : 1' },
  { sku: 'C1-6G', name: 'คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 6 กรัม', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'C2-35G', name: 'มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35 กรัม', type: 'FG', level1_rate: '1 : 210', level2_rate: '1 : 1' },
  { sku: 'C2-8G', name: 'มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8G', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'C3-30G', name: 'เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 30G', type: 'FG', level1_rate: '1 : 210', level2_rate: '1 : 1' },
  { sku: 'C3-7G', name: 'เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 7G', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'C3L10-2G', name: 'สินค้าตัวอย่างบรรจุ เมลอน มิลก์ ยูวี เอสเซนส์+วอเตอร์เมลอน ทรีดี ออร่า ซัน การ์ด SPF50+PA++++', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'C4-35G', name: 'แบล็ค จิงเจอร์ พอร์เลส&ออยล์ เคลียร์ เซรั่ม 35 กรัม', type: 'FG', level1_rate: '1 : 210', level2_rate: '1 : 1' },
  { sku: 'C4-8G', name: 'แบล็ค จิงเจอร์ พอร์เลส&ออยล์ เคลียร์ เซรั่ม 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'D2-70G', name: 'เจเด้นท์ 3X เอ็กซ์ตร้า แคร์ ทูธเพสท์ 70 กรัม', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 1' },
  { sku: 'D3-70G', name: 'เจเด้นท์ 3 in 1 เฮอร์เบิลไวท์ ทูธเพสท์+ 70กรัม', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 1' },
  { sku: 'JH701-40G', name: 'แมริโกลด์แอคเน่เจล 40g', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 1' },
  { sku: 'JH701-8G', name: 'แมริโกลด์แอคเน่เจล 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'JH702-40G', name: 'มอรินก้ารีแพร์เจล 40g', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 1' },
  { sku: 'JH702-8G', name: 'มอรินก้ารีแพร์เจล 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'JH703-40G', name: 'ดีดีครีมวอเตอร์เมลอน 40g', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 1' },
  { sku: 'JH703-8G', name: 'ดีดีครีมวอเตอร์เมลอน 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'JH704-40G', name: 'ลองแกน เมลาสม่า เซรั่ม 40g', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 1' },
  { sku: 'JH704-8G', name: 'ลองแกน เมลาสม่า เซรั่ม 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'JH705-40G', name: 'แมงโก้ โยเกิร์ต บูสเตอร์ เซรั่ม 40g', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 1' },
  { sku: 'JH705-8G', name: 'แมงโก้ โยเกิร์ต บูสเตอร์ เซรั่ม 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'JH706-8G', name: 'แครอท เดลี่ เซรั่ม 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'JH707-8G', name: 'แบล็ค จิงเจอร์ ออล อิน วัน เมน เซรั่ม 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'JH708-6G', name: 'วอเตอร์เมลอน อีอี คูชั่น 6g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'JH709-30G', name: 'แฮนด์ ซานิไทเซอร์ - เจลแอลกอฮอล์ 30g', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'JH904-60G', name: 'สบู่ดาวเรือง 60 กรัม', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 4' },
  { sku: 'JH904-70G', name: 'สบู่ดาวเรือง 70 กรัม', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 4' },
  { sku: 'JH905-60G', name: 'สบู่แตงโม 60 กรัม', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'JH905-70G', name: 'สบู่แตงโม 70 กรัม', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 12' },
  { sku: 'JH906-70G', name: 'สบู่ลำไย 70 กรัม', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 12' },
  { sku: 'JHA1-40G', name: 'วอเตอร์เมลอน บีบี บอดี้โลชั่น 40g', type: 'FG', level1_rate: '1 : 180', level2_rate: '1 : 12' },
  { sku: 'JHA2-40G', name: 'วอเตอร์เมลอน ออร่า บอมบ์ สครับ 40g', type: 'FG', level1_rate: '1 : 180', level2_rate: '1 : 12' },
  { sku: 'JHD1-12G', name: 'เจเด้นท์ 3 in 1 เฮอร์เบิลไวท์ ทูธเพสท์ 12 กรัม', type: 'FG', level1_rate: '1 : 1100', level2_rate: '1 : 12' },
  { sku: 'JHD1-70G', name: 'เจเด้นท์ 3 in 1 เฮอร์เบิลไวท์ ทูธเพสท์', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 12' },
  { sku: 'JHK1-8G', name: 'แมริโกลด์ อินเทนซีฟ เคลียร์ เจล 8G', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 12' },
  { sku: 'JHK3-30G', name: 'กลูต้า-ไฮยา บูสเตอร์ เซรั่ม 30G', type: 'FG', level1_rate: '1 : 128', level2_rate: '1 : 12' },
  { sku: 'JHK4-48G', name: 'อโวคาโด ไฮโดร ล็อก มอยส์เจอร์ ครีม 48G', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 12' },
  { sku: 'JHK4-8G', name: 'อโวคาโด ไฮโดร ล็อก มอยส์เจอร์ ครีม 8G', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 12' },
  { sku: 'JHK4K6-2G', name: 'ตัวอย่าง เมลอน มิลก์ ยูวี เอสเซนส์+อโวคาโด ไฮโดร ล็อก มอยส์เจอร์ ครีม', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'JHK5-15G', name: 'วอเตอร์เมลอน ไฮโดร ไวท์ เอสเซนส์ 15G', type: 'FG', level1_rate: '1 : 300', level2_rate: '1 : 12' },
  { sku: 'JHK6-7G', name: 'เมลอน มิลก์ ยูวี เอสเซนส์ SPF50PA++++ 7G', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 12' },
  { sku: 'JHM1-120G', name: 'จุฬาเฮิร์บ มะหาด บอดี้ เซรั่ม อินเทนซีฟ ไวท์ 120G', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 12' },
  { sku: 'JHM2-4G', name: '24เค โกลด์ ลองแกน เฟซ มาสก์ 4G', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 12' },
  { sku: 'JHP1-80G', name: 'วอเตอร์เมลอน ชูตติ้ง เจล 80G', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'JHP2-200G', name: 'วอเตอร์เมลอน สปา ซอลท์ บอดี้ สครับ 200 กรัม', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'JHQ1-30G', name: 'วอเตอร์เมลอน อีอี คูชั่น แมตต์ SPF50PA+++(01 Light)', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 12' },
  { sku: 'JHQ2-30G', name: 'วอเเตอร์เมลอน อีอี คูชั่น แมตต์ SPF50PA+++(2 Natural)', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 12' },
  { sku: 'JHT1-2G', name: 'วอเตอร์เมลอน เมจิค ลิป ทินท์ 01โกลเด้นควีน', type: 'FG', level1_rate: '1 : 240', level2_rate: '1 : 12' },
  { sku: 'JHT2-2G', name: 'วอเตอร์เมลอน เมจิค ลิป ทินท์ 02ซูการ์เบบี้', type: 'FG', level1_rate: '1 : 240', level2_rate: '1 : 12' },
  { sku: 'JHT3-2G', name: 'วอเตอร์เมลอน เมจิค ลิป ทินท์ 03ซันออเรนจ์', type: 'FG', level1_rate: '1 : 240', level2_rate: '1 : 12' },
  { sku: 'JHW1-12G', name: 'วิตต้า คอลลา 12 g (กลิ่นแตงโม+กลิ่นลิ้นจี่)', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'L1-150G', name: 'วอเตอร์เมลอน บีบี บอดี้โลชั่น พลัส SPF30PA+++ 150g', type: 'FG', level1_rate: '1 : 85', level2_rate: '1 : 12' },
  { sku: 'L10-30G', name: 'วอเตอร์เมลอน ทรีดี ออร่า ซัน การ์ด SPF50+PA++++ 30 กรัม', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 12' },
  { sku: 'L10-7G', name: 'วอเตอร์เมลอน ทรีดี ออร่า ซัน การ์ด SPF50+PA++++ 7 กรัม', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 12' },
  { sku: 'L11-400G', name: 'จุฬาเฮิร์บ เรด ออเร้นจ์ ออร่า ไบรท์ บอดี้ โลชั่น 400 กรัม', type: 'FG', level1_rate: '1 : 30', level2_rate: '1 : 12' },
  { sku: 'L11-40G', name: 'เรด ออเร้นจ์ ออร่า ไบรท์ บอดี้ โลชั่น 40 กรัม', type: 'FG', level1_rate: '1 : 180', level2_rate: '1 : 12' },
  { sku: 'L12-400G', name: 'เรด ออเร้นจ์ ออร่า โกลว์ ชาวเวอร์ เจล 400 กรัม', type: 'FG', level1_rate: '1 : 30', level2_rate: '1 : 12' },
  { sku: 'L13-10G', name: 'บลู โรส ไบรท์เทนนิ่ง อันเดอร์อาร์ม ครีม 10 กรัม', type: 'FG', level1_rate: '1 : 336', level2_rate: '1 : 6' },
  { sku: 'L13-2G', name: 'สินค้าตัวอย่าง บลู โรส ไบรท์เทนนิ่ง อันเดอร์อาร์ม ครีม 2 กรัม', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'L14-40G', name: 'วอร์เตอร์เมลอน ออร่า คลีนซิ่ง วิป โฟม 40 กรัม', type: 'FG', level1_rate: '1 : 180', level2_rate: '1 : 12' },
  { sku: 'L19-2G', name: 'สินค้าตัวอย่าง วอเตอร์ ลิลี่ อัลตร้า บูสต์ มอยส์เจอร์ เจล 2+2 กรัม', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'L3-40G', name: 'ดีดีครีมวอเตอร์เมลอนซันสกรีน 40g', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 12' },
  { sku: 'L3-8G', name: 'ดีดีครีมวอเตอร์เมลอนซันสกรีน 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'L4-40G', name: 'ลองแกน เมลาสม่า โปร เซรั่ม 40g', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 12' },
  { sku: 'L4-8G', name: 'ลองแกน เมลาสม่า โปร เซรั่ม 8g', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'L5-15G', name: 'จุฬาเฮิร์บ วอเตอร์เมลอน ไฮโดร ไวท์ เอสเซนส์ 15 กรัม', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'L5-90G', name: 'วอเตอร์เมลอน ไฮโดร ไวท์ เอสเซนส์ 90G', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'L6-40G', name: 'แครอท เอจจิ้ง เพอร์เฟค เซรั่ม 40G', type: 'FG', level1_rate: '1 : 128', level2_rate: '1 : 12' },
  { sku: 'L6-8G', name: 'แครอท เอจจิ้ง เพอร์เฟค เซรั่ม 8G', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 12' },
  { sku: 'L7-30G', name: 'จุฬาเฮิร์บ เรด ออเร้นจ์ กลูต้า บูสเตอร์ เซรั่ม 30 G', type: 'FG', level1_rate: '1 : 128', level2_rate: '1 : 1' },
  { sku: 'L7-6G', name: 'จุฬาเฮิร์บ เรด ออเร้นจ์ กลูต้า บูสเตอร์ เซรั่ม 6 G', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 6' },
  { sku: 'L8A-30G', name: 'วอเตอร์เมลอน อีอี คูชั่น แมตต์ SPF50PA+++30G(01 Light)', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 12' },
  { sku: 'L8A-6G', name: 'วอเตอร์เมลอน อีอี คูชั่น แมตต์ SPF50PA+++6G(01 Light)', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 12' },
  { sku: 'L8B-30G', name: 'วอเตอร์เมลอน อีอี คูชั่น แมตต์ SPF50PA+++30G(2 Natural)', type: 'FG', level1_rate: '1 : 126', level2_rate: '1 : 12' },
  { sku: 'L8B-6G', name: 'วอเตอร์เมลอน อีอี คูชั่น แมตต์ SPF50PA+++6G(2 Natural)', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 12' },
  { sku: 'L9-48G', name: 'อโวคาโด ไฮโดร ล็อก มอยส์เจอร์ ครีม 48G', type: 'FG', level1_rate: '1 : 120', level2_rate: '1 : 12' },
  { sku: 'L9-8G', name: 'อโวคาโด ไฮโดร ล็อก มอยส์เจอร์ ครีม 8G', type: 'FG', level1_rate: '1 : 504', level2_rate: '1 : 12' },
  // Add remaining SKUs... (continuing with remaining items from user's list)
  { sku: 'R1-30G', name: 'ไลโปโซม เรตินอล สมูท แอนด์ เฟิร์ม ไนท์ เซรั่ม 30 กรัม', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'T5A-2.5G', name: 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2.5 กรัม(สีชมพู)', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'T5A-2G', name: 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2 กรัม(สีชมพู)', type: 'FG', level1_rate: '1 : 288', level2_rate: '1 : 12' },
  { sku: 'T5B-2.5G', name: 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2.5 กรัม(สีแดง)', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'T5B-2G', name: 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2 กรัม(สีแดง)', type: 'FG', level1_rate: '1 : 288', level2_rate: '1 : 12' },
  { sku: 'T5C-2.5G', name: 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2.5 กรัม(สีส้ม)', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'T5C-2G', name: 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2 กรัม(สีส้ม)', type: 'FG', level1_rate: '1 : 288', level2_rate: '1 : 12' },
  { sku: 'T6A-10G', name: 'วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ คอนโทรล พาวเดอร์ 10 กรัม', type: 'FG', level1_rate: '1 : 168', level2_rate: '1 : 12' },
  { sku: 'T6A-3.8G', name: 'ตัวอย่าง วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ พาวเดอร์ 3.8 กรัม', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' },
  { sku: 'T6A-5G', name: 'วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ พาวเดอร์ 5 กรัม', type: 'FG', level1_rate: '1 : 144', level2_rate: '1 : 12' }
];

async function uploadRealConversionRates() {
  try {
    console.log('🔄 Starting real conversion rates upload...\n');

    // First check if product_conversion_rates table exists
    const { data: tables, error: tablesError } = await supabase.rpc('get_table_names');

    if (tablesError) {
      console.log('⚠️ Table check failed, attempting to query directly...');
    }

    // Test table accessibility
    const { data: testData, error: testError } = await supabase
      .from('product_conversion_rates')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Error: product_conversion_rates table does not exist or is not accessible');
      console.error('Please apply the migration file: supabase/migrations/20250918_create_product_conversion_rates.sql');
      return;
    }

    console.log('✅ product_conversion_rates table is accessible');

    // Clear existing data
    console.log('🗑️  Clearing existing conversion rates...');
    const { error: deleteError } = await supabase
      .from('product_conversion_rates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('❌ Error clearing existing data:', deleteError);
      return;
    }

    // Convert user data to database format
    const conversionData = REAL_CONVERSION_RATES.map(item => ({
      sku: item.sku,
      product_name: item.name,
      unit_level1_name: 'ลัง',
      unit_level2_name: 'กล่อง',
      unit_level3_name: 'ชิ้น',
      unit_level1_rate: parseConversionRate(item.level1_rate),
      unit_level2_rate: parseConversionRate(item.level2_rate),
      user_id: '00000000-0000-0000-0000-000000000000'
    }));

    console.log(`📊 Uploading ${conversionData.length} conversion rates...`);

    // Insert in batches of 50
    const batchSize = 50;
    let totalInserted = 0;

    for (let i = 0; i < conversionData.length; i += batchSize) {
      const batch = conversionData.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('product_conversion_rates')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        console.error('Failed items:', batch.map(b => b.sku));
        continue;
      }

      totalInserted += data.length;
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${data.length} records inserted`);
    }

    console.log(`\n🎉 Upload complete! ${totalInserted} conversion rates uploaded successfully`);

    // Show some sample data
    const { data: sampleData } = await supabase
      .from('product_conversion_rates')
      .select('*')
      .limit(5);

    console.log('\n📋 Sample conversion rates:');
    sampleData?.forEach(rate => {
      console.log(`  ${rate.sku}: 1 ลัง = ${rate.unit_level1_rate} ชิ้น, 1 กล่อง = ${rate.unit_level2_rate} ชิ้น`);
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the upload
uploadRealConversionRates();