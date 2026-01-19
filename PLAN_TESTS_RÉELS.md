# PLAN TESTS CLIENTS RÉELS - NEUROCORE 360

**Date:** 2026-01-10
**Objectif:** Tester chaque produit EXACTEMENT comme un vrai client

---

## 📊 PHOTOS TEST DISPONIBLES

### Dossiers localisés: `/Users/achzod/Desktop/neurocore/photos test/`

**✅ Femmes (3 profils):**
1. `femme 1/` - 3 photos (1.2M, 1.4M, 1.3M)
2. `femme 2/` - 3 photos JPG (660K, 825K, 655K)
3. `femme 3/` - 3 photos JPG screenshots (686K, 704K, 662K)

**✅ Hommes (2 profils utilisables):**
1. `homme 1/` - 3 photos (image0, image1, image2)
2. ❌ `homme 2/` - VIDE
3. `homme 3/` - 3 photos JPEG (342K, 521K, 292K)

**Total:** 5 profils photos complets (3F + 2H)

---

## 🎯 TESTS À EFFECTUER

### TEST 1: Discovery Scan (GRATUIT) ✅ PRIORITÉ 1

**Objectif:** Tester workflow complet Discovery

**Étapes:**
1. ✅ Ouvrir navigateur: https://neurocore-360.onrender.com
2. ✅ Cliquer "Discovery Scan Gratuit"
3. ✅ Remplir questionnaire complet (~50 questions)
   - Email: test-discovery-real@achzodcoaching.com
   - Prénom: TestDiscovery
   - Profil: Homme, 30-35 ans, objectif perte graisse
4. ✅ Soumettre questionnaire
5. ⏰ Attendre génération (2-5 min)
6. ✅ Vérifier email reçu sur test-discovery-real@
7. ✅ Vérifier email admin reçu sur achzodyt@gmail.com
8. ✅ Cliquer lien email → Accéder dashboard
9. ✅ Vérifier dashboard complet:
   - Sections présentes
   - CTAs Anabolic/Ultimate
   - CTA Coaching -20%
   - Bouton demande d'avis
10. ✅ Tester exports (si disponibles)
11. ✅ Tester CTAs (liens fonctionnels)

**Validation:**
- [ ] Email client reçu?
- [ ] Email admin reçu?
- [ ] Dashboard accessible?
- [ ] Contenu complet?
- [ ] CTAs fonctionnels?
- [ ] Aucun pattern IA visible?

---

### TEST 2: Burnout Engine ✅ PRIORITÉ 1

**Objectif:** Tester workflow Burnout après fix bug

**Étapes:**
1. ✅ Ouvrir: https://neurocore-360.onrender.com/burnout-scan
2. ✅ Remplir questionnaire Burnout (~30 questions)
   - Email: test-burnout-real@achzodcoaching.com
   - Prénom: TestBurnout
   - Réponses: Phase épuisement (scores 3-4)
3. ✅ Soumettre
4. ⏰ Attendre génération
5. ✅ Vérifier résultat affiché
6. ✅ Vérifier email reçu (si applicable)
7. ✅ Vérifier dashboard
8. ✅ Vérifier CTAs:
   - CTA Anabolic Bioscan
   - CTA Coaching avec code NEUROCORE20

**Validation:**
- [ ] Génération OK?
- [ ] Phase détectée correct?
- [ ] Score cohérent?
- [ ] Recommandations pertinentes?
- [ ] CTAs présents?

---

### TEST 3: Anabolic Bioscan (PREMIUM) ✅ PRIORITÉ 1

**Objectif:** Tester workflow Premium SANS photos

**⚠️ IMPORTANT:** Anabolic = PAS de photos. Photos = UNIQUEMENT Ultimate Scan.

**Étapes:**
1. ✅ Ouvrir: https://neurocore-360.onrender.com/offers/anabolic-bioscan
2. ✅ Cliquer "Commander Anabolic Bioscan" → Questionnaire
3. ✅ Remplir questionnaire complet (~150 questions):
   - Email: test-anabolic-real@achzodcoaching.com
   - Prénom: TestAnabolic
   - Profil détaillé nutrition/hormones/axes cliniques
   - **PAS de photos** (pas demandées pour Anabolic)
4. ✅ Soumettre questionnaire
5. ⏰ Attendre génération (5-10 min)
6. ✅ Vérifier email client avec lien dashboard
7. ✅ Vérifier email admin notification
8. ✅ Accéder dashboard
9. ✅ Vérifier contenu Premium:
   - 16 sections détaillées
   - PAS d'analyse photos (Anabolic n'a pas photos)
   - Protocoles fermés (5)
   - Stack suppléments personnalisé
   - Plan 30-60-90 jours
10. ✅ Tester exports: PDF, HTML, ZIP
11. ✅ Vérifier CTAs coaching

**Validation:**
- [ ] Email client reçu?
- [ ] Email admin reçu?
- [ ] Dashboard accessible?
- [ ] 16 sections présentes?
- [ ] AUCUNE mention photos (Anabolic sans photos)?
- [ ] Exports fonctionnels (PDF/HTML/ZIP)?
- [ ] CTA coaching présent?

---

### TEST 4: Ultimate Scan Homme SANS wearables (ELITE) ✅ PRIORITÉ 2

**Objectif:** Tester Ultimate complet sans sync wearables

**Photos:** Utiliser `homme 1/` (image0, image1, image2)

**Étapes:**
1. ✅ Ouvrir: https://neurocore-360.onrender.com/offers/ultimate-scan
2. ✅ Commander Ultimate Scan
3. ✅ Remplir questionnaire (~210 questions):
   - Email: test-ultimate-h-nowear@achzodcoaching.com
   - Prénom: TestUltimateH
   - Questions blessures/douleurs/biomécanique
   - **Upload 3 photos**
   - **NE PAS** sync wearables
4. ✅ Soumettre
5. ⏰ Attendre génération (10-15 min)
6. ✅ Vérifier emails
7. ✅ Dashboard Ultimate:
   - 18 sections (16 Anabolic + 2 photo/biomécanique)
   - Analyse visuelle posturale
   - Analyse biomécanique sangle profonde
   - Protocole réhabilitation
8. ✅ Vérifier guard-rail photos: doit avoir généré (3 photos OK)
9. ✅ Exports PDF/HTML/ZIP

**Validation:**
- [ ] 3 photos acceptées?
- [ ] 18 sections générées?
- [ ] Analyse posturale détaillée?
- [ ] Analyse biomécanique présente?
- [ ] Exports OK?

---

### TEST 5: Ultimate Scan Femme SANS wearables (ELITE) ✅ PRIORITÉ 2

**Objectif:** Tester Ultimate profil femme

**Photos:** Utiliser `femme 2/` (3 JPG)

**Étapes:**
1. ✅ Même workflow que TEST 4
2. ✅ Email: test-ultimate-f-nowear@achzodcoaching.com
3. ✅ Prénom: TestUltimateF
4. ✅ Sexe: Femme
5. ✅ Adapter réponses profil féminin:
   - Cycle menstruel
   - Hormones féminines
   - Questions spécifiques femme

**Validation:**
- [ ] Contenu adapté profil femme?
- [ ] Recommandations pertinentes femme?
- [ ] Analyse photos femme OK?

---

### TEST 6: Ultimate avec Wearables (OPTIONNEL) 🔄

**Objectif:** Tester sync données wearables

**Note:** Nécessite compte Oura/Whoop/Garmin test

**Étapes:**
1. Remplir questionnaire Ultimate
2. Cocher "J'ai un wearable"
3. Sync données (OAuth flow)
4. Vérifier sections HRV avancée
5. Vérifier analyse sommeil détaillée

**Validation:**
- [ ] OAuth flow fonctionnel?
- [ ] Données importées?
- [ ] Analyse HRV présente?
- [ ] Insights wearables pertinents?

---

## ✅ CHECKLIST VALIDATION GLOBALE

### Pour chaque test:

**📧 Emails:**
- [ ] Email client reçu sous 5 min après génération?
- [ ] Email admin reçu (achzodyt@gmail.com)?
- [ ] Emails bien formatés?
- [ ] Liens dashboard fonctionnels?
- [ ] CTAs cliquables?

**📊 Dashboard:**
- [ ] Dashboard accessible via lien email?
- [ ] Toutes sections chargées?
- [ ] Design cohérent?
- [ ] Photos affichées (si applicable)?
- [ ] Métriques visibles?
- [ ] Navigation fluide?

**📝 Contenu:**
- [ ] Aucun pattern IA détecté?
- [ ] Personnalisé (prénom utilisé)?
- [ ] Recommandations pertinentes?
- [ ] CTAs présents et corrects?
- [ ] Pas de placeholders {{}}?
- [ ] Pas d'erreurs [object Object]?

**💾 Exports:**
- [ ] PDF généré et téléchargeable?
- [ ] HTML téléchargeable?
- [ ] ZIP contient tous fichiers?
- [ ] Qualité export OK?

**🔗 CTAs:**
- [ ] Discovery → Anabolic/Ultimate (59€/79€)
- [ ] Anabolic/Ultimate → Coaching (-20%)
- [ ] Burnout → Anabolic (59€) + Coaching
- [ ] Liens fonctionnels?
- [ ] Codes promo corrects?

**🎯 Avis/Review:**
- [ ] Bouton "Laisser un avis" présent?
- [ ] Modal review fonctionnelle?
- [ ] Submit review OK?
- [ ] Admin notifié?

---

## 📋 ORDRE D'EXÉCUTION RECOMMANDÉ

**Session 1 (30-45 min):**
1. ✅ TEST 1: Discovery Scan
2. ✅ TEST 2: Burnout Engine

**Session 2 (1h):**
3. ✅ TEST 3: Anabolic Bioscan Homme

**Session 3 (1h30):**
4. ✅ TEST 4: Ultimate Homme sans wearables
5. ✅ TEST 5: Ultimate Femme sans wearables

**Session 4 (optionnel - 1h):**
6. 🔄 TEST 6: Ultimate avec wearables

---

## 🐛 BUGS À MONITORER

**Pendant tests, vérifier:**
- [ ] Aucune erreur console JS
- [ ] Temps génération acceptable
- [ ] Validation score ≥ 60
- [ ] Status progression cohérent
- [ ] Aucun timeout
- [ ] Photos bien uploadées (taille OK)
- [ ] Emails pas en spam
- [ ] CTAs redirection OK

**Documenter dans `BUGS_FOUND.md`:**
- Tout bug trouvé avec screenshot
- Logs serveur si erreur
- Steps pour reproduire
- Severity et impact

---

**Prochaine action:** Démarrer TEST 1 (Discovery Scan)
