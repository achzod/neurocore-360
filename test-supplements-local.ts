import { generateEnhancedSupplementsHTML } from "./server/supplementEngine";
import * as fs from 'fs';

const testResponses = {
  prenom: "Marc",
  age: "35",
  sexe: "homme",
  sommeil: "6h par nuit, reveils nocturnes",
  stress: "Eleve, travail intense",
  energie: "Fatigue chronique apres-midi",
  digestion: "Ballonnements frequents",
  medicaments: ""
};

async function run(): Promise<void> {
  const html = await generateEnhancedSupplementsHTML({
    responses: testResponses,
    globalScore: 52,
    firstName: "Marc"
  });

// CSS du rapport (dark theme)
const CSS = `
  :root {
    --bg: #0B0B0F;
    --surface-0: #121212;
    --surface-1: #1E1E1E;
    --surface-2: #242424;
    --surface-3: #2E2E2E;
    --background: #0B0B0F;
    --text: rgba(255,255,255,0.92);
    --text-muted: rgba(255,255,255,0.65);
    --text-secondary: rgba(255,255,255,0.65);
    --primary: #5eead4;
    --accent-ok: #34d399;
    --accent-warning: #f59e0b;
    --secondary: #9F8CFF;
    --border: rgba(255,255,255,0.06);
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    padding: 40px;
    max-width: 900px;
    margin: 0 auto;
    line-height: 1.6;
  }
  a { color: var(--primary); }
  a:hover { opacity: 0.8; }
`;

  fs.writeFileSync('test-supplements-output.html', `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
  <h1 style="color: var(--primary); margin-bottom: 32px;">Section Supplements - Preview</h1>
  ${html}
</body>
</html>
  `);

  console.log("HTML genere dans test-supplements-output.html");
  console.log("Ouvre le fichier pour voir le rendu.");
}

void run();
