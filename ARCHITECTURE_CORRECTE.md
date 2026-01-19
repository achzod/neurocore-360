# ARCHITECTURE NEUROCORE 360 - VERSION CORRECTE

**Date:** 2026-01-10 17:20
**Correction après erreur critique**

---

## ✅ ARCHITECTURE PRODUITS (CORRECTE)

### 1. Discovery Scan (GRATUIT)
- **Tier:** GRATUIT
- **Sections:** 4
- **Moteur:** Claude Sonnet 4.5
- **Photos:** ❌ NON
- **Wearables:** ❌ NON
- **Questions:** ~50
- **Durée génération:** 2-3 min
- **Exports:** Aucun (Gratuit)

### 2. Burnout Engine (STANDALONE)
- **Tier:** STANDALONE
- **Sections:** 6
- **Moteur:** Claude Opus 4.5
- **Photos:** ❌ NON
- **Wearables:** ❌ NON
- **Questions:** ~30
- **Durée génération:** 3-5 min
- **Exports:** Aucun

### 3. Anabolic Bioscan (PREMIUM)
- **Tier:** PREMIUM
- **Sections:** 16
- **Moteur:** Claude Opus 4.5
- **Photos:** ❌ NON ❌ NON ❌ NON
- **Wearables:** ❌ NON
- **Questions:** ~150
- **Durée génération:** 5-10 min
- **Exports:** ✅ PDF, HTML, ZIP

**Sections (16):**
```
1. Executive Summary
2. Analyse entrainement et periodisation
3. Analyse systeme cardiovasculaire
4. Analyse metabolisme et nutrition
5. Analyse sommeil et recuperation
6. Analyse digestion et microbiote
7. Analyse axes hormonaux
8. Protocole Matin Anti-Cortisol
9. Protocole Soir Verrouillage Sommeil
10. Protocole Digestion 14 Jours
11. Protocole Bureau Anti-Sedentarite
12. Protocole Entrainement Personnalise
13. Plan Semaine par Semaine 30-60-90
14. Stack Supplements Detaille
15. Synthese et KPIs
16. Prochaines Etapes et CTA
```

### 4. Ultimate Scan (ELITE) ← SEUL AVEC PHOTOS
- **Tier:** ELITE
- **Sections:** 18
- **Moteur:** Claude Opus 4.5
- **Photos:** ✅ OUI - 3 OBLIGATOIRES (front, side, back)
- **Wearables:** ✅ OUI - OPTIONNEL (Oura, Whoop, Garmin)
- **Questions:** ~210
- **Durée génération:** 10-15 min
- **Exports:** ✅ PDF, HTML, ZIP

**Sections (18) = 16 Anabolic + 2 photo/biomécanique:**
```
1. Executive Summary
2. Analyse visuelle et posturale complete    ← PHOTOS
3. Analyse biomecanique et sangle profonde   ← PHOTOS
4. Analyse entrainement et periodisation
5. Analyse systeme cardiovasculaire
6. Analyse metabolisme et nutrition
7. Analyse sommeil et recuperation
8. Analyse digestion et microbiote
9. Analyse axes hormonaux
10. Protocole Matin Anti-Cortisol
11. Protocole Soir Verrouillage Sommeil
12. Protocole Digestion 14 Jours
13. Protocole Bureau Anti-Sedentarite
14. Protocole Entrainement Personnalise
15. Plan Semaine par Semaine 30-60-90
16. Stack Supplements Detaille
17. Synthese et KPIs
18. Prochaines Etapes et CTA
```

**Guard-rail photos (CRITIQUE):**
```typescript
// server/reportJobManager.ts lignes 220-235
const requiresPhotos = auditType === "ELITE";
const needsPhotos = requiresPhotos && photos.length < 3;

if (needsPhotos) {
  console.error(`Photos insuffisantes pour ${auditId} (${photos.length}/3)`);
  await storage.failReportJob(auditId, "NEED_PHOTOS");
  await storage.updateAudit(auditId, { reportDeliveryStatus: "NEED_PHOTOS" });
  activeGenerations.delete(auditId);
  return; // ← STOP génération complètement
}
```

### 5. Blood Analysis (STANDALONE)
- **Status:** ❌ Non implémenté / Introuvable
- **À clarifier**

---

## 📸 PHOTOS: UNIQUEMENT ULTIMATE SCAN

**❌ Discovery Scan:** PAS de photos
**❌ Burnout Engine:** PAS de photos
**❌ Anabolic Bioscan:** PAS de photos
**✅ Ultimate Scan:** 3 photos OBLIGATOIRES

**Si Ultimate sans 3 photos:**
- Status = "NEED_PHOTOS"
- Génération STOP
- Email NON envoyé
- Dashboard NON accessible

---

## 📱 WEARABLES: UNIQUEMENT ULTIMATE SCAN (OPTIONNEL)

**Supported:**
- Oura Ring
- Whoop
- Garmin

**Flow:**
1. Questionnaire Ultimate → Case "J'ai un wearable"
2. OAuth flow pour sync données
3. Si données sync OK → Sections HRV avancée enrichies
4. Si pas de wearable → Sections générées sans données HRV

---

## 🔄 DIFFÉRENCES ANABOLIC vs ULTIMATE

| Feature | Anabolic (PREMIUM) | Ultimate (ELITE) |
|---------|-------------------|------------------|
| Sections | 16 | 18 |
| Photos | ❌ NON | ✅ OUI (3 requis) |
| Analyse posturale | ❌ NON | ✅ OUI |
| Analyse biomécanique | ❌ NON | ✅ OUI |
| Wearables | ❌ NON | ✅ OUI (optionnel) |
| Questions blessures | Basique | Détaillé |
| Prix | 59€ | 79€ |
| Durée génération | 5-10 min | 10-15 min |
| Exports | PDF/HTML/ZIP | PDF/HTML/ZIP |

---

## ❌ MON ERREUR CRITIQUE

**J'ai dit dans PLAN_TESTS_RÉELS.md:**
> "TEST 3: Anabolic Bioscan (PREMIUM)
> Photos: Utiliser homme 3/ (IMG_9309, IMG_9337, IMG_9366)
> Upload 3 photos: front, side, back"

**C'EST FAUX.**

**Anabolic Bioscan = AUCUNE photo.**
**Photos = UNIQUEMENT Ultimate Scan (ELITE).**

---

## ✅ PHOTOS DE TEST DISPONIBLES

**Pour Ultimate Scan uniquement:**

```
/Users/achzod/Desktop/neurocore/photos test/
├── femme 1/ ✅ 3 photos (1.2-1.4M)
├── femme 2/ ✅ 3 photos JPG (655-825K)
├── femme 3/ ✅ 3 photos JPG screenshots
├── homme 1/ ✅ 3 photos (132-179K)
├── homme 2/ ❌ VIDE
└── homme 3/ ✅ 3 photos JPEG (292-521K)
```

**Utilisables pour Ultimate:** 5 profils (3F + 2H)

---

## 🧪 PLAN TESTS CORRIGÉ

**TEST 1: Discovery Scan**
- ❌ Pas de photos
- ❌ Pas de wearables

**TEST 2: Burnout Engine**
- ❌ Pas de photos
- ❌ Pas de wearables

**TEST 3: Anabolic Bioscan**
- ❌ PAS DE PHOTOS ← CORRECTION
- ❌ Pas de wearables

**TEST 4: Ultimate Scan Homme**
- ✅ 3 photos OBLIGATOIRES
- ✅ Wearables optionnel (tester sans)

**TEST 5: Ultimate Scan Femme**
- ✅ 3 photos OBLIGATOIRES
- ✅ Wearables optionnel (tester sans)

---

**Correction appliquée:** ✅ PLAN_TESTS_RÉELS.md mis à jour
