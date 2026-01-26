# UX RESEARCH NOTES - BLOOD ANALYSIS DASHBOARD

**Date:** 2026-01-25
**Objectif:** UI/UX de niveau Ultrahuman/Oura pour le Blood Analysis

---

## 🎯 RÉFÉRENCES ANALYSÉES

### 1. ULTRAHUMAN BLOOD VISION ($499/an)
**URL:** ultrahuman.com/blood-vision

**Points forts UX:**
- 100+ biomarqueurs organisés par catégorie
- "Blood Age" - concept mémorable et engageant
- Clinician Summary + Supplement Report
- 2 tests/an pour tracker l'évolution
- Plans clairs: Essential ($99/6 mois) vs Annual ($499)
- Process en 3 étapes visuelles (Schedule → Analyze → Follow-up)
- Dashboard unique pour 100+ biomarqueurs
- Intégration avec Ring AIR (corrélation sleep/HR/HRV avec blood markers)

**Catégories de biomarqueurs:**
- Metabolic Health (Glucose, Insulin, HbA1c)
- Cardiovascular Health (Lipids, ApoB, Lp(a))
- Blood Health
- Immune Regulation
- Thyroid Health
- Kidney Health
- Liver Health
- Nutrients
- Inflammation
- Hormone Health
- Iron Status
- Omega Fatty Acids
- Heavy Metals

**Design:**
- Dark mode élégant
- Cards par catégorie
- Scores visuels
- Graphiques d'évolution

### 2. OURA
**Points forts:**
- "Your body, decoded"
- 20+ biometrics
- Scores quotidiens (Sleep, Readiness, Activity)
- Design minimaliste, premium
- Insights personnalisés

### 3. WHOOP
**Points forts:**
- Recovery Score quotidien
- Strain tracking
- Sleep performance
- "Healthspan" concept
- Coaching personnalisé
- Screen-free (pas de distraction)

---

## 🏗️ ARCHITECTURE IDÉALE POUR BLOOD ANALYSIS

### Dashboard Client (après upload PDF)

**Section 1: Overview**
- Score Global (0-100) - grand, central
- "Blood Age" vs Age Chronologique
- Date du test + labo
- Nombre de biomarqueurs analysés

**Section 2: Catégories de Biomarqueurs**
Cards par système:
1. 🫀 Cardiovasculaire (Lipides, ApoB, Lp(a))
2. 🍬 Métabolisme (Glucose, HbA1c, Insuline)
3. 🦴 Minéraux & Vitamines (Fer, D, B12, Mg)
4. ⚡ Thyroïde (TSH, T3, T4)
5. 💪 Hormones (Testo, Cortisol, DHEA)
6. 🔥 Inflammation (CRP, Homocystéine)
7. 🫘 Foie (ASAT, ALAT, GGT)
8. 🫧 Reins (Créatinine, eGFR, Uree)
9. 🩸 Formule Sanguine (Hb, Plaquettes, GB)

**Section 3: Biomarqueurs Détaillés**
Pour chaque marqueur:
- Valeur + unité
- Range normal (min-max)
- Status visuel (🟢 Optimal / 🟡 Attention / 🔴 Critique)
- Évolution vs dernier test
- Explication du marqueur (1-2 lignes)
- "Deep Dive" expandable avec:
  - Pourquoi c'est important
  - Ce qui influence ce marqueur
  - Actions pour optimiser

**Section 4: Synthèse IA**
- Points forts identifiés
- Points d'attention prioritaires
- Corrélations détectées
- Recommandations personnalisées

**Section 5: Plan d'Action**
- Protocoles prioritaires
- Stack suppléments suggéré
- Lifestyle adjustments
- Prochain test recommandé

---

## 🎨 DESIGN TOKENS

### Couleurs (Ultrahuman-inspired)
```css
--bg-primary: #0a0a0a
--bg-card: #141414
--bg-card-hover: #1a1a1a
--accent-green: #0ff172  /* Optimal */
--accent-yellow: #fbbf24 /* Attention */
--accent-red: #ef4444    /* Critique */
--text-primary: #ffffff
--text-secondary: #9ca3af
--border: #262626
```

### Typography
- Headers: Inter/SF Pro Bold
- Body: Inter/SF Pro Regular
- Numbers: Tabular figures (monospace)

### Animations
- Subtle fade-ins
- Smooth transitions (200ms ease)
- Progress bars animés
- Charts interactifs

---

## 📚 BASE DE CONNAISSANCES DISPONIBLE

Sources pour enrichir les rapports:
- **Huberman Lab** (21 MB) - protocoles sommeil, hormones, nutrition
- **Peter Attia** (2 MB) - longevity, bloodwork deep dives
- **MPMD** (3.4 MB) - hormones, PEDs, bloodwork
- **Chris Masterjohn** (1 MB) - vitamines, nutriments
- **Examine** (533 KB) - supplements evidence-based
- **Stronger By Science** (415 KB) - training science
- **Renaissance Periodization** (259 KB) - hypertrophy

**Utilisation:**
- Chaque biomarqueur peut avoir une section "Science Behind" tirée de ces sources
- Citations de Huberman/Attia pour crédibilité
- Protocoles basés sur la littérature

---

## ✅ TODO QUAND JE PRENDS LE RELAIS

1. [ ] Review le code actuel du BloodClientDashboard.tsx
2. [ ] Identifier les gaps UX vs Ultrahuman
3. [ ] Refactorer le layout (cards par catégorie)
4. [ ] Implémenter le "Blood Age" concept
5. [ ] Améliorer les visualisations (charts, gauges)
6. [ ] Enrichir les explications avec la knowledge base
7. [ ] Tester le flow complet (upload → dashboard → rapport)
8. [ ] Push + deploy
9. [ ] Itérer

---

## 🔄 WORKFLOW ATTENDU

```
1. Client upload PDF labo
2. OCR + extraction biomarqueurs
3. Génération rapport IA (Claude)
4. Affichage dashboard interactif
5. Export PDF premium (optionnel)
```

