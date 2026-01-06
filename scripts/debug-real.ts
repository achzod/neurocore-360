import { formatTxtToDashboard } from '../server/formatDashboard';

async function main() {
  const res = await fetch('https://neurocore-360.onrender.com/api/audits/ead0534c-19cc-401a-9bdf-7411a5b63302');
  const data = await res.json();
  const txt = data.narrativeReport?.txt || '';

  console.log('TXT length:', txt.length);
  console.log('First 500 chars:', txt.substring(0, 500));
  console.log('---');

  const result = formatTxtToDashboard(txt);

  console.log('\nParsed result:');
  console.log('Client:', result.clientName);
  console.log('Sections count:', result.sections.length);
  console.log('Global score:', result.global);
  console.log('');

  for (const section of result.sections) {
    console.log(`- ${section.title}: ${section.content.length} chars, score=${section.score}`);
    if (section.content.length === 0) {
      console.log('  PROBLEM: Content is EMPTY!');
    } else if (section.content.length < 100) {
      console.log(`  WARNING: Content short: "${section.content.substring(0, 100)}"`);
    }
  }
}

main().catch(console.error);
