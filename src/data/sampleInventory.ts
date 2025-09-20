// Sample inventory data for Chulaherb products
// This file contains sample data for testing and demonstration purposes

// Generate random warehouse location
const generateRandomLocation = () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  const levels = [1, 2, 3, 4];
  const positions = Array.from({ length: 20 }, (_, i) => i + 1);

  const randomRow = rows[Math.floor(Math.random() * rows.length)];
  const randomLevel = levels[Math.floor(Math.random() * levels.length)];
  const randomPosition = positions[Math.floor(Math.random() * positions.length)];

  return `${randomRow}/${randomLevel}/${randomPosition}`;
};

// Generate random lot number
const generateLotNumber = () => {
  const year = new Date().getFullYear();
  const lotNum = Math.floor(Math.random() * 999) + 1;
  return `LOT${year}${lotNum.toString().padStart(3, '0')}`;
};

// Generate random manufacturing date (within last 6 months)
const generateMFD = () => {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  const randomDate = new Date(randomTime);

  return randomDate.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Generate random quantities
const generateQuantities = () => ({
  boxes: Math.floor(Math.random() * 10) + 1, // 1-10 boxes
  loose: Math.floor(Math.random() * 21) // 0-20 loose items
});

// Chulaherb products data - อัปเดตตามข้อมูลใหม่
const chulaherb_products = [
  { name: "จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง", code: "A1-40G" },
  { name: "จุฬาเฮิร์บ บลูโรส ไวท์เทนนิ่ง อันเดอร์อาร์มครีม10ก", code: "L13-10G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง", code: "L8A-6G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 6 ก.รุ่นซอง", code: "L8B-6G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 30 ก.รุ่นหลอด", code: "L8A-30G" },
  { name: "จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 40ก", code: "L3-40G" },
  { name: "จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 6ก", code: "L7-6G" },
  { name: "จุฬาเฮิร์บ พลัม คอลลาเจน ไนท์ ครีม 40ก", code: "K1-40G" },
  { name: "จุฬาเฮิร์บ อัลตร้า ไวท์เทนนิ่ง โบดี้ ครีม 40ก", code: "A3-40G" },
  { name: "จุฬาเฮิร์บ อัลตร้า ไวท์เทนนิ่ง โบดี้ ครีม 100ก", code: "A3-100G" },
  { name: "จุฬาเฮิร์บ อัลตร้า ไวท์เทนนิ่ง โบดี้ ครีม 240ก", code: "A3-240G" },
  { name: "จุฬาเฮิร์บ อัลตร้า ไวท์เทนนิ่ง บอดี้ ครีม 40ก รุ่นซอง", code: "A3-40G-S" },
  { name: "จุฬาเฮิร์บ นวดเซียงวิเศษไข่ ซูเปอร์ โคลิน", code: "N1-15G" },
  { name: "จุฬาเฮิร์บ นวดเซียงวิเศษไข่ ซูเปอร์ คูลิ่ง", code: "N2-15G" },
  { name: "จุฬาเฮิร์บ พลัม คอลลาเจน ไนท์ ครีม 100ก", code: "K1-100G" },
  { name: "จุฬาเฮิร์บ อันจันสิงห์ ชิงจางเยียฟาง รุ่นใหม่", code: "AN1-30G" },
  { name: "จุฬาเฮิร์บ บีบี บอดี้โลชั่น 100ก", code: "A1-100G" },
  { name: "จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก หลอด", code: "A1-40G-T" },
  { name: "จุฬาเฮิร์บ อันจันสิงห์ เอสเซ้นเซีย ลิมิเต็ด เซรั่ม", code: "AN2-6G" },
  { name: "จุฬาเฮิร์บ มาสก์ ลำไยทองคำ 4 ก.", code: "M2-4G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป02เบอร์กันดี 2.5ก", code: "T5B-2.5G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน สครับ", code: "A2-40G" },
  { name: "จุฬาเฮิร์บ กลูต้า ไฮยา เซรั่ม", code: "K3-6G" },
  { name: "จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35ก.", code: "C2-35G" },
  { name: "จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8 ก. ซอง", code: "C2-8G" },
  { name: "จุฬาเฮิร์บวอเตอร์เมลอนแทททูลิป03ลิตเติ้ลดาร์ลิ่ง2ก", code: "T5C-2G" },
  { name: "จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 40ก.", code: "C2-40G" },
  { name: "จุฬาเฮิร์บ เจเด้นท์ 3 อิน 1 เฮอร์เบิล ไวท์ทูธเพสท์ออริจินัลเฟรช (ใหม่)", code: "D1-70G" },
  { name: "จุฬาเฮิร์บ เจเด้นท์ทรีเอ็กซ์เอ็กซ์ตร้า แคร์ทูธเพสท์", code: "D2-70G" },
  { name: "จุฬาเฮิร์บ ลองแกน เมลาสม่า โซฟ 70 กรัม", code: "JH906-70G" },
  { name: "จุฬาเฮิร์บ แมริโกลด์ แอคเน่ โซฟ 70กรัม", code: "JH904-70G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า โซฟ 70กรัม", code: "JH905-70G" }
];

// Generate complete sample inventory data with multiple lots per product
export const generateSampleInventoryData = () => {
  const inventoryData = [];

  // สร้างหลาย lot ต่อผลิตภัณฑ์เพื่อให้ได้ข้อมูล 350+ รายการ
  chulaherb_products.forEach((product) => {
    // สร้าง 5-8 lot ต่อผลิตภัณฑ์
    const lotsPerProduct = Math.floor(Math.random() * 4) + 5; // 5-8 lots

    for (let i = 0; i < lotsPerProduct; i++) {
      const quantities = generateQuantities();

      inventoryData.push({
        product_name: product.name,
        sku: product.code,
        location: generateRandomLocation(),
        unit_level1_quantity: Math.floor(Math.random() * 5) + 1, // 1-5 ลัง
        unit_level2_quantity: quantities.boxes, // กล่อง
        unit_level3_quantity: quantities.loose, // ชิ้น
        unit_level1_name: 'ลัง',
        unit_level2_name: 'กล่อง',
        unit_level3_name: 'ชิ้น',
        unit_level1_rate: 24, // 1 ลัง = 24 กล่อง
        unit_level2_rate: 12, // 1 กล่อง = 12 ชิ้น
        lot: generateLotNumber(),
        mfd: generateMFD(),
        user_id: '00000000-0000-0000-0000-000000000000' // Fixed user ID for demo
      });
    }
  });

  return inventoryData;
};

// Pre-generated static sample data (for consistent testing) - ใช้ฟิลด์ unit_level แบบใหม่
export const sampleInventoryData = [
  {
    product_name: "จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง",
    sku: "A1-40G",
    location: "A/2/15",
    unit_level1_quantity: 2,
    unit_level2_quantity: 5,
    unit_level3_quantity: 12,
    unit_level1_name: 'ลัง',
    unit_level2_name: 'กล่อง',
    unit_level3_name: 'ชิ้น',
    unit_level1_rate: 24,
    unit_level2_rate: 12,
    lot: "LOT2024001",
    mfd: "2024-08-15",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ บลูโรส ไวท์เทนนิ่ง อันเดอร์อาร์มครีม10ก",
    sku: "L13-10G",
    location: "B/3/8",
    unit_level1_quantity: 1,
    unit_level2_quantity: 3,
    unit_level3_quantity: 7,
    unit_level1_name: 'ลัง',
    unit_level2_name: 'กล่อง',
    unit_level3_name: 'ชิ้น',
    unit_level1_rate: 24,
    unit_level2_rate: 12,
    lot: "LOT2024002",
    mfd: "2024-09-01",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง",
    sku: "L8A-6G",
    location: "C/1/12",
    unit_level1_quantity: 3,
    unit_level2_quantity: 8,
    unit_level3_quantity: 3,
    unit_level1_name: 'ลัง',
    unit_level2_name: 'กล่อง',
    unit_level3_name: 'ชิ้น',
    unit_level1_rate: 24,
    unit_level2_rate: 12,
    lot: "LOT2024003",
    mfd: "2024-07-20",
    user_id: '00000000-0000-0000-0000-000000000000'
  }
];