/**
 * Poll blood analysis report until AI generation is complete
 */

const REPORT_ID = 'e1db30e5-d6d0-4b8c-8672-02252aa0f43a';
const BASE_URL = 'https://neurocore-360.onrender.com';
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_ATTEMPTS = 60; // 5 minutes max

interface ReportStatus {
  id: string;
  status: string;
  hasAiReport: boolean;
  markerCount: number;
  globalScore?: number;
}

async function checkReport(): Promise<ReportStatus | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/blood-analysis/reports/${REPORT_ID}`, {
      headers: {
        'Authorization': 'Bearer Badboy007'
      }
    });

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    return {
      id: data.id,
      status: data.status || 'unknown',
      hasAiReport: !!data.aiReport,
      markerCount: data.markers?.length || 0,
      globalScore: data.globalScore
    };
  } catch (error) {
    console.error('❌ Fetch error:', error);
    return null;
  }
}

async function pollReport() {
  console.log('🔄 Starting to poll report...');
  console.log(`📊 Report ID: ${REPORT_ID}`);
  console.log(`🌐 URL: ${BASE_URL}/analysis/${REPORT_ID}`);
  console.log(`⏱️  Polling every ${POLL_INTERVAL / 1000}s (max ${MAX_ATTEMPTS * POLL_INTERVAL / 1000}s)\n`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const status = await checkReport();

    if (!status) {
      console.log(`⚠️  Attempt ${attempt}/${MAX_ATTEMPTS}: Failed to fetch report`);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      continue;
    }

    console.log(`📈 Attempt ${attempt}/${MAX_ATTEMPTS}:`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Markers: ${status.markerCount}`);
    console.log(`   Global Score: ${status.globalScore ?? 'N/A'}`);
    console.log(`   AI Report: ${status.hasAiReport ? '✅ Generated' : '⏳ Processing...'}`);

    if (status.hasAiReport) {
      console.log('\n✅ SUCCESS! AI Report generation complete!');
      console.log(`\n🎉 Report ready at: ${BASE_URL}/analysis/${REPORT_ID}\n`);

      console.log('📊 Final Stats:');
      console.log(`   - Report ID: ${status.id}`);
      console.log(`   - Status: ${status.status}`);
      console.log(`   - Markers analyzed: ${status.markerCount}`);
      console.log(`   - Global Score: ${status.globalScore}/100`);
      console.log(`   - AI Report: Generated ✅`);

      return status;
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  console.log('\n⚠️  TIMEOUT: Report still processing after maximum wait time');
  console.log(`   Check manually at: ${BASE_URL}/analysis/${REPORT_ID}\n`);
  return null;
}

// Run
pollReport()
  .then((status) => {
    if (status) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
