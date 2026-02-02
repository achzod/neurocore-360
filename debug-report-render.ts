/**
 * Debug script to check why the dashboard is empty
 */

const REPORT_ID = 'e1db30e5-d6d0-4b8c-8672-02252aa0f43a';
const API_URL = 'https://neurocore-360.onrender.com';

async function debugReport() {
  console.log('🔍 Fetching report from API...\n');

  const response = await fetch(`${API_URL}/api/blood-analysis/report/${REPORT_ID}`);
  const data = await response.json();

  if (!data.success) {
    console.error('❌ API Error:', data);
    return;
  }

  const report = data.report;

  console.log('📊 REPORT DATA:');
  console.log('  - ID:', report.id);
  console.log('  - Email:', report.email);
  console.log('  - Profile:', JSON.stringify(report.profile, null, 2));
  console.log('  - Raw markers count:', report.markers?.length || 0);
  console.log('  - Analysis markers count:', report.analysis?.markers?.length || 0);
  console.log('  - aiReport length:', report.aiReport?.length || 0);
  console.log('\n');

  // Check what frontend will get
  console.log('🎯 WHAT FRONTEND WILL SEE:');

  const normalizedMarkers = (report.analysis?.markers || []).map((marker: any) => {
    const markerId = marker.markerId || marker.id || marker.name.toLowerCase().replace(/\s+/g, "_");
    return {
      id: markerId,
      name: marker.name,
      value: marker.value,
      unit: marker.unit,
      status: marker.status,
    };
  });

  console.log(`  - Normalized markers: ${normalizedMarkers.length}`);
  normalizedMarkers.forEach((m: any) => {
    console.log(`    • ${m.name}: ${m.value} ${m.unit} (${m.status})`);
  });
  console.log('\n');

  // Check panel distribution
  const BLOOD_PANELS = [
    { id: "hormonal", title: "Hormonal" },
    { id: "thyroid", title: "Thyroïde" },
    { id: "metabolic", title: "Métabolique" },
    { id: "inflammation", title: "Inflammation" },
    { id: "vitamins", title: "Vitamines" },
    { id: "liver_kidney", title: "Foie & Reins" },
  ];

  const MARKER_TO_PANEL: Record<string, string> = {
    "crp_us": "inflammation",
    "hdl": "metabolic",
    "ldl": "metabolic",
    "tsh": "thyroid",
    "estradiol": "hormonal",
    "vitamine_d": "vitamins",
    "b12": "vitamins",
    "folate": "vitamins",
    "prolactine": "hormonal",
  };

  console.log('📋 PANEL DISTRIBUTION:');
  BLOOD_PANELS.forEach(panel => {
    const markers = normalizedMarkers.filter((m: any) => MARKER_TO_PANEL[m.id] === panel.id);
    console.log(`  - ${panel.title}: ${markers.length} markers`);
    markers.forEach((m: any) => console.log(`      • ${m.name}`));
  });
  console.log('\n');

  // Check if components will render
  console.log('✅ COMPONENTS WILL RENDER:');
  console.log(`  - RadialScoreChart: ${normalizedMarkers.length > 0 ? 'YES' : 'NO'} (needs markers)`);
  console.log(`  - InteractiveHeatmap: ${normalizedMarkers.length > 0 ? 'YES' : 'NO'} (needs markers)`);
  console.log(`  - AnimatedStatCards: ${normalizedMarkers.length > 0 ? 'YES' : 'NO'} (needs markers)`);
  console.log('\n');

  // Check global score
  const STATUS_SCORE: Record<string, number> = {
    optimal: 100,
    normal: 80,
    suboptimal: 55,
    critical: 30,
  };

  const panelScores = BLOOD_PANELS.map(panel => {
    const markers = normalizedMarkers.filter((m: any) => MARKER_TO_PANEL[m.id] === panel.id);
    if (markers.length === 0) return 0;
    const avg = markers.reduce((acc: number, m: any) => acc + STATUS_SCORE[m.status], 0) / markers.length;
    return Math.round(avg);
  });

  const globalScore = panelScores.filter(s => s > 0).length > 0
    ? Math.round(panelScores.reduce((a, b) => a + b, 0) / panelScores.filter(s => s > 0).length)
    : 0;

  console.log('📈 CALCULATED SCORES:');
  console.log(`  - Global Score: ${globalScore}/100`);
  BLOOD_PANELS.forEach((panel, i) => {
    console.log(`  - ${panel.title}: ${panelScores[i]}/100`);
  });
  console.log('\n');

  // Final verdict
  console.log('🎯 FINAL VERDICT:');
  if (normalizedMarkers.length === 0) {
    console.log('  ❌ PROBLEM: No markers to display!');
  } else if (globalScore === 0) {
    console.log('  ❌ PROBLEM: Global score is 0!');
  } else {
    console.log('  ✅ Data is OK. Problem is likely:');
    console.log('     1. Theme is too dark (background black)');
    console.log('     2. CSS classes not loaded');
    console.log('     3. JavaScript error preventing render');
  }
}

debugReport().catch(console.error);
