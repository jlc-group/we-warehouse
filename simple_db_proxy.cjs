const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const port = 3004;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres'
});

// Generic Query Endpoint
app.post('/api/query', async (req, res) => {
    const { sql, params } = req.body;
    try {
        console.log('📝 SQL:', sql);
        const result = await pool.query(sql, params);
        res.json({ rows: result.rows, rowCount: result.rowCount });
    } catch (err) {
        console.error('❌ Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Generic Table Insert
app.post('/api/:table', async (req, res) => {
    const { table } = req.params;
    const data = req.body;
    const rows = Array.isArray(data) ? data : [data];

    if (rows.length === 0) return res.json({ data: [] });

    try {
        const columns = Object.keys(rows[0]);
        const values = rows.map(row => columns.map(col => row[col]));
        const placeholders = values.map((_, rowIndex) =>
            `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
        ).join(', ');

        const sql = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${placeholders} RETURNING *`;
        const flatValues = values.flat();

        console.log(`📥 Insert ${table}`);
        const result = await pool.query(sql, flatValues);
        res.json({ data: result.rows });
    } catch (err) {
        console.error('❌ Insert Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Generic Table Update (Simple Patch)
app.patch('/api/:table', async (req, res) => {
    const { table } = req.params;
    const query = req.query; // ?id=eq.123
    const data = req.body;

    try {
        const columns = Object.keys(data);
        const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
        const values = columns.map(col => data[col]);

        let whereClause = '';

        // Simple filter parsing (id=eq.123)
        Object.keys(query).forEach((key, i) => {
            const parts = query[key].split('.');
            if (parts.length === 2 && parts[0] === 'eq') {
                const val = parts[1];
                whereClause = `WHERE "${key}" = $${columns.length + 1}`;
                values.push(val);
            }
        });

        if (!whereClause) return res.status(400).json({ error: 'Missing WHERE clause (safe update)' });

        const sql = `UPDATE "${table}" SET ${setClause} ${whereClause} RETURNING *`;

        console.log(`🔄 Update ${table}`);
        const result = await pool.query(sql, values);
        res.json({ data: result.rows });
    } catch (err) {
        console.error('❌ Update Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 Local DB Proxy running at http://localhost:${port}`);
});
