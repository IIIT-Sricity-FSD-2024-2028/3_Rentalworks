require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. List public tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    // 2. For each table, get columns, constraints, foreign keys, row count
    const schemaInfo = {};

    for (const table of tables) {
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

      const countRes = await client.query(`SELECT count(*)::int as count FROM "${table}";`);

      const fksRes = await client.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1;
      `, [table]);

      const indexesRes = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = $1;
      `, [table]);

      schemaInfo[table] = {
        rowCount: countRes.rows[0].count,
        columns: colsRes.rows,
        foreignKeys: fksRes.rows,
        indexes: indexesRes.rows
      };
    }

    const fs = require('fs');
    const outPath = require('path').join(__dirname, 'current_neon_schema.json');
    fs.writeFileSync(outPath, JSON.stringify({ tables, schemaInfo }, null, 2), 'utf8');
    console.log('Saved schema to current_neon_schema.json');
  } catch (err) {
    console.error('Error connecting to database:', err.message);
  } finally {
    await client.end();
  }
}

main();
