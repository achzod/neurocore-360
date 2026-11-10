const { Pool } = require('pg');
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
  try {
    console.log('🔍 Checking email_tracking table columns...\n');

    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'email_tracking'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length === 0) {
      console.log('❌ Table email_tracking does NOT exist!');
    } else {
      console.log('✅ Table exists with', result.rows.length, 'columns:\n');
      result.rows.forEach(row => {
        const len = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
        const nullable = row.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE';
        console.log(`  ${row.column_name} - ${row.data_type}${len} ${nullable}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
