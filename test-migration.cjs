const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://apexlabs_user:2qxEKBpe8afjZaWPEUOQIR5idjrNOLQi@dpg-d6ip5hlm5p6s73ab2p4g-a/apexlabs_db',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('🔄 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database');
    
    console.log('\n🔄 Creating email_tracking table...');
    const result = await pool.query(`
      CREATE TABLE IF NOT EXISTS email_tracking (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        email_type VARCHAR(50) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255),
        audit_id VARCHAR(36),
        audit_type VARCHAR(50),
        subject TEXT,
        preview_text TEXT,
        sendpulse_task_id VARCHAR(255),
        sendpulse_status VARCHAR(50),
        sendpulse_error TEXT,
        opened TIMESTAMP,
        clicked TIMESTAMP,
        converted TIMESTAMP,
        conversion_type VARCHAR(50),
        metadata JSONB,
        sent_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table created successfully');
    
    console.log('\n🔄 Creating indexes...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON email_tracking(recipient_email);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_tracking_audit ON email_tracking(audit_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(sendpulse_status);`);
    console.log('✅ Indexes created successfully');
    
    console.log('\n🔄 Verifying table structure...');
    const verify = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'email_tracking'
      ORDER BY ordinal_position;
    `);
    console.log('✅ Columns found:', verify.rows.length);
    console.log(verify.rows.map(r => `  - ${r.column_name}: ${r.data_type}`).join('\n'));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Detail:', error);
  } finally {
    await pool.end();
  }
}

test();
