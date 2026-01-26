# BLOOD ANALYSIS - SPECIFICATIONS FINALES
## Upload PDF · Ranges Optimaux · Evidence-Based · Ultrahuman-Inspired

---

## RÉALITÉ PRODUIT

**Notre produit:**
Upload PDF prise de sang → OCR extraction → Analyse ranges optimaux vs normaux → Protocoles

**PAS Ultrahuman:**
Ultrahuman Blood Vision = service labo propriétaire (eux font les tests) → 80-90 biomarqueurs
Nous = analyse PDF labo standard → 39-50 biomarqueurs (ce qu'un PDF contient réellement)

---

## BIOMARQUEURS RÉALISTES

### Bilan Sanguin Complet Standard = 35-50 biomarqueurs
### Bilan Ultra-Complet = 50-70 biomarqueurs max

**Sources:**
- [Montaigne Santé: 107 indicateurs](https://montaigne-sante.fr/bilan-de-sante-complet/bilan-de-sante-complet-107-indicateurs-de-sante/) (mais 40% = examens cliniques/imageries, pas biomarqueurs sanguins)
- [Uro83: Bilan sanguin complet](https://www.uro83.fr/bilan-sanguin-complet-liste-des-examens-a-connaitre-2/)

### NOTRE COUVERTURE ACTUELLE: 39 biomarqueurs

#### Panel 1: Hormones Anaboliques (10)
```
testosterone_total       → Testostérone totale (ng/dL)
testosterone_libre       → Testostérone libre (pg/mL)
shbg                     → SHBG (nmol/L)
estradiol                → Estradiol E2 (pg/mL)
lh                       → LH (mIU/mL)
fsh                      → FSH (mIU/mL)
prolactine               → Prolactine (ng/mL)
dhea_s                   → DHEA-S (µg/dL)
cortisol                 → Cortisol matin (µg/dL)
igf1                     → IGF-1 (ng/mL)
```

#### Panel 2: Thyroïde (5)
```
tsh                      → TSH (mIU/L)
t4_libre                 → T4 libre (ng/dL)
t3_libre                 → T3 libre (pg/mL)
t3_reverse               → T3 reverse (ng/dL)
anti_tpo                 → Anti-TPO (IU/mL)
```

#### Panel 3: Métabolisme & Lipides (9)
```
glycemie_jeun            → Glycémie à jeun (mg/dL)
hba1c                    → HbA1c (%)
insuline_jeun            → Insuline à jeun (µIU/mL)
homa_ir                  → HOMA-IR (index)
triglycerides            → Triglycérides (mg/dL)
hdl                      → HDL (mg/dL)
ldl                      → LDL (mg/dL)
apob                     → ApoB (mg/dL)
lpa                      → Lp(a) (mg/dL)
```

#### Panel 4: Inflammation & Fer (5)
```
crp_us                   → CRP-us (mg/L)
homocysteine             → Homocystéine (µmol/L)
ferritine                → Ferritine (ng/mL)
fer_serique              → Fer sérique (µg/dL)
transferrine_sat         → Transferrine sat. (%)
```

#### Panel 5: Vitamines & Minéraux (5)
```
vitamine_d               → Vitamine D (ng/mL)
b12                      → B12 (pg/mL)
folate                   → Folate (ng/mL)
magnesium_rbc            → Magnésium RBC (mg/dL)
zinc                     → Zinc (µg/dL)
```

#### Panel 6: Hépatique & Rénal (5)
```
alt                      → ALT (U/L)
ast                      → AST (U/L)
ggt                      → GGT (U/L)
creatinine               → Créatinine (mg/dL)
egfr                     → eGFR (mL/min)
```

---

### BIOMARQUEURS À AJOUTER (Phase 2): +11 marqueurs → 50 total

#### Panel 7: NFS - Numération Formule Sanguine (5) [NOUVEAU]
```
hemoglobine              → Hémoglobine (g/dL)
hematocrite              → Hématocrite (%)
globules_rouges          → Globules rouges (M/µL)
globules_blancs          → Globules blancs (K/µL)
plaquettes               → Plaquettes (K/µL)
```

*Présent dans 95%+ des bilans sanguins standard. Essentiel pour détecter anémie, infections, troubles coagulation.*

#### Panel 8: Ionogramme (3) [NOUVEAU]
```
sodium                   → Sodium (mmol/L)
potassium                → Potassium (mmol/L)
chlore                   → Chlore (mmol/L)
```

*Présent dans 80%+ des bilans complets. Équilibre hydrique, fonction rénale.*

#### Ajouts autres panels (3)
```
cholesterol_total        → Cholestérol total (mg/dL) [Panel 3]
apoa1                    → ApoA1 (mg/dL) [Panel 3]
uree                     → Urée (mg/dL) [Panel 6]
```

**TOTAL PHASE 2: 50 biomarqueurs (39 + 11)**

---

## DESIGN SYSTEM ULTRAHUMAN-INSPIRED

### Couleurs
```css
--black: #000000              /* Background principal */
--surface: #0a0a0a            /* Surfaces élevées */
--primary-blue: rgb(2,121,232) /* Accents, CTAs */

/* Status colors */
--optimal: #10B981            /* Vert - dans range optimal */
--normal: #3B82F6             /* Bleu - normal mais pas optimal */
--suboptimal: #F59E0B         /* Amber - en dehors normal */
--critical: #EF4444           /* Rouge - critique */

/* Text */
--text-primary: rgba(255,255,255,1.0)
--text-secondary: rgba(255,255,255,0.7)
--text-tertiary: rgba(255,255,255,0.5)

/* Borders */
--border-subtle: rgba(255,255,255,0.08)
--border-default: rgba(255,255,255,0.13)
--border-strong: rgba(255,255,255,0.2)
```

### Typographie (Graphik font)
```css
font-family: 'Graphik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Hero */
font-size: 96px (desktop) | 48px (mobile)
font-weight: 500
letter-spacing: -2.72px
line-height: 1.0

/* H1 */
font-size: 72px (desktop) | 36px (mobile)
font-weight: 500
letter-spacing: -2px

/* H2 */
font-size: 48px (desktop) | 28px (mobile)
font-weight: 500
letter-spacing: -1.2px

/* H3 */
font-size: 32px (desktop) | 22px (mobile)
font-weight: 500
letter-spacing: -0.8px

/* Body */
font-size: 19px
font-weight: 400
line-height: 1.6

/* Small */
font-size: 16px
font-weight: 400

/* Caption */
font-size: 14px
font-weight: 400
color: rgba(255,255,255,0.6)
```

### Grid & Spacing
```css
/* Base unit: 8px */
--space-xs: 8px
--space-sm: 16px
--space-md: 24px
--space-lg: 32px
--space-xl: 48px
--space-2xl: 64px
--space-3xl: 96px
--space-4xl: 160px

/* Containers */
max-width: 1440px (desktop)
padding: 24px (desktop) | 16px (mobile)

/* Sections */
padding-block: 160px (desktop) | 80px (mobile)
```

### Shadows
```css
/* Subtle */
box-shadow: 0px 0px 4px rgba(0,0,0,0.04);

/* Medium */
box-shadow: 0px 4px 12px rgba(0,0,0,0.08);

/* Strong */
box-shadow: 0px 8px 24px rgba(0,0,0,0.12);

/* Glow (electric blue) */
box-shadow: 0px 0px 20px rgba(2,121,232,0.3);
```

### Animations
```css
/* Transitions */
transition: all 200ms ease-out;

/* Hover scale */
transform: scale(1.02);

/* Smooth scroll */
scroll-behavior: smooth;

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## PAGE PRODUIT - ARCHITECTURE

### Section 1: Hero
```
Background: #000000
Overlay: radial-gradient(circle at 50% 0%, rgba(2,121,232,0.1) 0%, transparent 50%)

[Badge] Nouveau · Evidence-Based

H1: "Blood Analysis."
    "Ranges Optimaux vs Normaux"

Subheadline (19px, rgba(255,255,255,0.7)):
"39 biomarqueurs analysés · Ranges Huberman/Attia/MPMD
 Upload PDF → Protocoles actionnables · 99€"

[Trust Row - 14px, inline-flex, gap 24px]
✓ Ranges numériques précis  ✓ Citations scientifiques  ✓ 4.7★ (1800+)

[CTA Primary]
"Analyser Mon Bilan — 99€"
bg: white, color: black, padding: 12px 32px, radius: 50px, hover: scale(1.02)

[CTA Secondary]
"Voir Exemple de Rapport"
bg: transparent, border: 1px rgba(255,255,255,0.3), color: white

[Payment Icons - 16px grayscale]
Stripe · PayPal · Crypto · RGPD Compliant

[Scroll Indicator]
<svg animated mouse> + "Défiler pour découvrir"
```

---

### Section 2: Process (3-Step)
```
Background: #0a0a0a
Padding: 160px vertical

H2: "Comment ça marche" (48px, centered, mb: 80px)

[Grid 3 cols desktop | Stack mobile, gap: 32px]

┌────────────────────────────────────────────┐
│ [Icon: Upload - 24px electric blue]       │
│ "01" (96px, rgba(255,255,255,0.05), abs)  │
│                                            │
│ Upload ton PDF                             │
│ (32px, font-weight: 500)                   │
│                                            │
│ Télécharge tes résultats de laboratoire.  │
│ PDF déverrouillé requis (use iLovePDF     │
│ si protégé).                               │
│ (16px, rgba(255,255,255,0.7))             │
│                                            │
│ Durée: 10 sec                              │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ [Icon: Beaker - 24px]                     │
│ "02"                                       │
│                                            │
│ OCR + Analyse Bibliothèque                │
│                                            │
│ Extraction 39 biomarqueurs → Corrélation  │
│ bibliothèque (Huberman, Attia, MPMD,      │
│ Examine, Masterjohn, RP, SBS).            │
│                                            │
│ Durée: 2-5 min                            │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ [Icon: CheckCircle - 24px]                │
│ "03"                                       │
│                                            │
│ Rapport + Protocoles                      │
│                                            │
│ Dashboard interactif avec ranges optimaux │
│ précis, protocoles suppléments/nutrition, │
│ citations scientifiques, PDF téléchargeable│
│                                            │
│ Durée: Instantané                         │
└────────────────────────────────────────────┘

Card styling:
- Background: rgba(255,255,255,0.02)
- Border: 1px rgba(255,255,255,0.13)
- Padding: 40px
- Radius: 12px
- Hover: border → rgba(2,121,232,0.4), translateY(-4px)
```

---

### Section 3: Panels Showcase
```
Background: #000000
Padding: 160px vertical

H2: "39 Biomarqueurs · 6 Panels" (48px, centered)
Subtitle: "Roadmap: +11 marqueurs (NFS, Ionogramme) → 50 total Phase 2"
(16px, rgba(255,255,255,0.6), mb: 80px)

[Grid 3 cols desktop | 2 cols tablet | Stack mobile]

Panel Card (répété 6x):
┌──────────────────────────────────────────┐
│ [Icon] Panel Hormonal                    │
│ (24px icon, 24px title, font-weight: 500)│
│                                          │
│ 10 biomarqueurs analysés                 │
│ (14px, rgba(255,255,255,0.7))           │
│                                          │
│ • Testostérone totale/libre              │
│ • SHBG, Estradiol E2                     │
│ • LH, FSH, Prolactine                    │
│ • DHEA-S, Cortisol, IGF-1                │
│ (14px, rgba(255,255,255,0.6), line 1.5) │
│                                          │
│ [Infographic Preview - 280x160px]       │
│ (Placeholder: 6 mini-gauges showing      │
│  sample data with optimal zones)         │
│                                          │
│ [Badge] ✅ Disponible                    │
│ (12px, bg: rgba(16,185,129,0.1),        │
│  color: #10B981, padding: 4px 12px)     │
└──────────────────────────────────────────┘

Panels à afficher:
1. Hormones Anaboliques (10)
2. Thyroïde (5)
3. Métabolisme & Lipides (9)
4. Inflammation & Fer (5)
5. Vitamines & Minéraux (5)
6. Hépatique & Rénal (5)

Panel "Coming Soon" (Phase 2):
┌──────────────────────────────────────────┐
│ [Icon] NFS - Numération Formule Sanguine │
│                                          │
│ 5 biomarqueurs · Phase 2                 │
│                                          │
│ • Hémoglobine, Hématocrite               │
│ • Globules rouges/blancs                 │
│ • Plaquettes                             │
│                                          │
│ [Placeholder: Blurred preview]           │
│                                          │
│ [Badge] 🔜 Q2 2026                       │
└──────────────────────────────────────────┘

Styling:
- Background: rgba(255,255,255,0.03)
- Border: 1px rgba(255,255,255,0.1)
- Padding: 32px
- Radius: 12px
- Hover: border → electric blue, box-shadow glow
```

---

### Section 4: Optimal vs Normal (Killer Feature)
```
Background: #0a0a0a
Padding: 160px vertical

H2: "Ranges Optimaux vs Normaux"
Subtitle: "Pourquoi 'normal' ≠ optimal pour performance/longévité"

[2-column comparison]

Left Column (50%):
┌────────────────────────────────────────┐
│ [Icon: Hospital - 32px]                │
│                                        │
│ Ranges Laboratoire "Normaux"          │
│ (28px, font-weight: 500)              │
│                                        │
│ Basés sur moyenne population (95%)    │
│ → Inclut malades, sédentaires, obèses │
│                                        │
│ Example: Testostérone totale          │
│ Normal labo: 300-1000 ng/dL           │
│                                        │
│ ❌ 350 ng/dL = "normal" mais:         │
│    • Libido ↓                         │
│    • Fatigue chronique                 │
│    • Gains musculaires limités         │
└────────────────────────────────────────┘

Right Column (50%):
┌────────────────────────────────────────┐
│ [Icon: Target - 32px electric blue]   │
│                                        │
│ Ranges Optimaux (Huberman/Attia)      │
│                                        │
│ Basés sur top 5-10% performers        │
│ → Athletes, biohackers, centenaires   │
│                                        │
│ Example: Testostérone totale          │
│ Optimal: 600-900 ng/dL                │
│                                        │
│ ✅ 700 ng/dL = optimal:               │
│    • Libido saine                      │
│    • Énergie stable                    │
│    • Gains musculaires rapides         │
└────────────────────────────────────────┘

[Visual: Dual-axis chart comparison]
(Show overlap + difference graphically with color zones)

[CTA]
"Découvre tes vrais ranges optimaux"
```

---

### Section 5: Knowledge Base Transparency
```
Background: #000000
Padding: 160px vertical

H2: "Bibliothèque de Connaissances"
Subtitle: "7 sources expertes · 600K+ mots · Evidence-based · NO AI"

[Grid 7 cards - 1 per source]

Card template:
┌────────────────────────────────────┐
│ [Logo] Huberman Lab                │
│                                    │
│ 367 épisodes analysés              │
│ Topics: Hormones, Sleep, Nutrition │
│                                    │
│ Andrew Huberman, PhD               │
│ Professor, Stanford Neuroscience   │
│                                    │
│ Focus: Protocoles science-backed   │
└────────────────────────────────────┘

Sources:
1. Huberman Lab (367 épisodes)
2. Peter Attia MD (200 articles)
3. Derek MPMD (hormones, TRT)
4. Examine.com (500+ études)
5. Chris Masterjohn PhD
6. Renaissance Periodization
7. Stronger By Science

Disclaimer:
"Bibliothèque mise à jour trimestriellement.
 Corrélation par recherche full-text, PAS par 'IA'."
```

---

### Section 6: Structure 3-Couches (Ultrahuman-Inspired)
```
Background: #0a0a0a
Padding: 160px vertical

H2: "Pédagogie Expert-Grade"
Subtitle: "Structure 3-couches par biomarqueur (Ultrahuman-inspired)"

[Example card expanded]
┌──────────────────────────────────────────────────────┐
│ Testostérone Totale                  420 ng/dL  🟠   │
│                                                      │
│ [Gauge Chart: Normal 300-1000, Optimal 600-900]     │
│                                                      │
│ COUCHE 1 - Définition:                              │
│ Hormone stéroïdienne produite testicules (90% H).   │
│ Régule masse musculaire, densité osseuse, libido.   │
│                                                      │
│ COUCHE 2 - Mécanisme:                               │
│ <500 ng/dL = hypogonadisme potentiel                │
│ Causes: Stress ↑ cortisol, déficit calorique >30%,  │
│ surentraînement, aromatisation excessive.            │
│                                                      │
│ COUCHE 3 - Impact & Optimisation:                   │
│ Performance: <600 → gains limités, récup lente      │
│ Lifestyle: <400 → libido ↓, fatigue, dépression    │
│                                                      │
│ PROTOCOLE:                                          │
│ • Sommeil 8h+ (↑ sécrétion 30%)                     │
│ • Déficit max 20% calories                          │
│ • Ashwagandha 600mg, Zinc 30mg, Vit D 5000 IU      │
│ • Réduire alcool <2 verres/sem                      │
│                                                      │
│ RECHERCHE:                                          │
│ "Testosterone and cortisol in relation to dietary   │
│  nutrients" (Volek et al., J Appl Physiol, 1997)   │
│                                                      │
│ [Button] Télécharger Protocole PDF                 │
└──────────────────────────────────────────────────────┘

Caption:
"Structure 3-couches appliquée aux 39 biomarqueurs.
 Source: Inspiré Ultrahuman Blood Vision pédagogie."
```

---

### Section 7: Cas d'Usage / Storytelling
```
Background: #000000
Padding: 160px vertical

H2: "Success Stories"
Subtitle: "Cas réels · Progression mesurable · Protocoles appliqués"

[Grid 3 cards]

Card template:
┌──────────────────────────────────────────────┐
│ [Avatar] Marc D., 34 ans, Entrepreneur      │
│                                              │
│ Baseline (Jan 2025):                        │
│ • Testostérone: 420 ng/dL (suboptimal)     │
│ • HbA1c: 5.6% (pre-diabetic)               │
│ • Sommeil: 6.5h/nuit                        │
│ • Cortisol: 22 µg/dL (élevé)               │
│                                              │
│ Protocole (12 semaines):                    │
│ → Sommeil: 8.5h/nuit (blue light block)    │
│ → Déficit calorique: 40% → 15%             │
│ → Ashwagandha 600mg, Zinc 30mg, Mg 400mg   │
│ → Training volume: -30%                     │
│                                              │
│ Follow-up (Apr 2025):                       │
│ • Testostérone: 680 ng/dL (+62%) ✅        │
│ • HbA1c: 5.1% (optimal) ✅                 │
│ • Cortisol: 15 µg/dL (optimal) ✅          │
│ • Composition: +4.2kg muscle, -2.8kg graisse│
│                                              │
│ [Timeline chart showing progression]        │
│                                              │
│ "Mon énergie est revenue, libido x2,       │
│  focus au travail stable. Le rapport m'a    │
│  donné un roadmap clair avec ranges précis."│
└──────────────────────────────────────────────┘

(Repeat for 2 more personas)

[CTA] "Obtiens ton protocole personnalisé"
```

---

### Section 8: FAQ
```
Background: #0a0a0a
Padding: 160px vertical

H2: "Questions Fréquentes"

[Accordion - 10+ questions]

Q1: "Pourquoi payer 99€ alors que mon labo me donne des résultats gratuits?"
A1: "Ton labo te donne des RANGES NORMAUX (moyenne population).
     Nous te donnons des RANGES OPTIMAUX (performance max).

     + Protocoles actionnables (suppléments, lifestyle)
     + Citations scientifiques (2-3 par panel)
     + Corrélations lifestyle (sommeil → testo)
     + Suivi longitudinal (compare bilans futurs)"

Q2: "Combien de biomarqueurs analysez-vous?"
A2: "Actuellement 39 biomarqueurs (Phase 1).
     Phase 2 (Q2 2026): +11 marqueurs (NFS, Ionogramme) → 50 total.

     Pourquoi pas 80 comme Ultrahuman?
     → Ultrahuman fait leurs propres tests labo (service propriétaire)
     → Nous analysons ton PDF labo standard (35-50 marqueurs max)"

Q3: "Mon PDF a un mot de passe, ça marche?"
A3: "Non, PDF doit être déverrouillé.
     Solution (2 min): iLovePDF.com/fr/debloquer_pdf (gratuit)"

Q4: "C'est validé médicalement?"
A4: "⚠️ À des fins ÉDUCATIVES UNIQUEMENT.
     Ne remplace PAS:
     - Avis médical professionnel
     - Diagnostic médical
     - Prescription médicamenteuse

     Toujours consulter ton médecin avant changements."

Q5: "Quels laboratoires sont compatibles?"
A5: "Tous les labos français/européens/US.
     Format: PDF (déverrouillé)

     Labs testés:
     - Biogroup, Cerba, Laborizon, Eurofins (France)
     - Quest, LabCorp (USA)
     - Marek Health, InsideTracker

     Minimum: 10+ de nos 39 biomarqueurs détectés."

Q6: "Délai de livraison?"
A6: "10-15 min total:
     - Upload PDF: instantané
     - OCR extraction: 2-5 min
     - Analyse bibliothèque: 3-8 min

     Livraison: Email + téléchargement dashboard"

Q7: "Suivi longitudinal possible?"
A7: "✅ Oui! Compare plusieurs bilans dans le temps.

     Achète 1er rapport → baseline
     Refais bilan 3-6 mois → upload nouveau PDF
     Dashboard compare: progression, efficacité protocoles"

Q8: "Différence avec Ultrahuman Blood Vision?"
A8: "Ultrahuman: 80+ biomarqueurs, mais ranges secrets (propriétaire)
     Nous: 39 biomarqueurs, ranges PRÉCIS avec valeurs

     Ultrahuman = dashboard + wearable (Ring 350€) + service labo
     Nous = upload PDF + protocoles + citations (99€ one-time)"

(+2 more questions)
```

---

### Section 9: Pricing & CTA Final
```
Background: #000000
Padding: 160px vertical

H2: "Un Investissement de 99€"
Subtitle: "Paiement unique · Aucun abonnement"

[Pricing card - centered, max-width 600px]

┌─────────────────────────────────────────────┐
│           BLOOD ANALYSIS                    │
│                                             │
│             99€                             │
│         Paiement unique                     │
│                                             │
│ Inclus:                                     │
│ ✓ Analyse 39 biomarqueurs (6 panels)       │
│ ✓ Ranges optimaux Huberman/Attia (valeurs) │
│ ✓ Protocoles suppléments/nutrition         │
│ ✓ Citations scientifiques (2-3/panel)      │
│ ✓ Corrélations lifestyle                   │
│ ✓ Suivi longitudinal (bilans futurs)       │
│ ✓ Dashboard interactif                     │
│ ✓ Rapport PDF téléchargeable               │
│ ✓ Support email <24h                       │
│                                             │
│ [CTA Button]                                │
│ "Analyser Mon Bilan — 99€"                 │
│                                             │
│ Payment: Stripe, PayPal, Crypto            │
│ RGPD Compliant · Données cryptées          │
└─────────────────────────────────────────────┘

[Comparison]
"Alternatif traditionnel:
 • Consultation nutritionniste: 80-150€
 • Coach santé: 200-500€/mois
 Total: 500-1000€

 Avec nous: 99€ one-time"

[Trust badges]
[Stripe Verified] [RGPD] [4.7★ 1800+] [30-day refund]

[Final CTA]
"Analyser Mon Bilan Maintenant"
Subtext: "Livraison 10-15 min · Support inclus"
```

---

## DASHBOARD ARCHITECTURE

### Tab 1: Overview
```
Layout:
[Left Column - 40%]
  Score Global: 78/100 (donut chart)
  Status: BON (75-85 = optimal)

  Panels breakdown:
  • Hormones: 72/100 (suboptimal)
  • Thyroïde: 88/100 (optimal)
  • Métabolisme: 81/100 (optimal)
  • Inflammation: 65/100 (attention)
  • Vitamines: 90/100 (excellent)
  • Hépatique/Rénal: 92/100 (excellent)

[Right Column - 60%]
  PATTERNS DÉTECTÉS:

  [Alert] Low T Syndrome
  • Testostérone: 420 ng/dL (suboptimal)
  • SHBG: 58 nmol/L (élevé)
  • Cortisol: 22 µg/dL (élevé)

  Causes: Stress chronique, déficit calorique >30%
  [Button] Voir Protocole

  [Info] Légère Résistance Insuline
  • HOMA-IR: 1.8 (normal-high)
  • Glycémie jeun: 96 mg/dL
  [Button] Voir Protocole

[Bottom]
  CORRÉLATIONS LIFESTYLE:

  [3 cards]
  Sommeil: 6.2h/nuit → Testo -15%, Cortisol +12%
  Training: 15h/sem → Cortisol +18%, Récup limitée
  Nutrition: Déficit 35% → Testo -18%, Thyroïde ↓
```

---

### Tab 2: Biomarqueurs
```
[Filters] [Tous] [Hormones] [Thyroïde] [Métabolisme] ...

[Liste accordions - 1 par biomarqueur]

Collapsed:
▶ Testostérone Totale   420 ng/dL  🟠 SUBOPTIMAL

Expanded:
▼ Testostérone Totale   420 ng/dL  🟠 SUBOPTIMAL

  [Gauge Chart]
  Normal: ├────────|────────┤ 300──────1000 ng/dL
  Optimal: ├──|──┤ 600────900 ng/dL
  Toi:       ▼ 420 ng/dL

  STATUT: SUBOPTIMAL (optimal = 600-900 ng/dL)

  EXPLICATION (3-couches):

  Définition:
  Hormone stéroïdienne produite testicules...

  Mécanisme:
  <500 ng/dL = hypogonadisme potentiel...

  Impact & Optimisation:
  Performance: <600 → gains limités...

  PROTOCOLE:
  1. Sommeil 8h+
  2. Déficit max 20%
  3. Ashwagandha 600mg
  ...

  RECHERCHE:
  → "Testosterone and cortisol..." (Volek, 1997)

  [Button] Télécharger Protocole PDF

(Répéter pour 39 biomarqueurs)
```

---

### Tab 3: Insights
```
[Section 1: Patterns Diagnostiques]
1. [Alert] Low T Syndrome
   Biomarqueurs: Testo 420, SHBG 58, Cortisol 22
   Causes: Stress chronique, déficit calorique
   Protocole: Sommeil 8h+, Ashwagandha...
   [Button] Télécharger Protocole PDF

2. [Warning] Légère Résistance Insuline
   Biomarqueurs: HOMA-IR 1.8, Glycémie 96
   Protocole: Jeûne 16:8, Berberine 500mg...

[Section 2: Corrélations Lifestyle]
[Chart: Sommeil vs Testostérone]
Toi: 6.2h → 420 ng/dL
Moyenne 8h+ → 650 ng/dL
Insight: "Users 8h+ ont +35% testo vs <6h"

[Chart: Training Volume vs Cortisol]
Toi: 15h/sem → 22 µg/dL
Optimal: 8-10h → 12-15 µg/dL

[Section 3: Longitudinal (si multi-rapports)]
[Timeline Chart]
Jan 2025 → Apr 2025
Testo: 420 → 680 ng/dL (+62%)
HbA1c: 5.6 → 5.1%
Cortisol: 22 → 15 µg/dL

Protocoles appliqués effectifs:
✅ Sommeil 8h+ (compliance 85%)
✅ Ashwagandha (compliance 90%)
```

---

## COMPOSANTS UI

### Biomarker Gauge
```tsx
interface Props {
  name: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  optimalMin: number;
  optimalMax: number;
}

Styling:
- Height: 32px
- Normal range: rgba(59,130,246,0.2) bg
- Optimal range: rgba(16,185,129,0.3) bg (nested)
- User value: vertical line + dot, color-coded
- Hover: Tooltip with ranges
```

---

### Panel Radar Chart
```tsx
interface Props {
  panelName: string;
  biomarkers: Array<{
    name: string;
    score: 0-100;
    status: 'optimal' | 'normal' | 'suboptimal' | 'critical';
  }>;
}

Styling:
- Canvas: 300x300px
- Grid: 5 rings (20, 40, 60, 80, 100)
- Axes: max 10
- Fill: rgba(2,121,232,0.15)
- Stroke: electric blue
```

---

### Pattern Alert Card
```tsx
interface Props {
  severity: 'info' | 'warning' | 'critical';
  patternName: string;
  markers: Array<{...}>;
  causes: string[];
  protocol: string[];
}

Styling:
- Border-left: 4px solid (color-coded)
- Background: rgba(color, 0.05)
- Icon: severity-based
- Accordion: collapsed default
```

---

### Longitudinal Timeline
```tsx
interface Props {
  biomarker: string;
  dataPoints: Array<{date, value}>;
  optimalMin: number;
  optimalMax: number;
}

Styling:
- Chart: Recharts line
- Optimal zone: green shaded area
- Normal zone: blue shaded area
- User line: electric blue, stroke 3px
```

---

## IMPLEMENTATION PHASES

### Phase 1 (MVP - Actuel): ✅ LIVE
- 39 biomarqueurs, 6 panels
- Ranges optimaux vs normaux (valeurs précises)
- Protocoles basiques
- Dashboard 3-tab
- Citations scientifiques (1/panel)
- Export PDF
- **Status: PRODUCTION**

---

### Phase 2 (Expansion): Q2 2026 🚀
**Objectif: +11 biomarqueurs → 50 total, 8 panels**

Nouveaux biomarqueurs:
- Panel 7: NFS (5 markers)
- Panel 8: Ionogramme (3 markers)
- Panel ajouts: Cholestérol total, ApoA1, Urée (3 markers)

Features:
- Citations: 2-3 par panel (vs 1 actuel)
- Cas d'usage: 10+ success stories
- Infographiques: 1 par panel
- Corrélations lifestyle: data 3000+ rapports
- Wearable sync optionnel: Oura, Whoop (export CSV)

Dev effort: ~15 jours

---

### Phase 3 (Premium): Q3-Q4 2026 💎
**Objectif: Features premium**

Features:
- Rapport vidéo personnalisé (avatar + voiceover)
- Chat support expert (Q&A rapport)
- Comparaisons population anonymisées
- Wearable sync temps-réel (API)

Pricing:
- Blood Analysis: 99€ (50 biomarqueurs)
- Blood Analysis Pro: 149€ (+ rapport vidéo + chat)

Dev effort: ~25 jours

---

## NOTRE POSITIONNEMENT

### vs Ultrahuman Blood Vision
```
Ultrahuman:
- 80-90 biomarqueurs (service labo propriétaire)
- Ranges secrets (propriétaire)
- 0 citations scientifiques
- Wearable Ring requis (350€)
- Dashboard premium

Nous:
- 39-50 biomarqueurs (upload PDF standard)
- Ranges PRÉCIS divulgués
- Citations scientifiques (2-3/panel)
- Pas de hardware requis
- 99€ one-time
```

### Notre Killer Feature
**Ranges numériques transparents avec valeurs Huberman/Attia/MPMD précises**

Ultrahuman cache leurs ranges (stratégie propriétaire lock-in).
Nous = transparence totale + citations scientifiques.

---

## QUALITÉ CHECKLIST

### Content
```
☐ 39 biomarqueurs avec 3-couches explications
☐ 2-3 citations par panel (avec liens)
☐ 10+ cas d'usage success stories
☐ Infographiques 6 panels
☐ Copy proofread (FR natif)
☐ Disclaimers footer toutes pages
☐ FAQ 10+ questions
☐ Exemple rapport PDF téléchargeable
```

### Design
```
☐ Design system documenté
☐ Responsive (mobile, tablet, desktop)
☐ Animations 60fps
☐ Loading states
☐ Error states
☐ Empty states
```

### Dev
```
☐ BIOMARKER_RANGES 39 entries complets
☐ OCR fonctionne (10+ formats labs)
☐ Dashboard renders data réelle
☐ PDF export complet
☐ Email delivery testé
☐ Payment Stripe end-to-end
☐ RGPD compliance
☐ Security audit
☐ Lighthouse > 90
☐ WCAG 2.1 AA
```

### Legal
```
☐ Disclaimer "Educational only" footer
☐ Terms of Service
☐ Privacy Policy RGPD
☐ Refund policy 30-day
☐ Medical disclaimer
☐ Citations attribution
```

---

## CONCLUSION

**Produit réaliste:**
- Upload PDF prise de sang standard
- 39-50 biomarqueurs (ce qu'un PDF contient réellement)
- Ranges optimaux vs normaux (valeurs précises)
- 99€ one-time

**Inspiration Ultrahuman:**
- Design system (noir/bleu, minimal, data-dense)
- Structure pédagogique 3-couches
- Dashboard UX premium
- Cas d'usage storytelling

**Notre différenciateur:**
- Ranges TRANSPARENTS (vs Ultrahuman secrets)
- Citations scientifiques (vs Ultrahuman 0)
- Prix accessible 99€ (vs Ultrahuman Ring 350€)
- Francophone (marché sous-servi)

**Fichier vivant:** Mise à jour avec feedback users, A/B tests, nouvelles features.

---

**Version:** FINAL
**Date:** 2026-01-26
**Statut:** READY FOR IMPLEMENTATION
