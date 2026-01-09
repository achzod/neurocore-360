#!/bin/bash

# NEUROCORE 360 - Applied Metabolics Full Scraper
# Usage: ./scrape-applied-metabolics.sh [password] [limit]
#
# Example: ./scrape-applied-metabolics.sh "mypassword123" 1000

PASSWORD="${1:-}"
LIMIT="${2:-1000}"

if [ -z "$PASSWORD" ]; then
  echo "ERROR: Password required"
  echo "Usage: ./scrape-applied-metabolics.sh [password] [limit]"
  echo "Example: ./scrape-applied-metabolics.sh 'mypassword123' 1000"
  exit 1
fi

echo "========================================="
echo "NEUROCORE 360 - Applied Metabolics Scraper"
echo "========================================="
echo "Limit: $LIMIT articles"
echo "Email: achkou@gmail.com"
echo ""

# Create temporary scraper runner
cat > /tmp/run-am-scraper.ts << 'EOTS'
import { scrapeSource } from "/Users/achzod/Desktop/neurocore/server/knowledge/scraper";

const limit = parseInt(process.argv[2]) || 1000;

console.log(`[CLI] Starting Applied Metabolics scraper with limit ${limit}`);

scrapeSource("applied_metabolics", limit)
  .then((result) => {
    console.log(`\n[CLI] ========================================`);
    console.log(`[CLI] COMPLETE: ${result.articles.length} articles scraped`);
    console.log(`[CLI] Saved: ${result.saved}, Duplicates: ${result.duplicates}`);
    console.log(`[CLI] ========================================`);
    
    // Also save to JSON file
    const fs = require('fs');
    const path = '/Users/achzod/Desktop/neurocore/scraped-data/applied-metabolics-full.json';
    fs.writeFileSync(path, JSON.stringify(result.articles, null, 2));
    console.log(`[CLI] Articles also saved to: ${path}`);
    
    process.exit(0);
  })
  .catch((err) => {
    console.error("[CLI] Error:", err);
    process.exit(1);
  });
EOTS

# Run with password
DATABASE_URL="postgresql://dummy" \
APPLIED_METABOLICS_PASSWORD="$PASSWORD" \
npx tsx /tmp/run-am-scraper.ts "$LIMIT"

