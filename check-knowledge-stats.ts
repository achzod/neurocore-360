import fs from 'fs';

// Load env
const envPath = ".env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith("#")) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function checkStats() {
  const { getStats } = await import('./server/knowledge/storage.js');

  const stats = await getStats();
  console.log('=== KNOWLEDGE BASE STATS ===');
  console.log('Total articles:', stats.totalArticles);
  console.log('\nBy Source:');
  Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
    console.log(`  ${source}: ${count} articles`);
  });
  console.log('\nBy Category:');
  Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} articles`);
  });
}

checkStats()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
  });
