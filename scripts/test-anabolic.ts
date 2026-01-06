import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROD_URL = 'https://neurocore-360.onrender.com';

const testResponses = {
  prenom: "Thomas",
  sexe: "homme",
  age: "28",
  taille: "175",
  poids: "78",
  objectif: "prise de masse seche",
  "heures-sommeil": "7-8",
  "qualite-sommeil": "bonne",
  "endormissement": "rarement",
  "reveils-nocturnes": "rarement",
  "reveil-fatigue": "parfois",
  "niveau-stress": "modere",
  "anxiete": "rarement",
  "concentration": "bonne",
  "energie-matin": "haute",
  "energie-aprem": "stable",
  "coup-fatigue": "rarement",
  "digestion-qualite": "bonne",
  "ballonnements": "rarement",
  "transit": "normal",
  "sport-frequence": "5-6",
  "type-sport": ["musculation"],
  "intensite": "eleve",
  "recuperation": "bonne",
  "performance-evolution": "progression-lente",
  "nb-repas": "4-5",
  "proteines-jour": "eleve",
  "eau-jour": "2-3L",
  "aliments-transformes": "rarement",
  "cafe-jour": "2",
  "tabac": "non",
  "temps-ecran": "2-4h",
  "exposition-soleil": "modere",
  "heures-assis": "4-6h",
  "engagement-niveau": "9-10",
  "consignes-strictes": "oui"
};

async function run() {
  const photosDir = path.join(__dirname, '../server/test-data/photos');
  const front = fs.readFileSync(path.join(photosDir, 'front.jpeg')).toString('base64');
  const side = fs.readFileSync(path.join(photosDir, 'side.jpeg')).toString('base64');
  const back = fs.readFileSync(path.join(photosDir, 'back.jpeg')).toString('base64');

  const body = {
    email: `test.anabolic.${Date.now()}@example.com`,
    type: "PREMIUM",
    responses: {
      ...testResponses,
      photoFront: `data:image/jpeg;base64,${front}`,
      photoSide: `data:image/jpeg;base64,${side}`,
      photoBack: `data:image/jpeg;base64,${back}`
    }
  };

  console.log('Creating PREMIUM (Anabolic Bioscan) audit...');
  const res = await fetch(`${PROD_URL}/api/audit/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  console.log('Audit ID:', data.id);
  console.log('Status:', data.reportDeliveryStatus);
  console.log(`Dashboard: ${PROD_URL}/anabolic/${data.id}`);
}

run().catch(console.error);
