
import { getConnection } from './config/database';
import dotenv from 'dotenv';
dotenv.config();

async function inspectSpecificDup() {
    try {
        const pool = await getConnection();

        console.log('\n--- Inspecting CSSALESUB for CS-661130-020 ---');
        // Get all rows for this specific document to see full details
        const result = await pool.request().query(`
            SELECT *
            FROM CSSALESUB
            WHERE DOCNO = 'CS-661130-020'
            ORDER BY LINEID
        `);

        console.log(`Total Rows Found: ${result.recordset.length}`);

        // Group by LINEID to show the duplication
        const grouped: Record<string, any[]> = {};
        result.recordset.forEach(row => {
            const key = row.LINEID;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(row);
        });

        Object.entries(grouped).forEach(([lineId, rows]) => {
            if (rows.length > 1) {
                console.log(`\n!!! LINEID ${lineId} has ${rows.length} copies !!!`);
                // Check if they are exactly identical
                const firstStr = JSON.stringify(rows[0]);
                let allIdentical = true;

                rows.forEach((row, idx) => {
                    const rowStr = JSON.stringify(row);
                    const isIdentical = rowStr === firstStr;
                    console.log(`   Copy ${idx + 1}: ${isIdentical ? 'IDENTICAL to Copy 1' : 'DIFFERENT'}`);
                    if (!isIdentical) {
                        allIdentical = false;
                        console.log('      Difference found:', row);
                    }
                });

                if (allIdentical) {
                    console.log('   => CONCLUSION: These rows are EXACT duplicates (100% same data).');
                } else {
                    console.log('   => CONCLUSION: VALID DATA? These rows differ in content.');
                }
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

inspectSpecificDup();
