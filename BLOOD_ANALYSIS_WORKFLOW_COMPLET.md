# BLOOD ANALYSIS - WORKFLOW COMPLET ULTRA-EXHAUSTIF

**Produit**: Blood Analysis by ApexLabs
**Valeur**: 500€ (prix lancement: 99€)
**Date**: 2026-01-20
**Positioning**: Premium biohacking futuristic dashboard

---

## 🎯 VISION PRODUIT

Un outil d'analyse sanguine **ultra-premium** qui transforme des résultats bruts en insights actionnables via un dashboard **biohacking futuriste** propulsé par Claude Opus 4.5.

**Différenciation**:
- Dashboard style biohacking/cyberpunk (pas un rapport PDF classique)
- 39 biomarqueurs analysés avec interconnexions
- Recommandations personnalisées par système
- Guide pré-analyse pour savoir quoi demander au médecin
- Pages dédiées suppléments + nutrition + lifestyle
- Analyse des conséquences court/moyen/long terme

---

## 🎨 DESIGN SYSTEM - BIOHACKING FUTURISTE

### Palette de Couleurs

```css
/* Background */
--bg-primary: #0A0E27;        /* Dark blue-black */
--bg-secondary: #151932;      /* Slightly lighter */
--bg-card: rgba(20, 25, 45, 0.6); /* Glassmorphism */

/* Accent Colors */
--cyan-neon: #00F0FF;         /* Data, highlights, scans */
--orange: #FF6B00;            /* Warnings, actions */
--green-optimal: #00FF9F;     /* Optimal ranges, success */
--red-critical: #FF3366;      /* Critical, problems */
--purple: #B87FFF;            /* Premium, elite features */
--yellow: #FFD700;            /* Caution, attention */

/* Text */
--text-primary: #FFFFFF;
--text-secondary: #A0AEC0;
--text-muted: #718096;

/* Borders & Effects */
--border-glow: rgba(0, 240, 255, 0.3);
--shadow-glow: 0 0 20px rgba(0, 240, 255, 0.4);
```

### Typographie

```css
/* Headings */
font-family: 'Space Grotesk', sans-serif;
font-weight: 700;
letter-spacing: -0.02em;

/* Body */
font-family: 'Inter', sans-serif;
font-weight: 400;
line-height: 1.6;

/* Data/Numbers */
font-family: 'JetBrains Mono', monospace;
font-weight: 500;
font-variant-numeric: tabular-nums;
```

### Composants UI

**Card avec Glassmorphism**:
```css
.bio-card {
  background: rgba(20, 25, 45, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.bio-card:hover {
  border-color: rgba(0, 240, 255, 0.5);
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.3);
  transform: translateY(-2px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Biomarker Badge**:
```css
.biomarker-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--cyan-neon), var(--purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
}

.biomarker-value::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cyan-neon), transparent);
  animation: scan 2s infinite;
}

@keyframes scan {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
```

**Particules Background**:
```jsx
<div className="particles-bg">
  {/* Canvas avec particules animées */}
  <canvas id="particles" />
  {/* Scan lines overlay */}
  <div className="scan-lines" />
  {/* Grid cyber */}
  <div className="cyber-grid" />
</div>
```

**Status Indicator**:
```jsx
const StatusDot = ({ status }) => (
  <div className={`status-dot ${status}`}>
    <div className="pulse-ring" />
    <div className="core" />
  </div>
);

// CSS
.status-dot.optimal .core { background: var(--green-optimal); }
.status-dot.warning .core { background: var(--orange); }
.status-dot.critical .core { background: var(--red-critical); }

.pulse-ring {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.5);
    opacity: 0;
  }
}
```

---

## 📋 PHASE 0: LANDING PAGE PRÉ-ACHAT

### Section Hero

**Titre accrocheur**:
> **Décode Ton Sang. Optimise Ta Biologie. Deviens Apex.**
>
> Transforme tes analyses sanguines en plan d'action personnalisé avec l'IA la plus avancée au monde.

**Visual**: Mockup du dashboard avec particules animées, biomarqueurs qui s'affichent en temps réel

**CTA Principal**:
```jsx
<button className="cta-primary">
  Obtenir Mon Analyse Premium - 99€
  <span className="price-strike">500€</span>
</button>
```

### Ce Que Tu Obtiens (Features)

**Grid 3 colonnes avec icons néon**:

1. **🔬 39 Biomarqueurs Analysés**
   - Santé hormonale (testostérone, estradiol, SHBG, DHT)
   - Métabolisme (insuline, glucose, HOMA-IR)
   - Inflammation (CRP, homocystéine)
   - Thyroïde (TSH, T3, T4)
   - Vitamines & minéraux (D3, B12, magnésium, zinc)
   - Lipides avancés (HDL, LDL, triglycérides, Lp(a))
   - Fonction hépatique & rénale
   - Marqueurs de performance

2. **🧠 IA Claude Opus 4.5**
   - Analyse contextuelle de TES données
   - Détection des interconnexions entre marqueurs
   - Recommandations personnalisées
   - Prédictions conséquences long terme

3. **📊 Dashboard Futuriste**
   - Interface biohacking cyberpunk
   - Visualisations interactives
   - Comparaison optimal vs normal
   - Suivi évolution dans le temps

4. **💊 Plans d'Action Concrets**
   - Suppléments précis avec dosages
   - Protocoles nutrition
   - Optimisations lifestyle
   - Timing et synergie

5. **📚 Éducation Complète**
   - Rôle de chaque biomarqueur
   - Pourquoi c'est important
   - Conséquences si hors norme
   - Comment l'optimiser

6. **🎯 Suivi & Exports**
   - Export PDF premium
   - Comparaison analyses futures
   - Tracker progression
   - Historique complet

### Comparaison Normal vs Optimal

**Tableau side-by-side**:

| Analyse Classique | Blood Analysis by ApexLabs |
|-------------------|----------------------------|
| ❌ Rapport PDF basique | ✅ Dashboard interactif futuriste |
| ❌ Ranges "normaux" uniquement | ✅ Ranges optimaux pour performance |
| ❌ Valeurs isolées | ✅ Interconnexions détectées |
| ❌ Aucune recommandation | ✅ Plans d'action personnalisés |
| ❌ Jargon médical incompréhensible | ✅ Explications claires + éducation |
| ❌ Pas de suivi | ✅ Comparaison dans le temps |

### Témoignages

**Format card avec photo + stats**:

> "J'ai découvert que mon zinc était limite bas, ce qui expliquait ma testostérone sous-optimale. Après 3 mois de protocole ApexLabs, +28% de testo et je dors enfin bien."
>
> **— Marc, 34 ans** | Testostérone: 450 → 576 ng/dL

### FAQ Pré-Achat

1. **Ai-je besoin d'une ordonnance ?**
   Non, mais nous te donnons un guide pour savoir quoi demander à ton médecin.

2. **Quels biomarqueurs dois-je tester ?**
   Liste complète des 39 biomarqueurs fournie + pourquoi chacun est important.

3. **Combien de temps pour recevoir l'analyse ?**
   24-48h après upload de tes résultats.

4. **Est-ce que ça remplace un médecin ?**
   Non, c'est un outil éducatif et d'optimisation. Consulte toujours un professionnel.

---

## 📋 PHASE 1: GUIDE PRÉ-ANALYSE (AVANT LA PRISE DE SANG)

### Page: "Prépare Ta Prise de Sang"

**Objectif**: Éduquer l'utilisateur AVANT qu'il n'aille faire sa prise de sang, pour éviter les erreurs et maximiser la qualité des données.

### Section 1: Quoi Demander à Ton Médecin

**Intro**:
> Beaucoup de médecins ne prescrivent que les analyses "de base". Voici exactement ce qu'il faut demander pour une analyse complète.

**Liste des 39 Biomarqueurs avec Justification**:

Format:
```
✅ NOM DU BIOMARQUEUR
   📋 Nom médical: [nom technique]
   🎯 Pourquoi: [raison en 1 phrase]
   💡 Argument médecin: [ce qu'il faut dire si le médecin refuse]
```

**Exemple**:

```markdown
### PANEL HORMONAL MASCULIN

✅ **Testostérone Totale**
   📋 Nom médical: Testostérone sérique totale
   🎯 Pourquoi: Hormone principale de la performance, masse musculaire, libido
   💡 Argument: "Je veux vérifier mon profil hormonal complet pour optimiser ma santé"

✅ **Testostérone Libre**
   📋 Nom médical: Testostérone libre (calcul ou dosage direct)
   🎯 Pourquoi: Seule forme biodisponible et active
   💡 Argument: "La totale ne suffit pas, j'ai besoin de la fraction libre"

✅ **SHBG** (Sex Hormone Binding Globulin)
   📋 Nom médical: SHBG
   🎯 Pourquoi: Détermine combien de testo est "piégée" vs utilisable
   💡 Argument: "Nécessaire pour calculer l'indice de testostérone libre"

✅ **Estradiol** (E2)
   📋 Nom médical: 17-bêta-estradiol
   🎯 Pourquoi: Trop haut = gynécomastie, rétention d'eau, baisse libido
   💡 Argument: "Important pour l'équilibre hormonal masculin"

✅ **DHT** (Dihydrotestostérone)
   📋 Nom médical: Dihydrotestostérone
   🎯 Pourquoi: Androgène le plus puissant, impact virilité et calvitie
   💡 Argument: "Je veux un profil androgénique complet"

✅ **LH** (Hormone Lutéinisante)
   📋 Nom médical: LH
   🎯 Pourquoi: Stimule production de testostérone par les testicules
   💡 Argument: "Pour vérifier la fonction de l'axe hypothalamo-hypophysaire"

✅ **FSH** (Hormone Folliculo-Stimulante)
   📋 Nom médical: FSH
   🎯 Pourquoi: Fertilité et fonction testiculaire
   💡 Argument: "Panel hormonal complet inclut LH et FSH"

### MÉTABOLISME & INSULINE

✅ **Glucose à Jeun**
   📋 Nom médical: Glycémie à jeun
   🎯 Pourquoi: Détecte prédiabète et résistance insulinique
   💡 Argument: "C'est un test standard du bilan métabolique"

✅ **Insuline à Jeun**
   📋 Nom médical: Insulinémie à jeun
   🎯 Pourquoi: Détecte résistance à l'insuline AVANT que la glycémie n'augmente
   💡 Argument: "Pour calculer l'indice HOMA-IR et détecter prédiabète précoce"

✅ **HbA1c** (Hémoglobine Glyquée)
   📋 Nom médical: HbA1c
   🎯 Pourquoi: Moyenne glycémie sur 3 mois
   💡 Argument: "Marqueur de référence du diabète"

### THYROÏDE

✅ **TSH**
   📋 Nom médical: TSH ultrasensible
   🎯 Pourquoi: Première ligne dépistage thyroïde
   💡 Argument: "Fatigue chronique, je veux éliminer hypothyroïdie"

✅ **T4 Libre** (FT4)
   📋 Nom médical: Thyroxine libre
   🎯 Pourquoi: Hormone produite par la thyroïde
   💡 Argument: "TSH seule ne suffit pas, besoin du panel complet"

✅ **T3 Libre** (FT3)
   📋 Nom médical: Triiodothyronine libre
   🎯 Pourquoi: Forme active de l'hormone thyroïdienne
   💡 Argument: "Pour détecter problèmes de conversion T4→T3"

✅ **T3 Reverse** (rT3)
   📋 Nom médical: T3 reverse
   🎯 Pourquoi: Forme inactive qui bloque récepteurs
   💡 Argument: "Pour vérifier ratio T3/rT3 en cas de fatigue persistante"

✅ **Anticorps Anti-TPO**
   📋 Nom médical: Anticorps anti-thyroperoxydase
   🎯 Pourquoi: Détecte thyroïdite auto-immune (Hashimoto)
   💡 Argument: "Dépistage maladies auto-immunes thyroïdiennes"

### INFLAMMATION

✅ **CRP Ultrasensible** (hs-CRP)
   📋 Nom médical: Protéine C-Réactive ultrasensible
   🎯 Pourquoi: Inflammation chronique, risque cardiovasculaire
   💡 Argument: "Marqueur de risque cardiovasculaire indépendant"

✅ **Homocystéine**
   📋 Nom médical: Homocystéine plasmatique
   🎯 Pourquoi: Risque cardiovasculaire, carence B9/B12
   💡 Argument: "Facteur de risque cardio souvent oublié"

### LIPIDES AVANCÉS

✅ **Cholestérol Total**
   📋 Nom médical: Cholestérol total
   🎯 Pourquoi: Vue d'ensemble
   💡 Argument: "Bilan lipidique standard"

✅ **HDL** (Bon Cholestérol)
   📋 Nom médical: HDL-cholestérol
   🎯 Pourquoi: Protecteur cardiovasculaire
   💡 Argument: "Bilan lipidique standard"

✅ **LDL** (Mauvais Cholestérol)
   📋 Nom médical: LDL-cholestérol
   🎯 Pourquoi: Risque cardiovasculaire si élevé
   💡 Argument: "Bilan lipidique standard"

✅ **Triglycérides**
   📋 Nom médical: Triglycérides
   🎯 Pourquoi: Métabolisme des graisses, risque cardio
   💡 Argument: "Bilan lipidique standard"

✅ **ApoB** (Apolipoprotéine B)
   📋 Nom médical: Apolipoprotéine B
   🎯 Pourquoi: Meilleur marqueur risque cardio que LDL
   💡 Argument: "Recommandé par les cardiologues préventifs modernes"

✅ **Lp(a)** (Lipoprotéine (a))
   📋 Nom médical: Lipoprotéine (a)
   🎯 Pourquoi: Facteur génétique risque cardio indépendant
   💡 Argument: "Dépistage une fois dans la vie, facteur génétique"

### VITAMINES & MINÉRAUX

✅ **Vitamine D** (25-OH)
   📋 Nom médical: 25-hydroxyvitamine D
   🎯 Pourquoi: Immunité, os, hormones, performance
   💡 Argument: "Très répandu en France, carence fréquente"

✅ **Vitamine B12**
   📋 Nom médical: Cobalamine
   🎯 Pourquoi: Énergie, fonction nerveuse, formation globules rouges
   💡 Argument: "Carence fréquente, surtout si végétarien/végétalien"

✅ **Folates** (B9)
   📋 Nom médical: Folates sériques
   🎯 Pourquoi: Méthylation, ADN, cardiovasculaire
   💡 Argument: "Travaille en synergie avec B12"

✅ **Magnésium**
   📋 Nom médical: Magnésium sérique (ou érythrocytaire si possible)
   🎯 Pourquoi: Énergie, muscles, système nerveux, sommeil
   💡 Argument: "Carence très fréquente, impacte 300+ réactions enzymatiques"

✅ **Fer Sérique**
   📋 Nom médical: Fer sérique
   🎯 Pourquoi: Transport oxygène, énergie
   💡 Argument: "Bilan martial de base"

✅ **Ferritine**
   📋 Nom médical: Ferritine
   🎯 Pourquoi: Réserves de fer
   💡 Argument: "Plus important que fer sérique pour détecter carence"

✅ **Transferrine / Coefficient de Saturation**
   📋 Nom médical: Transferrine + coefficient de saturation
   🎯 Pourquoi: Capacité transport du fer
   💡 Argument: "Complète le bilan martial"

✅ **Zinc**
   📋 Nom médical: Zinc sérique
   🎯 Pourquoi: Testostérone, immunité, fertilité
   💡 Argument: "Important pour santé hormonale masculine"

### FONCTION HÉPATIQUE

✅ **ASAT** (TGO)
   📋 Nom médical: Aspartate aminotransférase
   🎯 Pourquoi: Santé foie et muscles
   💡 Argument: "Bilan hépatique standard"

✅ **ALAT** (TGP)
   📋 Nom médical: Alanine aminotransférase
   🎯 Pourquoi: Santé foie
   💡 Argument: "Bilan hépatique standard"

✅ **GGT** (Gamma-GT)
   📋 Nom médical: Gamma-glutamyl transférase
   🎯 Pourquoi: Santé foie, consommation alcool
   💡 Argument: "Bilan hépatique standard"

### FONCTION RÉNALE

✅ **Créatinine**
   📋 Nom médical: Créatinine sérique
   🎯 Pourquoi: Fonction rénale
   💡 Argument: "Bilan rénal standard"

✅ **DFG** (Débit de Filtration Glomérulaire)
   📋 Nom médical: DFG estimé (eGFR)
   🎯 Pourquoi: Précision fonction rénale
   💡 Argument: "Calculé automatiquement à partir créatinine"

✅ **Urée**
   📋 Nom médical: Urée sanguine
   🎯 Pourquoi: Fonction rénale, apport protéines
   💡 Argument: "Complète le bilan rénal"

### FORMULE SANGUINE

✅ **NFS** (Numération Formule Sanguine)
   📋 Nom médical: Hémogramme complet
   🎯 Pourquoi: Globules rouges, blancs, plaquettes
   💡 Argument: "Bilan de santé générale standard"
```

### Section 2: Protocole de Préparation

**Timeline 1 Semaine Avant**:

**J-7**:
- 🚫 Arrête les suppléments de biotine (fausse les résultats thyroïde)
- 🚫 Évite excès d'alcool cette semaine
- 📝 Note tous les médicaments/suppléments actuels

**J-3**:
- 🚫 Arrête la créatine (fausse créatinine rénale)
- 🥩 Mange normalement (pas de régime extrême)

**J-1 (Veille)**:
- 🍽️ Dîne léger avant 20h
- 🚫 Pas d'alcool
- 💧 Hydrate-toi normalement
- 😴 Couche-toi à heure habituelle (stress/manque sommeil affecte cortisol)

**Jour J (Matin de la Prise de Sang)**:

**TIMING CRITIQUE**:
```
⏰ 7h00-9h00 = FENÊTRE OPTIMALE
```

**Pourquoi ?**
- Testostérone est au max le matin (rythme circadien)
- Cortisol suit aussi un rythme (pic matinal)
- Standardise les résultats pour comparaisons futures

**À JEUN STRICT**:
- ✅ Dernière prise alimentaire: >12h avant
- ✅ Eau plate: AUTORISÉE (bois 1-2 verres)
- 🚫 Café/thé: INTERDIT
- 🚫 Chewing-gum: INTERDIT
- 🚫 Cigarette: INTERDIT (affecte inflammation)
- 🚫 Suppléments: INTERDIT
- 🚫 Sport intense: INTERDIT le matin même

**Checklist Pré-Lab**:
```
☐ Ordonnance du médecin en main
☐ Carte Vitale + mutuelle
☐ Liste des 39 biomarqueurs imprimée (au cas où)
☐ Bien hydraté (facilite prise de sang)
☐ Vêtements avec manches faciles à retrousser
☐ Pas de stress (méditation 5min avant)
```

### Section 3: Après la Prise de Sang

**Immédiatement Après**:
- 💧 Bois de l'eau
- 🍎 Mange quelque chose de léger
- 🏃 Évite sport intense 2-3h

**Récupération Résultats**:
- 📧 Demande envoi email ET papier
- ⏱️ Délai: 24-48h en général
- 📱 Certains labos ont applis avec résultats

**Prépare Upload ApexLabs**:
- 📄 Scan ou photo CLAIRE des résultats
- ✅ Tous les biomarqueurs visibles
- ✅ Nom du labo + date visibles
- ✅ Unités de mesure visibles

### Section 4: Template Email pour Médecin

**Copy-paste prêt à l'emploi**:

```
Objet: Demande ordonnance bilan sanguin complet

Bonjour Docteur,

Je souhaite réaliser un bilan sanguin approfondi dans le cadre d'une démarche de santé préventive et d'optimisation de ma forme physique.

Pourriez-vous me prescrire les analyses suivantes :

PANEL HORMONAL:
- Testostérone totale et libre
- SHBG
- Estradiol (E2)
- DHT
- LH, FSH

MÉTABOLISME:
- Glycémie à jeun
- Insulinémie à jeun
- HbA1c

THYROÏDE:
- TSH ultrasensible
- T4 libre, T3 libre, T3 reverse
- Anticorps anti-TPO

INFLAMMATION:
- CRP ultrasensible
- Homocystéine

LIPIDES:
- Bilan lipidique complet (CT, HDL, LDL, TG)
- Apolipoprotéine B
- Lipoprotéine (a)

VITAMINES & MINÉRAUX:
- Vitamine D (25-OH)
- Vitamine B12, Folates
- Magnésium, Zinc
- Bilan martial (fer, ferritine, transferrine)

FONCTIONS ORGANES:
- Bilan hépatique (ASAT, ALAT, GGT)
- Bilan rénal (créatinine, DFG, urée)
- NFS

Je comprends que certains marqueurs peuvent ne pas être remboursés, j'accepte de payer de ma poche si nécessaire.

Merci pour votre compréhension.

Cordialement,
[Ton nom]
```

### Section 5: Coûts & Remboursement

**Tableau Transparent**:

| Catégorie | Coût Total | Remboursé Sécu | Reste à Charge |
|-----------|------------|----------------|----------------|
| Panel Standard (TSH, glycémie, lipides, NFS) | ~50€ | ~35€ | ~15€ |
| Panel Hormonal (testo, E2, LH, FSH) | ~80€ | ~20€ | ~60€ |
| Panel Thyroïde Complet (T3, T4, rT3, anti-TPO) | ~60€ | ~15€ | ~45€ |
| Vitamines & Minéraux | ~70€ | ~10€ | ~60€ |
| Marqueurs Avancés (ApoB, Lp(a), hs-CRP) | ~90€ | ~0€ | ~90€ |
| **TOTAL 39 BIOMARQUEURS** | **~350€** | **~80€** | **~270€** |

**💡 Astuce**:
Certaines mutuelles remboursent mieux. Vérifie ton contrat section "Analyses médicales hors parcours".

**🎯 ROI**:
270€ de prise de sang + 99€ ApexLabs = **369€ total**

VS consultation médecin fonctionnel privé (500-1000€) pour moins de détails.

---

## 📋 PHASE 2: CHECKOUT & ONBOARDING

### Page Checkout

**Résumé Produit**:
```
Blood Analysis Premium by ApexLabs
99€ (au lieu de 500€)

✅ Analyse de 39 biomarqueurs
✅ Dashboard biohacking futuriste
✅ IA Claude Opus 4.5
✅ Recommandations personnalisées
✅ Export PDF premium
```

**Paiement**: Stripe Checkout (comme Peptides Engine)

**Après Paiement**: Redirect vers `/blood-analysis/onboarding`

### Page Onboarding

**Step 1: Bienvenue**

```jsx
<div className="onboarding-hero">
  <h1>Bienvenue dans Blood Analysis 🔬</h1>
  <p>Tu as fait le bon choix. Voici ce qui va se passer:</p>

  <div className="steps-preview">
    <Step number="1" title="Upload tes résultats" time="2 min" />
    <Step number="2" title="Réponds au questionnaire" time="5 min" />
    <Step number="3" title="L'IA analyse" time="24-48h" />
    <Step number="4" title="Dashboard disponible" time="Email notification" />
  </div>
</div>
```

**Step 2: Guide Rapide "Comment Bien Upload"**

```markdown
### 📸 Upload Tes Résultats

**Formats acceptés**: PDF, JPG, PNG

**Checklist Photo Parfaite**:
✅ Tous les biomarqueurs visibles
✅ Valeurs + unités lisibles
✅ Nom du labo visible
✅ Date de prélèvement visible
✅ Bonne luminosité (pas de reflets)
✅ Photo droite (pas de biais)

**Multi-pages**: Si tes résultats font plusieurs pages, upload-les toutes
```

**Upload Zone**:
```jsx
<FileUploadZone
  accept=".pdf,.jpg,.jpeg,.png"
  maxSize="10MB"
  multiple={true}
  onUpload={handleUpload}
>
  <div className="upload-instructions">
    <Icon name="upload" size={48} color="cyan" />
    <p>Glisse tes résultats ici ou clique pour sélectionner</p>
    <small>PDF, JPG, PNG • Max 10MB par fichier</small>
  </div>
</FileUploadZone>
```

**Preview Uploaded Files**:
```jsx
<div className="uploaded-files">
  {files.map(file => (
    <div className="file-card" key={file.id}>
      <img src={file.thumbnail} alt={file.name} />
      <div className="file-info">
        <p>{file.name}</p>
        <small>{file.size}</small>
      </div>
      <button onClick={() => removeFile(file.id)}>
        <Icon name="trash" />
      </button>
    </div>
  ))}
</div>
```

---

## 📋 PHASE 3: QUESTIONNAIRE PERSONNALISÉ

### Objectif

Collecter contexte personnel pour affiner l'analyse IA:
- Objectifs santé
- Symptômes actuels
- Historique médical
- Lifestyle (sommeil, nutrition, entraînement, stress)
- Suppléments actuels

### Structure du Questionnaire

**39 Questions** réparties en **4 sections**:

---

### SECTION 1: TOI & TES OBJECTIFS (10 questions)

**Q1. Âge**
- Type: Number input
- Validation: 18-99

**Q2. Sexe**
- Type: Radio
- Options: Homme / Femme

**Q3. Poids (kg)**
- Type: Number
- Validation: 40-200

**Q4. Taille (cm)**
- Type: Number
- Validation: 140-220

**Q5. Tour de Taille (cm)**
- Type: Number
- Validation: 50-150
- Helper: "Mesure à hauteur du nombril"

**Q6. Pourcentage de Graisse Corporelle (estimation)**
- Type: Select
- Options: <10% / 10-15% / 15-20% / 20-25% / 25-30% / >30% / Je ne sais pas

**Q7. Quel est ton objectif principal ?**
- Type: Radio
- Options:
  - Optimiser ma santé globale
  - Augmenter ma performance sportive
  - Prendre de la masse musculaire
  - Perdre du gras
  - Améliorer mon énergie/fatigue
  - Optimiser ma santé hormonale
  - Autre (précise)

**Q8. Depuis combien de temps tu t'entraînes ?**
- Type: Select
- Options: Débutant (<1 an) / Intermédiaire (1-3 ans) / Avancé (3-5 ans) / Expert (>5 ans) / Je ne m'entraîne pas

**Q9. Fréquence d'entraînement par semaine**
- Type: Select
- Options: 0 / 1-2 / 3-4 / 5-6 / 7+

**Q10. Type d'entraînement principal**
- Type: Checkboxes (plusieurs choix)
- Options:
  - Musculation/Force
  - CrossFit/HIIT
  - Endurance (course, vélo)
  - Sports de combat
  - Sports d'équipe
  - Autre

---

### SECTION 2: SYMPTÔMES & SIGNES (12 questions)

**Q11. Niveau d'énergie actuel**
- Type: Scale 1-10
- Labels: 1="Épuisé" / 10="Débordant d'énergie"

**Q12. Qualité du sommeil**
- Type: Scale 1-10
- Labels: 1="Insomnie totale" / 10="Sommeil parfait"

**Q13. Heures de sommeil par nuit (moyenne)**
- Type: Number
- Validation: 3-12

**Q14. Libido / Fonction Sexuelle**
- Type: Scale 1-10
- Labels: 1="Inexistante" / 10="Excellente"

**Q15. Es-tu concerné par un ou plusieurs de ces symptômes ?**
- Type: Checkboxes
- Options:
  - Fatigue chronique malgré sommeil suffisant
  - Difficulté à prendre du muscle
  - Difficulté à perdre du gras (surtout abdomen)
  - Baisse de libido
  - Dysfonction érectile
  - Irritabilité / Mood swings
  - Anxiété
  - Dépression / Démotivation
  - Brouillard mental / Concentration difficile
  - Gynécomastie (développement poitrine homme)
  - Rétention d'eau
  - Peau sèche
  - Chute de cheveux
  - Mains/pieds froids
  - Aucun de ces symptômes

**Q16. Stress perçu (quotidien)**
- Type: Scale 1-10
- Labels: 1="Zen total" / 10="Stress maximal"

**Q17. As-tu des antécédents médicaux ?**
- Type: Checkboxes
- Options:
  - Diabète type 2 / Prédiabète
  - Hypertension
  - Maladie cardiovasculaire
  - Hypothyroïdie / Hyperthyroïdie
  - Maladie auto-immune
  - SOPK (femmes)
  - Hypogonadisme
  - Apnée du sommeil
  - Dépression diagnostiquée
  - Aucun

**Q18. Antécédents familiaux (parents/fratrie)**
- Type: Checkboxes
- Options:
  - Diabète
  - Maladie cardiovasculaire (infarctus, AVC)
  - Cancer (précise type si possible)
  - Maladie thyroïde
  - Aucun

**Q19. Prends-tu des médicaments actuellement ?**
- Type: Textarea
- Placeholder: "Liste tous tes médicaments avec dosages (ex: Metformine 500mg 2x/jour)"

**Q20. As-tu déjà pris des stéroïdes anabolisants ou SARMs ?**
- Type: Radio + Conditional
- Options: Jamais / Oui, dans le passé / Oui, actuellement
- If "Oui": Textarea "Précise lesquels et depuis quand"

**Q21. Consommation d'alcool**
- Type: Select
- Options: Jamais / Occasionnel (<2 verres/semaine) / Modéré (2-7 verres/semaine) / Élevé (>7 verres/semaine)

**Q22. Fumeur ?**
- Type: Radio
- Options: Non / Oui, occasionnel / Oui, régulier (<10 cig/jour) / Oui, régulier (>10 cig/jour)

---

### SECTION 3: NUTRITION & LIFESTYLE (9 questions)

**Q23. Régime alimentaire actuel**
- Type: Select
- Options:
  - Omnivore équilibré
  - Riche en protéines (>2g/kg)
  - Low carb / Keto
  - Végétarien
  - Végétalien
  - Carnivore
  - Jeûne intermittent
  - Autre

**Q24. Apport protéines quotidien (estimation)**
- Type: Select
- Options: <1g/kg / 1-1.5g/kg / 1.5-2g/kg / 2-2.5g/kg / >2.5g/kg / Je ne sais pas

**Q25. Consommation de sucres ajoutés**
- Type: Select
- Options: Très faible (<25g/jour) / Modérée (25-50g/jour) / Élevée (>50g/jour) / Je ne sais pas

**Q26. Exposition au soleil (moyenne)**
- Type: Select
- Options: <15min/jour / 15-30min/jour / 30-60min/jour / >1h/jour

**Q27. Gestion du stress (techniques utilisées)**
- Type: Checkboxes
- Options:
  - Méditation
  - Respiration (Wim Hof, cohérence cardiaque)
  - Yoga
  - Sport
  - Sauna
  - Bain froid
  - Aucune technique particulière

**Q28. Heures d'exposition écrans avant coucher**
- Type: Select
- Options: 0-1h / 1-2h / 2-3h / >3h

**Q29. Utilises-tu des lunettes anti-lumière bleue le soir ?**
- Type: Radio
- Options: Oui / Non

**Q30. Heure de coucher habituelle**
- Type: Time picker
- Helper: "En semaine"

**Q31. Te réveilles-tu reposé ?**
- Type: Radio
- Options: Oui, toujours / Parfois / Rarement / Jamais

---

### SECTION 4: SUPPLÉMENTS ACTUELS (8 questions)

**Q32. Prends-tu actuellement des suppléments ?**
- Type: Radio
- Options: Oui / Non

**If Oui → Questions conditionnelles:**

**Q33. Vitamine D**
- Type: Radio + Number
- Options: Non / Oui → Dosage (UI/jour) ?

**Q34. Zinc**
- Type: Radio + Number
- Options: Non / Oui → Dosage (mg/jour) ?

**Q35. Magnésium**
- Type: Radio + Number
- Options: Non / Oui → Dosage (mg/jour) + Forme (citrate/glycinate/oxide) ?

**Q36. Oméga-3**
- Type: Radio + Number
- Options: Non / Oui → Dosage EPA+DHA (mg/jour) ?

**Q37. Créatine**
- Type: Radio + Number
- Options: Non / Oui → Dosage (g/jour) ?

**Q38. Autres suppléments**
- Type: Textarea
- Placeholder: "Liste tous les autres (multivitamines, ashwagandha, tongkat ali, etc.) avec dosages"

**Q39. Depuis combien de temps prends-tu ces suppléments ?**
- Type: Textarea
- Placeholder: "Précise pour chaque supplément important (ex: Vitamine D 5000 UI depuis 6 mois)"

---

### UI/UX du Questionnaire

**Design**:
```jsx
<div className="questionnaire-container">
  {/* Progress Bar */}
  <div className="progress-bar">
    <div className="progress-fill" style={{width: `${progress}%`}} />
    <span className="progress-text">{currentQuestion}/39</span>
  </div>

  {/* Section Indicator */}
  <div className="section-indicator">
    <span className="section-number">Section {currentSection}/4</span>
    <h2 className="section-title">{sectionTitles[currentSection]}</h2>
  </div>

  {/* Question Card */}
  <div className="question-card">
    <label className="question-label">
      <span className="q-number">Q{currentQuestion}.</span>
      {question.text}
      {question.helper && (
        <small className="helper-text">{question.helper}</small>
      )}
    </label>

    {/* Dynamic Input Based on Type */}
    <QuestionInput type={question.type} options={question.options} />
  </div>

  {/* Navigation */}
  <div className="question-nav">
    <button onClick={goBack} disabled={currentQuestion === 1}>
      Précédent
    </button>
    <button onClick={goNext} className="btn-primary">
      {currentQuestion === 39 ? 'Terminer' : 'Suivant'}
    </button>
  </div>
</div>
```

**Validation**:
- Empêche de passer à la question suivante si champ requis vide
- Affiche message d'erreur inline
- Sauvegarde automatique des réponses (localStorage) pour éviter perte de données

**Après Soumission**:
```jsx
<div className="submission-success">
  <Icon name="check-circle" size={64} color="green" />
  <h2>C'est dans la boîte ! 🎯</h2>
  <p>Tes résultats et réponses ont été envoyés.</p>
  <p>L'IA va maintenant analyser tout ça. Tu recevras un email sous 24-48h quand ton dashboard sera prêt.</p>

  <div className="what-happens-next">
    <h3>Pendant ce temps:</h3>
    <ul>
      <li>✅ OCR extrait tes 39 biomarqueurs</li>
      <li>✅ Claude Opus 4.5 analyse les interconnexions</li>
      <li>✅ Génération des recommandations personnalisées</li>
      <li>✅ Création des visualisations</li>
      <li>✅ Compilation du rapport PDF</li>
    </ul>
  </div>

  <button onClick={goToDashboard} className="btn-secondary">
    Fermer
  </button>
</div>
```

---

## 📋 PHASE 4: BACKEND PROCESSING

### Step 1: OCR Extraction (Google Vision AI ou Tesseract)

**Input**: PDF/Images uploadées

**Process**:
1. Convertir PDF → Images (1 page = 1 image)
2. Pour chaque image, extraire texte via OCR
3. Parser le texte pour identifier les 39 biomarqueurs

**Pattern Matching**:
```python
BIOMARKER_PATTERNS = {
    'testosterone_total': [
        r'testost[ée]rone\s+totale?\s*:?\s*([0-9.,]+)\s*(ng/ml|nmol/l)',
        r't[ée]sto\s+tot\s*:?\s*([0-9.,]+)',
    ],
    'testosterone_free': [
        r'testost[ée]rone\s+libre?\s*:?\s*([0-9.,]+)\s*(pg/ml|pmol/l)',
    ],
    'shbg': [
        r'shbg\s*:?\s*([0-9.,]+)\s*(nmol/l)',
        r'sex\s+hormone\s+binding\s+globulin\s*:?\s*([0-9.,]+)',
    ],
    'estradiol': [
        r'(estradiol|[oe]estradiol|e2)\s*:?\s*([0-9.,]+)\s*(pg/ml|pmol/l)',
    ],
    # ... pour les 39 biomarqueurs
}

def extract_biomarkers(ocr_text):
    results = {}
    for biomarker, patterns in BIOMARKER_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, ocr_text, re.IGNORECASE)
            if match:
                results[biomarker] = {
                    'value': float(match.group(1).replace(',', '.')),
                    'unit': match.group(2) if len(match.groups()) > 1 else None
                }
                break
    return results
```

**Unit Conversion**:
```python
# Convertir tout en unités standard
CONVERSIONS = {
    'testosterone_total': {
        'nmol/l': lambda x: x * 28.85,  # → ng/dL
        'ng/ml': lambda x: x * 100,      # → ng/dL
    },
    'testosterone_free': {
        'pmol/l': lambda x: x * 0.0288,  # → pg/mL
    },
    # ...
}
```

**Output**:
```json
{
  "extracted_biomarkers": {
    "testosterone_total": {"value": 520, "unit": "ng/dL"},
    "testosterone_free": {"value": 12.3, "unit": "pg/mL"},
    "shbg": {"value": 35, "unit": "nmol/L"},
    "estradiol": {"value": 28, "unit": "pg/mL"},
    "glucose_fasting": {"value": 92, "unit": "mg/dL"},
    "insulin_fasting": {"value": 8.5, "unit": "µIU/mL"},
    // ... 33 autres
  },
  "missing_biomarkers": ["dht", "reverse_t3"],  // Pas détectés
  "confidence_scores": {
    "testosterone_total": 0.98,
    "glucose_fasting": 0.95,
    // ...
  }
}
```

### Step 2: Calcul Biomarqueurs Dérivés

**HOMA-IR** (Résistance Insulinique):
```python
def calculate_homa_ir(glucose_mg_dl, insulin_uIU_ml):
    """
    HOMA-IR = (Glucose × Insuline) / 405

    Interprétation:
    < 1.0 = Excellente sensibilité
    1.0-1.9 = Normale
    2.0-2.9 = Résistance précoce
    ≥ 3.0 = Résistance significative
    """
    return (glucose_mg_dl * insulin_uIU_ml) / 405

homa_ir = calculate_homa_ir(92, 8.5)  # = 1.93
```

**Free Androgen Index** (FAI):
```python
def calculate_fai(testosterone_total_nmol, shbg_nmol):
    """
    FAI = (Testostérone Totale / SHBG) × 100

    Interprétation homme:
    > 50 = Normal
    30-50 = Limite basse
    < 30 = Faible (hypogonadisme possible)
    """
    return (testosterone_total_nmol / shbg_nmol) * 100

# Convertir d'abord en nmol/L si nécessaire
testo_nmol = 520 / 28.85  # ng/dL → nmol/L = 18.02
fai = calculate_fai(18.02, 35)  # = 51.5
```

**Ratio Testo/Estradiol**:
```python
def calculate_te_ratio(testo_total_ng_dl, estradiol_pg_ml):
    """
    Ratio T/E optimal homme: 10-20

    < 10 = Trop d'estradiol (aromatisation excessive)
    > 20 = Possible faible estradiol (os, libido, mood)
    """
    return testo_total_ng_dl / estradiol_pg_ml

te_ratio = calculate_te_ratio(520, 28)  # = 18.6
```

**Ratio Cholestérol Total / HDL**:
```python
def calculate_tc_hdl_ratio(total_chol, hdl):
    """
    Risque cardiovasculaire:
    < 3.5 = Faible
    3.5-5.0 = Moyen
    > 5.0 = Élevé
    """
    return total_chol / hdl
```

**Ratio Triglycérides / HDL**:
```python
def calculate_tg_hdl_ratio(triglycerides, hdl):
    """
    Indicateur résistance insulinique:
    < 2.0 = Bon
    2.0-4.0 = Limite
    > 4.0 = Résistance probable
    """
    return triglycerides / hdl
```

### Step 3: Prompt IA pour Analyse Complète

**Utiliser**: Claude Opus 4.5 (le plus intelligent pour analyse médicale complexe)

**Prompt Template**:

```python
BLOOD_ANALYSIS_SYSTEM_PROMPT = """Tu es un expert en médecine fonctionnelle et optimisation de la santé, spécialisé dans l'interprétation d'analyses sanguines pour la performance et le biohacking.

CONTEXTE:
L'utilisateur a envoyé ses résultats de prise de sang avec 39 biomarqueurs. Tu vas générer une analyse complète, personnalisée et actio nnable.

TONE:
- Tutoiement (tu/ton/ta)
- Pédagogue mais pas condescendant
- Basé sur la science (cite études si pertinent)
- Actionnable et concret
- Ni alarmiste ni trop rassurant

STRUCTURE DE TA RÉPONSE:
Retourne un JSON avec les sections suivantes.
"""

def generate_analysis_prompt(biomarkers, questionnaire_data, user_profile):
    return f"""
{BLOOD_ANALYSIS_SYSTEM_PROMPT}

# DONNÉES UTILISATEUR

## Profil
- Âge: {user_profile['age']} ans
- Sexe: {user_profile['sex']}
- Poids: {user_profile['weight']} kg
- Taille: {user_profile['height']} cm
- IMC: {user_profile['bmi']:.1f}
- Tour de taille: {user_profile['waist']} cm
- % Graisse: {user_profile['bodyfat']}
- Objectif: {user_profile['goal']}

## Lifestyle
- Entraînement: {questionnaire_data['training_frequency']}x/semaine, {questionnaire_data['training_type']}
- Sommeil: {questionnaire_data['sleep_hours']}h/nuit, qualité {questionnaire_data['sleep_quality']}/10
- Stress: {questionnaire_data['stress_level']}/10
- Alimentation: {questionnaire_data['diet_type']}
- Protéines: {questionnaire_data['protein_intake']}

## Symptômes Actuels
{', '.join(questionnaire_data['symptoms'])}

## Antécédents
- Médicaux: {', '.join(questionnaire_data['medical_history'])}
- Familiaux: {', '.join(questionnaire_data['family_history'])}
- Médicaments: {questionnaire_data['medications']}

## Suppléments Actuels
{questionnaire_data['supplements']}

# BIOMARQUEURS MESURÉS

{format_biomarkers_for_prompt(biomarkers)}

# BIOMARQUEURS DÉRIVÉS

- HOMA-IR: {biomarkers['derived']['homa_ir']:.2f}
- Free Androgen Index: {biomarkers['derived']['fai']:.1f}
- Ratio Testo/Estradiol: {biomarkers['derived']['te_ratio']:.1f}
- Ratio TC/HDL: {biomarkers['derived']['tc_hdl']:.2f}
- Ratio TG/HDL: {biomarkers['derived']['tg_hdl']:.2f}

# TA MISSION

Génère une analyse JSON complète avec cette structure EXACTE:

{{
  "global_health_score": <0-100, score santé global>,
  "global_summary": "<paragraphe 3-4 phrases résumant l'état général>",

  "systems": {{
    "hormones": {{
      "score": <0-100>,
      "status": "optimal|suboptimal|problematic|critical",
      "key_findings": ["finding 1", "finding 2", ...],
      "detailed_analysis": "<analyse détaillée système hormonal>",
      "biomarkers_detail": [
        {{
          "name": "testosterone_total",
          "value": {biomarkers['testosterone_total']['value']},
          "unit": "{biomarkers['testosterone_total']['unit']}",
          "status": "optimal|high_optimal|normal|suboptimal|low|very_low",
          "optimal_range": {{"min": X, "max": Y}},
          "interpretation": "<explication courte>",
          "why_it_matters": "<pourquoi c'est important>",
          "short_term_consequences": "<si hors norme, conséquences court terme>",
          "long_term_consequences": "<si hors norme, conséquences long terme>",
          "contributing_factors": ["facteur 1", "facteur 2"],
          "interconnections": ["biomarker X influence celui-ci parce que...", ...]
        }},
        // ... pour testosterone_free, shbg, estradiol, dht, lh, fsh
      ]
    }},

    "metabolism": {{
      "score": <0-100>,
      "status": "optimal|suboptimal|problematic|critical",
      "key_findings": [...],
      "detailed_analysis": "<analyse>",
      "biomarkers_detail": [
        // glucose_fasting, insulin_fasting, hba1c, homa_ir
      ]
    }},

    "thyroid": {{
      "score": <0-100>,
      "status": "optimal|suboptimal|problematic|critical",
      "key_findings": [...],
      "detailed_analysis": "<analyse>",
      "biomarkers_detail": [
        // tsh, t4_free, t3_free, t3_reverse, anti_tpo
      ]
    }},

    "inflammation": {{
      "score": <0-100>,
      "status": "optimal|suboptimal|problematic|critical",
      "key_findings": [...],
      "detailed_analysis": "<analyse>",
      "biomarkers_detail": [
        // hscrp, homocysteine
      ]
    }},

    "lipids": {{
      "score": <0-100>,
      "status": "optimal|suboptimal|problematic|critical",
      "key_findings": [...],
      "detailed_analysis": "<analyse>",
      "biomarkers_detail": [
        // total_chol, hdl, ldl, triglycerides, apob, lp_a, tc_hdl_ratio, tg_hdl_ratio
      ]
    }},

    "vitamins_minerals": {{
      "score": <0-100>,
      "status": "optimal|suboptimal|problematic|critical",
      "key_findings": [...],
      "detailed_analysis": "<analyse>",
      "biomarkers_detail": [
        // vitamin_d, b12, folate, magnesium, iron, ferritin, transferrin_sat, zinc
      ]
    }},

    "liver": {{
      "score": <0-100>,
      "status": "optimal|suboptimal|problematic|critical",
      "key_findings": [...],
      "detailed_analysis": "<analyse>",
      "biomarkers_detail": [
        // ast, alt, ggt
      ]
    }},

    "kidney": {{
      "score": <0-100>,
      "status": "optimal|suboptimal|problematic|critical",
      "key_findings": [...],
      "detailed_analysis": "<analyse>",
      "biomarkers_detail": [
        // creatinine, egfr, urea
      ]
    }},

    "blood_cells": {{
      "score": <0-100>,
      "status": "optimal|suboptimal|problematic|critical",
      "key_findings": [...],
      "detailed_analysis": "<analyse>",
      "biomarkers_detail": [
        // rbc, hemoglobin, hematocrit, mcv, mch, mchc, wbc, platelets
      ]
    }}
  }},

  "interconnections": [
    {{
      "biomarkers": ["biomarker_1", "biomarker_2", "biomarker_3"],
      "relationship": "<explication comment ils s'influencent>",
      "impact": "<impact sur santé/performance>",
      "action": "<ce qu'il faut faire>"
    }},
    // ... 5-10 interconnexions majeures
  ],

  "recommendations": {{
    "supplements": [
      {{
        "name": "Vitamine D3",
        "dosage": "5000 UI/jour",
        "timing": "Le matin avec repas gras",
        "duration": "3 mois puis re-test",
        "why": "<justification basée sur résultats>",
        "expected_impact": "<biomarqueurs qui vont s'améliorer>",
        "synergies": ["Prendre avec magnésium et K2"],
        "warnings": ["Pas de surdosage, max 10000 UI/jour"]
      }},
      // ... tous les suppléments recommandés
    ],

    "nutrition": [
      {{
        "category": "Macros",
        "recommendation": "Augmente protéines à 2g/kg",
        "why": "<raison>",
        "how": "<exemples concrets>",
        "impact": "<biomarqueurs affectés>"
      }},
      {{
        "category": "Aliments spécifiques",
        "recommendation": "Ajoute crucifères 3-4x/semaine",
        "why": "DIM naturel pour métabolisme estrogènes",
        "how": "Brocoli, chou-fleur, choux de Bruxelles",
        "impact": "Peut améliorer ratio testo/E2"
      }},
      // ...
    ],

    "lifestyle": [
      {{
        "category": "Sommeil",
        "recommendation": "Vise 8h minimum",
        "why": "Testo se régénère pendant sommeil profond",
        "how": ["Couche-toi avant 23h", "Chambre noire totale", "Température 18°C"],
        "impact": "Peut augmenter testo de 10-15%"
      }},
      {{
        "category": "Stress",
        "recommendation": "Ajoute cohérence cardiaque 2x/jour",
        "why": "Cortisol élevé tue testostérone",
        "how": "5 min matin + soir, appli RespiRelax",
        "impact": "Baisse cortisol, protège testo"
      }},
      {{
        "category": "Entraînement",
        "recommendation": "Réduis volume cardio",
        "why": "Cardio excessif inhibe axe hormonal",
        "how": "Max 2-3 sessions/semaine, <30min",
        "impact": "Préserve testo et thyroïde"
      }},
      // ...
    ],

    "medical_followup": [
      {{
        "priority": "high|medium|low",
        "recommendation": "Consulte endocrinologue",
        "reason": "Testostérone libre très basse + symptômes",
        "what_to_say": "<script pour le médecin>",
        "tests_to_request": ["LH", "FSH", "Prolactine"]
      }},
      // ...
    ]
  }},

  "action_plan_30_days": [
    {{
      "day": 1,
      "actions": ["Commence Vitamine D 5000 UI", "Installe appli HRV pour tracking stress"],
      "why": "<raison>"
    }},
    {{
      "day": 3,
      "actions": ["Ajoute magnésium glycinate 400mg le soir"],
      "why": "<raison>"
    }},
    {{
      "week": 2,
      "actions": ["Évalue ton sommeil, ajuste si besoin"],
      "why": "<raison>"
    }},
    {{
      "day": 30,
      "actions": ["Re-test biomarqueurs clés (Vitamine D, Testo, Insuline)"],
      "why": "Vérifier progrès"
    }}
  ],

  "retest_protocol": {{
    "recommended_date": "Dans 3 mois",
    "priority_biomarkers": ["testosterone_total", "vitamin_d", "insulin_fasting"],
    "why_retest": "<explication>",
    "what_to_expect": "<améliorations attendues>"
  }}
}}

RÈGLES IMPORTANTES:
1. Utilise les ranges OPTIMAUX, pas juste "normaux" de labo
2. Détecte et explique les interconnexions (ex: zinc bas → testo basse)
3. Sois spécifique sur dosages et timing
4. Cite les facteurs lifestyle du questionnaire
5. Priorise par impact (quick wins d'abord)
6. Si biomarqueur critique → recommend medical followup
7. JSON valide strict (pas de commentaires, trailing commas, etc.)

Génère maintenant l'analyse complète en JSON.
"""
```

**Appel API**:
```python
import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

response = client.messages.create(
    model="claude-opus-4-5-20251101",
    max_tokens=16000,
    temperature=0.3,  # Moins de créativité, plus de précision
    system=BLOOD_ANALYSIS_SYSTEM_PROMPT,
    messages=[{
        "role": "user",
        "content": generate_analysis_prompt(biomarkers, questionnaire, profile)
    }]
)

analysis_json = json.loads(response.content[0].text)
```

### Step 4: Génération Visualisations

**Biomarker Gauge Chart**:
```jsx
const BiomarkerGauge = ({ biomarker }) => {
  const { value, optimal_range, status } = biomarker;

  // Normaliser 0-100 pour le gauge
  const position = ((value - optimal_range.min) / (optimal_range.max - optimal_range.min)) * 100;

  return (
    <div className="gauge-container">
      <svg viewBox="0 0 200 120">
        {/* Arc background */}
        <path d="M10,100 A90,90 0 0,1 190,100" fill="none" stroke="#2D3748" strokeWidth="20" />

        {/* Optimal zone (green) */}
        <path d="M10,100 A90,90 0 0,1 190,100" fill="none" stroke="var(--green-optimal)" strokeWidth="20" strokeDasharray="40 100" />

        {/* Needle */}
        <line x1="100" y1="100" x2={needleX} y2={needleY} stroke="var(--cyan-neon)" strokeWidth="3" />
        <circle cx="100" cy="100" r="6" fill="var(--cyan-neon)" />
      </svg>

      <div className="gauge-value">
        {value} {biomarker.unit}
      </div>
      <div className={`gauge-status status-${status}`}>
        {statusLabels[status]}
      </div>
    </div>
  );
};
```

**Radar Chart (Score par Système)**:
```jsx
import { Radar } from 'recharts';

const SystemsRadar = ({ systems }) => {
  const data = Object.entries(systems).map(([name, system]) => ({
    system: systemLabels[name],
    score: system.score,
    fullMark: 100
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(0, 240, 255, 0.2)" />
        <PolarAngleAxis dataKey="system" stroke="#A0AEC0" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#A0AEC0" />
        <Radar name="Ton Score" dataKey="score" stroke="var(--cyan-neon)" fill="var(--cyan-neon)" fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  );
};
```

**Biomarker Trend Line** (pour futurs re-tests):
```jsx
const TrendChart = ({ biomarker_history }) => {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={biomarker_history}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="date" stroke="#A0AEC0" />
        <YAxis stroke="#A0AEC0" />
        <Tooltip contentStyle={{background: '#1A202C', border: '1px solid var(--cyan-neon)'}} />

        {/* Optimal range band */}
        <ReferenceArea y1={optimalMin} y2={optimalMax} fill="var(--green-optimal)" fillOpacity={0.1} />

        {/* Actual values line */}
        <Line type="monotone" dataKey="value" stroke="var(--cyan-neon)" strokeWidth={3} dot={{r: 6}} />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

### Step 5: Génération PDF Premium

**Library**: Puppeteer (render HTML → PDF)

**Template HTML/CSS**:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap');

    body {
      font-family: 'Inter', sans-serif;
      color: #2D3748;
      line-height: 1.6;
    }

    .cover-page {
      height: 100vh;
      background: linear-gradient(135deg, #0A0E27 0%, #151932 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    .cover-title {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 20px;
      background: linear-gradient(135deg, #00F0FF, #B87FFF);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .biomarker-section {
      page-break-inside: avoid;
      margin-bottom: 40px;
      padding: 20px;
      border-left: 4px solid #00F0FF;
    }

    .biomarker-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 32px;
      font-weight: 700;
      color: #00F0FF;
    }

    /* ... */
  </style>
</head>
<body>
  <!-- Page 1: Cover -->
  <div class="cover-page">
    <h1 class="cover-title">Blood Analysis Premium</h1>
    <p>Rapport personnalisé pour {{user_name}}</p>
    <p>Analyse effectuée le {{date}}</p>
    <img src="logo.png" alt="ApexLabs" />
  </div>

  <!-- Page 2: Executive Summary -->
  <div class="page">
    <h1>Résumé Exécutif</h1>
    <div class="global-score">{{global_health_score}}/100</div>
    <p>{{global_summary}}</p>

    <h2>Scores par Système</h2>
    <!-- Radar chart image -->
    <img src="{{radar_chart_img}}" />
  </div>

  <!-- Pages 3-N: Chaque système -->
  {{#each systems}}
  <div class="page system-page">
    <h1>{{system_name}}</h1>
    <div class="score">{{score}}/100</div>
    <div class="status status-{{status}}">{{status}}</div>

    <h2>Points Clés</h2>
    <ul>
      {{#each key_findings}}
      <li>{{this}}</li>
      {{/each}}
    </ul>

    <h2>Analyse Détaillée</h2>
    <p>{{detailed_analysis}}</p>

    <h2>Biomarqueurs</h2>
    {{#each biomarkers_detail}}
    <div class="biomarker-section">
      <h3>{{name}}</h3>
      <div class="biomarker-value">{{value}} {{unit}}</div>
      <div class="status status-{{status}}">{{status}}</div>
      <p><strong>Interprétation:</strong> {{interpretation}}</p>
      <p><strong>Pourquoi c'est important:</strong> {{why_it_matters}}</p>
      {{#if short_term_consequences}}
      <p><strong>Conséquences court terme:</strong> {{short_term_consequences}}</p>
      {{/if}}
      {{#if long_term_consequences}}
      <p><strong>Conséquences long terme:</strong> {{long_term_consequences}}</p>
      {{/if}}
    </div>
    {{/each}}
  </div>
  {{/each}}

  <!-- Page N: Recommandations -->
  <div class="page">
    <h1>Plan d'Action</h1>

    <h2>Suppléments Recommandés</h2>
    {{#each recommendations.supplements}}
    <div class="supplement-card">
      <h3>{{name}}</h3>
      <p><strong>Dosage:</strong> {{dosage}}</p>
      <p><strong>Timing:</strong> {{timing}}</p>
      <p><strong>Durée:</strong> {{duration}}</p>
      <p><strong>Pourquoi:</strong> {{why}}</p>
    </div>
    {{/each}}

    <!-- Nutrition, Lifestyle, etc. -->
  </div>
</body>
</html>
```

**Generate PDF**:
```javascript
const puppeteer = require('puppeteer');

async function generatePDF(analysis, user) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Render template with data
  const html = renderTemplate('blood-analysis-report.html', {
    user_name: user.name,
    date: new Date().toLocaleDateString('fr-FR'),
    ...analysis
  });

  await page.setContent(html);

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  await browser.close();

  return pdf;
}
```

### Step 6: Sauvegarder en DB

**Schema Drizzle**:
```typescript
export const bloodAnalysisReports = pgTable('blood_analysis_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),

  // OCR data
  extractedBiomarkers: json('extracted_biomarkers'),
  missingBiomarkers: json('missing_biomarkers'),
  ocrConfidenceScores: json('ocr_confidence_scores'),

  // Questionnaire
  questionnaireData: json('questionnaire_data'),

  // Analysis (full JSON from Claude)
  analysis: json('analysis'),

  // PDF
  pdfUrl: text('pdf_url'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  processingStatus: text('processing_status'), // 'pending', 'processing', 'completed', 'failed'
  aiModel: text('ai_model').default('claude-opus-4-5'),

  // Pour comparaisons futures
  testDate: timestamp('test_date'),
  previousReportId: integer('previous_report_id').references(() => bloodAnalysisReports.id)
});
```

---

## 📋 PHASE 5: EMAIL NOTIFICATION

**Trigger**: Quand `processingStatus` passe à `'completed'`

**Template Email**:
```html
<!DOCTYPE html>
<html>
<body style="background: #0A0E27; color: white; font-family: Arial;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="background: linear-gradient(135deg, #00F0FF, #B87FFF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px;">
        Ton Analyse est Prête ! 🔬
      </h1>
    </div>

    <!-- Score Global -->
    <div style="background: rgba(20, 25, 45, 0.6); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
      <p style="color: #A0AEC0; margin: 0 0 10px;">Ton Score Santé Global</p>
      <div style="font-size: 64px; font-weight: 700; background: linear-gradient(135deg, #00F0FF, #00FF9F); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        {{global_health_score}}/100
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 40px 0;">
      <a href="https://apexlabs.achzodcoaching.com/blood-analysis/dashboard/{{report_id}}"
         style="display: inline-block; background: linear-gradient(135deg, #00F0FF, #B87FFF); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 700; font-size: 18px;">
        Voir Mon Dashboard 🚀
      </a>
    </div>

    <!-- Teaser -->
    <div style="margin-top: 40px;">
      <h2 style="color: #00F0FF;">Ce que tu vas découvrir:</h2>
      <ul style="color: #A0AEC0; line-height: 1.8;">
        <li>✅ Analyse complète de tes 39 biomarqueurs</li>
        <li>✅ Dashboard interactif futuriste</li>
        <li>✅ Recommandations personnalisées (suppléments, nutrition, lifestyle)</li>
        <li>✅ Plan d'action 30 jours</li>
        <li>✅ Export PDF premium</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; color: #718096; font-size: 14px;">
      <p>ApexLabs by ACHZOD</p>
      <p>Questions ? Réponds à cet email.</p>
    </div>

  </div>
</body>
</html>
```

**Send Email**:
```typescript
import nodemailer from 'nodemailer';

async function sendAnalysisReadyEmail(user, report) {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const html = renderEmailTemplate('blood-analysis-ready.html', {
    user_name: user.name,
    global_health_score: report.analysis.global_health_score,
    report_id: report.id
  });

  await transporter.sendMail({
    from: '"ApexLabs by ACHZOD" <coaching@achzodcoaching.com>',
    to: user.email,
    subject: `🔬 ${user.name}, ton analyse sanguine est prête !`,
    html
  });
}
```

---

## 📋 PHASE 6: DASHBOARD CLIENT (14+ Pages)

### Architecture Pages

```
/blood-analysis/dashboard/:reportId
├── /overview (Page Principale - Vue d'ensemble)
├── /systems
│   ├── /hormones
│   ├── /metabolism
│   ├── /thyroid
│   ├── /inflammation
│   ├── /lipids
│   ├── /vitamins-minerals
│   ├── /liver
│   ├── /kidney
│   └── /blood-cells
├── /recommendations
│   ├── /supplements
│   ├── /nutrition
│   ├── /lifestyle
│   └── /medical-followup
├── /action-plan
├── /interconnections
└── /export
```

---

### PAGE 1: OVERVIEW (Dashboard Principal)

**Layout**:
```jsx
<div className="blood-dashboard">
  {/* Particles Background */}
  <ParticlesBackground />

  {/* Header */}
  <header className="dashboard-header">
    <div className="user-info">
      <Avatar src={user.avatar} />
      <div>
        <h1>Salut {user.name} 👋</h1>
        <p>Analyse du {report.testDate}</p>
      </div>
    </div>

    <div className="header-actions">
      <button className="btn-icon" onClick={exportPDF}>
        <Icon name="download" /> Export PDF
      </button>
      <button className="btn-icon" onClick={compareWithPrevious}>
        <Icon name="chart-line" /> Comparer
      </button>
    </div>
  </header>

  {/* Global Score Card */}
  <section className="global-score-section">
    <div className="score-card-main">
      <div className="score-visual">
        <CircularProgress value={globalScore} size={200} />
        <div className="score-center">
          <div className="score-number">{globalScore}</div>
          <div className="score-label">Score Santé</div>
        </div>
      </div>

      <div className="score-interpretation">
        <h2>Résumé Global</h2>
        <p>{analysis.global_summary}</p>

        <div className="status-badges">
          <Badge color="green">
            {systemsCount.optimal} systèmes optimaux
          </Badge>
          <Badge color="orange">
            {systemsCount.suboptimal} à optimiser
          </Badge>
          {systemsCount.critical > 0 && (
            <Badge color="red">
              {systemsCount.critical} critiques
            </Badge>
          )}
        </div>
      </div>
    </div>
  </section>

  {/* Systems Radar */}
  <section className="systems-radar-section">
    <h2>Scores par Système</h2>
    <SystemsRadarChart data={systems} />
  </section>

  {/* Systems Grid */}
  <section className="systems-grid">
    <h2>Explore Tes Systèmes</h2>
    <div className="grid-3-cols">
      {Object.entries(systems).map(([key, system]) => (
        <SystemCard key={key} system={system} link={`/systems/${key}`} />
      ))}
    </div>
  </section>

  {/* Top Priority Actions */}
  <section className="priority-actions">
    <h2>Actions Prioritaires</h2>
    <div className="action-cards">
      {analysis.recommendations.supplements.slice(0, 3).map(supp => (
        <ActionCard
          icon="pill"
          title={supp.name}
          description={supp.why}
          cta="Voir Détails"
          link="/recommendations/supplements"
        />
      ))}
    </div>
  </section>

  {/* Interconnections Teaser */}
  <section className="interconnections-teaser">
    <h2>Interconnexions Détectées</h2>
    <p>{analysis.interconnections.length} relations importantes entre tes biomarqueurs</p>
    <Link to="/interconnections" className="btn-secondary">
      Explorer les Interconnexions
    </Link>
  </section>
</div>
```

**SystemCard Component**:
```jsx
const SystemCard = ({ system, link }) => {
  const statusColors = {
    optimal: 'var(--green-optimal)',
    suboptimal: 'var(--orange)',
    problematic: 'var(--red-critical)',
    critical: 'var(--red-critical)'
  };

  return (
    <Link to={link} className="system-card">
      <div className="system-header">
        <Icon name={system.icon} size={32} color={statusColors[system.status]} />
        <h3>{system.name}</h3>
      </div>

      <div className="system-score">
        <div className="score-number">{system.score}</div>
        <div className="score-bar">
          <div className="score-fill" style={{width: `${system.score}%`, background: statusColors[system.status]}} />
        </div>
      </div>

      <div className={`system-status status-${system.status}`}>
        <StatusDot status={system.status} />
        <span>{statusLabels[system.status]}</span>
      </div>

      <ul className="key-findings">
        {system.key_findings.slice(0, 2).map((finding, i) => (
          <li key={i}>{finding}</li>
        ))}
      </ul>

      <div className="card-footer">
        <span>Voir Détails</span>
        <Icon name="arrow-right" />
      </div>
    </Link>
  );
};
```

---

### PAGE 2-10: PAGES SYSTÈME (ex: /systems/hormones)

**Structure Type**:
```jsx
<div className="system-detail-page">
  {/* Breadcrumb */}
  <Breadcrumb>
    <Link to="/overview">Dashboard</Link>
    <span>/</span>
    <span>Système Hormonal</span>
  </Breadcrumb>

  {/* Header Système */}
  <header className="system-header">
    <div className="system-icon-large">
      <Icon name="hormone" size={64} />
    </div>
    <div>
      <h1>Système Hormonal</h1>
      <div className="score-badge">
        <span className="score">{system.score}/100</span>
        <StatusDot status={system.status} />
        <span>{statusLabels[system.status]}</span>
      </div>
    </div>
  </header>

  {/* Key Findings */}
  <section className="key-findings-section">
    <h2>Points Clés</h2>
    <div className="findings-grid">
      {system.key_findings.map((finding, i) => (
        <div className="finding-card" key={i}>
          <Icon name="check-circle" color="cyan" />
          <p>{finding}</p>
        </div>
      ))}
    </div>
  </section>

  {/* Analyse Détaillée */}
  <section className="detailed-analysis-section">
    <h2>Analyse Détaillée</h2>
    <div className="analysis-text">
      {system.detailed_analysis}
    </div>
  </section>

  {/* Biomarqueurs */}
  <section className="biomarkers-section">
    <h2>Tes Biomarqueurs</h2>
    {system.biomarkers_detail.map(biomarker => (
      <BiomarkerDetailCard key={biomarker.name} biomarker={biomarker} />
    ))}
  </section>

  {/* Recommendations Spécifiques au Système */}
  <section className="system-recommendations">
    <h2>Recommandations</h2>
    {/* Filtrer les recommendations qui concernent ce système */}
    <RecommendationsList recommendations={getSystemRecommendations(system)} />
  </section>
</div>
```

**BiomarkerDetailCard Component** (CRUCIAL):
```jsx
const BiomarkerDetailCard = ({ biomarker }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="biomarker-detail-card">
      {/* Header: Nom + Valeur + Gauge */}
      <div className="biomarker-header" onClick={() => setExpanded(!expanded)}>
        <div className="biomarker-name-section">
          <h3>{biomarkerLabels[biomarker.name]}</h3>

          {/* ICON TOOLTIP - FEATURE CLÉE */}
          <Tooltip content={<BiomarkerTooltip biomarker={biomarker} />}>
            <button className="info-icon">
              <Icon name="info-circle" color="cyan" />
            </button>
          </Tooltip>
        </div>

        <div className="biomarker-value-section">
          <div className="value-display">
            <span className="value">{biomarker.value}</span>
            <span className="unit">{biomarker.unit}</span>
          </div>
          <div className={`status-badge status-${biomarker.status}`}>
            {statusLabels[biomarker.status]}
          </div>
        </div>

        <BiomarkerGauge biomarker={biomarker} />

        <Icon name={expanded ? "chevron-up" : "chevron-down"} />
      </div>

      {/* Expandable Content */}
      {expanded && (
        <div className="biomarker-expanded">
          {/* Optimal Range */}
          <div className="range-section">
            <h4>Fourchette Optimale</h4>
            <div className="range-bar">
              <span className="range-min">{biomarker.optimal_range.min}</span>
              <div className="range-visual">
                <div className="optimal-zone" />
                <div className="your-marker" style={{left: calculatePosition(biomarker)}} />
              </div>
              <span className="range-max">{biomarker.optimal_range.max}</span>
            </div>
          </div>

          {/* Interpretation */}
          <div className="interpretation-section">
            <h4>Interprétation</h4>
            <p>{biomarker.interpretation}</p>
          </div>

          {/* Pourquoi Important */}
          <div className="why-matters-section">
            <h4>Pourquoi C'est Important</h4>
            <p>{biomarker.why_it_matters}</p>
          </div>

          {/* Conséquences (si hors norme) */}
          {biomarker.status !== 'optimal' && (
            <>
              <div className="consequences-section short-term">
                <h4>Conséquences Court Terme</h4>
                <ul>
                  {biomarker.short_term_consequences.split('. ').map((cons, i) => (
                    <li key={i}>{cons}</li>
                  ))}
                </ul>
              </div>

              <div className="consequences-section long-term">
                <h4>Conséquences Long Terme</h4>
                <ul>
                  {biomarker.long_term_consequences.split('. ').map((cons, i) => (
                    <li key={i}>{cons}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Facteurs Contributifs */}
          <div className="contributing-factors-section">
            <h4>Facteurs Qui Influencent Ce Marqueur</h4>
            <div className="factors-grid">
              {biomarker.contributing_factors.map((factor, i) => (
                <div className="factor-badge" key={i}>
                  {factor}
                </div>
              ))}
            </div>
          </div>

          {/* Interconnexions */}
          {biomarker.interconnections.length > 0 && (
            <div className="interconnections-section">
              <h4>Interconnexions</h4>
              {biomarker.interconnections.map((inter, i) => (
                <div className="interconnection-item" key={i}>
                  <Icon name="link" color="purple" />
                  <p>{inter}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

**BiomarkerTooltip Component** (Info Icon Hover):
```jsx
const BiomarkerTooltip = ({ biomarker }) => (
  <div className="biomarker-tooltip">
    <h4>{biomarkerLabels[biomarker.name]}</h4>

    <div className="tooltip-section">
      <strong>Rôle:</strong>
      <p>{biomarker.why_it_matters}</p>
    </div>

    <div className="tooltip-section">
      <strong>Optimal:</strong>
      <span>{biomarker.optimal_range.min} - {biomarker.optimal_range.max} {biomarker.unit}</span>
    </div>

    <div className="tooltip-section">
      <strong>Actions:</strong>
      <ul>
        {getQuickActions(biomarker).map((action, i) => (
          <li key={i}>{action}</li>
        ))}
      </ul>
    </div>
  </div>
);
```

---

### PAGE 11: RECOMMANDATIONS - SUPPLÉMENTS (/recommendations/supplements)

**Structure**:
```jsx
<div className="recommendations-page supplements-page">
  <h1>Protocole Suppléments Personnalisé</h1>

  <div className="intro-section">
    <p>Basé sur tes résultats, voici les suppléments qui auront le plus d'impact sur ta santé et performance.</p>
    <div className="priority-badge">
      <Icon name="star" /> Classés par Priorité d'Impact
    </div>
  </div>

  {/* Supplements Grid */}
  <div className="supplements-grid">
    {analysis.recommendations.supplements.map((supplement, index) => (
      <SupplementCard key={index} supplement={supplement} priority={index + 1} />
    ))}
  </div>

  {/* Timing Chart */}
  <section className="timing-chart-section">
    <h2>Timing Optimal</h2>
    <SupplementTimingChart supplements={analysis.recommendations.supplements} />
  </section>

  {/* Budget Estimator */}
  <section className="budget-section">
    <h2>Budget Mensuel Estimé</h2>
    <BudgetBreakdown supplements={analysis.recommendations.supplements} />
  </section>
</div>
```

**SupplementCard Component**:
```jsx
const SupplementCard = ({ supplement, priority }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="supplement-card">
      <div className="card-header">
        <div className="priority-badge">#{priority}</div>
        <h3>{supplement.name}</h3>
        <button onClick={() => setExpanded(!expanded)}>
          <Icon name={expanded ? "minus" : "plus"} />
        </button>
      </div>

      <div className="dosage-section">
        <Icon name="pill" color="cyan" />
        <div>
          <strong>Dosage:</strong> {supplement.dosage}
        </div>
      </div>

      <div className="timing-section">
        <Icon name="clock" color="orange" />
        <div>
          <strong>Quand:</strong> {supplement.timing}
        </div>
      </div>

      <div className="duration-section">
        <Icon name="calendar" color="purple" />
        <div>
          <strong>Durée:</strong> {supplement.duration}
        </div>
      </div>

      {expanded && (
        <div className="supplement-expanded">
          <div className="why-section">
            <h4>Pourquoi pour Toi ?</h4>
            <p>{supplement.why}</p>
          </div>

          <div className="impact-section">
            <h4>Impact Attendu</h4>
            <p>{supplement.expected_impact}</p>
          </div>

          {supplement.synergies.length > 0 && (
            <div className="synergies-section">
              <h4>Synergies</h4>
              <ul>
                {supplement.synergies.map((syn, i) => (
                  <li key={i}>
                    <Icon name="link" size={16} />
                    {syn}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {supplement.warnings.length > 0 && (
            <div className="warnings-section">
              <h4>⚠️ Précautions</h4>
              <ul>
                {supplement.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="where-to-buy">
            <h4>Où Acheter ?</h4>
            <p>Privilégie marques certifiées (Thorne, Life Extension, NOW Foods, Solgar)</p>
            {/* Optionnel: Affiliation Amazon/iHerb */}
          </div>
        </div>
      )}
    </div>
  );
};
```

**SupplementTimingChart Component**:
```jsx
const SupplementTimingChart = ({ supplements }) => {
  const timeline = [
    { time: 'Matin (à jeun)', icon: '🌅', supplements: [] },
    { time: 'Matin (avec repas)', icon: '☀️', supplements: [] },
    { time: 'Midi', icon: '🌞', supplements: [] },
    { time: 'Après-midi', icon: '🌤️', supplements: [] },
    { time: 'Soir (dîner)', icon: '🌆', supplements: [] },
    { time: 'Avant coucher', icon: '🌙', supplements: [] }
  ];

  // Group supplements by timing
  supplements.forEach(supp => {
    const slot = timeline.find(t => supp.timing.includes(t.time));
    if (slot) slot.supplements.push(supp.name);
  });

  return (
    <div className="timing-chart">
      {timeline.map((slot, i) => (
        <div className="time-slot" key={i}>
          <div className="time-header">
            <span className="time-icon">{slot.icon}</span>
            <h4>{slot.time}</h4>
          </div>
          <div className="supplements-list">
            {slot.supplements.length > 0 ? (
              <ul>
                {slot.supplements.map((name, j) => (
                  <li key={j}>{name}</li>
                ))}
              </ul>
            ) : (
              <span className="empty">-</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

### PAGE 12: RECOMMANDATIONS - NUTRITION (/recommendations/nutrition)

**Structure**:
```jsx
<div className="recommendations-page nutrition-page">
  <h1>Optimisations Nutrition</h1>

  {analysis.recommendations.nutrition.map((rec, i) => (
    <NutritionRecommendationCard key={i} recommendation={rec} />
  ))}

  {/* Meal Plan Example (optionnel) */}
  <section className="meal-plan-example">
    <h2>Exemple de Journée Type</h2>
    <MealPlanTimeline />
  </section>
</div>
```

**NutritionRecommendationCard**:
```jsx
const NutritionRecommendationCard = ({ recommendation }) => (
  <div className="nutrition-card">
    <div className="category-badge">{recommendation.category}</div>

    <h3>{recommendation.recommendation}</h3>

    <div className="why-section">
      <strong>Pourquoi:</strong>
      <p>{recommendation.why}</p>
    </div>

    <div className="how-section">
      <strong>Comment:</strong>
      <p>{recommendation.how}</p>
    </div>

    <div className="impact-section">
      <strong>Impact:</strong>
      <p>{recommendation.impact}</p>
    </div>
  </div>
);
```

---

### PAGE 13: PLAN D'ACTION 30 JOURS (/action-plan)

**Structure**:
```jsx
<div className="action-plan-page">
  <h1>Ton Plan d'Action 30 Jours</h1>

  <div className="plan-intro">
    <p>Voici un protocole étape par étape pour optimiser tes résultats. Chaque action est basée sur tes biomarqueurs.</p>
  </div>

  <Timeline>
    {analysis.action_plan_30_days.map((item, i) => (
      <TimelineItem key={i} item={item} />
    ))}
  </Timeline>

  {/* Checklist Interactive */}
  <section className="interactive-checklist">
    <h2>Ma Checklist</h2>
    <ActionChecklist plan={analysis.action_plan_30_days} />
  </section>
</div>
```

**ActionChecklist Component**:
```jsx
const ActionChecklist = ({ plan }) => {
  const [completed, setCompleted] = useState([]);

  const toggleAction = (id) => {
    setCompleted(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="checklist">
      {plan.map((item, i) => (
        <div className="checklist-item" key={i}>
          <input
            type="checkbox"
            checked={completed.includes(i)}
            onChange={() => toggleAction(i)}
          />
          <div className="item-content">
            <strong>Jour {item.day || `Semaine ${item.week}`}</strong>
            <ul>
              {item.actions.map((action, j) => (
                <li key={j}>{action}</li>
              ))}
            </ul>
            <small className="why-text">{item.why}</small>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

### PAGE 14: INTERCONNEXIONS (/interconnections)

**Structure**:
```jsx
<div className="interconnections-page">
  <h1>Interconnexions Biomarqueurs</h1>

  <div className="intro">
    <p>Tes biomarqueurs ne fonctionnent pas isolément. Voici comment ils s'influencent mutuellement.</p>
  </div>

  {/* Network Graph (optionnel mais badass) */}
  <section className="network-graph-section">
    <BiomarkerNetworkGraph interconnections={analysis.interconnections} />
  </section>

  {/* Interconnections List */}
  <div className="interconnections-list">
    {analysis.interconnections.map((inter, i) => (
      <InterconnectionCard key={i} interconnection={inter} />
    ))}
  </div>
</div>
```

**InterconnectionCard Component**:
```jsx
const InterconnectionCard = ({ interconnection }) => (
  <div className="interconnection-card">
    <div className="biomarkers-involved">
      {interconnection.biomarkers.map((b, i) => (
        <React.Fragment key={i}>
          <span className="biomarker-tag">{biomarkerLabels[b]}</span>
          {i < interconnection.biomarkers.length - 1 && (
            <Icon name="arrow-right" size={16} color="purple" />
          )}
        </React.Fragment>
      ))}
    </div>

    <div className="relationship-section">
      <h4>Relation</h4>
      <p>{interconnection.relationship}</p>
    </div>

    <div className="impact-section">
      <h4>Impact</h4>
      <p>{interconnection.impact}</p>
    </div>

    <div className="action-section">
      <h4>Action</h4>
      <div className="action-cta">
        <Icon name="target" color="cyan" />
        <p>{interconnection.action}</p>
      </div>
    </div>
  </div>
);
```

---

## 📋 PHASE 7: EXPORT PDF

**Bouton Export** (présent sur toutes les pages):
```jsx
<button onClick={handleExportPDF} className="btn-primary">
  <Icon name="download" />
  Télécharger PDF Premium
</button>
```

**Endpoint Backend**:
```typescript
app.get('/api/blood-analysis/:reportId/export-pdf', async (req, res) => {
  const { reportId } = req.params;

  const report = await db.query.bloodAnalysisReports.findFirst({
    where: eq(bloodAnalysisReports.id, reportId)
  });

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  // Si déjà généré, servir depuis cache
  if (report.pdfUrl) {
    return res.redirect(report.pdfUrl);
  }

  // Sinon, générer
  const pdf = await generateBloodAnalysisPDF(report);

  // Upload to storage (S3, Cloudflare R2, etc.)
  const pdfUrl = await uploadToStorage(pdf, `blood-reports/${reportId}.pdf`);

  // Update DB
  await db.update(bloodAnalysisReports)
    .set({ pdfUrl })
    .where(eq(bloodAnalysisReports.id, reportId));

  res.redirect(pdfUrl);
});
```

---

## 📋 PHASE 8: SUIVI & COMPARAISON (Futures Analyses)

**Fonctionnalité**: Quand l'utilisateur refait une prise de sang dans 3-6 mois

**Comparaison**:
```jsx
const ComparisonView = ({ currentReport, previousReport }) => {
  const improvements = calculateImprovements(currentReport, previousReport);

  return (
    <div className="comparison-view">
      <h2>Évolution Depuis {previousReport.testDate}</h2>

      {/* Global Score Evolution */}
      <div className="score-evolution">
        <div className="score-before">
          <span>Avant</span>
          <div className="score">{previousReport.analysis.global_health_score}</div>
        </div>
        <Icon name="arrow-right" size={32} />
        <div className="score-after">
          <span>Maintenant</span>
          <div className="score">{currentReport.analysis.global_health_score}</div>
        </div>
        <div className={`score-delta ${improvements.global > 0 ? 'positive' : 'negative'}`}>
          {improvements.global > 0 ? '+' : ''}{improvements.global}
        </div>
      </div>

      {/* Biomarkers Comparison Table */}
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Biomarqueur</th>
            <th>Avant</th>
            <th>Maintenant</th>
            <th>Évolution</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(currentReport.extractedBiomarkers).map(key => {
            const before = previousReport.extractedBiomarkers[key];
            const after = currentReport.extractedBiomarkers[key];
            const delta = after.value - before.value;
            const deltaPercent = ((delta / before.value) * 100).toFixed(1);

            return (
              <tr key={key}>
                <td>{biomarkerLabels[key]}</td>
                <td>{before.value} {before.unit}</td>
                <td>{after.value} {after.unit}</td>
                <td className={delta > 0 ? 'positive' : 'negative'}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)} ({deltaPercent}%)
                  <Icon name={delta > 0 ? 'trending-up' : 'trending-down'} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Recommendations Adjusted */}
      <section>
        <h3>Recommandations Ajustées</h3>
        <p>Basé sur tes progrès, voici ce qu'on ajuste:</p>
        {/* ... */}
      </section>
    </div>
  );
};
```

---

## 📋 PHASE 9: ADMIN PANEL

**Route**: `/admin/blood-analysis`

**Features**:
- Liste tous les rapports
- Statuts (pending, processing, completed, failed)
- Retry failed processing
- Preview rapports
- Stats (nombre analyses, taux succès OCR, temps moyen traitement)

**Table**:
```jsx
<table>
  <thead>
    <tr>
      <th>ID</th>
      <th>User</th>
      <th>Test Date</th>
      <th>Status</th>
      <th>Global Score</th>
      <th>Created</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {reports.map(report => (
      <tr key={report.id}>
        <td>#{report.id}</td>
        <td>{report.user.name}</td>
        <td>{report.testDate}</td>
        <td>
          <StatusBadge status={report.processingStatus} />
        </td>
        <td>{report.analysis?.global_health_score || '-'}</td>
        <td>{report.createdAt}</td>
        <td>
          <button onClick={() => viewReport(report.id)}>View</button>
          {report.processingStatus === 'failed' && (
            <button onClick={() => retryProcessing(report.id)}>Retry</button>
          )}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 📋 PHASE 10: COMPLIANCE & DISCLAIMERS

### Disclaimer Légal (à afficher partout)

**Footer de chaque page dashboard**:
```jsx
<div className="legal-disclaimer">
  <Icon name="info-circle" />
  <p>
    <strong>Disclaimer:</strong> Ce rapport est fourni à titre éducatif et informatif uniquement.
    Il ne remplace pas un avis médical professionnel, un diagnostic ou un traitement.
    Consulte toujours un médecin qualifié pour toute question concernant ta santé.
  </p>
</div>
```

**Page Landing Pré-Achat**:
```markdown
### ⚠️ Important

Blood Analysis by ApexLabs est un outil d'optimisation et d'éducation.

**Ce n'est PAS**:
- Un diagnostic médical
- Une prescription
- Un remplacement de consultation médicale

**Utilise-le pour**:
- Comprendre tes biomarqueurs
- Optimiser ta santé et performance
- Avoir des conversations informées avec ton médecin
- Prendre des décisions lifestyle éclairées

Toujours consulter un professionnel de santé avant de modifier suppléments, médicaments ou protocoles.
```

### Données Sensibles (RGPD)

**Politique de confidentialité**:
- Les analyses sont stockées de manière sécurisée (chiffrement)
- Aucune donnée vendue à des tiers
- Possibilité de supprimer ses données
- Conformité RGPD

**Bouton Suppression**:
```jsx
<button onClick={deleteMyData} className="btn-danger">
  Supprimer Toutes Mes Données
</button>
```

---

## 🎯 RÉCAPITULATIF FEATURES CLÉS

### Dashboard Biohacking Futuriste ✅
- Glassmorphism cards
- Particules animées background
- Scan lines overlay
- Couleurs néon (cyan, orange, purple, green, red)
- Typographie: Space Grotesk + Inter + JetBrains Mono

### Icon Tooltip à Côté de Chaque Marqueur ✅
- Info icon cliquable/hoverable
- Tooltip affiche: Rôle, Range optimal, Actions rapides

### Page Principale par Section ✅
- 9 pages système (hormones, métabolisme, thyroïde, etc.)
- Analyse détaillée
- Conséquences court/moyen/long terme si hors norme
- Facteurs contributifs

### Pages Recommandations ✅
- Page Suppléments (dosages, timing, synergies, warnings)
- Page Nutrition (macros, aliments spécifiques)
- Page Lifestyle (sommeil, stress, entraînement)
- Page Suivi Médical (si nécessaire)

### Guide Pré-Analyse ✅
- Quoi demander au médecin (39 biomarqueurs listés)
- Template email copier-coller
- Protocole préparation (J-7, J-1, Jour J)
- Checklist pré-lab

### Interconnexions ✅
- Détection relations entre biomarqueurs
- Explications impact
- Actions recommandées

### Plan d'Action 30 Jours ✅
- Timeline jour par jour
- Checklist interactive

### Export PDF Premium ✅
- Design professionnel
- Toutes les sections incluses

---

## 💰 PRICING & POSITIONING

**Prix Lancement**: 99€
**Valeur Perçue**: 500€

**Justification Prix**:
- Claude Opus 4.5 (coût API ~3-5€ par analyse)
- OCR processing
- Infrastructure storage
- Dashboard ultra-personnalisé
- 39 biomarqueurs analysés
- Expertise médicale IA

**Upsells Potentiels** (futur):
- Suivi trimestriel (abonnement 29€/mois)
- Consultation 1-on-1 avec coach santé (149€)
- Accès communauté privée biohackers (19€/mois)

---

## 📊 MÉTRIQUES DE SUCCÈS

**KPIs à Tracker**:
1. Taux conversion landing → achat
2. Temps moyen traitement (objectif: <48h)
3. Taux succès OCR (objectif: >95%)
4. Score satisfaction utilisateur (NPS)
5. Taux re-test après 3 mois (fidélisation)
6. Taux export PDF
7. Pages les plus consultées dashboard

---

## 🚀 ROADMAP FUTURE

**V2 Features**:
- Intégration wearables (Oura, Whoop, Apple Watch)
- IA conversationnelle (chat avec ton rapport)
- Comparaison population (anonymisée)
- Protocoles pré-définis (ex: "Protocole Testostérone Boost")
- Marketplace suppléments (affiliation)
- Intégration calendrier (rappels prises suppléments)

---

**FIN DU WORKFLOW BLOOD ANALYSIS**

**Score Exhaustivité**: 500€ value ✅
**Design**: Biohacking futuriste ✅
**Features**: Tout ce qui a été demandé ✅

Prêt pour implémentation. 🚀
