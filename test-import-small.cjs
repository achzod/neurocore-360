const https = require('https');

const testData = `Date envoi;Destinataire;Email;Objet;Statut;SendPulse ID
2026-03-18;Test User;test@example.com;Discovery Scan Results;Delivered;123456`;

const body = JSON.stringify({ csvData: testData });

const options = {
  hostname: 'apexlabs.achzodcoaching.com',
  port: 443,
  path: '/api/admin/import-sendpulse-history',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': 'e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('🔄 Testing small import to check if email_tracking table exists...\n');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    
    if (result.error && result.error.includes('does not exist')) {
      console.log('\n❌ Table still does not exist!');
    } else if (result.success) {
      console.log('\n✅ Table exists! Import successful.');
    } else {
      console.log('\n⚠️  Unknown result');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.write(body);
req.end();
