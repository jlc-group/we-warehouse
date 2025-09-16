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

// Chulaherb products data
const chulaherb_products = [
  { name: "จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง", code: "A1-40G" },
  { name: "จุฬาเฮิร์บ บลูโรส ไวท์เทนนิ่ง อันเดอร์อาร์มครีม10ก", code: "L13-10G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง", code: "L8A-6G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 6 ก.รุ่นซอง", code: "L8B-6G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 30 ก.รุ่นหลอด", code: "L8A-30G" },
  { name: "จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 40ก", code: "L3-40G" },
  { name: "จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 6ก", code: "L7-6G" },
  { name: "จุฬาเฮิร์บ ลองแกน เมลาสม่า เซรั่ม 40 ก.รุ่นหลอด", code: "L4-40G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน 3D ออร่า ซันการ์ด 7ก", code: "L10-7G" },
  { name: "จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 8ก", code: "L3-8G" },
  { name: "จุฬาเฮิร์บ เรด ออเรนจ์ ออร่า ไบรท์ บอดี้ โลชั่น 40ก", code: "L11-40G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า คลีนซิ่ง วิป โฟม 40ก", code: "L14-40G" },
  { name: "จุฬาเฮิร์บ ลองแกน เมลาสม่า เซรั่ม 8 ก.รุ่นซอง", code: "L4-8G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน ฟีลเตอร์ ฟิต พาวเดอร์ 10ก", code: "T6A-10G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน ฟีลเตอร์ ฟิต พาวเดอร์ 5ก", code: "T6A-5G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน ไฮโดร ไวท์ เอสเซนส์ 15 ก.", code: "L5-15G" },
  { name: "จุฬาเฮิร์บ ลองแกน เมลาสม่า  โซฟ 70 กรัม", code: "S3-70G" },
  { name: "จุฬาเฮิร์บ แบล็ก จิงเจอร์ เคลีย เซรั่ม 40 กรัม", code: "C4-40G" },
  { name: "จุฬาเฮิร์บ แครอท เอจจิ้ง เพอร์เฟค เซรั่ม 8 ก.", code: "L6-8G" },
  { name: "จุฬาเฮิร์บ แมงโก้ เซรั่ม", code: "J8-40G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป 01 ออล สวีท 2ก", code: "T5A-2G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า คลีนซิ่ง วิป โฟม 40ก", code: "L11-40G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป02เบอร์กันดี 2ก", code: "T5B-2G" },
  { name: "จุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ 7 ก.", code: "C3-7G" },
  { name: "จุฬาเฮิร์บ แครอท เอจจิ้ง เพอร์เฟค เซรั่ม 40 ก.", code: "L6-40G" },
  { name: "จุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ 7 ก.", code: "J3-8G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน 3D ออร่า ซันการ์ด 30ก", code: "L10-30G" },
  { name: "จุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ 30 ก", code: "C3-30G" },
  { name: "จุฬาเฮิร์บ คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 6 ก", code: "C1-6G" },
  { name: "จุฬาเฮิร์บ อโวคาโด มอยส์เจอร์ ครีม 8 ก. รุ่นซอง", code: "L9-8G" },
  { name: "จุฬาเฮิร์บ แบล็คจิงเจอร์ เคลีย เซรั่ม 8 ก", code: "C4-8G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 30 ก.หลอด", code: "L8B-30G" },
  { name: "จุฬาเฮิร์บ แมริโกลด์ แอคเน่ โซฟ 70กรัม", code: "S1-70G" },
  { name: "จุฬาเฮิร์บ แบล็ก จิงเจอร์ เคลีย เซรั่ม 35ก หลอด", code: "C4-35G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า โซฟ 70กรัม", code: "S2-70G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป 01 ออล สวีท 2.5ก", code: "T5A-2.5G" },
  { name: "จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 30 ก ขวด", code: "L7-30G" },
  { name: "จุฬาเฮิร์บ มาสก์ ลำไยทองคำ 24 ก.", code: "M2-24G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป02เบอร์กันดี 2.5ก", code: "T5B-2.5G" },
  { name: "จุฬาเฮิร์บ วอเตอร์เมลอน สครับ", code: "A2-40G" },
  { name: "จุฬาเฮิร์บ กลูต้า ไฮยา เซรั่ม", code: "K3-6G" },
  { name: "จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35ก.", code: "C2-35G" },
  { name: "จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8 ก. ซอง", code: "C2-8G" },
  { name: "จุฬาเฮิร์บ แบล็ก จิงเจอร์ เคลีย เซรั่ม 40ก หลอด", code: "C4-40G-2" },
  { name: "จุฬาเฮิร์บวอเตอร์เมลอนแทททูลิป03ลิตเติ้ลดาร์ลิ่ง2ก", code: "T5C-2G" },
  { name: "จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 40ก.", code: "C2-40G" },
  { name: "จุฬาเฮิร์บ เจเด้นท์ 3 อิน 1 เฮอร์เบิล ไวท์ทูธเพสท์ออริจินัลเฟรช", code: "D1-70G" },
  { name: "จุฬาเฮิร์บ เจเด้นท์ทรีเอ็กซ์เอ็กซ์ตร้า แคร์ทูธเพสท์", code: "D2-70G" }
];

// Generate complete sample inventory data
export const generateSampleInventoryData = () => {
  return chulaherb_products.map((product) => {
    const quantities = generateQuantities();

    return {
      product_name: product.name,
      product_code: product.code,
      location: generateRandomLocation(),
      quantity_boxes: quantities.boxes,
      quantity_loose: quantities.loose,
      lot: generateLotNumber(),
      mfd: generateMFD(),
      user_id: '00000000-0000-0000-0000-000000000000' // Fixed user ID for demo
    };
  });
};

// Pre-generated static sample data (for consistent testing)
export const sampleInventoryData = [
  {
    product_name: "จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง",
    product_code: "A1-40G",
    location: "A/2/15",
    quantity_boxes: 5,
    quantity_loose: 12,
    lot: "LOT2024001",
    mfd: "2024-08-15",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ บลูโรส ไวท์เทนนิ่ง อันเดอร์อาร์มครีม10ก",
    product_code: "L13-10G",
    location: "B/3/8",
    quantity_boxes: 3,
    quantity_loose: 7,
    lot: "LOT2024002",
    mfd: "2024-09-01",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง",
    product_code: "L8A-6G",
    location: "C/1/12",
    quantity_boxes: 8,
    quantity_loose: 3,
    lot: "LOT2024003",
    mfd: "2024-07-20",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 6 ก.รุ่นซอง",
    product_code: "L8B-6G",
    location: "C/1/13",
    quantity_boxes: 6,
    quantity_loose: 15,
    lot: "LOT2024004",
    mfd: "2024-07-20",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 30 ก.รุ่นหลอด",
    product_code: "L8A-30G",
    location: "C/2/12",
    quantity_boxes: 4,
    quantity_loose: 8,
    lot: "LOT2024005",
    mfd: "2024-08-01",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 40ก",
    product_code: "L3-40G",
    location: "D/4/5",
    quantity_boxes: 7,
    quantity_loose: 2,
    lot: "LOT2024006",
    mfd: "2024-06-15",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 6ก",
    product_code: "L7-6G",
    location: "E/2/18",
    quantity_boxes: 9,
    quantity_loose: 5,
    lot: "LOT2024007",
    mfd: "2024-08-10",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ ลองแกน เมลาสม่า เซรั่ม 40 ก.รุ่นหลอด",
    product_code: "L4-40G",
    location: "F/1/7",
    quantity_boxes: 2,
    quantity_loose: 18,
    lot: "LOT2024008",
    mfd: "2024-05-25",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ วอเตอร์เมลอน 3D ออร่า ซันการ์ด 7ก",
    product_code: "L10-7G",
    location: "G/3/14",
    quantity_boxes: 5,
    quantity_loose: 11,
    lot: "LOT2024009",
    mfd: "2024-07-05",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 8ก",
    product_code: "L3-8G",
    location: "D/3/5",
    quantity_boxes: 6,
    quantity_loose: 9,
    lot: "LOT2024010",
    mfd: "2024-06-20",
    user_id: '00000000-0000-0000-0000-000000000000'
  }
  // ... (remaining products will be generated dynamically or can be added here)
];

export default { generateSampleInventoryData, sampleInventoryData };