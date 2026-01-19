# BUGS TROUVÉS - TESTS NEUROCORE 360

**Date:** 2026-01-10
**Phase:** Tests end-to-end

---

## 🐛 BUG #1: Burnout Engine Test Failure

**Severity:** CRITIQUE
**Status:** ❌ Bloquant
**Produit:** Burnout Engine
**Fichier test:** `server/test-all-offers.ts`

### Description
Le test automatisé du Burnout Engine échoue lors de la soumission.

### Erreur
```
❌ Erreur: {"error":"Aucune réponse fournie"}
```

### Endpoint
```typescript
POST /api/burnout-detection/analyze
```

### Données envoyées
```typescript
{
  prenom: "Julien",
  email: "test.burnout.XXX@achzodcoaching.com",
  fatigue_reveil: "toujours",
  energie_journee: "epuise",
  motivation_travail: "aucune",
  // ... 20+ champs
}
```

### Cause probable
1. Structure des données ne correspond pas au schéma attendu par l'API
2. Validation Zod échoue sur les champs
3. Champs manquants ou noms de champs incorrects

### Impact
- ❌ Impossible de tester Burnout Engine automatiquement
- ⚠️ Potentiel bug en production si utilisateurs soumettent avec ces champs

### À investiguer
- [ ] Vérifier schéma Zod pour Burnout Engine dans `server/routes.ts`
- [ ] Vérifier mapping des champs dans `server/burnout-detection.ts`
- [ ] Comparer avec questionnaire frontend Burnout
- [ ] Tester manuellement via UI pour voir si même problème

### Fix proposé
1. Auditer le schéma de validation
2. Corriger les noms de champs dans test
3. Ou corriger la validation API pour accepter les champs

---

## ✅ TESTS COMPLÉTÉS

### 1. Discovery Scan ✅ SUCCESS
- **ID:** 4da7d306-53f6-4802-9b8a-9ea22fe38fd8
- **Email:** test.discovery.1768044261449@achzodcoaching.com
- **URL:** https://neurocore-360.onrender.com/audit/4da7d306-53f6-4802-9b8a-9ea22fe38fd8
- **Durée génération:** ~2 minutes
- **Validation:**
  - ✅ Aucun pattern IA détecté
  - ✅ Analyse nutrition détaillée présente
  - ✅ Compléments niveau expert présents
  - ✅ CTA présent

### 2. Anabolic Bioscan ✅ SUCCESS
- **ID:** d55b3ae7-f03f-4d1f-8221-834cdb3b8ea2
- **Email:** test.anabolic.1768044262089@achzodcoaching.com
- **URL:** https://neurocore-360.onrender.com/audit/d55b3ae7-f03f-4d1f-8221-834cdb3b8ea2
- **Photos:** ✅ Chargées (front, side, back - 3 photos homme)
- **Durée génération:** ~4 minutes
- **Validation:**
  - ✅ Aucun pattern IA détecté
  - ✅ Analyse nutrition détaillée présente
  - ✅ Compléments niveau expert présents
  - ✅ CTA présent

### 3. Ultimate Scan ✅ SUCCESS (test précédent)
- **ID:** ebc7b23d-da3e-4b8d-9d20-bbb5078cef7f
- **URL:** https://neurocore-360.onrender.com/audit/ebc7b23d-da3e-4b8d-9d20-bbb5078cef7f
- **Validation:**
  - ✅ Aucun pattern IA détecté
  - ✅ Analyse nutrition détaillée présente
  - ✅ Compléments niveau expert présents
  - ✅ CTA présent

### 4. Burnout Engine ❌ FAILED
- **Email:** test.burnout.1768044264233@achzodcoaching.com
- **Erreur:** `{"error":"Aucune réponse fournie"}`
- **Status:** Bloquant - nécessite investigation

---

## 📊 RÉSUMÉ TESTS

**Taux de réussite:** 3/4 (75%)

**✅ SUCCÈS (3):**
- Discovery Scan - Génération 100% fonctionnelle, validation OK
- Anabolic Bioscan - Génération 100% fonctionnelle, validation OK, photos OK
- Ultimate Scan - Génération 100% fonctionnelle, validation OK

**❌ ÉCHECS (1):**
- Burnout Engine - Erreur soumission (schéma validation)

**Qualité des rapports générés:**
- ✅ Aucun pattern IA détecté sur TOUS les rapports
- ✅ CTAs présents et valides
- ✅ Contenu expert détaillé
- ✅ Validation automatique passe à 100%

---

## 🐛 BUG #2: Emails Admin/Client Non Envoyés

**Severity:** CRITIQUE ⚠️
**Status:** ✅ CAUSE IDENTIFIÉE
**Système:** Email workflow

### Description
Aucun email envoyé pour les 3 audits tests:
- Discovery: `reportDeliveryStatus = READY` (pas SENT)
- Anabolic: `reportDeliveryStatus = READY` (pas SENT)
- Ultimate: `reportDeliveryStatus = READY` (pas SENT)

### Cause identifiée
**Script test bypasse le workflow email complet:**

```typescript
// Script test appelle directement:
POST /api/audit/create
  → Crée audit
  → Génère rapport en async
  → Met status = COMPLETED, deliveryStatus = READY
  → MAIS ne déclenche PAS l'envoi email

// Flow normal client:
POST /api/audit/create
  → Crée audit
  → Génère rapport
  → Validation OK
  → sendReportReadyEmail() ← DÉCLENCHÉ
  → Update deliveryStatus = SENT
  → sendAdminEmailNewAudit() ← DÉCLENCHÉ
```

**Preuve:**
```bash
$ curl https://neurocore-360.onrender.com/api/audits/4da7d306-53f6-4802-9b8a-9ea22fe38fd8
{
  "status": "COMPLETED",
  "reportDeliveryStatus": "READY",  ← Devrait être "SENT"
  "reportSentAt": null               ← Devrait avoir timestamp
}
```

### Impact
- ❌ Tests automatisés ne testent PAS le workflow email
- ✅ Système email probablement fonctionnel (pas testé)
- ⚠️ Impossible de valider emails sans test client réel

### Fix appliqué
1. ✅ Bug Burnout corrigé (format body JSON)
2. 🔄 Besoin test RÉEL avec questionnaire UI

---

## 🐛 BUG #3: Tests Automatisés Ne Simulent Pas Vrai Client

**Severity:** MAJEUR
**Status:** ❌ Incomplet

### Description
Les tests actuels:
- ❌ Ne passent pas par le questionnaire frontend
- ❌ Ne déclenchent pas le workflow email complet
- ❌ Ne vérifient pas les dashboards client
- ❌ Ne testent pas l'expérience utilisateur réelle

### Impact
- Tests ne reflètent pas l'expérience client réelle
- Bugs potentiels non détectés dans le flow complet
- Validation incomplète du système

### Fix requis
1. Tester chaque produit comme un vrai client:
   - Remplir le questionnaire via UI
   - Soumettre et attendre email
   - Vérifier dashboard client
   - Vérifier email admin reçu
   - Tester tous les CTAs
   - Vérifier exports (PDF/HTML/ZIP)

---

## 🐛 BUG #4: Photos Femme Non Disponibles

**Severity:** MINEUR
**Status:** ⚠️ Limitation test

### Description
Dossier `photos test/femme 1/` existe mais est vide.

### Impact
- Impossible de tester Ultimate Scan avec photos femme
- Tests incomplets pour variante femme

### Fix requis
1. Ajouter photos femme test (front, side, back)
2. Tester Ultimate Scan femme

---

## 🐛 BUG #5: Discovery Scan - Section Manquante

**Severity:** MAJEUR 🔴
**Status:** ❌ BUG CONFIRMÉ
**Produit:** Discovery Scan (GRATUIT)
**Test ID:** 188c1a52-53e0-4078-b607-516f518833e2

### Description
Discovery Scan génère seulement **3 sections au lieu de 4**.

### Attendu (ARCHITECTURE_CORRECTE.md + geminiPremiumEngine.ts)
```typescript
export const SECTIONS_GRATUIT = [
  "Executive Summary",
  "Analyse energie et recuperation",  ← MANQUANTE
  "Analyse metabolisme et nutrition",
  "Synthese et Prochaines Etapes",
];
```

### Reçu (Dashboard API)
```json
{
  "sections": [
    { "title": "EXECUTIVE SUMMARY", "content": "18,558 chars" },
    { "title": "ANALYSE METABOLISME ET NUTRITION", "content": "7,897 chars" },
    { "title": "SYNTHESE ET PROCHAINES ETAPES", "content": "14,076 chars" }
  ]
}
```

### Preuve
```bash
curl -s "https://neurocore-360.onrender.com/api/audits/188c1a52-53e0-4078-b607-516f518833e2/dashboard" \
  | jq '.sections | length'
# Output: 3 (devrait être 4)
```

### Impact
- ❌ Clients Discovery ne reçoivent pas analyse complète
- ❌ Section "Analyse energie et recuperation" jamais générée
- ⚠️ Affecte 100% des Discovery Scans
- 💰 Dévalue le produit gratuit (moins de contenu = moins d'upsell)

### Cause probable
1. Loop génération sections saute "Analyse energie et recuperation"
2. Ou condition qui filtre cette section
3. Ou crash silencieux pendant génération de cette section

### À investiguer
- [ ] `server/geminiPremiumEngine.ts` - loop de génération sections
- [ ] `server/anthropicEngine.ts` - si utilisé pour Discovery
- [ ] `server/reportJobManager.ts` - orchestration génération
- [ ] Logs serveur pour cette génération

### Fix requis
1. Trouver pourquoi section est skip
2. Corriger loop/condition
3. Re-générer test pour valider 4 sections

---

**Prochaines étapes:**
1. ✅ BUG #5 documenté
2. 🔧 Fixer bug Discovery - Section manquante (priorité 1)
3. 🔧 Fixer bug Burnout Engine (priorité 1)
4. 🧪 Continuer tests RÉELS clients (TEST 2: Burnout)
5. 📝 Rapport final complet
