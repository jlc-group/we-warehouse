-- Migration: Inbound Receipts System
-- Created: 2025-10-10
-- Description: ระบบรับเข้าสินค้า (Inbound Receipts) สำหรับ FG และ PK

-- =====================================================
-- Table: inbound_receipts (หัวรายการรับเข้า)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inbound_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- เลขที่เอกสาร
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  receipt_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- ประเภทการรับเข้า
  receipt_type VARCHAR(20) NOT NULL CHECK (receipt_type IN (
    'po_fg',        -- รับจากโรงงาน (Finished Goods) - มี PO
    'po_pk',        -- รับจากซัพพลายเออร์ (Packaging) - มี PO
    'manual',       -- รับเข้าด้วยตนเอง (ไม่มี PO)
    'return',       -- สินค้าคืน
    'adjustment'    -- ปรับสต็อก
  )),

  -- ข้อมูลผู้ส่ง
  supplier_code VARCHAR(100),
  supplier_name VARCHAR(255),

  -- อ้างอิง PO (ถ้ามี)
  po_number VARCHAR(50),
  po_date TIMESTAMP WITH TIME ZONE,

  -- ข้อมูลการส่ง
  delivery_note_number VARCHAR(100),
  delivery_date TIMESTAMP WITH TIME ZONE,
  carrier_name VARCHAR(200),
  tracking_number VARCHAR(100),

  -- สถานะ
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft',        -- ร่าง
    'received',     -- รับเข้าแล้ว
    'qc_pending',   -- รอตรวจสอบคุณภาพ
    'qc_approved',  -- ผ่านการตรวจสอบ
    'qc_rejected',  -- ไม่ผ่านการตรวจสอบ
    'completed',    -- เสร็จสิ้น (เข้าสต็อกแล้ว)
    'cancelled'     -- ยกเลิก
  )),

  -- คลังที่รับเข้า
  warehouse_id UUID REFERENCES warehouses(id),
  warehouse_name VARCHAR(200),

  -- จำนวนรายการ
  total_items INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0, -- จำนวนรวมทั้งหมด (base unit)

  -- หมายเหตุ
  notes TEXT,
  internal_notes TEXT,
  qc_notes TEXT,

  -- ผู้รับผิดชอบ
  received_by UUID REFERENCES auth.users(id),
  qc_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),

  -- วันที่สำคัญ
  received_at TIMESTAMP WITH TIME ZONE,
  qc_completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index สำหรับ performance
CREATE INDEX idx_inbound_receipts_receipt_number ON public.inbound_receipts(receipt_number);
CREATE INDEX idx_inbound_receipts_po_number ON public.inbound_receipts(po_number);
CREATE INDEX idx_inbound_receipts_status ON public.inbound_receipts(status);
CREATE INDEX idx_inbound_receipts_receipt_type ON public.inbound_receipts(receipt_type);
CREATE INDEX idx_inbound_receipts_receipt_date ON public.inbound_receipts(receipt_date DESC);
CREATE INDEX idx_inbound_receipts_warehouse_id ON public.inbound_receipts(warehouse_id);

-- =====================================================
-- Table: inbound_receipt_items (รายการสินค้าที่รับเข้า)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inbound_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- อ้างอิง receipt
  inbound_receipt_id UUID NOT NULL REFERENCES inbound_receipts(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,

  -- ข้อมูลสินค้า
  product_id UUID REFERENCES products(id),
  product_code VARCHAR(100),
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),

  -- จำนวนที่สั่ง (จาก PO) - ถ้ามี
  ordered_quantity_level1 INTEGER DEFAULT 0, -- ลัง
  ordered_quantity_level2 INTEGER DEFAULT 0, -- กล่อง
  ordered_quantity_level3 INTEGER DEFAULT 0, -- ชิ้น

  -- จำนวนที่รับจริง
  received_quantity_level1 INTEGER DEFAULT 0,
  received_quantity_level2 INTEGER DEFAULT 0,
  received_quantity_level3 INTEGER DEFAULT 0,

  -- หน่วยและอัตราแปลง (snapshot)
  unit_level1_name VARCHAR(50) DEFAULT 'ลัง',
  unit_level2_name VARCHAR(50) DEFAULT 'กล่อง',
  unit_level3_name VARCHAR(50) DEFAULT 'ชิ้น',
  unit_level1_rate INTEGER DEFAULT 144, -- 1 ลัง = 144 ชิ้น
  unit_level2_rate INTEGER DEFAULT 12,  -- 1 กล่อง = 12 ชิ้น

  -- คำนวณจำนวนรวม (base unit = pieces)
  total_received_pieces INTEGER GENERATED ALWAYS AS (
    (received_quantity_level1 * unit_level1_rate) +
    (received_quantity_level2 * unit_level2_rate) +
    received_quantity_level3
  ) STORED,

  -- ตำแหน่งเก็บ
  location VARCHAR(50),

  -- ข้อมูล Lot/Batch
  lot_number VARCHAR(100),
  batch_number VARCHAR(100),
  manufacturing_date DATE,
  expiry_date DATE,

  -- Quality Control
  qc_status VARCHAR(20) DEFAULT 'pending' CHECK (qc_status IN (
    'pending',      -- รอตรวจสอบ
    'approved',     -- ผ่าน
    'rejected',     -- ไม่ผ่าน
    'partial'       -- ผ่านบางส่วน
  )),
  qc_approved_qty INTEGER DEFAULT 0,
  qc_rejected_qty INTEGER DEFAULT 0,
  qc_notes TEXT,

  -- ราคา (ถ้ามี)
  unit_price DECIMAL(10,4),
  total_amount DECIMAL(15,2),

  -- สถานะ
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- รอดำเนินการ
    'received',     -- รับเข้าแล้ว
    'stocked',      -- เข้าสต็อกแล้ว
    'rejected'      -- ปฏิเสธ
  )),

  -- หมายเหตุ
  notes TEXT,

  -- เชื่อมโยงกับ inventory_items (หลังจากเข้าสต็อก)
  inventory_item_id UUID REFERENCES inventory_items(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint
  UNIQUE(inbound_receipt_id, line_number)
);

-- Index
CREATE INDEX idx_inbound_receipt_items_receipt_id ON public.inbound_receipt_items(inbound_receipt_id);
CREATE INDEX idx_inbound_receipt_items_product_id ON public.inbound_receipt_items(product_id);
CREATE INDEX idx_inbound_receipt_items_lot_number ON public.inbound_receipt_items(lot_number);
CREATE INDEX idx_inbound_receipt_items_status ON public.inbound_receipt_items(status);
CREATE INDEX idx_inbound_receipt_items_location ON public.inbound_receipt_items(location);

-- =====================================================
-- Table: inbound_qc_logs (บันทึกการตรวจสอบคุณภาพ)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inbound_qc_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- อ้างอิง
  inbound_receipt_id UUID NOT NULL REFERENCES inbound_receipts(id) ON DELETE CASCADE,
  inbound_receipt_item_id UUID REFERENCES inbound_receipt_items(id) ON DELETE CASCADE,

  -- ผลการตรวจสอบ
  qc_result VARCHAR(20) NOT NULL CHECK (qc_result IN (
    'pass',         -- ผ่าน
    'fail',         -- ไม่ผ่าน
    'conditional'   -- ผ่านแบบมีเงื่อนไข
  )),

  -- รายละเอียด
  qc_criteria TEXT,      -- เกณฑ์การตรวจสอบ
  qc_findings TEXT,      -- ผลการตรวจสอบ
  qc_notes TEXT,         -- หมายเหตุ

  -- คะแนน (ถ้ามี)
  qc_score DECIMAL(5,2),
  max_score DECIMAL(5,2),

  -- รูปถ่าย (URLs)
  photo_urls TEXT[],

  -- ผู้ตรวจสอบ
  qc_inspector_id UUID REFERENCES auth.users(id),
  qc_inspector_name VARCHAR(200),

  -- เวลา
  qc_performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_inbound_qc_logs_receipt_id ON public.inbound_qc_logs(inbound_receipt_id);
CREATE INDEX idx_inbound_qc_logs_item_id ON public.inbound_qc_logs(inbound_receipt_item_id);
CREATE INDEX idx_inbound_qc_logs_result ON public.inbound_qc_logs(qc_result);

-- =====================================================
-- Functions & Triggers
-- =====================================================

-- Function: Auto-generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'GR' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('receipt_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- Trigger: Auto-generate receipt number
CREATE TRIGGER trg_generate_receipt_number
  BEFORE INSERT ON public.inbound_receipts
  FOR EACH ROW
  EXECUTE FUNCTION generate_receipt_number();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inbound_receipt_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp on inbound_receipts
CREATE TRIGGER trg_update_inbound_receipt_timestamp
  BEFORE UPDATE ON public.inbound_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_inbound_receipt_timestamp();

-- Trigger: Update timestamp on inbound_receipt_items
CREATE TRIGGER trg_update_inbound_receipt_item_timestamp
  BEFORE UPDATE ON public.inbound_receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inbound_receipt_timestamp();

-- Function: Update total_items in inbound_receipts
CREATE OR REPLACE FUNCTION update_inbound_receipt_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.inbound_receipts
  SET
    total_items = (
      SELECT COUNT(*)
      FROM public.inbound_receipt_items
      WHERE inbound_receipt_id = COALESCE(NEW.inbound_receipt_id, OLD.inbound_receipt_id)
    ),
    total_quantity = (
      SELECT COALESCE(SUM(total_received_pieces), 0)
      FROM public.inbound_receipt_items
      WHERE inbound_receipt_id = COALESCE(NEW.inbound_receipt_id, OLD.inbound_receipt_id)
    )
  WHERE id = COALESCE(NEW.inbound_receipt_id, OLD.inbound_receipt_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update totals when items change
CREATE TRIGGER trg_update_receipt_totals_on_item_insert
  AFTER INSERT ON public.inbound_receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inbound_receipt_totals();

CREATE TRIGGER trg_update_receipt_totals_on_item_update
  AFTER UPDATE ON public.inbound_receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inbound_receipt_totals();

CREATE TRIGGER trg_update_receipt_totals_on_item_delete
  AFTER DELETE ON public.inbound_receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inbound_receipt_totals();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE public.inbound_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_qc_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for authenticated users (adjust based on your auth system)
CREATE POLICY "Allow all for authenticated users"
  ON public.inbound_receipts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users"
  ON public.inbound_receipt_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users"
  ON public.inbound_qc_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Views (Optional - for reporting)
-- =====================================================

-- View: Recent Inbound Receipts with Summary
CREATE OR REPLACE VIEW public.v_recent_inbound_receipts AS
SELECT
  ir.id,
  ir.receipt_number,
  ir.receipt_date,
  ir.receipt_type,
  ir.po_number,
  ir.supplier_name,
  ir.warehouse_name,
  ir.status,
  ir.total_items,
  ir.total_quantity,
  u.email as received_by_email,
  ir.received_at,
  ir.created_at
FROM public.inbound_receipts ir
LEFT JOIN auth.users u ON ir.received_by = u.id
ORDER BY ir.receipt_date DESC
LIMIT 100;

-- Grant access to view
GRANT SELECT ON public.v_recent_inbound_receipts TO authenticated;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public.inbound_receipts IS 'ระบบรับเข้าสินค้า - หัวรายการ';
COMMENT ON TABLE public.inbound_receipt_items IS 'รายการสินค้าที่รับเข้า';
COMMENT ON TABLE public.inbound_qc_logs IS 'บันทึกการตรวจสอบคุณภาพ';

COMMENT ON COLUMN public.inbound_receipts.receipt_type IS 'ประเภท: po_fg, po_pk, manual, return, adjustment';
COMMENT ON COLUMN public.inbound_receipts.status IS 'สถานะ: draft, received, qc_pending, qc_approved, qc_rejected, completed, cancelled';
COMMENT ON COLUMN public.inbound_receipt_items.total_received_pieces IS 'คำนวณอัตโนมัติจาก received quantities';
