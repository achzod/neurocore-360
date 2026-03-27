/**
 * APEXLABS - Peptides Engine
 * Generates personalized peptide protocols via Claude.
 * Temperature 0.3 for reproducibility and clinical consistency.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_CONFIG, validateAnthropicConfig } from "./anthropicConfig";
import { storage } from "./storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PeptideItem {
  name: string;
  purpose: string;
  dosage: string;
  timing: string;
  route: string;
  cycleDuration: string;
  purchaseUrl: string;
  priceEstimate: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
}

export interface PeptidesReport {
  clientName: string;
  sections: ReportSection[];
  peptides: PeptideItem[];
  bloodMarkers: string[];
  promoCodesGenerated: string[];
}

// ─── Client (lazy init) ───────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!validateAnthropicConfig()) {
      throw new Error("[PeptidesEngine] Anthropic API key not configured");
    }
    _client = new Anthropic({ apiKey: ANTHROPIC_CONFIG.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function generatePromoCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PEPBLOOD-${code}`;
}

function extractFirstName(responses: Record<string, unknown>, email: string): string {
  const raw =
    (responses as any)?.prenom ??
    (responses as any)?.firstName ??
    (responses as any)?.firstname ??
    (responses as any)?.name;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().split(/\s+/)[0];
  }
  if (email.includes("@")) return email.split("@")[0];
  return "Profil";
}

function buildResponsesSummary(responses: Record<string, unknown>): string {
  const lines: string[] = [];

  const FIELD_LABELS: Record<string, string> = {
    prenom: "Prénom",
    firstName: "Prénom",
    age: "Age",
    sexe: "Sexe",
    poids: "Poids (kg)",
    taille: "Taille (cm)",
    objectifPrincipal: "Objectif principal",
    objectifSecondaire: "Objectif secondaire",
    experience: "Expérience peptides",
    experiencePeptides: "Expérience peptides",
    experienceLevel: "Niveau d'expérience",
    niveauActivite: "Niveau d'activité",
    frequenceEntrainement: "Fréquence entraînement",
    typeEntrainement: "Type d'entraînement",
    stackActuel: "Stack actuel",
    supplementsActuels: "Suppléments actuels",
    medicaments: "Médicaments",
    antecedentsMedicaux: "Antécédents médicaux",
    antecedentsFamiliaux: "Antécédents familiaux",
    antecedentsCancer: "Antécédents cancer",
    cancer: "Cancer / Antécédents cancer",
    diabete: "Diabète",
    thyroide: "Problèmes thyroïdiens",
    problemesThyroide: "Problèmes thyroïdiens",
    hypertension: "Hypertension",
    pathologiesChroniques: "Pathologies chroniques",
    allergies: "Allergies",
    douleurs: "Douleurs / blessures",
    blessures: "Blessures passées",
    recuperation: "Qualité récupération",
    sommeil: "Qualité sommeil",
    dureeSommeil: "Durée sommeil",
    fatigue: "Niveau de fatigue",
    libido: "Libido",
    libidoEtErection: "Libido / érection",
    stress: "Niveau de stress",
    niveauStress: "Niveau de stress",
    humeur: "Humeur générale",
    concentration: "Concentration / cognition",
    peau: "Santé peau",
    cheveux: "Santé cheveux",
    cicatrisation: "Cicatrisation",
    perteDePoids: "Objectif perte de poids",
    igf1: "IGF-1 (si connu)",
    gh: "GH (si connue)",
    testosteroneTotale: "Testostérone totale (ng/dL)",
    glycemie: "Glycémie à jeun (mg/dL)",
    hba1c: "HbA1c (%)",
    budget: "Budget mensuel (EUR)",
    budgetMensuel: "Budget mensuel (EUR)",
    voieAdministration: "Voie administration préférée",
    disponibiliteInjection: "Disponibilité injections",
    frequenceDesiredDosing: "Fréquence dosage souhaitée",
    dureeProtocole: "Durée protocole souhaitée",
    contraintesMedicales: "Contraintes médicales",
    autresInfos: "Informations complémentaires",
  };

  const SKIP_KEYS = new Set(["photo", "image", "photos", "password"]);

  for (const [key, value] of Object.entries(responses)) {
    if (!value && value !== 0) continue;
    if (SKIP_KEYS.has(key.toLowerCase())) continue;

    const label = FIELD_LABELS[key] || key;
    const strValue = Array.isArray(value)
      ? value.join(", ")
      : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

    if (strValue.startsWith("data:image/")) continue;
    if (strValue.trim().length === 0) continue;

    lines.push(`${label}: ${strValue}`);
  }

  return lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un expert en peptides thérapeutiques avec 15 ans d'expérience clinique et de terrain. Tu combines rigueur scientifique, harm reduction et pragmatisme. Tu t'exprimes en français, de façon directe et sans paternalisme.

CADRE DE TRAVAIL
- Tu fournis des protocoles personnalisés basés sur les données du profil
- Tu ne prescris pas — tu informes et tu recommandes avec une approche harm reduction
- Tu adaptes toujours les protocoles aux contraintes individuelles (santé, budget, voie d'administration, expérience)
- Tu cites des fenêtres de dosage basées sur la littérature disponible et les pratiques documentées

CONNAISSANCES PEPTIDES (base complète)

BPC-157 (Body Protection Compound 157)
- Mécanisme: promotion de l'angiogenèse, upregulation VEGF, protection gastrointestinale, modulation NO
- Dosage typique: 200-500 mcg/jour (SC ou IM), oral 500-1500 mcg/jour (moins biodisponible)
- Timing: matin à jeun ou split matin/soir
- Route: SC préférée pour ciblage systémique; IM local pour tendon/muscle ciblé
- Durée cycle: 4-12 semaines selon indication
- Stockage: 2-8°C reconstitué, 6 mois lyophilisé
- Effets secondaires: nausées légères (rares), potentiel pro-angiogénique (contre-indication oncologie)
- Contre-indications absolues: antécédents de cancer actif ou récent (< 5 ans)
- Références: études animales Sikiric et al.; usage humain documenté hors AMM

TB-500 (Thymosin Beta-4 fragment)
- Mécanisme: modulation actine, migration cellulaire, réduction inflammation, régénération tissulaire
- Dosage typique: 2-2.5 mg 2x/semaine (induction), puis 1-1.25 mg 2x/semaine (maintenance)
- Timing: flexible, non horaire-dépendant
- Route: SC ou IM
- Durée cycle: 4-6 semaines induction, maintenance selon réponse
- Synergie: excellent avec BPC-157 pour récupération musculosquelettique
- Contre-indications: même prudence oncologique que BPC-157
- Stockage: 2-8°C reconstitué, 3-4 semaines

CJC-1295 sans DAC (Mod GRF 1-29)
- Mécanisme: analogue GHRH, stimule sécrétion pulsatile GH hypophysaire
- Dosage typique: 100-200 mcg par injection
- Timing: 30-45 min avant sommeil (pic GH nocturne), ou post-entraînement
- Route: SC (sous-cutané)
- Durée cycle: 8-12 semaines, pause 4 semaines
- Important: demi-vie courte (30 min) — effet pulse naturel; toujours associer à un GHRP/sécrétagogue
- Contre-indications: acromégalie, tumeurs actives, résistance insulinique sévère non contrôlée
- Stockage: 2-8°C reconstitué, 2-3 semaines

CJC-1295 avec DAC
- Mécanisme: GHRH long-acting (demi-vie 8 jours), élévation GH baseline prolongée
- Dosage typique: 1-2 mg/semaine (1-2 injections)
- Timing: 1-2x/semaine flexible
- Route: SC
- Durée cycle: 8-12 semaines
- Différence vs sans DAC: élévation GH baseline vs pulsatile — moins physiologique, plus pratique
- Contre-indications: idem sans DAC + vigilance supplémentaire résistance insulinique (GH baseline élevée)

Ipamorelin
- Mécanisme: sécrétagogue GH sélectif (GHRP), minimal effet cortisol/prolactine
- Dosage typique: 100-300 mcg par injection, 1-3x/jour
- Timing: avant sommeil et/ou post-entraînement, à jeun (+/- 30 min repas)
- Route: SC
- Profil: plus propre que GHRP-2/GHRP-6 (pas de faim excessive, pas de cortisol)
- Synergie forte: CJC-1295 sans DAC + Ipamorelin = combo standard premier cycle GH
- Durée cycle: 8-12 semaines, pause 4 semaines
- Contre-indications: tumeurs actives

Tesamorelin
- Mécanisme: analogue GHRH stabilisé, approuvé FDA pour lipoatrophie VIH
- Dosage typique: 1-2 mg/jour SC
- Timing: avant sommeil
- Indication principale: réduction graisse viscérale, cognition (données Alzheimer)
- Route: SC
- Durée: 3-6 mois
- Coût élevé; protocole plus médical
- Contre-indications: idem GHRH class

Sermorelin
- Mécanisme: fragment GHRH (1-29), premier GHRH de synthèse
- Dosage typique: 200-500 mcg/jour avant sommeil
- Route: SC
- Profil: bien toléré, souvent utilisé anti-âge et protocoles TRT adjuvants
- Durée: 3-6 mois
- Moins puissant que CJC-1295, coût inférieur

MK-677 (Ibutamoren — non-peptide sécrétagogue oral)
- Mécanisme: agoniste ghrelin receptor, sécrétagogue GH oral puissant
- Dosage typique: 10-25 mg/jour (oral)
- Timing: au coucher (évite faim diurne)
- Avantage majeur: oral, pas d'injection
- Effets secondaires: rétention eau, faim accrue, engourdissements membres, élévation glycémie
- Contre-indications relatives: diabète type 2 non contrôlé, résistance insulinique marquée
- Durée: cycles 3-6 mois ou continu avec surveillance

AOD-9604
- Mécanisme: fragment hGH (177-191), lipolytique sans effet IGF-1
- Dosage typique: 250-300 mcg/jour SC ou oral
- Timing: matin à jeun
- Indication: perte de graisse localisée ou globale sans effets anabolisants
- Durée cycle: 4-12 semaines
- Profil sécurité favorable; pas d'impact insulinique

5-Amino-1MQ
- Mécanisme: inhibiteur NNMT, augmente NAD+/SAM, améliore métabolisme lipidique
- Dosage typique: 50-100 mg/jour (oral ou sublingual)
- Indication: perte de masse grasse, longévité métabolique, sensibilité insulinique
- Durée: 8-12 semaines
- Données humaines limitées; prometteur sur modèles précliniques

DSIP (Delta Sleep-Inducing Peptide)
- Mécanisme: neuropeptide, modulation cycles sommeil delta, action opioïde légère
- Dosage typique: 100-200 mcg SC au coucher
- Indication: insomnie, amélioration architecture sommeil profond
- Durée: 2-4 semaines cycles

Epitalon (Epithalon)
- Mécanisme: tétrapeptide pinéal, activation télomérase, régulation mélatonine
- Dosage typique: 5-10 mg/jour SC pendant 10-20 jours (2x/an)
- Indication: anti-âge, immunité, régulation circadienne
- Profil sécurité: très bien toléré

Semax
- Mécanisme: analogue ACTH(4-7), neuroprotecteur, BDNF upregulation
- Dosage typique: 200-600 mcg intranasale (1-3x/jour)
- Route: intranasal (spray)
- Indication: cognition, récupération neurologique, anxiété, focus
- Durée: 2-4 semaines cycles
- Bien toléré; usage documenté en Russie/Ukraine

Selank
- Mécanisme: analogue tuftsin, anxiolytique, BDNF, immunomodulateur
- Dosage typique: 200-300 mcg intranasale 2x/jour
- Route: intranasale
- Indication: anxiété, stress chronique, cognition
- Durée: 2-4 semaines; peut être prolongé

PT-141 (Bremelanotide)
- Mécanisme: agoniste MCR (mélanokortine), stimulation centrale de la libido
- Dosage typique: 0.5-2 mg SC, 45-90 min avant activité sexuelle
- Route: SC
- Indication: dysfonction sexuelle (hommes et femmes), libido
- Effets secondaires: nausées (réduire dose), flush, légère hypertension transitoire
- Contre-indications: hypertension non contrôlée, pathologie cardiovasculaire sévère
- Remarque: usage ponctuel (non chronique)

GHK-Cu (Cuivre tripeptide-1)
- Mécanisme: facteur de croissance endogène, synthèse collagène, réparation ADN, anti-inflammatoire
- Dosage typique: 1-2 mg SC ou topique (beaucoup plus), 3-5x/semaine
- Indication: cicatrisation, peau, inflammation, récupération
- Durée: 4-8 semaines
- Excellent profil sécurité

Melanotan II
- Mécanisme: agoniste mélanokortine non sélectif, bronzage, libido, érection spontanée
- Dosage typique: 0.25-1 mg SC (dose d'essai 0.1 mg)
- Route: SC
- Effets secondaires: nausées (dose-dépendant), bouffées de chaleur, érections spontanées, yeux sombres permanents à forte dose
- Contre-indications: mélanome ou antécédents, nevi multiples atypiques, risque cardiovasculaire élevé
- Avertissement: profil sécurité moins favorable que PT-141; usage strict harm reduction
- Durée: cycles courts, titration prudente

SS-31 (Elamipretide)
- Mécanisme: ciblage membrane mitochondriale interne, réduction ROS, protection mitochondries
- Dosage typique: 1-3 mg/jour SC
- Indication: longévité, récupération cardiaque, maladies mitochondriales
- Route: SC
- Données: essais cliniques phase II/III pour IC et maladies mitochondriales
- Durée: protocoles longs 4-12 semaines

RECONSTITUTION ET STOCKAGE
- Eau bactériostatique (BAC water): solvant standard pour lyophilisats peptidiques
- Volume BAC: typiquement 1-2 mL pour vials 2-5 mg (donne concentrations pratiques 1-5 mg/mL)
- Calcul dose: (dose mcg / concentration mcg par mL) × 100 = unités sur seringue U-100
- Seringues: insuline U-100 (31G × 8mm) pour SC; 25-27G pour IM
- Injection SC: ventre, cuisse externe, flanc — 45° ou pli cutané
- Stockage lyophilisé: température ambiante ou 2-8°C, à l'abri lumière
- Stockage reconstitué: 2-8°C obligatoire, jamais congeler sauf lyophilisé
- Durée reconstitué: 2-4 semaines selon peptide (cf. fiches individuelles)
- Antisepsie: swab alcool vial + site injection, laisser sécher 30 sec

RÈGLES DE SÉCURITÉ (non négociables)
1. CANCER (actif ou < 5 ans de rémission) → contre-indication absolue à tous peptides pro-angiogéniques (BPC-157, TB-500) et à la classe GHRH/sécrétagogues GH
2. DIABÈTE TYPE 2 non contrôlé → éviter MK-677 (élévation glycémique), prudence sécrétagogues GH (augmentent insulinorésistance)
3. ACROMÉGALIE / GH endogène élevée → contre-indication aux sécrétagogues GH
4. HYPERTENSION NON CONTRÔLÉE → éviter Melanotan II, PT-141 (flush hypertensif)
5. GROSSESSE / ALLAITEMENT → aucun peptide recommandé
6. MÉLANOME ou NEVI ATYPIQUES → contre-indication Melanotan II absolue
7. MALADIE HÉPATIQUE SÉVÈRE → prudence générale, métabolisme altéré
8. Adapter budget: prioriser 1-2 peptides si budget < 200 EUR/mois

FORMAT DE RÉPONSE
Tu dois répondre UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte autour).
Le JSON doit respecter exactement la structure demandée dans le prompt utilisateur.`;

// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(
  responses: Record<string, unknown>,
  firstName: string
): string {
  const summary = buildResponsesSummary(responses);

  return `Génère un protocole peptides personnalisé pour ce profil.

DONNÉES PROFIL (${firstName}):
${summary}

INSTRUCTIONS:
1. Analyse les objectifs, contraintes de santé, budget, expérience et stack actuel
2. Applique les règles de sécurité strictes (cancer, diabète, etc.)
3. Sélectionne 2 à 5 peptides adaptés au profil (pas plus pour ne pas surcharger)
4. Pour chaque peptide, fournis les URL peptaura.com dans purchaseUrl
5. Les sections narratives doivent être en français, directes, sans jargon inutile
6. Les bloodMarkers doivent être les marqueurs biologiques à surveiller pendant le protocole

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans texte avant ou après):

{
  "clientName": "${firstName}",
  "sections": [
    {
      "id": "profil-synthese",
      "title": "Synthèse du profil",
      "content": "Analyse narrative du profil: objectifs, points forts, contraintes..."
    },
    {
      "id": "rationale",
      "title": "Raisonnement du protocole",
      "content": "Pourquoi ces peptides spécifiquement pour ce profil, logique de sélection..."
    },
    {
      "id": "protocole-pratique",
      "title": "Protocole pratique",
      "content": "Guide opérationnel: reconstitution, timing d'injection, organisation de la semaine..."
    },
    {
      "id": "securite-surveillance",
      "title": "Sécurité et surveillance",
      "content": "Signaux d'alerte, ajustements de dose, quand arrêter, interactions potentielles..."
    },
    {
      "id": "prochaines-etapes",
      "title": "Prochaines étapes",
      "content": "Recommandations bilans biologiques à faire avant/pendant, progression protocole..."
    }
  ],
  "peptides": [
    {
      "name": "Nom du peptide",
      "purpose": "Objectif spécifique pour ce profil",
      "dosage": "X mcg / X mg par injection ou par jour",
      "timing": "Horaire et conditions (à jeun, avant sommeil, etc.)",
      "route": "SC / IM / Intranasal / Oral",
      "cycleDuration": "X semaines, pause Y semaines",
      "purchaseUrl": "https://peptaura.com/...",
      "priceEstimate": "~XX EUR / mois"
    }
  ],
  "bloodMarkers": [
    "IGF-1",
    "Glycémie à jeun",
    "HbA1c",
    "... autres marqueurs pertinents pour ce profil"
  ],
  "promoCodesGenerated": []
}`;
}

// ─── Claude call with retry ───────────────────────────────────────────────────

const PEPTIDES_MAX_TOKENS = 4000;
const PEPTIDES_TEMPERATURE = 0.3;
const PEPTIDES_MAX_RETRIES = 3;

async function callClaudeForPeptides(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = getClient();
  const model = ANTHROPIC_CONFIG.ANTHROPIC_MODEL;
  const fallback = ANTHROPIC_CONFIG.ANTHROPIC_FALLBACK_MODEL;

  for (let attempt = 1; attempt <= PEPTIDES_MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: PEPTIDES_MAX_TOKENS,
        temperature: PEPTIDES_TEMPERATURE,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find((c) => c.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text : "";

      if (!text.trim()) throw new Error("Empty response from Claude");

      console.log(`[PeptidesEngine] Generation OK (attempt ${attempt}, model: ${model})`);
      return text;
    } catch (error: any) {
      const status = error?.status;
      const msg = String(error?.message || error || "");
      console.error(`[PeptidesEngine] Attempt ${attempt}/${PEPTIDES_MAX_RETRIES} failed: ${msg}`);

      if (status === 429) {
        const retryAfter = error?.headers?.["retry-after"];
        const waitMs = retryAfter ? Number(retryAfter) * 1000 : 8000;
        console.log(`[PeptidesEngine] Rate limit — waiting ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      if (status === 529 || msg.includes("overloaded")) {
        console.log(`[PeptidesEngine] Server overloaded — waiting 12s`);
        await sleep(12000);
        continue;
      }

      if (attempt < PEPTIDES_MAX_RETRIES) {
        await sleep(3000 + Math.random() * 1000);
      }
    }
  }

  // Fallback model
  console.log(`[PeptidesEngine] Switching to fallback model: ${fallback}`);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: fallback,
        max_tokens: PEPTIDES_MAX_TOKENS,
        temperature: PEPTIDES_TEMPERATURE,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const textBlock = response.content.find((c) => c.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text : "";
      if (text.trim()) {
        console.log(`[PeptidesEngine] Fallback OK (attempt ${attempt})`);
        return text;
      }
    } catch (error: any) {
      console.error(`[PeptidesEngine] Fallback attempt ${attempt}/2: ${error?.message || error}`);
      if (attempt < 2) await sleep(4000);
    }
  }

  throw new Error("[PeptidesEngine] All generation attempts failed");
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

function extractJsonFromResponse(raw: string): PeptidesReport {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Find first { to last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(cleaned);
    return parsed as PeptidesReport;
  } catch (err) {
    console.error("[PeptidesEngine] JSON parse error:", err);
    console.error("[PeptidesEngine] Raw response preview:", raw.slice(0, 500));
    throw new Error("Could not parse Claude response as JSON");
  }
}

// ─── Promo code creator ───────────────────────────────────────────────────────

async function createBloodAnalysisPromoCodes(email: string): Promise<string[]> {
  const codes: string[] = [];

  for (let i = 0; i < 2; i++) {
    const code = generatePromoCode();
    try {
      await storage.createPromoCode({
        code,
        discountPercent: 100,
        description: `Blood Analysis offert — Peptides Engine (${email})`,
        validFor: "BLOOD_ANALYSIS",
        maxUses: 1,
        isActive: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });
      codes.push(code);
      console.log(`[PeptidesEngine] Promo code created: ${code}`);
    } catch (err) {
      console.error(`[PeptidesEngine] Failed to create promo code ${code}:`, err);
      // Still add to list — delivery email will carry it even if DB insert failed
      codes.push(code);
    }
  }

  return codes;
}

// ─── Safety gate ──────────────────────────────────────────────────────────────

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
}

export function checkPeptidesSafetyGate(
  responses: Record<string, unknown>
): SafetyCheckResult {
  const boolish = (v: unknown): boolean => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const lower = v.toLowerCase();
      return lower === "oui" || lower === "yes" || lower === "true";
    }
    return false;
  };

  const stringish = (v: unknown): string => {
    if (!v) return "";
    return String(v).toLowerCase();
  };

  // Cancer check — multiple possible field names
  const cancerFields = ["cancer", "antecedentsCancer", "antecedentsMedicaux", "pathologiesChroniques"];
  for (const field of cancerFields) {
    const val = responses[field];
    if (boolish(val)) {
      return {
        safe: false,
        reason:
          "Antécédents de cancer détectés. Les peptides pro-angiogéniques (BPC-157, TB-500) et les sécrétagogues GH sont contre-indiqués. Consulte un oncologue avant toute supplémentation.",
      };
    }
    if (typeof val === "string" && stringish(val).includes("cancer")) {
      return {
        safe: false,
        reason:
          "Antécédents de cancer détectés. Les peptides pro-angiogéniques (BPC-157, TB-500) et les sécrétagogues GH sont contre-indiqués. Consulte un oncologue avant toute supplémentation.",
      };
    }
  }

  // Check free-text antecedentsMedicaux for cancer keyword
  const antecedents = stringish(responses["antecedentsMedicaux"]);
  if (antecedents.includes("cancer") || antecedents.includes("tumeur") || antecedents.includes("onco")) {
    return {
      safe: false,
      reason:
        "Antécédents oncologiques détectés dans le profil médical. Protocole peptides suspendu par précaution. Consulte un médecin spécialisé.",
    };
  }

  return { safe: true };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generatePeptidesProtocol(
  responses: Record<string, unknown>,
  email: string
): Promise<PeptidesReport> {
  console.log(`[PeptidesEngine] Starting generation for ${email}`);

  const firstName = extractFirstName(responses, email);
  const userPrompt = buildUserPrompt(responses, firstName);

  // Generate protocol
  const rawResponse = await callClaudeForPeptides(SYSTEM_PROMPT, userPrompt);
  const report = extractJsonFromResponse(rawResponse);

  // Create promo codes and inject into report
  const promoCodes = await createBloodAnalysisPromoCodes(email);
  report.promoCodesGenerated = promoCodes;

  // Normalize client name
  report.clientName = firstName;

  console.log(
    `[PeptidesEngine] Done for ${email} — ${report.peptides?.length ?? 0} peptides, ${report.sections?.length ?? 0} sections`
  );

  return report;
}
