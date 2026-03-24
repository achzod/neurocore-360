const fs = require('fs');
const https = require('https');

console.log('🚀 IMPORT SENDPULSE HISTORY TO DATABASE');
console.log('━'.repeat(80));
console.log('');

// Load CSV
const csvPath = '/tmp/sendpulse_history.csv';
const csvData = fs.readFileSync(csvPath, 'utf8');

console.log(`📄 CSV loaded: ${csvData.split('\n').length} lines`);
console.log('');

// API config
const ADMIN_KEY = 'e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e';
const API_URL = 'https://apexlabs.achzodcoaching.com/api/admin/import-sendpulse-history';

console.log('📡 Sending to API...');
console.log(`   URL: ${API_URL}`);
console.log('');

const body = JSON.stringify({ csvData });

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': ADMIN_KEY,
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(API_URL, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`✅ Response status: ${res.statusCode}`);
    console.log('');

    try {
      const result = JSON.parse(data);

      console.log('━'.repeat(80));
      console.log('📊 IMPORT RESULTS:');
      console.log('━'.repeat(80));
      console.log('');
      console.log(`✅ Imported: ${result.imported}`);
      console.log(`⏭️  Skipped: ${result.skipped}`);
      console.log(`❌ Errors: ${result.errors}`);
      console.log(`📊 Total lines: ${result.totalLines}`);
      console.log('');

      if (result.errorDetails && result.errorDetails.length > 0) {
        console.log('❌ Error details (first 10):');
        result.errorDetails.slice(0, 10).forEach((err, idx) => {
          console.log(`   ${idx + 1}. Line ${err.line}: ${err.email} - ${err.error}`);
        });
        console.log('');
      }

      console.log('━'.repeat(80));
      console.log('✅ IMPORT TERMINÉ !');
      console.log('━'.repeat(80));
      console.log('');

      // Save result
      fs.writeFileSync('/tmp/import_result.json', JSON.stringify(result, null, 2));
      console.log('📄 Result saved: /tmp/import_result.json');

    } catch (err) {
      console.error('❌ Error parsing response:', err);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err);
});

req.write(body);
req.end();
