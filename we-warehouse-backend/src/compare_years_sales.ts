
import { getConnection, sql } from './config/database';

async function compareYears() {
    try {
        const pool = await getConnection();

        // Function to get Net Sales for a given year
        const getNetSales = async (year: string) => {
            // 1. Sales (SA + 68)
            const salesQuery = `
        SELECT SUM(d.NETAMOUNT) as total
        FROM CSSALESUB d
        JOIN CSSALE h ON d.DOCNO = h.DOCNO
        WHERE h.DOCDATE >= '${year}-01-01' AND h.DOCDATE <= '${year}-12-31'
        AND h.CANCELDATE IS NULL
        AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
        AND LEFT(h.DOCNO, 2) NOT IN ('CS', 'CN') -- Assume everything else is sales
      `;
            const salesResult = await pool.request().query(salesQuery);
            const salesTotal = salesResult.recordset[0].total || 0;

            // 2. Credit Notes (CS + CN)
            const cnQuery = `
        SELECT SUM(d.NETAMOUNT) as total
        FROM CSSALESUB d
        JOIN CSSALE h ON d.DOCNO = h.DOCNO
        WHERE h.DOCDATE >= '${year}-01-01' AND h.DOCDATE <= '${year}-12-31'
        AND h.CANCELDATE IS NULL
        AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
        AND LEFT(h.DOCNO, 2) IN ('CS', 'CN')
      `;
            const cnResult = await pool.request().query(cnQuery);
            const cnTotal = cnResult.recordset[0].total || 0;

            return {
                year,
                sales: salesTotal,
                cn: cnTotal,
                net: salesTotal - cnTotal
            };
        };

        const year2024 = await getNetSales('2024');
        const year2025 = await getNetSales('2025');

        console.table([year2024, year2025]);

        // Check columns to be sure about Inc/Ex VAT
        console.log("\n--- Sample Line Item Columns ---");
        const sample = await pool.request().query(`
        SELECT TOP 1 NETAMOUNT, TOTALAMOUNT, VATAMOUNT, AMOUNT
        FROM CSSALESUB
    `);
        console.table(sample.recordset);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}
compareYears();
