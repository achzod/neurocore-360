# PLAN DE REFONTE ULTRA-DESIGN - RAPPORT SANGUIN APEXLABS
## Transformation: Generic Medical Report → Biohacking Premium Interface

---

## AUDIT ACTUEL - PROBLÈMES IDENTIFIÉS

### PROBLÈMES CRITIQUES DE DESIGN

#### 1. TYPOGRAPHIE GÉNÉRIQUE ET SANS CARACTÈRE
**Problèmes actuels:**
- `Georgia, 'Times New Roman', serif` (ligne 623) = typographie vieillotte, association "journal papier"
- `Inter, sans-serif` pour headings = extrêmement commun, zero différenciation
- Aucune hiérarchie typographique dramatique
- Pas de font monospace distinctive pour données médicales
- Letter-spacing et line-height par défaut (manque de raffinement)

**Impact:** Le rapport ressemble à un document Word 2010, pas à une interface biohacking premium.

---

#### 2. PALETTE COULEURS BASIQUE ET TERNE
**Problèmes actuels:**
- Fond blanc pur `#ffffff` forcé (ligne 395) = éblouissant, pas médical
- Couleurs status génériques: `red-500`, `blue-600`, `emerald-600` = palette Tailwind par défaut
- Aucun gradient, aucun glow, aucun effet biométrique
- Borders gris fade `slate-200` = zero profondeur visuelle
- Pas de mode dark premium (le rapport force le light mode)

**Impact:** Esthétique "formulaire administratif" au lieu de "scan médical futuriste".

---

#### 3. LAYOUT CONVENTIONNEL ET PRÉVISIBLE
**Problèmes actuels:**
- Structure 100% verticale linéaire
- Sections empilées de façon monotone
- Aucun élément asymétrique ou grid-breaking
- Cards uniformes avec `rounded-2xl` partout
- Navigation sidebar basique (lignes 604-618)

**Impact:** Zéro momentum visuel, lecture fatigante, manque d'excitation.

---

#### 4. ABSENCE TOTALE D'ANIMATIONS DATA-DRIVEN
**Problèmes actuels:**
- Aucune animation au chargement de page
- Pas de staggered reveal pour les sections
- Scores et valeurs apparaissent statiquement
- Aucun effet scroll-triggered
- Transitions CSS par défaut uniquement

**Impact:** Interface morte, pas d'engagement émotionnel avec les données.

---

#### 5. MANQUE D'EFFETS VISUELS BIOMÉTRIQUES
**Problèmes actuels:**
- Backgrounds solides uniquement
- Aucun grain/noise texture
- Pas de glows sur données critiques
- Borders plates sans depth
- Aucun effet de scan médical

**Impact:** Ne transmet pas l'impression de technologie médicale avancée.

---

#### 6. COMPOSANTS SANS IDENTITÉ VISUELLE FORTE
**Problèmes actuels:**
- Progress bars standards (ligne 693)
- Badges génériques shadcn/ui
- Icons Lucide basiques sans customisation
- Aucun composant signature mémorable
- Marker cards très simples (lignes 752-798)

**Impact:** Interchangeable avec n'importe quel dashboard SaaS B2B.

---

## DIRECTION ESTHÉTIQUE - BIOHACKING PREMIUM

### CONCEPT CENTRAL: "MEDICAL FUTURISM MEETS MINIMALIST LUXURY"

**Tone:** Clinique spatiale, data-driven élégant, confiance scientifique, premium accessible

**Références visuelles:**
- Ultrahuman M1 dashboard (dark mode medical)
- Whoop app (data viz + glows subtils)
- Apple Health (lisibilité + micro-interactions)
- Sci-fi medical UI (Prometheus, Minority Report)
- Luxury watchfaces (typographie data premium)

**Différenciation INOUBLIABLE:**
1. **Système de "glow signatures"** - chaque niveau de score a sa couleur de glow unique
2. **Typographie data monospace distinctive** - chiffres ont leur propre identité
3. **Animations de "scan médical"** - effet de révélation progressive des données
4. **Dark mode medical par défaut** - fond gris anthracite profond, pas noir pur
5. **Grain texture subtile** - toutes surfaces ont micro-texture organique

---

## 1. TYPOGRAPHIE DISTINCTIVE

### SYSTÈME À 3 FONTS

#### DISPLAY FONT (Headings, Scores)
**Options premium:**

**OPTION A: JetBrains Mono Bold (Recommandé)**
- Style: Monospace futuriste, geometric, tech-medical
- Usage: Scores, headings, nombres importants
- Poids: 700-800
- Letter-spacing: -0.02em (tight, impactful)
```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700;800&display=swap');
```

**OPTION B: Clash Display**
- Style: Geometric sans, premium, distinctive
- Usage: Headings principaux uniquement
- Note: Nécessite self-hosting
```css
@font-face {
  font-family: 'Clash Display';
  src: url('/fonts/ClashDisplay-Semibold.woff2') format('woff2');
  font-weight: 600;
}
```

**OPTION C: Space Grotesk**
- Style: Tech-forward, lisible, caractère fort
- Usage: Alternative si performance critique
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
```

---

#### BODY FONT (Paragraphes, Textes longs)
**Choix: IBM Plex Sans**
- Style: Moderniste médical, excellent rendu écran, lisibilité scientifique
- Poids: 400 (regular), 500 (medium)
- Line-height: 1.7 (aération lecture longue)
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap');
```

**Alternative: Inter Variable**
- Mais SEULEMENT avec customisation letter-spacing et optical sizing
```css
font-family: 'Inter', sans-serif;
font-optical-sizing: auto;
letter-spacing: -0.011em;
```

---

#### DATA FONT (Valeurs, Métriques, Chiffres)
**Choix: JetBrains Mono Regular**
- Style: Monospace tech, clarté numérique
- Poids: 400-500
- Tabular figures activées
```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
font-feature-settings: 'tnum' on, 'lnum' on;
```

---

### IMPLÉMENTATION CODE

```tsx
// Ajout dans index.css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=IBM+Plex+Sans:wght@400;500&display=swap');

:root {
  --font-display: 'JetBrains Mono', monospace;
  --font-body: 'IBM Plex Sans', -apple-system, sans-serif;
  --font-data: 'JetBrains Mono', 'Courier New', monospace;
}

/* Typographie classes */
.text-display {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.text-data {
  font-family: var(--font-data);
  font-feature-settings: 'tnum' on, 'lnum' on;
  font-variant-numeric: tabular-nums;
}
```

**Update BloodAnalysisReport.tsx:**
```tsx
// Remplacer ligne 623
<main
  className="w-full max-w-[900px]"
  style={{
    fontFamily: "var(--font-body)",
    lineHeight: 1.7
  }}
>

// Headings (ligne 629, etc.)
<h2 className="text-2xl font-bold text-display">
  Introduction & guide de lecture
</h2>

// Scores (ligne 684)
<div className="mt-2 text-4xl font-bold text-data">
  {reportData.globalScore}/100
</div>
```

---

## 2. PALETTE COULEURS FUTURISTE

### DARK MODE MEDICAL (Mode par défaut)

#### COULEURS DOMINANTES
```css
:root[data-blood-theme="medical-dark"] {
  /* Backgrounds - Gris anthracite profond avec warm undertone */
  --blood-bg-primary: #0a0b0d;
  --blood-bg-elevated: #13151a;
  --blood-bg-surface: #1a1d24;

  /* Text - Haute lisibilité */
  --blood-text-primary: #f8fafc;
  --blood-text-secondary: #94a3b8;
  --blood-text-tertiary: #64748b;

  /* Borders - Subtiles mais visibles */
  --blood-border-subtle: rgba(255, 255, 255, 0.05);
  --blood-border-default: rgba(255, 255, 255, 0.08);
  --blood-border-strong: rgba(255, 255, 255, 0.12);
}
```

---

#### ACCENTS DATA-DRIVEN (Status colors avec glows)

```css
:root[data-blood-theme="medical-dark"] {
  /* Optimal - Cyan électrique */
  --blood-optimal: #06b6d4;
  --blood-optimal-glow: rgba(6, 182, 212, 0.3);
  --blood-optimal-bg: rgba(6, 182, 212, 0.1);

  /* Normal - Bleu science */
  --blood-normal: #3b82f6;
  --blood-normal-glow: rgba(59, 130, 246, 0.25);
  --blood-normal-bg: rgba(59, 130, 246, 0.08);

  /* Suboptimal - Amber warning */
  --blood-suboptimal: #f59e0b;
  --blood-suboptimal-glow: rgba(245, 158, 11, 0.3);
  --blood-suboptimal-bg: rgba(245, 158, 11, 0.1);

  /* Critical - Rose vibrant (pas rouge pur) */
  --blood-critical: #f43f5e;
  --blood-critical-glow: rgba(244, 63, 94, 0.35);
  --blood-critical-bg: rgba(244, 63, 94, 0.12);

  /* Accent principal - Vert biomédical */
  --blood-accent-primary: #10b981;
  --blood-accent-glow: rgba(16, 185, 129, 0.25);
}
```

---

#### GRADIENTS BIOMÉTRIQUES

```css
:root[data-blood-theme="medical-dark"] {
  /* Hero gradient */
  --blood-gradient-hero: linear-gradient(
    135deg,
    #0a0b0d 0%,
    #13151a 50%,
    #1a1d24 100%
  );

  /* Card hover gradient */
  --blood-gradient-card: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.02) 0%,
    rgba(255, 255, 255, 0) 100%
  );

  /* Score gradient (radial pour progress circles) */
  --blood-gradient-score: radial-gradient(
    circle at center,
    var(--blood-accent-primary) 0%,
    var(--blood-optimal) 100%
  );

  /* Data glow gradient */
  --blood-gradient-glow: linear-gradient(
    90deg,
    transparent 0%,
    var(--blood-accent-glow) 50%,
    transparent 100%
  );
}
```

---

### LIGHT MODE PREMIUM (Option alternative)

```css
:root[data-blood-theme="medical-light"] {
  /* Backgrounds - Off-white crémeux */
  --blood-bg-primary: #fafaf9;
  --blood-bg-elevated: #ffffff;
  --blood-bg-surface: #f5f5f4;

  /* Text */
  --blood-text-primary: #0f172a;
  --blood-text-secondary: #475569;
  --blood-text-tertiary: #94a3b8;

  /* Borders */
  --blood-border-subtle: rgba(0, 0, 0, 0.06);
  --blood-border-default: rgba(0, 0, 0, 0.10);
  --blood-border-strong: rgba(0, 0, 0, 0.15);

  /* Status colors ajustées pour light */
  --blood-optimal: #0891b2;
  --blood-normal: #2563eb;
  --blood-suboptimal: #d97706;
  --blood-critical: #dc2626;
}
```

---

### IMPLÉMENTATION CODE

**Ajout dans BloodAnalysisReport.tsx:**

```tsx
// Remplacer le useEffect ligne 384-408 par:
useEffect(() => {
  const root = document.documentElement;
  root.setAttribute('data-blood-theme', 'medical-dark');

  // Inject CSS variables
  const style = document.createElement('style');
  style.textContent = `
    :root[data-blood-theme="medical-dark"] {
      --blood-bg-primary: #0a0b0d;
      --blood-bg-elevated: #13151a;
      --blood-bg-surface: #1a1d24;
      --blood-text-primary: #f8fafc;
      --blood-text-secondary: #94a3b8;
      --blood-border-default: rgba(255, 255, 255, 0.08);
      --blood-optimal: #06b6d4;
      --blood-critical: #f43f5e;
      --blood-accent-primary: #10b981;
    }
  `;
  document.head.appendChild(style);

  return () => {
    document.head.removeChild(style);
    root.removeAttribute('data-blood-theme');
  };
}, []);

// Update container (ligne 576)
<div
  className="min-h-screen"
  style={{
    backgroundColor: 'var(--blood-bg-primary)',
    color: 'var(--blood-text-primary)'
  }}
>
```

---

## 3. ANIMATIONS & MICRO-INTERACTIONS

### PAGE LOAD SEQUENCE (Staggered Reveals)

**Concept:** Les sections apparaissent en cascade avec effet "scan médical"

```tsx
// Installation
npm install framer-motion

// Ajout dans BloodAnalysisReport.tsx
import { motion, useInView } from "framer-motion";

// Wrapper pour chaque section
const SectionReveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: [0.22, 1, 0.36, 1] // Smooth easing
      }}
    >
      {children}
    </motion.div>
  );
};

// Usage (wrapper les sections)
<SectionReveal delay={0.1}>
  <section id="introduction" className="scroll-mt-24">
    {/* ... */}
  </section>
</SectionReveal>

<SectionReveal delay={0.2}>
  <section id="overview" className="mt-10 scroll-mt-24">
    {/* ... */}
  </section>
</SectionReveal>
```

---

### SCORE ANIMATION (Compteur incrémental)

```tsx
// Créer composant AnimatedScore.tsx
import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedScoreProps {
  value: number;
  duration?: number;
}

export const AnimatedScore = ({ value, duration = 2 }: AnimatedScoreProps) => {
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 30,
    duration: duration * 1000
  });

  const display = useTransform(spring, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    spring.set(value);
    return display.on("change", (latest) => setDisplayValue(latest));
  }, [value, spring, display]);

  return (
    <motion.span
      className="text-data"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {displayValue}
    </motion.span>
  );
};

// Usage dans rapport (ligne 684)
<div className="mt-2 text-4xl font-bold">
  <AnimatedScore value={reportData.globalScore} />
  <span className="text-blood-text-secondary">/100</span>
</div>
```

---

### HOVER STATES MÉMORABLES

```css
/* Ajout dans index.css */

/* Marker cards hover avec glow */
.marker-card {
  position: relative;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  border: 1px solid var(--blood-border-default);
  background: var(--blood-bg-surface);
}

.marker-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, var(--blood-accent-glow), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.marker-card:hover::before {
  opacity: 1;
}

.marker-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 0 20px var(--blood-accent-glow),
    0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Status badges avec pulse */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 10px var(--glow-color);
  }
  50% {
    box-shadow: 0 0 20px var(--glow-color);
  }
}

.status-badge-critical {
  --glow-color: var(--blood-critical-glow);
  animation: pulse-glow 2s ease-in-out infinite;
}
```

---

### SCROLL-TRIGGERED EFFECTS

```tsx
// Progress bar au scroll
const [scrollProgress, setScrollProgress] = useState(0);

useEffect(() => {
  const handleScroll = () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = window.scrollY;
    const progress = (scrolled / documentHeight) * 100;
    setScrollProgress(progress);
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// JSX (top de la page)
<motion.div
  className="fixed top-0 left-0 right-0 h-1 z-50"
  style={{
    background: 'var(--blood-accent-primary)',
    scaleX: scrollProgress / 100,
    transformOrigin: 'left',
  }}
/>
```

---

### TRANSITIONS FLUIDES ENTRE SECTIONS

```tsx
// Navigation avec smooth scroll + highlight active
const [activeSection, setActiveSection] = useState('introduction');

const handleNavigate = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  element?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
  setActiveSection(sectionId);
};

// Update navigation items (ligne 608-616)
<a
  href={`#${section.id}`}
  onClick={(e) => {
    e.preventDefault();
    handleNavigate(section.id);
  }}
  className={`
    block rounded-md px-2 py-1 transition-all duration-300
    ${activeSection === section.id
      ? 'bg-blood-accent-primary/20 text-blood-accent-primary border-l-2 border-blood-accent-primary'
      : 'text-blood-text-secondary hover:bg-blood-bg-elevated'
    }
  `}
>
  {section.label}
</a>
```

---

## 4. COMPOSITION SPATIALE

### LAYOUTS ASYMÉTRIQUES

**Hero section avec score offset:**

```tsx
// Remplacer section overview (ligne 665-714)
<section id="overview" className="mt-10 scroll-mt-24">
  <div className="grid grid-cols-12 gap-6">
    {/* Score - Large, dominant */}
    <div className="col-span-12 lg:col-span-7">
      <div
        className="rounded-xl p-12 relative overflow-hidden"
        style={{
          background: 'var(--blood-gradient-hero)',
          border: '1px solid var(--blood-border-default)'
        }}
      >
        {/* Grain texture overlay */}
        <div className="absolute inset-0 opacity-5 bg-grain" />

        <div className="relative z-10">
          <div className="text-xs uppercase tracking-wider text-blood-text-tertiary mb-4">
            Score global ApexLabs
          </div>
          <div className="flex items-baseline gap-4">
            <AnimatedScore value={reportData.globalScore} />
            <span className="text-4xl text-blood-text-secondary">/100</span>
          </div>

          {/* Visual score bar */}
          <div className="mt-6 h-2 bg-blood-bg-primary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--blood-gradient-score)' }}
              initial={{ width: 0 }}
              animate={{ width: `${reportData.globalScore}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* Patient info - Compact sidebar */}
    <div className="col-span-12 lg:col-span-5 space-y-4">
      {/* Cards empilées verticalement */}
      {/* ... */}
    </div>
  </div>
</section>
```

---

### GRID-BREAKING ELEMENTS

**Marker cards avec tailles variables:**

```tsx
// Alerts section avec cards différentes (ligne 728-806)
<div className="grid grid-cols-12 gap-4">
  {criticalMarkers.map((marker, idx) => (
    <motion.div
      key={marker.code}
      // Alternance tailles: premier = full width, suivants = 2 colonnes
      className={idx === 0 ? "col-span-12" : "col-span-12 lg:col-span-6"}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.1 }}
    >
      {/* Marker card content */}
    </motion.div>
  ))}
</div>
```

---

### NEGATIVE SPACE STRATÉGIQUE

```css
/* Breathing room between sections */
.blood-section {
  margin-bottom: 120px; /* Plus généreux que 40px actuel */
}

.blood-section:first-of-type {
  margin-top: 80px;
}

/* Padding internal généreux */
.blood-card {
  padding: 32px; /* Au lieu de 20px */
}

/* Max-width restreint pour lecture */
.blood-content {
  max-width: 65ch; /* Ligne optimale lecture */
}
```

---

## 5. EFFETS VISUELS BIOMÉTRIQUES

### GRADIENT MESHES POUR BACKGROUNDS

```css
/* Ajout dans index.css */
.blood-mesh-bg {
  background:
    radial-gradient(circle at 20% 30%, var(--blood-accent-glow) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, var(--blood-optimal-glow) 0%, transparent 50%),
    var(--blood-bg-primary);
  background-size: 100% 100%;
  background-attachment: fixed;
}

/* Animated mesh (subtle movement) */
@keyframes mesh-flow {
  0%, 100% {
    background-position: 0% 0%, 100% 100%;
  }
  50% {
    background-position: 100% 100%, 0% 0%;
  }
}

.blood-mesh-animated {
  animation: mesh-flow 30s ease-in-out infinite;
}
```

**Usage:**
```tsx
// Container principal (ligne 576)
<div className="min-h-screen blood-mesh-bg blood-mesh-animated">
```

---

### GRAIN/NOISE TEXTURES SUBTILES

```css
/* Générer via SVG inline pour performance */
.bg-grain {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
}

/* Application sur toutes les cards */
.blood-card {
  position: relative;
}

.blood-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  border-radius: inherit;
}
```

---

### GLOWS POUR DONNÉES CRITIQUES

```tsx
// Composant GlowValue pour valeurs importantes
const GlowValue = ({
  value,
  status
}: {
  value: string;
  status: MarkerStatus;
}) => {
  const glowColor = {
    optimal: 'var(--blood-optimal-glow)',
    normal: 'var(--blood-normal-glow)',
    suboptimal: 'var(--blood-suboptimal-glow)',
    critical: 'var(--blood-critical-glow)',
  }[status];

  return (
    <motion.div
      className="text-data text-4xl font-bold"
      style={{
        color: `var(--blood-${status})`,
        textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
      }}
      animate={{
        textShadow: [
          `0 0 20px ${glowColor}`,
          `0 0 30px ${glowColor}`,
          `0 0 20px ${glowColor}`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {value}
    </motion.div>
  );
};

// Usage dans marker cards (ligne 764)
<GlowValue value={formatValue(marker.value, marker.unit)} status={marker.status} />
```

---

### BORDERS/DIVIDERS FUTURISTES

```css
/* Scan line separator */
.blood-divider {
  position: relative;
  height: 1px;
  background: var(--blood-border-subtle);
  overflow: hidden;
  margin: 60px 0;
}

.blood-divider::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 30%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--blood-accent-primary) 50%,
    transparent 100%
  );
  animation: scan-line 3s ease-in-out infinite;
}

@keyframes scan-line {
  0% { left: -100%; }
  100% { left: 200%; }
}

/* Gradient borders */
.blood-border-gradient {
  position: relative;
  border: 1px solid transparent;
  background-clip: padding-box;
}

.blood-border-gradient::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, var(--blood-accent-primary), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
```

---

### DATA VISUALIZATION EFFECTS

```tsx
// Progress bar avec trail effect
const ProgressBarBiometric = ({
  value,
  max = 100,
  status
}: {
  value: number;
  max?: number;
  status: MarkerStatus;
}) => {
  const percentage = (value / max) * 100;

  return (
    <div className="relative h-3 bg-blood-bg-primary rounded-full overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            var(--blood-border-default) 0px,
            var(--blood-border-default) 1px,
            transparent 1px,
            transparent 10px
          )`
        }}
      />

      {/* Animated fill */}
      <motion.div
        className="absolute inset-y-0 left-0"
        style={{
          background: `linear-gradient(90deg, var(--blood-${status}), var(--blood-accent-primary))`,
          boxShadow: `0 0 20px var(--blood-${status}-glow)`,
        }}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      {/* Moving glow effect */}
      <motion.div
        className="absolute inset-y-0 w-[20%]"
        style={{
          background: `linear-gradient(90deg, transparent, var(--blood-${status}-glow), transparent)`,
          left: `${percentage - 10}%`,
        }}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};
```

---

## 6. COMPOSANTS PREMIUM À CRÉER

### 1. BIOMARKER CARD PREMIUM

**Fichier: `client/src/components/blood/BiomarkerCardPremium.tsx`**

```tsx
import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronDown, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface BiomarkerCardPremiumProps {
  marker: {
    name: string;
    value: number;
    unit: string;
    status: "optimal" | "normal" | "suboptimal" | "critical";
    optimalMin: number | null;
    optimalMax: number | null;
    normalMin: number | null;
    normalMax: number | null;
    interpretation?: string;
    percentile?: number;
  };
}

export const BiomarkerCardPremium = ({ marker }: BiomarkerCardPremiumProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const statusConfig = {
    optimal: {
      color: 'var(--blood-optimal)',
      glow: 'var(--blood-optimal-glow)',
      bg: 'var(--blood-optimal-bg)',
      icon: TrendingUp,
    },
    normal: {
      color: 'var(--blood-normal)',
      glow: 'var(--blood-normal-glow)',
      bg: 'var(--blood-normal-bg)',
      icon: TrendingUp,
    },
    suboptimal: {
      color: 'var(--blood-suboptimal)',
      glow: 'var(--blood-suboptimal-glow)',
      bg: 'var(--blood-suboptimal-bg)',
      icon: AlertCircle,
    },
    critical: {
      color: 'var(--blood-critical)',
      glow: 'var(--blood-critical-glow)',
      bg: 'var(--blood-critical-bg)',
      icon: TrendingDown,
    },
  }[marker.status];

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      className="relative group"
    >
      {/* Card container */}
      <div
        className="rounded-lg overflow-hidden cursor-pointer transition-all duration-300"
        style={{
          background: 'var(--blood-bg-surface)',
          border: `1px solid ${isExpanded ? statusConfig.color : 'var(--blood-border-default)'}`,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Grain overlay */}
        <div className="absolute inset-0 bg-grain opacity-5 pointer-events-none" />

        {/* Glow effect on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 40px ${statusConfig.glow}`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Status icon with glow */}
              <motion.div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{
                  background: statusConfig.bg,
                  border: `1px solid ${statusConfig.color}`,
                  boxShadow: `0 0 15px ${statusConfig.glow}`,
                }}
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <StatusIcon
                  className="w-5 h-5"
                  style={{ color: statusConfig.color }}
                />
              </motion.div>

              {/* Name */}
              <div>
                <h3
                  className="font-bold text-lg text-display"
                  style={{ color: 'var(--blood-text-primary)' }}
                >
                  {marker.name}
                </h3>
                {marker.percentile && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--blood-text-tertiary)' }}
                  >
                    Top {100 - marker.percentile}% de la population
                  </p>
                )}
              </div>
            </div>

            {/* Value with glow */}
            <div className="text-right">
              <motion.div
                className="text-3xl font-bold text-data"
                style={{
                  color: statusConfig.color,
                  textShadow: `0 0 20px ${statusConfig.glow}`,
                }}
                animate={{
                  textShadow: [
                    `0 0 15px ${statusConfig.glow}`,
                    `0 0 25px ${statusConfig.glow}`,
                    `0 0 15px ${statusConfig.glow}`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {marker.value}
              </motion.div>
              <div
                className="text-sm mt-1"
                style={{ color: 'var(--blood-text-secondary)' }}
              >
                {marker.unit}
              </div>
            </div>
          </div>

          {/* Range visualization */}
          <div className="relative h-2 bg-blood-bg-primary rounded-full overflow-hidden mb-3">
            {/* Optimal range zone */}
            {marker.optimalMin !== null && marker.optimalMax !== null && marker.normalMax !== null && (
              <div
                className="absolute inset-y-0"
                style={{
                  left: `${(marker.optimalMin / marker.normalMax) * 100}%`,
                  width: `${((marker.optimalMax - marker.optimalMin) / marker.normalMax) * 100}%`,
                  background: 'var(--blood-optimal-bg)',
                  border: '1px solid var(--blood-optimal)',
                }}
              />
            )}

            {/* Current value indicator */}
            {marker.normalMax !== null && (
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-1 h-4 rounded-full"
                style={{
                  left: `${Math.min((marker.value / marker.normalMax) * 100, 100)}%`,
                  background: statusConfig.color,
                  boxShadow: `0 0 10px ${statusConfig.glow}`,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              />
            )}
          </div>

          {/* Status badge + expand icon */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs uppercase tracking-wider px-3 py-1 rounded-full font-semibold"
              style={{
                background: statusConfig.bg,
                color: statusConfig.color,
                border: `1px solid ${statusConfig.color}`,
              }}
            >
              {marker.status}
            </span>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown
                className="w-5 h-5"
                style={{ color: 'var(--blood-text-secondary)' }}
              />
            </motion.div>
          </div>
        </div>

        {/* Expandable content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                borderTop: `1px solid var(--blood-border-default)`,
                background: 'var(--blood-bg-elevated)',
              }}
            >
              <div className="p-6 space-y-4">
                {/* Ranges detail */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div
                      className="text-xs uppercase tracking-wider mb-1"
                      style={{ color: 'var(--blood-text-tertiary)' }}
                    >
                      Range optimal
                    </div>
                    <div
                      className="text-data"
                      style={{ color: 'var(--blood-text-primary)' }}
                    >
                      {marker.optimalMin ?? "-"} - {marker.optimalMax ?? "-"} {marker.unit}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs uppercase tracking-wider mb-1"
                      style={{ color: 'var(--blood-text-tertiary)' }}
                    >
                      Range normal
                    </div>
                    <div
                      className="text-data"
                      style={{ color: 'var(--blood-text-primary)' }}
                    >
                      {marker.normalMin ?? "-"} - {marker.normalMax ?? "-"} {marker.unit}
                    </div>
                  </div>
                </div>

                {/* Interpretation */}
                {marker.interpretation && (
                  <div
                    className="rounded-lg p-4"
                    style={{
                      background: statusConfig.bg,
                      border: `1px solid ${statusConfig.color}`,
                    }}
                  >
                    <div
                      className="text-xs uppercase tracking-wider mb-2"
                      style={{ color: statusConfig.color }}
                    >
                      Analyse personnalisée
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--blood-text-primary)' }}
                    >
                      {marker.interpretation}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
```

---

### 2. PROGRESS CIRCLE BIOMÉTRIQUE

**Fichier: `client/src/components/blood/BiometricProgressCircle.tsx`**

```tsx
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface BiometricProgressCircleProps {
  score: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const BiometricProgressCircle = ({
  score,
  max = 100,
  size = 200,
  strokeWidth = 8,
  label = "Score",
  sublabel,
}: BiometricProgressCircleProps) => {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = (score / max) * 100;
  const offset = circumference - (percentage / 100) * circumference;

  // Animate score number
  useEffect(() => {
    let start = 0;
    const duration = 2000; // 2 seconds
    const increment = score / (duration / 16); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [score]);

  const scoreColor =
    percentage >= 85 ? 'var(--blood-optimal)' :
    percentage >= 70 ? 'var(--blood-normal)' :
    percentage >= 50 ? 'var(--blood-suboptimal)' :
    'var(--blood-critical)';

  const glowColor =
    percentage >= 85 ? 'var(--blood-optimal-glow)' :
    percentage >= 70 ? 'var(--blood-normal-glow)' :
    percentage >= 50 ? 'var(--blood-suboptimal-glow)' :
    'var(--blood-critical-glow)';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--blood-bg-primary)"
          strokeWidth={strokeWidth}
        />

        {/* Grid pattern background */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="var(--blood-border-subtle)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#grid)"
          strokeWidth={strokeWidth}
          opacity="0.3"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 10px ${glowColor})`,
          }}
        />

        {/* Glow effect */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={strokeWidth / 2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          opacity="0.3"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            filter: `blur(4px)`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="text-5xl font-bold text-data"
          style={{
            color: scoreColor,
            textShadow: `0 0 20px ${glowColor}`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {displayScore}
        </motion.div>
        <div
          className="text-xs uppercase tracking-wider mt-2"
          style={{ color: 'var(--blood-text-secondary)' }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            className="text-[10px] mt-1"
            style={{ color: 'var(--blood-text-tertiary)' }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 3. ALERT SYSTEM PREMIUM

**Fichier: `client/src/components/blood/AlertBanner.tsx`**

```tsx
import { motion } from "framer-motion";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

type AlertType = "info" | "warning" | "success" | "critical";

interface AlertBannerProps {
  type: AlertType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const AlertBanner = ({
  type,
  title,
  message,
  actionLabel,
  onAction,
}: AlertBannerProps) => {
  const config = {
    info: {
      icon: Info,
      color: 'var(--blood-normal)',
      glow: 'var(--blood-normal-glow)',
      bg: 'var(--blood-normal-bg)',
    },
    warning: {
      icon: AlertTriangle,
      color: 'var(--blood-suboptimal)',
      glow: 'var(--blood-suboptimal-glow)',
      bg: 'var(--blood-suboptimal-bg)',
    },
    success: {
      icon: CheckCircle,
      color: 'var(--blood-optimal)',
      glow: 'var(--blood-optimal-glow)',
      bg: 'var(--blood-optimal-bg)',
    },
    critical: {
      icon: XCircle,
      color: 'var(--blood-critical)',
      glow: 'var(--blood-critical-glow)',
      bg: 'var(--blood-critical-bg)',
    },
  }[type];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--blood-bg-surface)',
        border: `1px solid ${config.color}`,
        boxShadow: `0 0 30px ${config.glow}`,
      }}
    >
      {/* Grain texture */}
      <div className="absolute inset-0 bg-grain opacity-5 pointer-events-none" />

      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${config.glow}, transparent)`,
          opacity: 0.3,
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-6 flex items-start gap-4">
        {/* Icon with pulse */}
        <motion.div
          className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
          style={{
            background: config.bg,
            border: `1px solid ${config.color}`,
          }}
          animate={{
            boxShadow: [
              `0 0 15px ${config.glow}`,
              `0 0 25px ${config.glow}`,
              `0 0 15px ${config.glow}`,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <Icon
            className="w-6 h-6"
            style={{ color: config.color }}
          />
        </motion.div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-lg font-bold mb-1 text-display"
            style={{ color: config.color }}
          >
            {title}
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--blood-text-secondary)' }}
          >
            {message}
          </p>
        </div>

        {/* Action button */}
        {actionLabel && onAction && (
          <motion.button
            onClick={onAction}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: config.color,
              color: 'var(--blood-bg-primary)',
            }}
            whileHover={{
              scale: 1.05,
              boxShadow: `0 0 20px ${config.glow}`,
            }}
            whileTap={{ scale: 0.95 }}
          >
            {actionLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
```

---

### 4. DATA CARDS INTERACTIFS

**Fichier: `client/src/components/blood/InteractiveDataCard.tsx`**

```tsx
import { motion } from "framer-motion";
import { ReactNode, useState } from "react";

interface InteractiveDataCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  description?: string;
  icon?: ReactNode;
}

export const InteractiveDataCard = ({
  label,
  value,
  unit,
  trend,
  trendValue,
  description,
  icon,
}: InteractiveDataCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const trendConfig = {
    up: { color: 'var(--blood-optimal)', symbol: '↑' },
    down: { color: 'var(--blood-critical)', symbol: '↓' },
    stable: { color: 'var(--blood-normal)', symbol: '→' },
  };

  const trendData = trend ? trendConfig[trend] : null;

  return (
    <motion.div
      className="relative group cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="rounded-lg overflow-hidden relative"
        style={{
          background: 'var(--blood-bg-surface)',
          border: '1px solid var(--blood-border-default)',
        }}
      >
        {/* Grain */}
        <div className="absolute inset-0 bg-grain opacity-5 pointer-events-none" />

        {/* Hover glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'radial-gradient(circle at center, var(--blood-accent-glow), transparent)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div
              className="text-xs uppercase tracking-wider"
              style={{ color: 'var(--blood-text-tertiary)' }}
            >
              {label}
            </div>
            {icon && (
              <motion.div
                animate={{ rotate: isHovered ? 360 : 0 }}
                transition={{ duration: 0.5 }}
                style={{ color: 'var(--blood-accent-primary)' }}
              >
                {icon}
              </motion.div>
            )}
          </div>

          {/* Value */}
          <div className="flex items-baseline gap-2">
            <motion.div
              className="text-4xl font-bold text-data"
              style={{ color: 'var(--blood-text-primary)' }}
              animate={isHovered ? {
                textShadow: '0 0 20px var(--blood-accent-glow)',
              } : {}}
            >
              {value}
            </motion.div>
            {unit && (
              <span
                className="text-lg"
                style={{ color: 'var(--blood-text-secondary)' }}
              >
                {unit}
              </span>
            )}
          </div>

          {/* Trend */}
          {trendData && trendValue && (
            <div
              className="flex items-center gap-2 mt-3 text-sm"
              style={{ color: trendData.color }}
            >
              <span className="text-lg">{trendData.symbol}</span>
              <span className="font-semibold">{trendValue}</span>
            </div>
          )}

          {/* Description (appears on hover) */}
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={isHovered ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {description && (
              <p
                className="mt-4 pt-4 text-sm leading-relaxed"
                style={{
                  color: 'var(--blood-text-secondary)',
                  borderTop: '1px solid var(--blood-border-default)',
                }}
              >
                {description}
              </p>
            )}
          </motion.div>
        </div>

        {/* Scan line effect */}
        <motion.div
          className="absolute inset-x-0 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--blood-accent-primary), transparent)',
            top: isHovered ? '0%' : '-100%',
          }}
          animate={isHovered ? {
            top: ['0%', '100%'],
          } : {}}
          transition={{
            duration: 1.5,
            repeat: isHovered ? Infinity : 0,
          }}
        />
      </div>
    </motion.div>
  );
};
```

---

### 5. TIMELINE 90 JOURS VISUELLE

**Fichier: `client/src/components/blood/Protocol90Timeline.tsx`**

```tsx
import { motion } from "framer-motion";
import { Calendar, Target, TrendingUp } from "lucide-react";

interface Phase {
  id: string;
  title: string;
  duration: string;
  items: string[];
  milestone?: string;
}

interface Protocol90TimelineProps {
  phases: Phase[];
}

export const Protocol90Timeline = ({ phases }: Protocol90TimelineProps) => {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div
        className="absolute left-8 top-0 bottom-0 w-[2px]"
        style={{ background: 'var(--blood-border-default)' }}
      />

      {/* Animated glow on line */}
      <motion.div
        className="absolute left-8 top-0 w-[2px] h-full"
        style={{
          background: 'linear-gradient(180deg, var(--blood-accent-primary), transparent)',
        }}
        animate={{
          y: ['0%', '100%'],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Phases */}
      <div className="space-y-12">
        {phases.map((phase, index) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 }}
            className="relative pl-20"
          >
            {/* Timeline node */}
            <motion.div
              className="absolute left-6 top-4 w-5 h-5 rounded-full"
              style={{
                background: 'var(--blood-accent-primary)',
                border: '2px solid var(--blood-bg-primary)',
                boxShadow: '0 0 20px var(--blood-accent-glow)',
              }}
              animate={{
                boxShadow: [
                  '0 0 15px var(--blood-accent-glow)',
                  '0 0 30px var(--blood-accent-glow)',
                  '0 0 15px var(--blood-accent-glow)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.3,
              }}
            />

            {/* Phase card */}
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--blood-bg-surface)',
                border: '1px solid var(--blood-border-default)',
              }}
            >
              {/* Grain */}
              <div className="absolute inset-0 bg-grain opacity-5 pointer-events-none" />

              {/* Content */}
              <div className="relative z-10 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="text-xs uppercase tracking-wider px-2 py-1 rounded"
                        style={{
                          background: 'var(--blood-accent-primary)',
                          color: 'var(--blood-bg-primary)',
                        }}
                      >
                        Phase {index + 1}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: 'var(--blood-text-tertiary)' }}
                      >
                        <Calendar className="inline w-3 h-3 mr-1" />
                        {phase.duration}
                      </span>
                    </div>
                    <h3
                      className="text-xl font-bold text-display"
                      style={{ color: 'var(--blood-text-primary)' }}
                    >
                      {phase.title}
                    </h3>
                  </div>

                  {phase.milestone && (
                    <motion.div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: 'var(--blood-optimal-bg)',
                        border: '1px solid var(--blood-optimal)',
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Target
                        className="w-4 h-4"
                        style={{ color: 'var(--blood-optimal)' }}
                      />
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--blood-optimal)' }}
                      >
                        {phase.milestone}
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Items */}
                <ul className="space-y-2">
                  {phase.items.map((item, itemIndex) => (
                    <motion.li
                      key={itemIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: itemIndex * 0.1 }}
                      className="flex items-start gap-3 text-sm"
                    >
                      <span
                        className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2"
                        style={{ background: 'var(--blood-accent-primary)' }}
                      />
                      <span style={{ color: 'var(--blood-text-secondary)' }}>
                        {item}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* End milestone */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative pl-20 mt-12"
      >
        <div
          className="absolute left-5 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--blood-accent-primary)',
            boxShadow: '0 0 40px var(--blood-accent-glow)',
          }}
        >
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--blood-bg-primary)' }} />
        </div>

        <div
          className="rounded-lg p-6"
          style={{
            background: 'linear-gradient(135deg, var(--blood-accent-glow), transparent)',
            border: '1px solid var(--blood-accent-primary)',
          }}
        >
          <h4
            className="text-lg font-bold mb-2 text-display"
            style={{ color: 'var(--blood-accent-primary)' }}
          >
            Objectif 90 jours atteint
          </h4>
          <p
            className="text-sm"
            style={{ color: 'var(--blood-text-secondary)' }}
          >
            Retest sanguin pour validation des résultats et ajustement du protocole.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
```

---

## PLAN D'IMPLÉMENTATION PROGRESSIF

### PHASE 1 - FONDATIONS (2-3h)
1. Setup typographie (fonts Google + CSS variables)
2. Implémentation palette couleurs CSS variables
3. Ajout theme switcher dark mode medical
4. Installation framer-motion

### PHASE 2 - COMPOSANTS CORE (4-5h)
1. Créer BiomarkerCardPremium
2. Créer BiometricProgressCircle
3. Créer AlertBanner
4. Créer InteractiveDataCard

### PHASE 3 - ANIMATIONS (3-4h)
1. Page load staggered reveals
2. Scroll progress bar
3. Score animations compteur
4. Hover states cards

### PHASE 4 - EFFETS VISUELS (3-4h)
1. Gradient mesh backgrounds
2. Grain textures
3. Glows sur données critiques
4. Scan line dividers

### PHASE 5 - INTÉGRATION (4-5h)
1. Remplacer composants existants
2. Update BloodAnalysisReport.tsx
3. Créer Protocol90Timeline
4. Tests responsive

### PHASE 6 - POLISH (2-3h)
1. Fine-tuning animations
2. Optimisation performance
3. Accessibilité (contraste, focus states)
4. Documentation composants

---

## TOTAL ESTIMÉ: 18-24 heures de développement

---

## MÉTRIQUES DE SUCCÈS

**Avant refonte:**
- Typographie: Georgia/Inter (generic) → Score: 3/10
- Couleurs: Blanc pur + slate (basique) → Score: 4/10
- Animations: Quasi-inexistantes → Score: 2/10
- Identité visuelle: Aucune → Score: 2/10
- **TOTAL: 11/40 (27.5%)**

**Après refonte (objectif):**
- Typographie: JetBrains Mono + IBM Plex (distinctive) → Score: 9/10
- Couleurs: Dark medical + gradients biométriques → Score: 9/10
- Animations: Staggered reveals + data-driven effects → Score: 9/10
- Identité visuelle: Signature glow system + grain textures → Score: 10/10
- **TOTAL: 37/40 (92.5%)**

---

## DIFFÉRENCIATION VS CONCURRENTS

| Feature | ApexLabs (actuel) | Ultrahuman | Whoop | ApexLabs (refonte) |
|---------|-------------------|------------|-------|---------------------|
| Dark mode medical | ❌ | ✅ | ✅ | ✅ |
| Typographie distinctive | ❌ | ✅ | ✅ | ✅ |
| Glows data-driven | ❌ | ✅ | ⚠️ | ✅ |
| Animations premium | ❌ | ✅ | ✅ | ✅ |
| Grain textures | ❌ | ❌ | ❌ | ✅ (différenciation) |
| Timeline 90j visuelle | ❌ | ❌ | ❌ | ✅ (différenciation) |

---

## NOTES FINALES

**Points d'attention:**
- Performance: lazy load composants lourds (framer-motion)
- Accessibilité: maintenir contraste WCAG AA minimum
- Mobile: tester tous breakpoints, simplifier animations si nécessaire
- Print: prévoir CSS print sans effets visuels

**Quick wins prioritaires si budget temps limité:**
1. Typographie + couleurs (4h) = 60% de l'impact visuel
2. BiomarkerCardPremium (2h) = composant le plus visible
3. Score animations (1h) = wow factor immédiat

**Extensions futures possibles:**
- Thème clair premium (alternative)
- Mode comparaison multi-rapports
- Export PDF avec design premium
- Animations 3D (Three.js) pour radar charts
