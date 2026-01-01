/**
 * NEUROCORE 360 - Moteur de Stack de Suppléments
 * Utilise le système Gemini pour générer des stacks personnalisés
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config';
import { ClientData, AuditTier } from './types';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================

const SUPPLEMENT_SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../stack/achzod_supplement_engine_SYSTEM_PROMPT.txt'),
  'utf-8'
);

const SUPPLEMENT_LIBRARY = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../stack/supplement_library_v1.json'),
    'utf-8'
  )
);

// ============================================================
// TYPES
// ============================================================

export interface UserProfile {
  sex?: string;
  age?: number;
  bodyweight_kg?: number;
  lean_mass_kg?: number;
  goals?: string[];
  constraints?: {
    preferred_shop?: string;
    diet?: string;
  };
  meds?: string[];
  conditions?: string[];
  labs?: Record<string, any>;
}

export interface SupplementStack {
  stack_core: any[];
  stack_advanced: any[];
  optional_addons: any[];
  avoid_list: any[];
  monitoring: {
    labs_to_consider: string[];
    symptoms_to_track: string[];
  };
  shopping_rules: string[];
}

// ============================================================
// FONCTION DE CHECK DES SAFETY GATES
// ============================================================

function checkSafetyGates(userProfile: UserProfile): string[] {
  const blockedIngredients: string[] = [];
  const gates = SUPPLEMENT_LIBRARY.hard_safety_gates;

  // Vérifier les médicaments
  const meds = (userProfile.meds || []).map(m => m.toLowerCase());
  const conditions = (userProfile.conditions || []).map(c => c.toLowerCase());

  // Gate 1: Risque de saignement / anticoagulants
  const bleedingRiskKeywords = ['anticoagulant', 'aspirine', 'warfarin', 'saignement', 'bleeding'];
  if (meds.some(m => bleedingRiskKeywords.some(k => m.includes(k))) ||
      conditions.some(c => bleedingRiskKeywords.some(k => c.includes(k)))) {
    blockedIngredients.push(...(gates.bleeding_risk_or_blood_thinners_or_surgery?.block_ingredient_ids || []));
  }

  // Gate 2: Médicaments sérotoninergiques
  const serotonergicKeywords = ['ssri', 'snri', 'maoi', 'sérotonine', 'serotonin'];
  if (meds.some(m => serotonergicKeywords.some(k => m.includes(k)))) {
    blockedIngredients.push(...(gates.serotonergic_meds?.block_ingredient_ids || []));
  }

  // Gate 3: Grossesse / Allaitement
  const pregnancyKeywords = ['grossesse', 'pregnant', 'allaitement', 'breastfeeding'];
  if (conditions.some(c => pregnancyKeywords.some(k => c.includes(k)))) {
    blockedIngredients.push(...(gates.pregnancy_breastfeeding?.block_ingredient_ids || []));
  }

  return [...new Set(blockedIngredients)]; // Dédupliquer
}

// ============================================================
// FONCTION DE GÉNÉRATION DE STACK
// ============================================================

export async function generateSupplementStack(
  clientData: ClientData,
  tier: AuditTier = 'PREMIUM'
): Promise<SupplementStack | null> {
  try {
    // Convertir ClientData en UserProfile
    const userProfile: UserProfile = {
      sex: clientData['sexe'],
      age: clientData['age'] ? parseInt(clientData['age']) : undefined,
      bodyweight_kg: clientData['poids'] ? parseFloat(clientData['poids']) : undefined,
      goals: extractGoals(clientData),
      constraints: {
        preferred_shop: 'iHerb',
        diet: 'omnivore'
      },
      meds: clientData['medicaments'] ? [clientData['medicaments']] : [],
      conditions: clientData['antecedents-medicaux'] || [],
      labs: extractLabs(clientData)
    };

    // Calculer lean_mass_kg approximatif (bodyweight - 15-25% selon estimation)
    if (userProfile.bodyweight_kg && !userProfile.lean_mass_kg) {
      const estimatedBodyFat = 0.20; // 20% par défaut
      userProfile.lean_mass_kg = Math.round(userProfile.bodyweight_kg * (1 - estimatedBodyFat));
    }

    // Vérifier les safety gates
    const blockedIngredients = checkSafetyGates(userProfile);

    // Construire le prompt
    const userProfileJson = JSON.stringify(userProfile, null, 2);
    const libraryJson = JSON.stringify(SUPPLEMENT_LIBRARY, null, 2);

    const fullPrompt = `${SUPPLEMENT_SYSTEM_PROMPT}

USER PROFILE (JSON):
${userProfileJson}

SUPPLEMENT LIBRARY (JSON):
${libraryJson}

BLOCKED INGREDIENTS (do not include these):
${JSON.stringify(blockedIngredients, null, 2)}

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON matching this exact schema:
{
  "stack_core": [...],
  "stack_advanced": [...],
  "optional_addons": [...],
  "avoid_list": [...],
  "monitoring": {
    "labs_to_consider": [...],
    "symptoms_to_track": [...]
  },
  "shopping_rules": [...]
}

- NO markdown, NO extra text, ONLY JSON
- Every ingredient_id MUST exist in the supplement library
- Respect safety gates (blocked ingredients)
- Use evidence-based doses and timing`;

    // Appeler Gemini
    const model = genAI.getGenerativeModel({ 
      model: CONFIG.GEMINI_MODEL,
      generationConfig: {
        temperature: 0.7, // Plus bas pour la précision
        maxOutputTokens: 4000,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const jsonText = response.text();

    // Parser le JSON
    let stack: SupplementStack;
    try {
      stack = JSON.parse(jsonText);
    } catch (e) {
      // Nettoyer le JSON si nécessaire
      const cleanedJson = jsonText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      stack = JSON.parse(cleanedJson);
    }

    return stack;
  } catch (error: any) {
    console.error('❌ Erreur génération stack suppléments:', error.message);
    return null;
  }
}

// ============================================================
// FONCTION DE FORMATAGE POUR LE RAPPORT
// ============================================================

export function formatStackForReport(
  stack: SupplementStack | null,
  tier: AuditTier = 'PREMIUM'
): string {
  if (!stack) {
    return "⚠️ Impossible de générer une stack de suppléments personnalisée à ce moment.";
  }

  const lines: string[] = [];
  
  // Introduction directe et personnelle
  lines.push("Allez, analysons maintenant ton protocole de suppléments personnalisé. Ce n'est pas une liste générique, c'est ta stack sur-mesure basée sur ton profil complet.\n");

  // STACK CORE
  if (stack.stack_core && stack.stack_core.length > 0) {
    lines.push("STACK FONDATION");
    lines.push("Ce sont tes compléments de base, les piliers non-négociables pour reconstruire tes fondations :\n");
    stack.stack_core.forEach((item, idx) => {
      lines.push(`\n${idx + 1}. ${item.ingredient_id.replace(/_/g, ' ').toUpperCase()}`);
      if (item.mechanism) {
        lines.push(`   Pourquoi: ${item.mechanism}`);
      }
      if (item.dose) {
        lines.push(`   Dose: ${item.dose.value} ${item.dose.unit}${item.dose.range ? ' (fourchette)' : ''}`);
      }
      if (item.timing && item.timing.length > 0) {
        const timingStr = item.timing.map(t => {
          if (t === 'with_meal') return 'avec repas';
          if (t === 'pre_bed') return 'avant le coucher';
          if (t === 'morning') return 'matin';
          if (t === 'evening') return 'soir';
          if (t === 'split') return 'réparti';
          return t;
        }).join(', ');
        lines.push(`   Quand: ${timingStr}`);
      }
      if (item.cycle) {
        const cycleStr = item.cycle.on_weeks > 0 
          ? `${item.cycle.on_weeks} semaines ON${item.cycle.off_weeks > 0 ? `, ${item.cycle.off_weeks} semaines OFF` : ''}`
          : 'Continu';
        lines.push(`   Cycle: ${cycleStr}`);
      }
      if (item.expected_impacts && item.expected_impacts.length > 0) {
        lines.push(`   Effets attendus: ${item.expected_impacts.join(', ')}`);
      }
      if (item.risks && item.risks.length > 0) {
        lines.push(`   ⚠️ Précautions: ${item.risks.join(', ')}`);
      }
      if (item.label_check && item.label_check.length > 0 && idx === 0) {
        // Afficher les règles d'achat seulement une fois au début
      }
    });
  }

  // STACK ADVANCED (seulement pour PREMIUM)
  if (tier === 'PREMIUM' && stack.stack_advanced && stack.stack_advanced.length > 0) {
    lines.push("\n\nSTACK AVANCÉ");
    lines.push("Une fois la fondation posée, ces compléments peuvent t'aider à passer au niveau supérieur :\n");
    stack.stack_advanced.forEach((item, idx) => {
      lines.push(`\n${idx + 1}. ${item.ingredient_id.toUpperCase()}`);
      if (item.dose) {
        lines.push(`   Dose: ${item.dose.value} ${item.dose.unit}${item.dose.range ? ' (fourchette)' : ''}`);
      }
      if (item.timing && item.timing.length > 0) {
        lines.push(`   Timing: ${item.timing.join(', ')}`);
      }
      if (item.cycle) {
        const cycleStr = item.cycle.on_weeks > 0 
          ? `${item.cycle.on_weeks} semaines ON${item.cycle.off_weeks > 0 ? `, ${item.cycle.off_weeks} semaines OFF` : ''}`
          : 'Continu';
        lines.push(`   Cycle: ${cycleStr}`);
      }
      if (item.mechanism) {
        lines.push(`   Mécanisme: ${item.mechanism}`);
      }
      if (item.expected_impacts && item.expected_impacts.length > 0) {
        lines.push(`   Effets attendus: ${item.expected_impacts.join(', ')}`);
      }
    });
  }

  // OPTIONAL ADDONS
  if (stack.optional_addons && stack.optional_addons.length > 0 && tier === 'PREMIUM') {
    lines.push("\n\nCOMPLÉMENTS OPTIONNELS");
    lines.push("Ces suppléments peuvent apporter un plus selon tes besoins spécifiques :\n");
    stack.optional_addons.forEach((item, idx) => {
      lines.push(`\n${idx + 1}. ${item.ingredient_id.toUpperCase()}`);
      if (item.dose) {
        lines.push(`   Dose: ${item.dose.value} ${item.dose.unit}`);
      }
      if (item.mechanism) {
        lines.push(`   Mécanisme: ${item.mechanism}`);
      }
    });
  }

  // AVOID LIST
  if (stack.avoid_list && stack.avoid_list.length > 0) {
    lines.push("\n\nÀ ÉVITER");
    lines.push("Ces produits ou ingrédients ne sont pas adaptés à ton profil actuel :\n");
    stack.avoid_list.forEach((item) => {
      lines.push(`\n✗ ${item.ingredient_id}: ${item.reason}`);
    });
  }

  // MONITORING
  if (stack.monitoring) {
    lines.push("\n\n=== SUIVI RECOMMANDÉ ===");
    if (stack.monitoring.labs_to_consider && stack.monitoring.labs_to_consider.length > 0) {
      lines.push("\nBilans à considérer:");
      stack.monitoring.labs_to_consider.forEach(lab => lines.push(`  - ${lab}`));
    }
    if (stack.monitoring.symptoms_to_track && stack.monitoring.symptoms_to_track.length > 0) {
      lines.push("\nSymptômes à suivre:");
      stack.monitoring.symptoms_to_track.forEach(symptom => lines.push(`  - ${symptom}`));
    }
  }

  // SHOPPING RULES
  if (stack.shopping_rules && stack.shopping_rules.length > 0) {
    lines.push("\n\n=== RÈGLES D'ACHAT ===");
    stack.shopping_rules.forEach(rule => lines.push(`\n• ${rule}`));
  }

  return lines.join('\n');
}

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

function extractGoals(clientData: ClientData): string[] {
  const goals: string[] = [];
  const objectif = clientData['objectif']?.toLowerCase() || '';
  
  if (objectif.includes('masse') || objectif.includes('muscle')) goals.push('muscle_gain');
  if (objectif.includes('perte') || objectif.includes('gras') || objectif.includes('sèche')) goals.push('fat_loss');
  if (objectif.includes('force')) goals.push('strength');
  if (objectif.includes('santé') || objectif.includes('sante')) goals.push('health');
  if (objectif.includes('performance')) goals.push('performance');
  
  return goals;
}

function extractLabs(clientData: ClientData): Record<string, any> {
  const labs: Record<string, any> = {};
  
  // Essayer d'extraire des données de bilans si disponibles dans clientData
  // Cette fonction peut être étendue selon les clés disponibles
  
  return labs;
}

