/**
 * TEST Discovery Scan - Cas pratique réel
 * Homme 27 ans, un peu gras, plateau de progression
 */

import { analyzeDiscoveryScan, convertToNarrativeReport } from './server/discovery-scan';

const TEST_RESPONSES = {
  // Profil base
  sexe: 'homme',
  prenom: 'Thomas',
  email: 'achkou@gmail.com',
  age: '27',
  taille: '178',
  poids: '86',
  objectif: 'Perdre du gras et reprendre ma progression en muscu',

  // Santé & Historique
  'diagnostic-medical': [],
  'traitement-medical': 'non',
  'bilan-sanguin-recent': 'non',
  'plateau-metabolique': 'oui',
  'tca-historique': 'non',
  'experience-sportive': '3-5ans',

  // Sommeil - Problématique
  'heures-sommeil': '6-7',
  'qualite-sommeil': 'moyenne',
  'endormissement': 'souvent',
  'reveils-nocturnes': 'parfois',
  'reveil-fatigue': 'souvent',
  'heure-coucher': '23h-00h',

  // Stress & Nerveux - Élevé
  'niveau-stress': 'eleve',
  'anxiete': 'parfois',
  'concentration': 'moyenne',
  'irritabilite': 'souvent',
  'humeur-fluctuation': 'parfois',
  'gestion-stress': ['rien'],

  // Énergie - Problématique
  'energie-matin': 'faible',
  'energie-aprem': 'moyenne',
  'coup-fatigue': 'souvent',
  'envies-sucre': 'souvent',
  'motivation': 'fluctuante',
  'thermogenese': 'froid',

  // Digestion - Moyen
  'digestion-qualite': 'moyenne',
  'ballonnements': 'parfois',
  'transit': 'irregulier',
  'reflux': 'rarement',
  'intolerance': [],
  'energie-post-repas': 'fatigue',

  // Training - Stagnation
  'sport-frequence': '3-4',
  'type-sport': ['musculation'],
  'intensite': 'moderee',
  'recuperation': 'moyenne',
  'courbatures': 'souvent',
  'performance-evolution': 'stagnation',

  // Nutrition Base - À optimiser
  'nb-repas': '3',
  'petit-dejeuner': 'glucides',
  'proteines-jour': 'insuffisant',
  'eau-jour': '1-1.5L',
  'regime-alimentaire': 'standard',
  'aliments-transformes': 'souvent',
  'sucres-ajoutes': 'souvent',
  'alcool': 'weekend',

  // Lifestyle - Sédentaire
  'cafe-jour': '3-4',
  'tabac': 'non',
  'temps-ecran': 'plus-6h',
  'exposition-soleil': 'rarement',
  'profession': 'bureau',
  'heures-assis': '8h-plus',

  // Mindset
  'frustration-passee': 'J\'ai essayé plusieurs programmes mais je stagne depuis 6 mois, je perds pas de gras malgré mes efforts',
  'si-rien-change': 'Je vais continuer à tourner en rond et perdre ma motivation',
  'ideal-6mois': 'Perdre 8kg de gras, voir mes abdos, reprendre de la force',
  'plus-grosse-peur': 'Ne jamais atteindre mon physique idéal',
  'engagement-niveau': 'pret-tout',
  'motivation-principale': 'esthetique'
};

async function runTest() {
  console.log('🧪 TEST Discovery Scan - Thomas 27 ans plateau\n');
  console.log('='.repeat(60));

  try {
    // Analyze
    console.log('\n📊 Analyse en cours...\n');
    const result = await analyzeDiscoveryScan(TEST_RESPONSES);

    console.log(`✅ Score Global: ${result.globalScore}/100`);
    console.log('\n📈 Scores par domaine:');
    Object.entries(result.scoresByDomain).forEach(([domain, score]) => {
      const filled = Math.round(score / 10);
      const empty = 10 - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      console.log(`   ${domain.padEnd(12)} ${bar} ${score}/100`);
    });

    console.log(`\n🚨 Blocages détectés: ${result.blocages.length}`);
    result.blocages.forEach((b, i) => {
      console.log(`\n   ${i + 1}. [${b.severity.toUpperCase()}] ${b.domain}`);
      console.log(`      ${b.title}`);
      console.log(`      Mécanisme: ${b.mechanism.substring(0, 100)}...`);
    });

    console.log('\n📝 Synthèse IA:');
    console.log(result.synthese.substring(0, 500) + '...');

    // Convert to NarrativeReport
    console.log('\n\n🔄 Conversion en NarrativeReport pour dashboard...');
    const narrativeReport = convertToNarrativeReport(result, TEST_RESPONSES);

    console.log(`\n✅ NarrativeReport généré:`);
    console.log(`   - Global: ${narrativeReport.global}/100`);
    console.log(`   - Sections: ${narrativeReport.sections.length}`);
    console.log(`   - Priority sections: ${narrativeReport.prioritySections.join(', ')}`);
    console.log(`   - Strength sections: ${narrativeReport.strengthSections.join(', ')}`);
    console.log(`   - Hero: ${narrativeReport.heroSummary}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST TERMINÉ');

    // Output full result
    console.log('\n\n📄 FULL NARRATIVE REPORT (JSON):');
    console.log(JSON.stringify(narrativeReport, null, 2));

  } catch (error) {
    console.error('❌ ERREUR:', error);
  }
}

runTest();
