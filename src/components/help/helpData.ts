export interface HelpStep {
  step: number;
  text: string;
  tip?: string;
}

export interface HelpGuide {
  id: string;
  title: string;
  icon: string;
  description: string;
  steps: HelpStep[];
  tips?: string[];
}

export const helpGuides: Record<string, HelpGuide> = {
  // ==========================================
  // DESKTOP
  // ==========================================
  'overview': {
    id: 'overview',
    title: 'หน้าภาพรวม (Dashboard)',
    icon: 'LayoutDashboard',
    description: 'หน้าหลักแสดงสรุปข้อมูลคลังสินค้าทั้งหมด',
    steps: [
      { step: 1, text: 'เลือก Warehouse ที่ต้องการดูจาก dropdown ด้านบน' },
      { step: 2, text: 'ดูสถิติด้านขวา: จำนวนรายการ, ตำแหน่ง, FG/PK' },
      { step: 3, text: 'ใช้แถบ "การดำเนินการด่วน" สำหรับ: เพิ่มสินค้า, ย้าย, ส่งออก, สแกน QR' },
      { step: 4, text: 'กดปุ่มสีเขียว "ส่งออกหลาย" เพื่อส่งออกหลายรายการพร้อมกัน' },
      { step: 5, text: 'ใช้ช่องค้นหาเพื่อหาสินค้าตามชื่อ, SKU, หรือ Location' },
    ],
    tips: [
      'กด Refresh เพื่อโหลดข้อมูลใหม่',
      'เลือกโหมด "มอนิเตอร์" เพื่อดู dashboard วิเคราะห์',
      'กรอง FG/PK ได้ที่ฟิลเตอร์ด้านขวา',
    ]
  },

  'inventory': {
    id: 'inventory',
    title: 'รายการสินค้า',
    icon: 'Package',
    description: 'ดูและจัดการรายการสินค้าทั้งหมดในคลัง',
    steps: [
      { step: 1, text: 'ดูตารางสินค้าทั้งหมด — แสดง SKU, ชื่อ, Location, จำนวน' },
      { step: 2, text: 'ใช้ช่องค้นหาด้านบนเพื่อค้นหาสินค้า' },
      { step: 3, text: 'กรองตาม Lot, รหัสสินค้า, ประเภท, สถานะ' },
      { step: 4, text: 'คลิกหัวคอลัมน์เพื่อเรียงลำดับ' },
      { step: 5, text: 'กด Export Excel / Export PDF เพื่อดาวน์โหลด' },
    ],
    tips: [
      'จำนวนแสดงแยก 3 ระดับ: ลัง > กล่อง > ชิ้น',
      '"รวม (ชิ้น)" คำนวณจากอัตราแปลงอัตโนมัติ',
    ]
  },

  'product-management': {
    id: 'product-management',
    title: 'จัดการสินค้า',
    icon: 'Settings',
    description: 'เพิ่ม แก้ไข ข้อมูลสินค้าหลัก และอัตราแปลงหน่วย',
    steps: [
      { step: 1, text: 'เลือก sub-tab: รายการสต็อก / สรุปสินค้า / จัดการข้อมูลสินค้า' },
      { step: 2, text: 'เพิ่มสินค้าใหม่: กด "+ เพิ่มสินค้า" → กรอก SKU, ชื่อ, ประเภท → บันทึก' },
      { step: 3, text: 'แก้ไขสินค้า: กดไอคอนแก้ไขที่แถวสินค้า → แก้ข้อมูล → บันทึก' },
      { step: 4, text: 'ตั้งอัตราแปลงหน่วย: เช่น 1 ลัง = 12 กล่อง = 144 ชิ้น' },
    ],
    tips: [
      'ประเภท FG = สินค้าสำเร็จรูป, PK = วัสดุบรรจุภัณฑ์',
      'SKU ต้องไม่ซ้ำกัน',
    ]
  },

  'shelf': {
    id: 'shelf',
    title: 'แผนผังคลัง (Shelf Grid)',
    icon: 'Grid3X3',
    description: 'ดูแผนผังคลังสินค้าแบบ visual — แถว A-Z, ชั้น 1-4',
    steps: [
      { step: 1, text: 'ดูแผนผังเป็น Grid — แต่ละช่องคือ 1 ตำแหน่ง (เช่น A3/2)' },
      { step: 2, text: 'สีเขียว = มีสินค้า, เทา = ว่าง' },
      { step: 3, text: 'คลิกที่ช่อง → เปิดหน้ารายละเอียดของ Location นั้น' },
      { step: 4, text: 'ใช้ช่องค้นหาเพื่อ highlight ตำแหน่งที่มีสินค้าที่ต้องการ' },
      { step: 5, text: 'กรองตามประเภท: ทั้งหมด / FG / PK' },
    ],
    tips: [
      'เลื่อนซ้าย-ขวาเพื่อดูตำแหน่งที่ไม่แสดงบนหน้าจอ',
      'ตัวเลขในช่อง = จำนวนรายการสินค้าที่ตำแหน่งนั้น',
    ]
  },

  'locations': {
    id: 'locations',
    title: 'จัดการ Location',
    icon: 'MapPin',
    description: 'สร้าง แก้ไข ลบ ตำแหน่งในคลังสินค้า',
    steps: [
      { step: 1, text: 'ดูรายการ Location ทั้งหมด' },
      { step: 2, text: 'เพิ่ม Location ใหม่: กด "+ เพิ่ม" → กรอกรหัส, แถว, ชั้น, ประเภท → บันทึก' },
      { step: 3, text: 'แก้ไข: กดไอคอนแก้ไข → เปลี่ยนข้อมูล → บันทึก' },
      { step: 4, text: 'ลบ: กดไอคอนลบ → ยืนยัน (ซ่อนจากระบบ ไม่ลบจริง)' },
    ],
  },

  'bulk-export': {
    id: 'bulk-export',
    title: 'ส่งออกหลายรายการพร้อมกัน',
    icon: 'PackageCheck',
    description: 'เลือกสินค้าหลาย Location แล้วแบ่งส่งให้ลูกค้าในครั้งเดียว',
    steps: [
      { step: 1, text: 'Step 1 - เลือกสินค้า: ค้นหาและกด "+" เพื่อเลือกสินค้าจากรายการ', tip: 'กรอง FG/PK เพื่อหาเร็วขึ้น' },
      { step: 2, text: 'Step 2 - แบ่งให้ลูกค้า: เลือกลูกค้า → ใส่จำนวน (ลัง/กล่อง/ชิ้น)', tip: 'เพิ่มหลายลูกค้าต่อสินค้าได้' },
      { step: 3, text: 'Step 3 - สรุปและยืนยัน: ตรวจสอบรายการทั้งหมด → ใส่เลข PO → กด "ยืนยันการส่งออก"' },
    ],
    tips: [
      'จำนวนรวมต้องไม่เกินสต็อกที่มี',
      'สามารถส่งสินค้าจากหลาย Location ให้ลูกค้าเดียวกันได้',
    ]
  },

  'qr-management': {
    id: 'qr-management',
    title: 'QR Code Management',
    icon: 'QrCode',
    description: 'สร้าง QR Code สำหรับติดที่ตำแหน่งคลังสินค้า',
    steps: [
      { step: 1, text: 'สร้าง QR เดี่ยว: ใส่รหัส Location → กด "สร้าง QR"' },
      { step: 2, text: 'สร้าง QR หลายตำแหน่ง: เลือกช่วง Location → กด "สร้างทั้งหมด"' },
      { step: 3, text: 'ดาวน์โหลด: กดปุ่ม Download → ได้ไฟล์ PNG' },
      { step: 4, text: 'พิมพ์: กดปุ่ม Print → พิมพ์ออกมาติดที่ชั้นวาง' },
    ],
    tips: [
      'QR Code encode URL ไปหน้า Mobile Location — สแกนแล้วเปิดทำงานได้ทันที',
      'แนะนำพิมพ์ขนาดใหญ่เพื่อสแกนง่าย',
    ]
  },

  'staging': {
    id: 'staging',
    title: 'พักสินค้า (Staging)',
    icon: 'Clock',
    description: 'ตรวจสอบรายการที่รอยืนยัน ก่อนอัปเดตสต็อกจริง',
    steps: [
      { step: 1, text: 'ดูรายการที่รออยู่ใน staging queue' },
      { step: 2, text: 'แต่ละรายการแสดง: ประเภท, สินค้า, จำนวน, Location, ผู้ทำ' },
      { step: 3, text: 'กด "ยืนยัน" → ระบบดำเนินการจริง (หัก/เพิ่มสต็อก)', tip: 'ตรวจสอบให้ดีก่อนกด เพราะจะหักสต็อกทันที' },
      { step: 4, text: 'กด "ยกเลิก" → ลบออกจาก queue' },
    ],
    tips: [
      'ทุก action จาก Mobile (รับ/ส่ง/ย้าย) จะเข้ามาที่นี่ก่อน',
      'ใช้ "ยืนยันทั้งหมด" เพื่อ confirm ทีเดียว',
    ]
  },

  'packing-list': {
    id: 'packing-list',
    title: 'รายการส่งของ (Packing List)',
    icon: 'ClipboardList',
    description: 'จัดการรายการส่งของและมอบหมายงานให้พนักงาน',
    steps: [
      { step: 1, text: 'ดูรายการ orders ที่ต้องจัดของ' },
      { step: 2, text: 'กด "ดูรายละเอียด" เพื่อเห็นสินค้าทั้งหมดใน order' },
      { step: 3, text: 'มอบหมายงาน: เลือก orders → เลือกพนักงาน → กด "มอบหมาย"' },
      { step: 4, text: 'ตรวจสอบสถานะ: จัดแล้ว / รอจัด / ส่งแล้ว' },
    ],
  },

  'task-assignment': {
    id: 'task-assignment',
    title: 'กระจายงาน',
    icon: 'Users',
    description: 'มอบหมาย shipment tasks ให้พนักงาน',
    steps: [
      { step: 1, text: 'เลือก orders ที่ต้องการกระจาย' },
      { step: 2, text: 'เลือกพนักงานที่จะมอบหมาย' },
      { step: 3, text: 'ตั้งระดับความสำคัญ (priority)' },
      { step: 4, text: 'กด "มอบหมาย" → งานไปปรากฏที่มือถือพนักงาน' },
    ],
  },

  'stock-card': {
    id: 'stock-card',
    title: 'Stock Card',
    icon: 'FileText',
    description: 'ดูประวัติการเคลื่อนไหวของสินค้าแต่ละ SKU',
    steps: [
      { step: 1, text: 'เลือกสินค้า (SKU) ที่ต้องการดู' },
      { step: 2, text: 'เลือกช่วงวันที่' },
      { step: 3, text: 'ดูประวัติ: วันที่, ประเภท (รับ/ส่ง/ย้าย), จำนวน, ยอดคงเหลือ, Location' },
    ],
  },

  'logs': {
    id: 'logs',
    title: 'ประวัติ (Event Logs)',
    icon: 'History',
    description: 'ดู log กิจกรรมทั้งหมดของระบบ',
    steps: [
      { step: 1, text: 'ดู log กิจกรรมทั้งหมด เรียงตามเวลาล่าสุด' },
      { step: 2, text: 'กรองตาม: ประเภท, ช่วงวันที่, ผู้ใช้, Location' },
      { step: 3, text: 'แต่ละ log แสดง: เวลา, ผู้ทำ, action, สินค้า, จำนวน, Location' },
    ],
  },

  'users': {
    id: 'users',
    title: 'จัดการผู้ใช้ (Admin)',
    icon: 'Shield',
    description: 'จัดการผู้ใช้, Role, แผนก และสิทธิ์การเข้าถึง',
    steps: [
      { step: 1, text: 'Tab ผู้ใช้: ดูรายชื่อ → เพิ่ม/แก้ไข/ลบผู้ใช้ → กำหนด role + แผนก' },
      { step: 2, text: 'Tab แผนก: ดู matrix สิทธิ์ → เปิด/ปิดสิทธิ์เข้าถึงแต่ละหน้า' },
      { step: 3, text: 'Tab Roles: จัดการ role → กำหนดสิทธิ์ต่อหน้า' },
    ],
    tips: [
      'super_admin เข้าถึงได้ทุกหน้า',
      'เปลี่ยน role จะมีผลทันทีหลัง login ใหม่',
    ]
  },

  // ==========================================
  // MOBILE
  // ==========================================
  'mobile-home': {
    id: 'mobile-home',
    title: 'หน้าแรก Mobile',
    icon: 'Smartphone',
    description: 'หน้าหลักสำหรับพนักงานคลังสินค้า',
    steps: [
      { step: 1, text: 'ดูสถิติวันนี้: รับเข้า / เบิกออก / ย้าย' },
      { step: 2, text: 'ดูสถานะ Shipment: รอจัด / จัดแล้ว / ส่งแล้ว' },
      { step: 3, text: 'เลือกเมนูที่ต้องการ: งานของฉัน, รับสินค้า, ย้าย, ค้นหา, นับ, เบิก, สแกน' },
    ],
  },

  'location-action': {
    id: 'location-action',
    title: 'สแกน QR ที่ Location',
    icon: 'ScanLine',
    description: 'สแกน QR Code ที่ชั้นวาง → เปิดหน้าทำงานทันที',
    steps: [
      { step: 1, text: 'สแกน QR Code ที่ติดอยู่ที่ตำแหน่ง (ใช้กล้องหรือเครื่องสแกน)' },
      { step: 2, text: 'ระบบเปิดหน้า Location โดยอัตโนมัติ — แสดงสินค้าปัจจุบัน' },
      { step: 3, text: 'เลือก action ที่ต้องการ:', tip: 'ระบบจะ pre-fill Location ให้อัตโนมัติ' },
      { step: 4, text: '   รับเข้า (เขียว) → เปิดหน้ารับสินค้า' },
      { step: 5, text: '   ส่งออก (แดง) → เปิดหน้าเบิกจ่าย' },
      { step: 6, text: '   ย้ายสินค้า (น้ำเงิน) → เปิดหน้าย้าย' },
      { step: 7, text: '   นับสต็อก (ม่วง) → เปิดหน้านับ' },
      { step: 8, text: 'ดูประวัติล่าสุด 10 รายการที่ด้านล่าง' },
    ],
    tips: [
      'ทุกครั้งที่สแกน ระบบบันทึก log "สแกน" อัตโนมัติ',
      'กด Refresh เพื่อโหลดข้อมูลล่าสุด',
    ]
  },

  'receive': {
    id: 'receive',
    title: 'รับสินค้า (Receive)',
    icon: 'ArrowDownToLine',
    description: 'รับสินค้าเข้าคลังจาก PO — สแกน → เลือก → ใส่ Location + จำนวน',
    steps: [
      { step: 1, text: 'Step 1: สแกน barcode ใบ PO หรือพิมพ์เลข PO' },
      { step: 2, text: 'ระบบแสดงรายการสินค้าใน PO' },
      { step: 3, text: 'เลือกสินค้าจากรายการ (หรือสแกน SKU)' },
      { step: 4, text: 'ใส่ Location ที่จะวาง (หรือ pre-fill จาก QR scan)' },
      { step: 5, text: 'ใส่จำนวนที่รับจริง (ลัง/กล่อง/ชิ้น)' },
      { step: 6, text: 'กด "ยืนยันรับ" → รายการเข้า Staging Queue' },
      { step: 7, text: 'ทำซ้ำจนครบทุกรายการใน PO' },
    ],
    tips: [
      'รายการจะรอใน Staging Queue จนกว่าหัวหน้างาน กด "ยืนยัน" ที่ Desktop',
      'ถ้าสแกน QR มาก่อน Location จะถูก pre-fill ให้อัตโนมัติ',
    ]
  },

  'pick': {
    id: 'pick',
    title: 'เบิกจ่าย (Pick)',
    icon: 'ArrowUpFromLine',
    description: 'หยิบสินค้าตาม Order — สแกน order → เดินไป Location → หยิบ',
    steps: [
      { step: 1, text: 'Step 1: สแกน barcode ใบ order หรือพิมพ์เลข order' },
      { step: 2, text: 'ระบบแสดงรายการสินค้าที่ต้องหยิบ (เรียงตาม Location)' },
      { step: 3, text: 'ดูสินค้าถัดไป: ชื่อ, SKU, ตำแหน่ง, จำนวนที่ต้องหยิบ' },
      { step: 4, text: 'เดินไปที่ตำแหน่ง → สแกน QR ที่ชั้น เพื่อยืนยันว่าถูกที่' },
      { step: 5, text: 'หยิบสินค้า → ใส่จำนวนที่หยิบจริง → กด "ยืนยัน"' },
      { step: 6, text: 'ทำซ้ำจนหยิบครบ → กด "ส่งทั้งหมด"' },
    ],
    tips: [
      'รายการเรียงตาม Location เพื่อให้เดินน้อยที่สุด',
      'ดู progress bar ด้านบนเพื่อติดตามความคืบหน้า',
    ]
  },

  'move': {
    id: 'move',
    title: 'ย้ายสินค้า (Move)',
    icon: 'ArrowLeftRight',
    description: 'ย้ายสินค้าจาก Location หนึ่งไปอีก Location',
    steps: [
      { step: 1, text: 'เลือกสินค้าต้นทาง: สแกน QR ที่ Location ต้นทาง (หรือ pre-fill จาก QR)' },
      { step: 2, text: 'เลือกสินค้าจากรายการที่แสดง' },
      { step: 3, text: 'เลือก Location ปลายทาง: สแกน QR หรือพิมพ์รหัส' },
      { step: 4, text: 'ใส่จำนวนที่ต้องการย้าย' },
      { step: 5, text: 'กด "ยืนยันย้าย" → รายการเข้า Staging Queue' },
    ],
    tips: [
      'ดูแผนภาพ "จาก → ไป" เพื่อยืนยันทิศทาง',
      'ย้ายไป Location ที่มีสินค้าเดียวกันอยู่ → ระบบรวมจำนวนอัตโนมัติ',
    ]
  },

  'count': {
    id: 'count',
    title: 'นับสต็อก (Count)',
    icon: 'ClipboardCheck',
    description: 'นับสินค้าจริงที่ Location แล้วเทียบกับในระบบ',
    steps: [
      { step: 1, text: 'สแกน QR ที่ Location (หรือพิมพ์รหัส)' },
      { step: 2, text: 'ระบบแสดงรายการสินค้าที่ควรอยู่ที่ตำแหน่งนี้' },
      { step: 3, text: 'นับสินค้าจริงทีละรายการ → ใส่จำนวนที่นับได้' },
      { step: 4, text: 'ระบบแสดง variance: ตรง / มากกว่า / น้อยกว่า' },
      { step: 5, text: 'นับครบ → กด "ส่งผลนับ"' },
      { step: 6, text: 'ระบบอัปเดตจำนวนตามที่นับจริง + บันทึก log' },
    ],
    tips: [
      'สีเขียว = ตรง, สีเหลือง = มากกว่า, สีแดง = น้อยกว่า',
      'นับทุกรายการก่อนกดส่ง เพื่อให้ผลนับครบถ้วน',
    ]
  },

  'lookup': {
    id: 'lookup',
    title: 'ค้นหา (Lookup)',
    icon: 'Search',
    description: 'ค้นหาสินค้าหรือ Location — สแกน QR หรือพิมพ์',
    steps: [
      { step: 1, text: 'กดปุ่มกล้อง เพื่อสแกน QR Code' },
      { step: 2, text: 'หรือพิมพ์: Location (เช่น A3/2) หรือ SKU (เช่น L3-8G)' },
      { step: 3, text: 'ผลลัพธ์: ถ้าค้นด้วย Location → แสดงสินค้าทั้งหมดที่ตำแหน่งนั้น' },
      { step: 4, text: 'ผลลัพธ์: ถ้าค้นด้วย SKU → แสดงทุก Location ที่มีสินค้านั้น' },
      { step: 5, text: 'กดที่รายการ → ดูรายละเอียด หรือเริ่ม action (ย้าย/ส่งออก)' },
    ],
  },

  'my-tasks': {
    id: 'my-tasks',
    title: 'งานของฉัน (My Tasks)',
    icon: 'ListTodo',
    description: 'ดูงาน shipment ที่ได้รับมอบหมาย',
    steps: [
      { step: 1, text: 'ดูรายการ tasks ที่มอบหมายให้คุณ' },
      { step: 2, text: 'กรองตามสถานะ: ทั้งหมด / รอจัด / จัดแล้ว' },
      { step: 3, text: 'กด "เริ่มจัดของ" → ระบบเปิดหน้า Pick โดยอัตโนมัติ' },
      { step: 4, text: 'หยิบสินค้าตาม order → ยืนยัน → เสร็จสิ้น' },
    ],
    tips: [
      'หน้านี้ auto-refresh ทุก 30 วินาที',
      'Badge แสดงจำนวนงานที่รอ',
    ]
  },

  // ==========================================
  // WORKFLOWS
  // ==========================================
  'inbound-flow': {
    id: 'inbound-flow',
    title: 'Workflow: รับสินค้าเข้าคลัง',
    icon: 'ArrowDownToLine',
    description: 'ขั้นตอนครบ: PO มาถึง → รับเข้า → ตรวจสอบ → เข้าสต็อก',
    steps: [
      { step: 1, text: '[Desktop] สร้าง/นำเข้า PO ในระบบ' },
      { step: 2, text: '[Mobile] พนักงานเปิดหน้า "รับสินค้า"' },
      { step: 3, text: '[Mobile] สแกน PO → เลือกสินค้า → ใส่ Location + จำนวน → ยืนยัน' },
      { step: 4, text: '[ระบบ] รายการเข้า Staging Queue (สถานะ: pending)' },
      { step: 5, text: '[Desktop] หัวหน้างานเปิดหน้า Staging → ตรวจสอบ → กด "ยืนยัน"' },
      { step: 6, text: '[ระบบ] สต็อกเพิ่มขึ้นจริง + บันทึก Activity Log' },
    ],
  },

  'outbound-flow': {
    id: 'outbound-flow',
    title: 'Workflow: ส่งสินค้าออก',
    icon: 'ArrowUpFromLine',
    description: 'ขั้นตอนครบ: Order → มอบหมาย → หยิบ → พัก → จัดส่ง',
    steps: [
      { step: 1, text: '[Desktop] สร้าง Order / นำเข้าจากระบบ' },
      { step: 2, text: '[Desktop] หน้า "กระจายงาน" → มอบหมายให้พนักงาน' },
      { step: 3, text: '[Mobile] พนักงานเปิด "งานของฉัน" → เห็น task → กด "เริ่มจัดของ"' },
      { step: 4, text: '[Mobile] สแกน order → เดินไป Location → สแกน QR ชั้น → หยิบ → ใส่จำนวน' },
      { step: 5, text: '[ระบบ] รายการเข้า Staging Queue' },
      { step: 6, text: '[Desktop] หัวหน้าเปิด Staging → ตรวจ → กด "ยืนยัน"' },
      { step: 7, text: '[Desktop] Packing List → ตรวจสอบของครบ → ยืนยันส่ง' },
    ],
  },

  'transfer-flow': {
    id: 'transfer-flow',
    title: 'Workflow: ย้ายสินค้าระหว่าง Location',
    icon: 'ArrowLeftRight',
    description: 'ขั้นตอนครบ: สแกน QR → เลือก → ย้าย → ยืนยัน',
    steps: [
      { step: 1, text: '[Mobile] สแกน QR ที่ Location ต้นทาง' },
      { step: 2, text: '[Mobile] กด "ย้ายสินค้า" → เลือกสินค้า' },
      { step: 3, text: '[Mobile] สแกน QR ที่ Location ปลายทาง (หรือพิมพ์)' },
      { step: 4, text: '[Mobile] ใส่จำนวน → กด "ยืนยัน"' },
      { step: 5, text: '[ระบบ] เข้า Staging Queue' },
      { step: 6, text: '[Desktop] หัวหน้า กด "ยืนยัน" ที่ Staging' },
      { step: 7, text: '[ระบบ] สต็อกต้นทางลด / ปลายทางเพิ่ม + บันทึก Log ทั้ง 2 ตำแหน่ง' },
    ],
  },

  'count-flow': {
    id: 'count-flow',
    title: 'Workflow: นับสต็อก',
    icon: 'ClipboardCheck',
    description: 'ขั้นตอนครบ: สแกน → นับ → ส่งผล → ปรับปรุง',
    steps: [
      { step: 1, text: '[Mobile] สแกน QR ที่ Location → กด "นับสต็อก"' },
      { step: 2, text: '[Mobile] ระบบแสดงรายการสินค้าที่ควรอยู่' },
      { step: 3, text: '[Mobile] นับสินค้าจริง → ใส่จำนวนทีละรายการ' },
      { step: 4, text: '[Mobile] ดู variance (ตรง/มากกว่า/น้อยกว่า)' },
      { step: 5, text: '[Mobile] กด "ส่งผลนับ"' },
      { step: 6, text: '[ระบบ] ปรับปรุงจำนวนตามที่นับจริง + บันทึก Activity Log' },
    ],
  },
  'staging-confirmation-flow': {
    id: 'staging-confirmation-flow',
    title: 'Workflow: Desktop ↔ Mobile ผ่าน Staging Queue',
    icon: 'Zap',
    description: 'หลักการสำคัญ: Mobile ไม่แก้ stock ตรง ต้องผ่าน queue → Desktop confirm',
    steps: [
      { step: 1, text: '[Mobile] พนักงานสแกน/เลือกสินค้า → addToStagingQueue() → รายการเข้า "pending"', tip: 'Mobile ห้ามแก้ inventory ตรง' },
      { step: 2, text: '[Desktop] หัวหน้างานเปิด Staging Dashboard → เห็นรายการ pending แยกตามประเภท (pick/receive/move)' },
      { step: 3, text: '[Desktop] ตรวจสอบความถูกต้อง → กด "ยืนยัน"', tip: 'รายการค้างเกิน 24 ชม. จะขึ้นกรอบแดง เตือน' },
      { step: 4, text: '[Backend] confirmStagingQueueItem() → executePick/Receive/Move → หัก/เพิ่ม inventory 3 levels พร้อมกัน' },
      { step: 5, text: '[Log] บันทึก stock_movements + location_activity_logs (user_id = UUID)' },
      { step: 6, text: '[UI] รายการหายจาก queue + Mobile เห็นสถานะอัปเดต' },
    ],
    tips: [
      'ป้องกันข้อผิดพลาด: มีจุด audit ชัดเจน แก้ไขได้ก่อน commit',
      'User ID เป็น UUID เสมอ — ไม่ใช่ email',
      'Unit Quantity เก็บครบ 3 levels (ลัง/กล่อง/ชิ้น)',
    ]
  },
};

// Map Dashboard section values to help guide IDs
export const sectionToHelpId: Record<string, string> = {
  'overview': 'overview',
  'stock-overview': 'overview',
  'inventory': 'inventory',
  'product-management': 'product-management',
  'shelf': 'shelf',
  'locations': 'locations',
  'operations': 'bulk-export',
  'qr-management': 'qr-management',
  'staging': 'staging',
  'packing-list': 'packing-list',
  'task-assignment': 'task-assignment',
  'daily-shipment': 'packing-list',
  'stock-card': 'stock-card',
  'transfer': 'move',
  'logs': 'logs',
  'users': 'users',
  'database': 'overview',
  'finance': 'overview',
  'analytics': 'overview',
  'ai-lab': 'overview',
};

// Get all guides grouped by category
export const guideCategories = [
  { label: 'Desktop', guides: ['overview', 'inventory', 'product-management', 'shelf', 'locations', 'bulk-export', 'qr-management', 'staging', 'packing-list', 'stock-card', 'logs', 'users'] },
  { label: 'Mobile', guides: ['mobile-home', 'location-action', 'receive', 'pick', 'move', 'count', 'lookup', 'my-tasks'] },
  { label: 'Workflow', guides: ['inbound-flow', 'outbound-flow', 'transfer-flow', 'count-flow', 'staging-confirmation-flow'] },
];
