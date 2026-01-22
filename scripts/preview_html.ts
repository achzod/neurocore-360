import fs from 'fs';
import { generateExportHTMLFromTxt } from '../server/exportService';
import { formatTxtToDashboard } from '../server/formatDashboard';

async function run(): Promise<void> {
  // Lire le TXT généré
  const txtPath = '/Users/achzod/Desktop/neurocore/final_report.txt';
  const txtContent = fs.readFileSync(txtPath, 'utf-8');

  console.log("Taille TXT:", txtContent.length);

  // Debug parsing
  const dashboard = formatTxtToDashboard(txtContent);
  console.log("Sections détectées:", dashboard.sections.length);
  dashboard.sections.forEach(s => console.log(`- ${s.title} (${s.content.length} chars)`));

  // Générer le HTML
  const photos = [
    'https://placehold.co/300x400/png?text=Face',
    'https://placehold.co/300x400/png?text=Profil',
    'https://placehold.co/300x400/png?text=Dos'
  ];

  const html = await generateExportHTMLFromTxt(txtContent, 'PREVIEW-ID-123', photos);

  // Sauvegarder
  const outPath = 'neurocore-preview.html';
  fs.writeFileSync(outPath, html);

  console.log(`HTML généré : ${outPath} (${html.length} bytes)`);
}

void run();
