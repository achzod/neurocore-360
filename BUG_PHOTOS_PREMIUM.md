# BUG - Photos obligatoires pour PREMIUM (Anabolic Bioscan)

**Date:** 2026-01-10 19:15
**Sévérité:** 🔴 CRITIQUE - Bloque les commandes Anabolic Bioscan

---

## 🐛 PROBLÈME

Le code exige 3 photos pour **PREMIUM (Anabolic Bioscan)** alors qu'elles sont uniquement requises pour **ELITE (Ultimate Scan)**.

### Fichier
`server/routes.ts` ligne 230-233

### Code actuel (BUGUÉ)
```typescript
// P0: Exiger 3 photos pour PREMIUM/ELITE
if (data.type !== "GRATUIT" && !hasThreePhotos(data.responses)) {
  res.status(400).json({ error: "NEED_PHOTOS", message: "3 photos obligatoires (face, profil, dos)" });
  return;
}
```

**Problème:** `data.type !== "GRATUIT"` signifie que photos sont exigées pour:
- ✅ ELITE (Ultimate Scan) - **CORRECT**
- ❌ PREMIUM (Anabolic Bioscan) - **INCORRECT**

---

## ✅ ARCHITECTURE CORRECTE

### Anabolic Bioscan (PREMIUM)
- **Tier:** PREMIUM
- **Photos:** ❌ NON requises
- **Sections:** 16 (sans photo/biomécanique)
- **Prix:** Moins cher qu'Ultimate

### Ultimate Scan (ELITE)
- **Tier:** ELITE
- **Photos:** ✅ OUI requises (3 photos: face, side, back)
- **Sections:** 18 (avec 2 sections photo: "Analyse visuelle et posturale complete" + "Analyse biomecanique et sangle profonde")
- **Prix:** Plus cher avec analyse visuelle

### Discovery Scan (GRATUIT)
- **Tier:** GRATUIT
- **Photos:** ❌ NON requises
- **Sections:** 4 (version gratuite)

---

## 🔧 FIX REQUIS

### Code corrigé
```typescript
// Photos obligatoires UNIQUEMENT pour Ultimate Scan (ELITE)
if (data.type === "ELITE" && !hasThreePhotos(data.responses)) {
  res.status(400).json({ error: "NEED_PHOTOS", message: "3 photos obligatoires pour Ultimate Scan (face, profil, dos)" });
  return;
}
```

---

## 📊 IMPACT

### Utilisateurs bloqués
Tous les clients qui commandent **Anabolic Bioscan (PREMIUM)** sont bloqués avec erreur `NEED_PHOTOS` alors qu'ils n'ont pas besoin de photos.

### Workflow correct
1. Client remplit questionnaire Anabolic
2. **Ne prend PAS de photos** (pas requis pour ce tier)
3. Submit
4. ❌ **ERREUR 400:** "3 photos obligatoires"
5. Client confus car offre Anabolic ne mentionne pas les photos

### Différenciation produits
Le bug **casse la différenciation** entre Anabolic et Ultimate:
- Anabolic devrait être plus simple (sans photos, moins cher)
- Ultimate devrait être premium (avec photos, analyse visuelle, plus cher)

Actuellement les deux exigent photos → pas de différence visible pour le client.

---

## 🧪 TEST POUR REPRODUIRE

### Payload Anabolic Bioscan (PREMIUM) - SANS photos
```json
{
  "type": "PREMIUM",
  "email": "test@example.com",
  "responses": {
    "prenom": "Marc",
    "age": "35",
    "sexe": "homme",
    "objectif": "Prise de masse",
    "niveau-activite": "intermediaire"
  }
}
```

**Résultat actuel:** ❌ `400 NEED_PHOTOS`
**Résultat attendu:** ✅ `200 OK` - Génération rapport 16 sections SANS analyse photo

### Payload Ultimate Scan (ELITE) - SANS photos
```json
{
  "type": "ELITE",
  "email": "test@example.com",
  "responses": {
    "prenom": "Sophie",
    "age": "28",
    "sexe": "femme",
    "objectif": "Recomposition corporelle"
  }
}
```

**Résultat actuel:** ✅ `400 NEED_PHOTOS` - CORRECT
**Résultat attendu:** ✅ `400 NEED_PHOTOS` - CORRECT

---

## 📝 RÉFÉRENCES

### Documentation architecture
Voir `ARCHITECTURE_MOTEURS_IA.md` section "1️⃣ SYSTÈME PREMIUM/ELITE"

### Code sections
```typescript
// geminiPremiumEngine.ts ligne 232-291

// ULTIMATE SCAN (ELITE) - 18 sections
const SECTIONS_ULTIMATE: SectionName[] = [
  "Executive Summary",
  "Analyse visuelle et posturale complete",    // ← ULTIMATE ONLY
  "Analyse biomecanique et sangle profonde",   // ← ULTIMATE ONLY
  // ... 15 autres sections
];

// ANABOLIC BIOSCAN (PREMIUM) - 16 sections
const SECTIONS_ANABOLIC: SectionName[] = [
  "Executive Summary",
  // PAS de sections photo/biomécanique
  "Analyse entrainement et periodisation",
  // ... 14 autres sections
];
```

### Confirmation utilisateur
> "abruti, les photos et la sync wearables c'est uniquement ULTIMATE SCAN. putain de merde"

---

## ⚡ PRIORITÉ

**CRITIQUE** - À fixer avant tout test Anabolic Bioscan.

Sans ce fix, impossible de tester le système Premium/Elite correctement.

---

**Auteur:** Claude Code (analyse bug GitHub)
**Fichier source:** `server/routes.ts:230-233`
