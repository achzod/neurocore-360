#!/usr/bin/env node

/**
 * SCRIPT 1: EXTRACTION BIOMARKER DATA
 *
 * Cherche dans toutes les bibliothèques de connaissances (JSON)
 * et extrait les informations pertinentes pour un biomarqueur donné.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const KNOWLEDGE_BASE_DIR = path.join(__dirname, '../../knowledge-base');
const OUTPUT_DIR = path.join(__dirname, '../../scripts/biomarkers/extracted');

// Bibliothèques disponibles
const LIBRARIES = [
  'huberman-full.json',
  'mpmd-full.json',
  'masterjohn-full.json',
  'examine-full.json',
  'peter-attia-full.json',
  'marek-health-full.json',
  'sbs-full.json',
  'applied-metabolics-full.json',
  'rp-full.json'
];

// Mots-clés alternatifs par biomarqueur
const BIOMARKER_KEYWORDS = {
  lh: ['LH', 'luteinizing hormone', 'hormone lutéinisante', 'luteinising'],
  fsh: ['FSH', 'follicle stimulating hormone', 'hormone folliculo-stimulante'],
  prolactine: ['prolactin', 'prolactine', 'PRL'],
  dhea_s: ['DHEA-S', 'DHEA sulfate', 'dehydroepiandrosterone'],
  igf1: ['IGF-1', 'IGF1', 'insulin-like growth factor'],
  tsh: ['TSH', 'thyroid stimulating hormone', 'thyrotropin'],
  t4_libre: ['free T4', 'FT4', 'free thyroxine', 'T4 libre'],
  t3_libre: ['free T3', 'FT3', 'free triiodothyronine', 'T3 libre'],
  t3_reverse: ['reverse T3', 'rT3', 'T3 reverse'],
  anti_tpo: ['anti-TPO', 'thyroid peroxidase antibody', 'TPO antibodies'],
  insuline_jeun: ['fasting insulin', 'insulin', 'insuline à jeun'],
  homa_ir: ['HOMA-IR', 'insulin resistance', 'résistance insuline'],
  triglycerides: ['triglycerides', 'triglycérides', 'TG'],
  hdl: ['HDL', 'HDL cholesterol', 'high-density lipoprotein'],
  ldl: ['LDL', 'LDL cholesterol', 'low-density lipoprotein'],
  apob: ['ApoB', 'apolipoprotein B', 'apoB'],
  lpa: ['Lp(a)', 'lipoprotein a', 'lipoprotein(a)'],
  crp_us: ['CRP', 'hs-CRP', 'high sensitivity CRP', 'C-reactive protein'],
  homocysteine: ['homocysteine', 'homocystéine'],
  ferritine: ['ferritin', 'ferritine'],
  fer_serique: ['serum iron', 'fer sérique', 'iron'],
  transferrine_sat: ['transferrin saturation', 'TSAT', 'transferrine'],
  b12: ['vitamin B12', 'B12', 'cobalamin', 'vitamine B12'],
  folate: ['folate', 'folic acid', 'vitamin B9', 'B9'],
  magnesium_rbc: ['RBC magnesium', 'red blood cell magnesium', 'magnésium'],
  zinc: ['zinc'],
  alt: ['ALT', 'alanine aminotransferase', 'ALAT'],
  ast: ['AST', 'aspartate aminotransferase', 'ASAT'],
  ggt: ['GGT', 'gamma-GT', 'gamma glutamyl transferase'],
  creatinine: ['creatinine', 'créatinine'],
  egfr: ['eGFR', 'estimated GFR', 'glomerular filtration rate']
};

/**
 * Cherche un biomarqueur dans un fichier JSON
 */
function searchInLibrary(libraryPath, keywords) {
  try {
    const content = fs.readFileSync(libraryPath, 'utf8');
    const data = JSON.parse(content);

    const results = [];
    const keywordsLower = keywords.map(k => k.toLowerCase());

    // Fonction récursive pour chercher dans un objet
    function searchObject(obj, path = '') {
      if (typeof obj === 'string') {
        // Vérifier si un des keywords est dans le texte
        const textLower = obj.toLowerCase();
        for (const keyword of keywordsLower) {
          if (textLower.includes(keyword)) {
            results.push({
              path,
              text: obj,
              keyword,
              score: calculateRelevanceScore(obj, keywords)
            });
            break;
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          searchObject(item, `${path}[${index}]`);
        });
      } else if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          searchObject(obj[key], path ? `${path}.${key}` : key);
        });
      }
    }

    searchObject(data);
    return results;

  } catch (error) {
    console.error(`Erreur lecture ${libraryPath}:`, error.message);
    return [];
  }
}

/**
 * Calcule un score de pertinence
 */
function calculateRelevanceScore(text, keywords) {
  let score = 0;
  const textLower = text.toLowerCase();

  // Plus de mentions = meilleur score
  keywords.forEach(keyword => {
    const matches = (textLower.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    score += matches;
  });

  // Bonus si le texte contient des mots-clés comme "protocol", "supplement", "range"
  const bonusWords = ['protocol', 'supplement', 'dosage', 'range', 'optimal', 'mechanism'];
  bonusWords.forEach(word => {
    if (textLower.includes(word)) score += 2;
  });

  // Pénalité si texte trop court
  if (text.length < 100) score *= 0.5;

  return score;
}

/**
 * Extrait les citations d'un texte
 */
function extractCitations(text) {
  const citations = [];

  // Chercher des patterns de citations
  const patterns = [
    /"([^"]{20,})"/, // Guillemets
    /«([^»]{20,})»/, // Guillemets français
    />\s*"([^"]{20,})"/, // Markdown quote
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      citations.push(matches[1]);
    }
  });

  return citations;
}

/**
 * Extrait les données pour un biomarqueur
 */
function extractBiomarkerData(biomarkerCode) {
  console.log(`\n🔍 Extraction données pour: ${biomarkerCode}`);

  const keywords = BIOMARKER_KEYWORDS[biomarkerCode];
  if (!keywords) {
    console.error(`❌ Aucun mot-clé défini pour ${biomarkerCode}`);
    return null;
  }

  console.log(`   Keywords: ${keywords.join(', ')}`);

  const allResults = {};
  let totalMatches = 0;

  // Chercher dans chaque bibliothèque
  LIBRARIES.forEach(library => {
    const libraryPath = path.join(KNOWLEDGE_BASE_DIR, library);

    if (!fs.existsSync(libraryPath)) {
      console.log(`   ⚠️  ${library} - Non trouvé`);
      return;
    }

    console.log(`   📚 Recherche dans ${library}...`);
    const results = searchInLibrary(libraryPath, keywords);

    if (results.length > 0) {
      // Trier par score de pertinence
      results.sort((a, b) => b.score - a.score);

      // Garder les meilleurs résultats
      const topResults = results.slice(0, 10);
      allResults[library] = topResults;
      totalMatches += results.length;

      console.log(`      ✅ ${results.length} mentions trouvées (top 10 gardés)`);
    } else {
      console.log(`      ❌ 0 mentions`);
    }
  });

  console.log(`\n   📊 Total: ${totalMatches} mentions dans ${Object.keys(allResults).length} bibliothèques`);

  // Extraire citations et protocoles
  const citations = [];
  const protocols = [];

  Object.values(allResults).forEach(results => {
    results.forEach(result => {
      // Chercher citations
      const cit = extractCitations(result.text);
      citations.push(...cit);

      // Chercher protocoles
      if (result.text.toLowerCase().includes('protocol') ||
          result.text.toLowerCase().includes('supplement')) {
        protocols.push(result.text);
      }
    });
  });

  // Construire objet de données
  const biomarkerData = {
    code: biomarkerCode,
    keywords,
    extraction_date: new Date().toISOString(),
    total_mentions: totalMatches,
    sources: Object.keys(allResults).length,
    results: allResults,
    citations: [...new Set(citations)], // Dédupliquer
    protocols: protocols.slice(0, 5), // Top 5
    summary: {
      total_matches: totalMatches,
      libraries_found: Object.keys(allResults).length,
      citations_found: citations.length,
      protocols_found: protocols.length
    }
  };

  return biomarkerData;
}

/**
 * Sauvegarde les données extraites
 */
function saveExtractedData(biomarkerCode, data) {
  // Créer dossier output
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, `${biomarkerCode}_data.json`);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`\n✅ Données sauvegardées: ${outputPath}`);
  console.log(`   ${data.summary.total_matches} mentions`);
  console.log(`   ${data.summary.libraries_found} sources`);
  console.log(`   ${data.summary.citations_found} citations`);
  console.log(`   ${data.summary.protocols_found} protocoles\n`);

  return outputPath;
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node extract_biomarker_data.js <biomarker_code>

Exemple: node extract_biomarker_data.js lh

Biomarqueurs disponibles:
  ${Object.keys(BIOMARKER_KEYWORDS).join(', ')}
    `);
    process.exit(1);
  }

  const biomarkerCode = args[0];

  console.log('============================================================================');
  console.log('EXTRACTION BIOMARKER DATA');
  console.log('============================================================================');

  const data = extractBiomarkerData(biomarkerCode);

  if (data) {
    const outputPath = saveExtractedData(biomarkerCode, data);

    console.log('============================================================================');
    console.log('✅ EXTRACTION COMPLÈTE');
    console.log('============================================================================');
    console.log(`Fichier: ${outputPath}`);

    process.exit(0);
  } else {
    console.error('\n❌ Extraction échouée');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractBiomarkerData, saveExtractedData };
