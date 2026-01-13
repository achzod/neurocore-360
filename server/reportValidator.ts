/**
 * NEUROCORE 360 - Report Quality Validator
 *
 * Validates generated reports before sending to ensure:
 * - All sections are present and complete
 * - Content quality meets standards
 * - No AI-sounding clichés
 * - CTA and review sections are included
 * - Minimum content thresholds are met
 */

import { AuditTier } from './types';
import { getSectionsForTier } from './geminiPremiumEngine';

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  warnings: string[];
  details: {
    sectionsFound: number;
    sectionsExpected: number;
    missingSections: string[];
    shortSections: string[];
    aiPatternsFound: string[];
    totalChars: number;
    averageSectionLength: number;
    hasCTA: boolean;
    hasReviewSection: boolean;
    sourcesFound: string[];
  };
}

// AI clichés and patterns to detect (French)
const AI_PATTERNS = [
  // Generic AI phrases (truly robotic, not natural French)
  "il est important de noter que",
  "il convient de souligner que",
  "il est essentiel de préciser",
  "n'hésitez pas à",
  "n'hésite pas à consulter",
  "dans le cadre de cette analyse",
  "en conclusion de cette section",
  "pour conclure ce chapitre",
  "il va sans dire que",
  "comme mentionné précédemment",
  "comme nous l'avons vu plus haut",
  "cependant il est important de noter",
  "il faut savoir que dans ce contexte",

  // Generic health clichés
  "chaque individu est unique",
  "chaque personne est différente",
  "écoutez votre corps",
  "écoute ton corps",
  "prenez soin de vous",
  "prends soin de toi",
  "votre bien-être est important",
  "ton bien-être est important",
  "consultez un professionnel",
  "consulte un professionnel",
  "avant de commencer tout",
  "avant toute modification",
  "parlez-en à votre médecin",
  "parle à ton médecin",
  "ce guide ne remplace pas",
  "ceci n'est pas un avis médical",
  "pour aller plus loin",

  // AI-specific language patterns
  "en tant qu'assistant",
  "en tant qu'ia",
  "en tant que modèle",
  "je suis un assistant",
  "je suis une ia",
  "je ne suis pas un médecin",
  "je ne peux pas diagnostiquer",

  // Overly formal/robotic
  "veuillez noter que",
  "il vous est conseillé",
  "il t'est conseillé",
  "suite à l'analyse",
  "au vu des données",
  "compte tenu des informations",
  "au regard de",
  "dans cette optique",
  "dans cette perspective",
  "à cet égard",
  "force est de constater",

  // Empty phrases
  "joue un rôle important",
  "joue un rôle crucial",
  "revêt une importance",
  "est fondamental pour",
  "est essentiel pour",
  "constitue un élément clé",
  "représente un aspect",
];

// Minimum section lengths (in characters)
const MIN_SECTION_LENGTH_PREMIUM = 3200;
const MIN_SECTION_LENGTH_GRATUIT = 2000;
const MIN_TOTAL_LENGTH_PREMIUM = 60000; // ~40+ pages
const MIN_TOTAL_LENGTH_GRATUIT = 15000; // ~10+ pages

// Required CTA markers
const CTA_MARKERS = [
  "coaching",
  "accompagnement",
  "formule",
  "offre",
  "programme",
  "achzodcoaching",
  "neurocore20",
  "analyse20",
  "promo",
  "réduction",
];

// Review/rating markers
const REVIEW_MARKERS = [
  "avis",
  "review",
  "note",
  "étoile",
  "satisfaction",
  "feedback",
  "témoignage",
  "recommander",
];

// Knowledge base source markers (should NOT appear in final text)
const SOURCE_MARKERS = [
  "huberman",
  "peter attia",
  "attia",
  "applied metabolics",
  "stronger by science",
  "sbs",
  "examine",
  "renaissance periodization",
  "mpmd",
  "newsletter",
  "achzod",
];

const MULTI_PERSON_MARKERS = ["nous", "notre", "nos", "client"];

export function validateReport(
  reportTxt: string,
  reportHtml: string,
  tier: AuditTier
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const aiPatternsFound: string[] = [];

  const expectedSections = getSectionsForTier(tier);
  const sectionsFound: string[] = [];
  const missingSections: string[] = [];
  const shortSections: string[] = [];

  // Normalize text for analysis
  const txtLower = reportTxt.toLowerCase();
  const htmlLower = reportHtml.toLowerCase();

  // 1. Check total length
  const totalChars = reportTxt.length;
  const minLength = tier === 'GRATUIT' ? MIN_TOTAL_LENGTH_GRATUIT : MIN_TOTAL_LENGTH_PREMIUM;

  if (totalChars < minLength) {
    errors.push(`Rapport trop court: ${totalChars} chars (minimum: ${minLength})`);
  } else if (totalChars < minLength * 1.2) {
    warnings.push(`Rapport proche du minimum: ${totalChars} chars`);
  }

  // 2. Check each section is present and has content
  const minSectionLength = tier === 'GRATUIT' ? MIN_SECTION_LENGTH_GRATUIT : MIN_SECTION_LENGTH_PREMIUM;

  for (const section of expectedSections) {
    const sectionNameLower = section.toLowerCase();
    const sectionNameUpper = section.toUpperCase();

    // Find section in text
    const sectionIndex = txtLower.indexOf(sectionNameLower);
    const sectionIndexUpper = reportTxt.indexOf(sectionNameUpper);

    if (sectionIndex === -1 && sectionIndexUpper === -1) {
      missingSections.push(section);
      errors.push(`Section manquante: "${section}"`);
      continue;
    }

    sectionsFound.push(section);

    // Find next section to calculate length
    const startIndex = sectionIndexUpper !== -1 ? sectionIndexUpper : sectionIndex;
    let endIndex = reportTxt.length;

    for (const otherSection of expectedSections) {
      if (otherSection === section) continue;
      const otherIndex = reportTxt.indexOf(otherSection.toUpperCase(), startIndex + section.length);
      if (otherIndex !== -1 && otherIndex < endIndex) {
        endIndex = otherIndex;
      }
    }

    const sectionContent = reportTxt.substring(startIndex, endIndex);
    const sectionLength = sectionContent.length;

    if (sectionLength < minSectionLength) {
      shortSections.push(`${section} (${sectionLength} chars)`);
      errors.push(`Section trop courte: "${section}" - ${sectionLength} chars (minimum: ${minSectionLength})`);
    }
  }

  // 3. Check for AI patterns
  for (const pattern of AI_PATTERNS) {
    if (txtLower.includes(pattern.toLowerCase())) {
      aiPatternsFound.push(pattern);
    }
  }

  if (aiPatternsFound.length >= 6) {
    errors.push(`Trop de patterns IA détectés (${aiPatternsFound.length}): ${aiPatternsFound.slice(0, 5).join(', ')}...`);
  } else if (aiPatternsFound.length >= 2) {
    warnings.push(`Patterns IA détectés (${aiPatternsFound.length}): ${aiPatternsFound.join(', ')}`);
  }

  // 4. Knowledge source visibility (should be absent in output)
  const sourcesFound = SOURCE_MARKERS.filter((marker) => txtLower.includes(marker));
  if (sourcesFound.length > 0) {
    errors.push(`Sources visibles dans le texte: ${sourcesFound.join(", ")}`);
  }

  // 4b. Single-author voice (no "nous"/"client")
  const multiFound = MULTI_PERSON_MARKERS.filter((marker) => new RegExp(`\\b${marker}\\b`).test(txtLower));
  if (multiFound.length > 0) {
    errors.push(`Pronoms collectifs/termes interdits detectes: ${multiFound.join(", ")}`);
  }

  // 5. Check CTA presence
  const hasCTA = CTA_MARKERS.some(marker =>
    txtLower.includes(marker.toLowerCase()) || htmlLower.includes(marker.toLowerCase())
  );

  if (!hasCTA) {
    errors.push('CTA coaching/offre manquant dans le rapport');
  }

  // 6. Check review section (only for PREMIUM)
  const hasReviewSection = tier === 'GRATUIT' || REVIEW_MARKERS.some(marker =>
    txtLower.includes(marker.toLowerCase()) || htmlLower.includes(marker.toLowerCase())
  );

  if (!hasReviewSection) {
    warnings.push('Section demande de review/avis manquante');
  }

  // 7. Check HTML structure
  if (reportHtml.length < 5000) {
    errors.push(`HTML trop court: ${reportHtml.length} chars`);
  }

  if (!reportHtml.includes('<!DOCTYPE html') && !reportHtml.includes('<html')) {
    errors.push('HTML invalide: balise <html> manquante');
  }

  // 8. Check for placeholder/error text
  // Note: "null" and "undefined" removed - can appear in legitimate text
  // "ERROR" and "FAILED" only matched in caps to avoid false positives
  const errorMarkers = [
    'NOTE (TECHNIQUE)',
    'incident temporaire',
    'service est stable',
    '[object Object]',
    '{{',  // Template placeholder
    '}}',  // Template placeholder
    'PLACEHOLDER',
  ];

  for (const marker of errorMarkers) {
    if (reportTxt.includes(marker)) {
      errors.push(`Texte d'erreur/placeholder détecté: "${marker}"`);
    }
  }

  // 9. Check for personalization (client name should appear)
  const personalMarkers = ['ton', 'ta', 'tes', 'toi', 'te '];
  const hasPersonalization = personalMarkers.some(marker => txtLower.includes(marker));

  if (!hasPersonalization) {
    warnings.push('Manque de personnalisation (tutoiement)');
  }

  // Calculate score
  let score = 100;

  // Deduct for errors
  score -= errors.length * 15;

  // Deduct for warnings
  score -= warnings.length * 5;

  // Deduct for missing sections
  score -= missingSections.length * 10;

  // Deduct for short sections
  score -= shortSections.length * 5;

  // Deduct for AI patterns (capped)
  score -= Math.min(aiPatternsFound.length * 2, 20);

  // Bonus for extra content
  if (totalChars > minLength * 1.5) score += 5;

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Calculate average section length
  const averageSectionLength = sectionsFound.length > 0
    ? Math.round(totalChars / sectionsFound.length)
    : 0;

  return {
    isValid: errors.length === 0 && score >= 60,
    score,
    errors,
    warnings,
    details: {
      sectionsFound: sectionsFound.length,
      sectionsExpected: expectedSections.length,
      missingSections,
      shortSections,
      aiPatternsFound,
      totalChars,
      averageSectionLength,
      hasCTA,
      hasReviewSection,
      sourcesFound,
    },
  };
}

/**
 * Quick validation for progress monitoring (less intensive)
 */
export function quickValidate(partialTxt: string, expectedSections: number): {
  sectionsDetected: number;
  estimatedProgress: number;
  isProgressing: boolean;
} {
  const txtUpper = partialTxt.toUpperCase();

  // Count section headers (uppercase section names)
  let sectionsDetected = 0;
  const sectionPatterns = [
    'EXECUTIVE SUMMARY',
    'ANALYSE',
    'PROTOCOLE',
    'SUPPLEMENTS',
    'SYNTHESE',
    'KPI',
    'PLAN',
    'BILAN',
    'NUTRITION',
    'SOMMEIL',
    'STRESS',
    'HORMONES',
    'ENERGIE',
    'DIGESTION',
    'CARDIO',
  ];

  for (const pattern of sectionPatterns) {
    if (txtUpper.includes(pattern)) {
      sectionsDetected++;
    }
  }

  const estimatedProgress = Math.round((sectionsDetected / expectedSections) * 100);

  return {
    sectionsDetected,
    estimatedProgress: Math.min(estimatedProgress, 95), // Cap at 95 until full validation
    isProgressing: sectionsDetected > 0,
  };
}

/**
 * Log validation results
 */
export function logValidation(auditId: string, result: ValidationResult): void {
  const status = result.isValid ? '✅ VALID' : '❌ INVALID';

  console.log(`\n[Validator] ${status} - Audit ${auditId}`);
  console.log(`[Validator] Score: ${result.score}/100`);
  console.log(`[Validator] Sections: ${result.details.sectionsFound}/${result.details.sectionsExpected}`);
  console.log(`[Validator] Total chars: ${result.details.totalChars}`);
  console.log(`[Validator] Avg section length: ${result.details.averageSectionLength}`);
  console.log(`[Validator] CTA present: ${result.details.hasCTA}`);
  console.log(`[Validator] Review section: ${result.details.hasReviewSection}`);
  console.log(`[Validator] Sources found: ${result.details.sourcesFound.join(", ") || "none"}`);

  if (result.errors.length > 0) {
    console.log(`[Validator] ERRORS:`);
    result.errors.forEach(err => console.log(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log(`[Validator] WARNINGS:`);
    result.warnings.forEach(warn => console.log(`  - ${warn}`));
  }

  if (result.details.aiPatternsFound.length > 0) {
    console.log(`[Validator] AI patterns: ${result.details.aiPatternsFound.slice(0, 5).join(', ')}`);
  }

  console.log('');
}
