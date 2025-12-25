
import { getConnection, sql } from './config/database';

async function analyzeSalesStructure() {
    try {
        const pool = await getConnection();

        console.log("╔════════════════════════════════════════════════════════════════╗");
        console.log("║          CSMILE Database Sales Data Analysis                   ║");
        console.log("╚════════════════════════════════════════════════════════════════╝\n");

        // 1. List all Sales-related tables
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📂 1. SALES-RELATED TABLES IN DATABASE");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND (TABLE_NAME LIKE '%SALE%' OR TABLE_NAME LIKE '%CS%' OR TABLE_NAME LIKE '%AR%')
      ORDER BY TABLE_NAME
    `);
        tables.recordset.forEach((t: any) => console.log(`   - ${t.TABLE_NAME}`));

        // 2. CSSALE (Header) Structure
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📋 2. CSSALE (Sales Header) - Key Columns");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const cssaleCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CSSALE'
      AND COLUMN_NAME IN ('DOCNO', 'DOCDATE', 'DOCTYPE', 'ARCODE', 'ARNAME', 
                          'TOTALAMOUNT', 'SUMAMOUNT1', 'TAXAMOUNT', 'NETAMOUNT',
                          'CANCELDATE', 'DOCSTATUS')
      ORDER BY ORDINAL_POSITION
    `);
        console.table(cssaleCols.recordset);

        // 3. CSSALESUB (Line Items) Structure
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📋 3. CSSALESUB (Sales Line Items) - Key Columns");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const cssalesubCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CSSALESUB'
      AND COLUMN_NAME IN ('DOCNO', 'LINEID', 'PRODUCTCODE', 'PRODUCTNAME', 
                          'QUANTITY', 'UNITPRICE', 'AMOUNT', 'DISCAMOUNT',
                          'NETAMOUNT', 'PRODUCTSET', 'PRODUCTSETCODE')
      ORDER BY ORDINAL_POSITION
    `);
        console.table(cssalesubCols.recordset);

        // 4. Document Types
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🏷️ 4. DOCUMENT TYPES (DocNo Prefixes) in 2024-2025");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const docTypes = await pool.request().query(`
      SELECT 
        LEFT(DOCNO, 2) as DocPrefix,
        CASE LEFT(DOCNO, 2)
          WHEN 'SA' THEN 'Sales Invoice (ใบขาย)'
          WHEN 'CS' THEN 'Credit Sales / Return (ใบรับคืน)'
          WHEN 'CN' THEN 'Credit Note (ใบลดหนี้)'
          WHEN '68' THEN 'Special Sales (ขายพิเศษ/โครงการ)'
          ELSE 'Other'
        END as Description,
        COUNT(*) as DocCount,
        SUM(TOTALAMOUNT) as TotalAmount
      FROM CSSALE
      WHERE DOCDATE >= '2024-01-01'
      AND CANCELDATE IS NULL
      GROUP BY LEFT(DOCNO, 2)
      ORDER BY LEFT(DOCNO, 2)
    `);
        console.table(docTypes.recordset);

        // 5. PRODUCTSET Explanation
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📦 5. PRODUCTSET Field (Critical for Double-Counting)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const productSet = await pool.request().query(`
      SELECT 
        PRODUCTSET,
        CASE PRODUCTSET
          WHEN 0 THEN 'Regular Product (สินค้าปกติ)'
          WHEN 1 THEN 'Product Set/Bundle (ชุดสินค้า)'
          WHEN 2 THEN 'Component of Set (ไส้ในชุด - ห้ามนับ!)'
          ELSE 'Other'
        END as Meaning,
        COUNT(*) as LineCount,
        SUM(NETAMOUNT) as TotalNet
      FROM CSSALESUB d
      JOIN CSSALE h ON d.DOCNO = h.DOCNO
      WHERE h.DOCDATE >= '2024-01-01' AND h.CANCELDATE IS NULL
      GROUP BY PRODUCTSET
      ORDER BY PRODUCTSET
    `);
        console.table(productSet.recordset);

        // 6. Amount Fields Comparison
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("💰 6. AMOUNT FIELD DEFINITIONS (Sample Document)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const amountFields = await pool.request().query(`
      SELECT TOP 1
        d.PRODUCTCODE,
        d.QUANTITY,
        d.UNITPRICE as 'Unit Price',
        d.AMOUNT as 'AMOUNT (Qty*Price)',
        d.DISCAMOUNT as 'Discount',
        d.NETAMOUNT as 'NETAMOUNT (After Disc)',
        d.TGAMOUNT as 'TGAMOUNT (ภาษีนำเข้า?)'
      FROM CSSALESUB d
      JOIN CSSALE h ON d.DOCNO = h.DOCNO
      WHERE h.DOCDATE >= '2025-01-01' AND d.DISCAMOUNT > 0
    `);
        console.table(amountFields.recordset);
        console.log("   📝 NETAMOUNT = ยอดหลังหักส่วนลดแล้ว (ก่อน VAT)");

        // 7. 2025 Breakdown Summary
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 7. YEAR 2025 SALES BREAKDOWN (Verified)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        const sales2025 = await pool.request().query(`
      SELECT 
        LEFT(h.DOCNO, 2) as DocType,
        CASE WHEN LEFT(h.DOCNO, 2) IN ('CS', 'CN') THEN 'Credit Note (หัก)' ELSE 'Sales (บวก)' END as Category,
        COUNT(DISTINCT h.DOCNO) as DocCount,
        SUM(d.NETAMOUNT) as GrossAmount
      FROM CSSALESUB d
      JOIN CSSALE h ON d.DOCNO = h.DOCNO
      WHERE h.DOCDATE BETWEEN '2025-01-01' AND '2025-12-31'
      AND h.CANCELDATE IS NULL
      AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
      GROUP BY LEFT(h.DOCNO, 2)
      ORDER BY Category, LEFT(h.DOCNO, 2)
    `);
        console.table(sales2025.recordset);

        // Calculate Net
        let salesTotal = 0;
        let cnTotal = 0;
        sales2025.recordset.forEach((r: any) => {
            if (r.Category === 'Sales (บวก)') salesTotal += r.GrossAmount;
            else cnTotal += r.GrossAmount;
        });
        const netSales = salesTotal - cnTotal;

        console.log("\n   📈 CALCULATION:");
        console.log(`   ├─ Sales Amount:      ${salesTotal.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`);
        console.log(`   ├─ Credit Note:     - ${cnTotal.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`);
        console.log(`   └─ NET SALES:       = ${netSales.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`);

        // 8. Data Flow Diagram
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔀 8. CORRECT DATA FLOW (การไหลของข้อมูลที่ถูกต้อง)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`
    ┌─────────────────────────────────────────────────────────────────┐
    │                      CSSALE (Header)                            │
    │  ┌───────────┬──────────────┬────────────┬────────────────────┐ │
    │  │  DOCNO    │   DOCDATE    │  ARCODE    │   CANCELDATE       │ │
    │  │  SA-XXXX  │  2025-01-XX  │  CUST001   │   NULL (ไม่ถูก     │ │
    │  │           │              │            │   ยกเลิก)           │ │
    │  └───────────┴──────────────┴────────────┴────────────────────┘ │
    └─────────────────────────┬───────────────────────────────────────┘
                              │ JOIN ON DOCNO
                              ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    CSSALESUB (Line Items)                       │
    │  ┌───────────┬────────────┬────────────┬────────────┬────────┐ │
    │  │  DOCNO    │ PRODUCTCODE│ NETAMOUNT  │ PRODUCTSET │ Note   │ │
    │  ├───────────┼────────────┼────────────┼────────────┼────────┤ │
    │  │  SA-XXXX  │ PROD-001   │   1,000    │     0      │   ✅   │ │
    │  │  SA-XXXX  │ SET-A      │   5,000    │     1      │   ✅   │ │
    │  │  SA-XXXX  │ ITEM-A1    │   2,500    │     2      │   ❌   │ │
    │  │  SA-XXXX  │ ITEM-A2    │   2,500    │     2      │   ❌   │ │
    │  └───────────┴────────────┴────────────┴────────────┴────────┘ │
    │                                                                 │
    │  ⚠️  PRODUCTSET = 2 คือ "ไส้ใน" ที่ถูกนับซ้ำ ต้อง FILTER ออก!   │
    └─────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────┐
    │                   🧮 CORRECT FORMULA                            │
    │  ═══════════════════════════════════════════════════════════    │
    │                                                                 │
    │  SELECT SUM(d.NETAMOUNT)                                        │
    │  FROM CSSALESUB d                                               │
    │  JOIN CSSALE h ON d.DOCNO = h.DOCNO                             │
    │  WHERE h.CANCELDATE IS NULL          -- ไม่ถูกยกเลิก            │
    │    AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)  -- ไม่ซ้ำ   │
    │    AND LEFT(h.DOCNO, 2) NOT IN ('CS', 'CN')  -- ใบขาย           │
    │                                                                 │
    │  MINUS                                                          │
    │                                                                 │
    │  SELECT SUM(d.NETAMOUNT) [for CS/CN]  -- หักใบลดหนี้             │
    │                                                                 │
    └─────────────────────────────────────────────────────────────────┘
    `);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}
analyzeSalesStructure();
