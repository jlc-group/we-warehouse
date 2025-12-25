export interface TableColumnMeta {
  name: string;
  type: string;
  description?: string;
  isNullable?: boolean;
  isPrimaryKey?: boolean;
}

export interface TableRelationshipMeta {
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type?: 'many_to_one' | 'one_to_many' | 'many_to_many';
  description?: string;
}

export interface TableMeta {
  name: string;
  description: string;
  columns: TableColumnMeta[];
  sampleQuestions?: string[];
  relationships?: TableRelationshipMeta[];
}

export const SCHEMA_METADATA: Record<string, TableMeta> = {
  customers: {
    name: 'customers',
    description: 'ข้อมูลลูกค้าแต่ละราย ใช้สำหรับผูกกับใบขายและออเดอร์ รวมถึงวิเคราะห์ยอดขายตามลูกค้า',
    columns: [
      { name: 'id', type: 'uuid', description: 'รหัสลูกค้า', isPrimaryKey: true },
      { name: 'customer_code', type: 'text', description: 'รหัสลูกค้าใช้ค้นหา/อ้างอิง' },
      { name: 'customer_name', type: 'text', description: 'ชื่อลูกค้า/บริษัท' },
      { name: 'customer_type', type: 'text', description: 'ประเภทธุรกิจ/กลุ่มลูกค้า', isNullable: true },
      { name: 'contact_person', type: 'text', description: 'ชื่อผู้ติดต่อหลัก', isNullable: true },
      { name: 'phone', type: 'text', description: 'เบอร์ติดต่อลูกค้า', isNullable: true },
      { name: 'email', type: 'text', description: 'อีเมลลูกค้า', isNullable: true },
      { name: 'address_line1', type: 'text', description: 'ที่อยู่ (บรรทัด 1)', isNullable: true },
      { name: 'address_line2', type: 'text', description: 'ที่อยู่ (บรรทัด 2)', isNullable: true },
      { name: 'district', type: 'text', description: 'เขต/อำเภอ', isNullable: true },
      { name: 'province', type: 'text', description: 'จังหวัด', isNullable: true },
      { name: 'postal_code', type: 'text', description: 'รหัสไปรษณีย์', isNullable: true },
      { name: 'country', type: 'text', description: 'ประเทศ', isNullable: true },
      { name: 'tax_id', type: 'text', description: 'เลขประจำตัวผู้เสียภาษี', isNullable: true },
      { name: 'credit_limit', type: 'numeric', description: 'วงเงินเครดิตของลูกค้า', isNullable: true },
      { name: 'payment_terms', type: 'integer', description: 'เงื่อนไขเครดิต (จำนวนวัน)', isNullable: true },
      { name: 'is_active', type: 'boolean', description: 'สถานะการใช้งานของลูกค้า', isNullable: true },
      { name: 'notes', type: 'text', description: 'หมายเหตุเพิ่มเติมเกี่ยวกับลูกค้า', isNullable: true },
      { name: 'created_at', type: 'timestamp', description: 'เวลาที่สร้างลูกค้า', isNullable: true },
      { name: 'updated_at', type: 'timestamp', description: 'เวลาที่แก้ไขข้อมูลล่าสุด', isNullable: true }
    ],
    sampleQuestions: [
      'ตาราง customers เก็บข้อมูลอะไรบ้างเกี่ยวกับลูกค้าแต่ละราย',
      'อยากวิเคราะห์ยอดขายแยกตามลูกค้า โดยใช้ customers ร่วมกับ sales_bills',
      'อยากรู้ว่าลูกค้าคนไหน active อยู่ และอยู่จังหวัดอะไร'
    ],
    relationships: [
      {
        fromColumn: 'id',
        toTable: 'sales_bills',
        toColumn: 'customer_id',
        type: 'one_to_many',
        description: 'ลูกค้า 1 รายสามารถมีใบขายหลายใบใน sales_bills'
      },
      {
        fromColumn: 'id',
        toTable: 'customer_orders',
        toColumn: 'customer_id',
        type: 'one_to_many',
        description: 'ลูกค้า 1 รายอาจมี customer_orders หลายออเดอร์ (เวอร์ชันเก่าของ workflow)'
      }
    ]
  },
  products: {
    name: 'products',
    description: 'ข้อมูลสินค้าเชิง master data เช่น ประเภทสินค้า แบรนด์ SKU และต้นทุน ใช้ร่วมกับสต็อกและยอดขาย',
    columns: [
      { name: 'id', type: 'uuid', description: 'รหัสสินค้า', isPrimaryKey: true },
      { name: 'product_name', type: 'text', description: 'ชื่อสินค้า', isNullable: true },
      { name: 'product_type', type: 'text', description: 'ประเภทสินค้า เช่น finished goods, raw material', isNullable: true },
      { name: 'category', type: 'text', description: 'หมวดหมู่สินค้า', isNullable: true },
      { name: 'subcategory', type: 'text', description: 'หมวดหมู่ย่อย', isNullable: true },
      { name: 'brand', type: 'text', description: 'แบรนด์สินค้า', isNullable: true },
      { name: 'sku_code', type: 'text', description: 'รหัส SKU หลักของสินค้า', isNullable: true },
      { name: 'unit_of_measure', type: 'text', description: 'หน่วยวัดหลักของสินค้า เช่น ชิ้น, กล่อง', isNullable: true },
      { name: 'unit_cost', type: 'numeric', description: 'ต้นทุนต่อหน่วย', isNullable: true },
      { name: 'max_stock_level', type: 'numeric', description: 'ระดับสต็อกสูงสุดที่แนะนำ', isNullable: true },
      { name: 'reorder_level', type: 'numeric', description: 'จุดสั่งซื้อซ้ำ (minimum level)', isNullable: true },
      { name: 'weight', type: 'numeric', description: 'น้ำหนักสินค้า', isNullable: true },
      { name: 'dimensions', type: 'text', description: 'ขนาด/มิติของสินค้า', isNullable: true },
      { name: 'storage_conditions', type: 'text', description: 'เงื่อนไขการจัดเก็บ (เช่น แช่เย็น, หลีกเลี่ยงแสงแดด)', isNullable: true },
      { name: 'manufacturing_country', type: 'text', description: 'ประเทศผู้ผลิต', isNullable: true },
      { name: 'description', type: 'text', description: 'คำอธิบายสินค้า', isNullable: true },
      { name: 'is_active', type: 'boolean', description: 'สถานะการใช้งานของสินค้า', isNullable: true },
      { name: 'created_at', type: 'timestamp', description: 'เวลาที่สร้างสินค้า', isNullable: true },
      { name: 'updated_at', type: 'timestamp', description: 'เวลาที่อัปเดตล่าสุด', isNullable: true }
    ],
    sampleQuestions: [
      'ตาราง products มี field อะไรที่เกี่ยวกับต้นทุนและประเภทสินค้า',
      'อยากวิเคราะห์ยอดขายแยกตามประเภทสินค้า โดยใช้ products ร่วมกับ sales_bill_items',
      'อยากดูว่าสินค้าแต่ละ SKU มี reorder level กับ max_stock_level เท่าไหร่'
    ],
    relationships: [
      {
        fromColumn: 'id',
        toTable: 'sales_bill_items',
        toColumn: 'product_id',
        type: 'one_to_many',
        description: 'สินค้า 1 ตัวถูกขายในหลายบรรทัดของ sales_bill_items'
      },
      {
        fromColumn: 'sku_code',
        toTable: 'inventory_items',
        toColumn: 'sku',
        type: 'one_to_many',
        description: 'รหัส SKU ใน products ใช้เชื่อมกับสต็อกจริงใน inventory_items.sku'
      }
    ]
  },
  inventory_items: {
    name: 'inventory_items',
    description: 'เก็บข้อมูลสินค้าคงคลังตามตำแหน่งจัดเก็บในแต่ละคลัง',
    columns: [
      { name: 'id', type: 'uuid', description: 'รหัส record', isPrimaryKey: true },
      { name: 'sku', type: 'text', description: 'รหัสสินค้า (SKU)' },
      { name: 'product_name', type: 'text', description: 'ชื่อสินค้า' },
      { name: 'warehouse_id', type: 'uuid', description: 'อ้างอิงคลังสินค้า (warehouses.id)', isNullable: true },
      { name: 'location', type: 'text', description: 'ตำแหน่งจัดเก็บ เช่น A/1/01', isNullable: true },
      { name: 'unit_level3_quantity', type: 'numeric', description: 'จำนวนคงเหลือในหน่วยเล็กสุด (เช่น ชิ้น)', isNullable: true },
      { name: 'quantity_pieces', type: 'numeric', description: 'จำนวนคงเหลือ (ชิ้น)', isNullable: true },
      { name: 'lot', type: 'text', description: 'เลข LOT ของสินค้า', isNullable: true },
      { name: 'mfd', type: 'date', description: 'วันผลิต', isNullable: true },
      { name: 'exp', type: 'date', description: 'วันหมดอายุ', isNullable: true },
      { name: 'updated_at', type: 'timestamp', description: 'เวลาที่แก้ไขล่าสุด', isNullable: true }
    ],
    sampleQuestions: [
      'ตาราง inventory_items มี field อะไรที่สำคัญบ้าง',
      'ข้อมูลใน inventory_items ใช้สำหรับวิเคราะห์สต็อกอะไรได้บ้าง'
    ],
    relationships: [
      {
        fromColumn: 'warehouse_id',
        toTable: 'warehouses',
        toColumn: 'id',
        type: 'many_to_one',
        description: 'แต่ละแถวของ inventory_items อยู่ในคลังสินค้าใด (เชื่อมกับ warehouses)'
      }
    ]
  },
  inventory_history: {
    name: 'inventory_history',
    description: 'บันทึกประวัติการเคลื่อนไหวของสินค้าแต่ละ SKU/ตำแหน่ง',
    columns: [
      { name: 'id', type: 'uuid', description: 'รหัสประวัติการเคลื่อนไหว', isPrimaryKey: true },
      { name: 'action', type: 'text', description: 'ประเภทการเคลื่อนไหว เช่น add/remove/transfer' },
      { name: 'product_name', type: 'text', description: 'ชื่อสินค้า ณ ขณะนั้น', isNullable: true },
      { name: 'sku', type: 'text', description: 'รหัสสินค้า (SKU)' },
      { name: 'quantity_change', type: 'numeric', description: 'จำนวนที่เพิ่ม/ลด (+/-)', isNullable: true },
      { name: 'location', type: 'text', description: 'ตำแหน่งที่เกี่ยวข้องกับการเคลื่อนไหว', isNullable: true },
      { name: 'created_at', type: 'timestamp', description: 'เวลาที่เกิดเหตุการณ์', isNullable: true },
      { name: 'user_id', type: 'uuid', description: 'ผู้ใช้งานที่ทำรายการ', isNullable: true }
    ],
    sampleQuestions: [
      'ตาราง inventory_history เก็บประวัติอะไรบ้าง',
      'อยากดู movement ล่าสุดของสินค้าแต่ละตัวจาก inventory_history'
    ]
  },
  warehouses: {
    name: 'warehouses',
    description: 'ข้อมูลคลังสินค้าแต่ละแห่ง',
    columns: [
      { name: 'id', type: 'uuid', description: 'รหัสคลังสินค้า', isPrimaryKey: true },
      { name: 'name', type: 'text', description: 'ชื่อคลังสินค้า' },
      { name: 'code', type: 'text', description: 'รหัสคลัง เช่น A, B, C', isNullable: true },
      { name: 'is_active', type: 'boolean', description: 'สถานะการใช้งานของคลัง', isNullable: true },
      { name: 'created_at', type: 'timestamp', description: 'เวลาที่สร้างคลัง', isNullable: true }
    ],
    sampleQuestions: [
      'มีคลังอะไรบ้างในระบบ และแต่ละคลังเอาไว้ทำอะไร',
      'อยากดูสถิติสรุปตามคลังจาก warehouses และ inventory_items'
    ],
    relationships: [
      {
        fromColumn: 'id',
        toTable: 'inventory_items',
        toColumn: 'warehouse_id',
        type: 'one_to_many',
        description: 'คลังสินค้าแต่ละแห่งมีรายการสต็อกใน inventory_items หลายแถว'
      }
    ]
  },
  sales_bills: {
    name: 'sales_bills',
    description: 'ตารางใบขาย/ใบเสนอราคาหลักของระบบ (ต้นทางของ workflow การขาย → คลัง → จัดส่ง)',
    columns: [
      { name: 'id', type: 'uuid', description: 'รหัสใบขาย', isPrimaryKey: true },
      { name: 'bill_number', type: 'text', description: 'เลขที่ใบขาย/ใบเสนอราคา' },
      { name: 'customer_id', type: 'uuid', description: 'อ้างอิงลูกค้า (customers.id)' },
      { name: 'bill_date', type: 'date', description: 'วันที่ออกใบขาย' },
      { name: 'status', type: 'enum(sales_bill_status)', description: 'สถานะของใบขาย เช่น draft, confirmed, sent_to_warehouse, shipped, delivered' },
      { name: 'bill_type', type: 'enum(sales_bill_type)', description: 'ประเภทใบ เช่น sale, quote, pro_forma' },
      { name: 'priority', type: 'enum(priority_level)', description: 'ลำดับความสำคัญของใบขาย เช่น urgent' },
      { name: 'customer_po_number', type: 'text', description: 'เลขที่ PO ของลูกค้า', isNullable: true },
      { name: 'payment_terms', type: 'integer', description: 'เงื่อนไขเครดิต (จำนวนวัน)', isNullable: true },
      { name: 'due_date', type: 'date', description: 'กำหนดชำระเงิน', isNullable: true },
      { name: 'subtotal', type: 'numeric', description: 'ยอดก่อนภาษี' },
      { name: 'tax_amount', type: 'numeric', description: 'ยอดภาษีมูลค่าเพิ่ม' },
      { name: 'discount_amount', type: 'numeric', description: 'ยอดส่วนลดรวม' },
      { name: 'total_amount', type: 'numeric', description: 'ยอดรวมสุทธิ' },
      { name: 'shipping_address_line1', type: 'text', description: 'ที่อยู่จัดส่ง (บรรทัด 1)', isNullable: true },
      { name: 'shipping_address_line2', type: 'text', description: 'ที่อยู่จัดส่ง (บรรทัด 2)', isNullable: true },
      { name: 'shipping_district', type: 'text', description: 'เขต/อำเภอ', isNullable: true },
      { name: 'shipping_province', type: 'text', description: 'จังหวัด', isNullable: true },
      { name: 'shipping_postal_code', type: 'text', description: 'รหัสไปรษณีย์', isNullable: true },
      { name: 'shipping_contact_person', type: 'text', description: 'ผู้ติดต่อสำหรับการจัดส่ง', isNullable: true },
      { name: 'shipping_phone', type: 'text', description: 'เบอร์ติดต่อจัดส่ง', isNullable: true },
      { name: 'sales_person_id', type: 'uuid', description: 'พนักงานขายผู้รับผิดชอบ', isNullable: true },
      { name: 'sales_notes', type: 'text', description: 'หมายเหตุสำหรับลูกค้า/การขาย', isNullable: true },
      { name: 'internal_notes', type: 'text', description: 'หมายเหตุภายในทีม', isNullable: true },
      { name: 'created_at', type: 'timestamp', description: 'เวลาที่สร้างใบขาย' },
      { name: 'updated_at', type: 'timestamp', description: 'เวลาที่อัปเดตล่าสุด' },
      { name: 'created_by', type: 'uuid', description: 'ผู้สร้างใบขาย', isNullable: true },
      { name: 'updated_by', type: 'uuid', description: 'ผู้แก้ไขใบขายล่าสุด', isNullable: true }
    ],
    sampleQuestions: [
      'ตาราง sales_bills เก็บข้อมูลอะไรบ้างเกี่ยวกับใบขายและลูกค้า',
      'status ใน sales_bills ใช้สำหรับติดตามสถานะ workflow ยังไง',
      'อยากดูภาพรวมยอดขายจาก sales_bills ตามช่วงเวลา'
    ],
    relationships: [
      {
        fromColumn: 'customer_id',
        toTable: 'customers',
        toColumn: 'id',
        type: 'many_to_one',
        description: 'ใบขายแต่ละใบอ้างอิงลูกค้า 1 รายจากตาราง customers'
      },
      {
        fromColumn: 'id',
        toTable: 'sales_bill_items',
        toColumn: 'sales_bill_id',
        type: 'one_to_many',
        description: 'ใบขาย 1 ใบมีหลายรายการสินค้าใน sales_bill_items'
      },
      {
        fromColumn: 'id',
        toTable: 'warehouse_assignments',
        toColumn: 'sales_bill_id',
        type: 'one_to_many',
        description: 'ใบขาย 1 ใบถูกแตกออกเป็นงานในคลังหลายแถวใน warehouse_assignments'
      },
      {
        fromColumn: 'id',
        toTable: 'fulfillment_orders',
        toColumn: 'sales_bill_id',
        type: 'one_to_many',
        description: 'ใบขาย 1 ใบสามารถมีใบจัดส่ง (fulfillment_orders) ได้หลายใบ ถ้าแยกส่งหลายรอบ'
      }
    ]
  },
  sales_bill_items: {
    name: 'sales_bill_items',
    description: 'รายละเอียดสินค้าแต่ละรายการในใบขาย (ผูกกับ sales_bills และ products)',
    columns: [
      { name: 'id', type: 'uuid', description: 'รหัสบรรทัดสินค้าในใบขาย', isPrimaryKey: true },
      { name: 'sales_bill_id', type: 'uuid', description: 'อ้างอิงไปยังใบขาย (sales_bills.id)' },
      { name: 'line_number', type: 'integer', description: 'ลำดับบรรทัดในใบขาย' },
      { name: 'product_id', type: 'uuid', description: 'อ้างอิงสินค้า (products.id)', isNullable: true },
      { name: 'product_name', type: 'text', description: 'ชื่อสินค้าที่แสดงบนใบขาย' },
      { name: 'product_code', type: 'text', description: 'รหัสสินค้า', isNullable: true },
      { name: 'sku', type: 'text', description: 'รหัส SKU ของสินค้า', isNullable: true },
      { name: 'quantity_level1', type: 'numeric', description: 'จำนวนในหน่วยใหญ่สุด (เช่น ลัง)', isNullable: false },
      { name: 'quantity_level2', type: 'numeric', description: 'จำนวนในหน่วยกลาง (เช่น ห่อ)', isNullable: false },
      { name: 'quantity_level3', type: 'numeric', description: 'จำนวนในหน่วยเล็กสุด (เช่น ชิ้น)', isNullable: false },
      { name: 'unit_level1_name', type: 'text', description: 'ชื่อหน่วยใหญ่สุด', isNullable: false },
      { name: 'unit_level2_name', type: 'text', description: 'ชื่อหน่วยกลาง', isNullable: false },
      { name: 'unit_level3_name', type: 'text', description: 'ชื่อหน่วยเล็กสุด', isNullable: false },
      { name: 'unit_level1_rate', type: 'numeric', description: 'อัตราแปลงหน่วยใหญ่ → หน่วยเล็ก', isNullable: false },
      { name: 'unit_level2_rate', type: 'numeric', description: 'อัตราแปลงหน่วยกลาง → หน่วยเล็ก', isNullable: false },
      { name: 'unit_price', type: 'numeric', description: 'ราคาต่อหน่วย (ตามหน่วยขายหลัก)' },
      { name: 'line_total', type: 'numeric', description: 'ยอดรวมก่อนส่วนลดของบรรทัดนี้' },
      { name: 'discount_percentage', type: 'numeric', description: 'ส่วนลดเป็นเปอร์เซ็นต์', isNullable: false },
      { name: 'discount_amount', type: 'numeric', description: 'มูลค่าส่วนลดของบรรทัด', isNullable: false },
      { name: 'status', type: 'enum(sales_bill_item_status)', description: 'สถานะบรรทัด เช่น pending, assigned, picked, packed, shipped' },
      { name: 'notes', type: 'text', description: 'หมายเหตุบรรทัดสินค้า', isNullable: true },
      { name: 'special_instructions', type: 'text', description: 'คำแนะนำพิเศษในการจัดเตรียม/จัดส่ง', isNullable: true },
      { name: 'created_at', type: 'timestamp', description: 'เวลาที่สร้างบรรทัดนี้' },
      { name: 'updated_at', type: 'timestamp', description: 'เวลาที่อัปเดตล่าสุด' }
    ],
    sampleQuestions: [
      'ตาราง sales_bill_items ผูกกับ sales_bills และ products ยังไง',
      'อยากวิเคราะห์ยอดขายรายสินค้าโดยใช้ sales_bill_items',
      'status ของแต่ละบรรทัดสินค้าใน sales_bill_items บอกขั้นตอนไหนของกระบวนการคลัง'
    ],
    relationships: [
      {
        fromColumn: 'sales_bill_id',
        toTable: 'sales_bills',
        toColumn: 'id',
        type: 'many_to_one',
        description: 'แต่ละบรรทัดสินค้าอยู่ภายใต้ใบขาย 1 ใบใน sales_bills'
      },
      {
        fromColumn: 'product_id',
        toTable: 'products',
        toColumn: 'id',
        type: 'many_to_one',
        description: 'ถ้ามี product_id จะเชื่อมไปยังข้อมูลสินค้าในตาราง products'
      },
      {
        fromColumn: 'id',
        toTable: 'warehouse_assignments',
        toColumn: 'sales_bill_item_id',
        type: 'one_to_many',
        description: 'บรรทัดสินค้า 1 รายการอาจกระจายไปเป็นงานหยิบหลายตำแหน่งใน warehouse_assignments'
      }
    ]
  },
  warehouse_assignments: {
    name: 'warehouse_assignments',
    description: 'งานที่มอบหมายให้คลังหยิบสินค้าจากตำแหน่งจริง เพื่อตอบสนองใบขายแต่ละบรรทัด',
    columns: [
      { name: 'id', type: 'uuid', description: 'รหัสงานมอบหมายในคลัง', isPrimaryKey: true },
      { name: 'sales_bill_id', type: 'uuid', description: 'อ้างอิงใบขาย (sales_bills.id)' },
      { name: 'sales_bill_item_id', type: 'uuid', description: 'อ้างอิงบรรทัดสินค้า (sales_bill_items.id)' },
      { name: 'assigned_by', type: 'uuid', description: 'ผู้มอบหมายงานในคลัง' },
      { name: 'assigned_at', type: 'timestamp', description: 'เวลาที่มอบหมายงาน' },
      { name: 'assignment_status', type: 'enum(assignment_status)', description: 'สถานะงานคลัง เช่น assigned, picked, packed, ready_to_ship, shipped' },
      { name: 'inventory_item_id', type: 'uuid', description: 'อ้างอิงสินค้าในคลังจริง (inventory_items.id)' },
      { name: 'source_location', type: 'text', description: 'ตำแหน่งชั้นวางที่ให้หยิบสินค้า (เชื่อมกับ inventory_items.location)' },
      { name: 'assigned_quantity_level1', type: 'numeric', description: 'จำนวนที่มอบหมาย (หน่วยใหญ่สุด)', isNullable: false },
      { name: 'assigned_quantity_level2', type: 'numeric', description: 'จำนวนที่มอบหมาย (หน่วยกลาง)', isNullable: false },
      { name: 'assigned_quantity_level3', type: 'numeric', description: 'จำนวนที่มอบหมาย (หน่วยเล็กสุด)', isNullable: false },
      { name: 'picked_quantity_level1', type: 'numeric', description: 'จำนวนที่หยิบจริง (หน่วยใหญ่สุด)', isNullable: false },
      { name: 'picked_quantity_level2', type: 'numeric', description: 'จำนวนที่หยิบจริง (หน่วยกลาง)', isNullable: false },
      { name: 'picked_quantity_level3', type: 'numeric', description: 'จำนวนที่หยิบจริง (หน่วยเล็กสุด)', isNullable: false },
      { name: 'picked_by', type: 'uuid', description: 'ผู้หยิบสินค้า', isNullable: true },
      { name: 'picked_at', type: 'timestamp', description: 'เวลาที่หยิบสินค้า', isNullable: true },
      { name: 'packed_by', type: 'uuid', description: 'ผู้แพ็คสินค้า', isNullable: true },
      { name: 'packed_at', type: 'timestamp', description: 'เวลาที่แพ็คสินค้า', isNullable: true },
      { name: 'picker_notes', type: 'text', description: 'โน้ตจากผู้หยิบ', isNullable: true },
      { name: 'warehouse_notes', type: 'text', description: 'หมายเหตุอื่น ๆ จากคลัง', isNullable: true },
      { name: 'created_at', type: 'timestamp', description: 'เวลาที่สร้างงานมอบหมาย' },
      { name: 'updated_at', type: 'timestamp', description: 'เวลาที่อัปเดตงานล่าสุด' }
    ],
    sampleQuestions: [
      'อยากดูว่างานในคลัง (warehouse_assignments) ถูกสร้างจากใบขายยังไง',
      'assignment_status ใช้ติดตามขั้นตอนการหยิบ/แพ็คสินค้าในคลังยังไง',
      'อยากวิเคราะห์ประสิทธิภาพการหยิบสินค้าตามตำแหน่งชั้นวางจาก warehouse_assignments'
    ],
    relationships: [
      {
        fromColumn: 'sales_bill_id',
        toTable: 'sales_bills',
        toColumn: 'id',
        type: 'many_to_one',
        description: 'งานในคลังแต่ละงานมาจากใบขาย 1 ใบ'
      },
      {
        fromColumn: 'sales_bill_item_id',
        toTable: 'sales_bill_items',
        toColumn: 'id',
        type: 'many_to_one',
        description: 'งานในคลังอ้างอิงไปยังบรรทัดสินค้าในใบขาย'
      },
      {
        fromColumn: 'inventory_item_id',
        toTable: 'inventory_items',
        toColumn: 'id',
        type: 'many_to_one',
        description: 'งานในคลังแต่ละแถวจะชี้ไปยังสินค้าจริงในสต็อกจาก inventory_items'
      }
    ]
  },
  fulfillment_orders: {
    name: 'fulfillment_orders',
    description: 'ใบจัดส่ง/ใบ Fulfillment สุดท้ายที่ใช้ติดตามการจัดส่งสินค้าให้ลูกค้า',
    columns: [
      { name: 'id', type: 'uuid', description: 'รหัสใบจัดส่ง', isPrimaryKey: true },
      { name: 'fulfillment_number', type: 'text', description: 'เลขที่ใบจัดส่ง' },
      { name: 'sales_bill_id', type: 'uuid', description: 'อ้างอิงใบขายต้นทาง (sales_bills.id)' },
      { name: 'status', type: 'enum(fulfillment_status)', description: 'สถานะใบจัดส่ง เช่น preparing, ready_to_ship, shipped, delivered, returned' },
      { name: 'carrier', type: 'text', description: 'ผู้ให้บริการขนส่ง (เช่น Kerry, Flash)', isNullable: true },
      { name: 'tracking_number', type: 'text', description: 'หมายเลขติดตามพัสดุ', isNullable: true },
      { name: 'shipping_cost', type: 'numeric', description: 'ค่าขนส่ง', isNullable: true },
      { name: 'estimated_delivery_date', type: 'date', description: 'วันที่คาดว่าจะส่งถึง', isNullable: true },
      { name: 'actual_delivery_date', type: 'date', description: 'วันที่ส่งถึงจริง', isNullable: true },
      { name: 'prepared_by', type: 'uuid', description: 'ผู้เตรียมของ', isNullable: true },
      { name: 'prepared_at', type: 'timestamp', description: 'เวลาที่เตรียมของเสร็จ', isNullable: true },
      { name: 'shipped_by', type: 'uuid', description: 'ผู้ทำการส่งออกจากคลัง', isNullable: true },
      { name: 'shipped_at', type: 'timestamp', description: 'เวลาที่ส่งออกจริง', isNullable: true },
      { name: 'stock_deducted_at', type: 'timestamp', description: 'เวลาที่ตัดสต็อกจากคลัง', isNullable: true },
      { name: 'stock_deducted_by', type: 'uuid', description: 'ผู้ที่สั่งตัดสต็อก', isNullable: true },
      { name: 'fulfillment_notes', type: 'text', description: 'หมายเหตุเกี่ยวกับการจัดส่ง', isNullable: true },
      { name: 'delivery_instructions', type: 'text', description: 'คำแนะนำพิเศษสำหรับคนส่งของ', isNullable: true },
      { name: 'created_at', type: 'timestamp', description: 'เวลาที่สร้างใบจัดส่ง' },
      { name: 'updated_at', type: 'timestamp', description: 'เวลาที่อัปเดตใบจัดส่งล่าสุด' }
    ],
    sampleQuestions: [
      'ตาราง fulfillment_orders ใช้ติดตามสถานะการจัดส่งยังไง',
      'อยากดู performance การจัดส่ง เช่น shipped → delivered ใช้เวลานานเท่าไหร่',
      'อยากวิเคราะห์ค่าขนส่งรวม และ carrier ที่ใช้บ่อยจาก fulfillment_orders'
    ],
    relationships: [
      {
        fromColumn: 'sales_bill_id',
        toTable: 'sales_bills',
        toColumn: 'id',
        type: 'many_to_one',
        description: 'ใบจัดส่งแต่ละใบเชื่อมกับใบขายต้นทาง 1 ใบใน sales_bills'
      }
    ]
  }
};
