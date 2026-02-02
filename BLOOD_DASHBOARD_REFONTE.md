# Blood Analysis Dashboard - Refonte v2.0

## Architecture

- Tab system: 6 tabs (Overview, Biomarkers, Analysis, Protocol, Trends, Sources)
- Sidebar navigation: fixed left, progress tracking
- Theme: dark/light toggle visible (header)
- Modal details: 2000-3000 mots par biomarqueur critique

## Structure fichiers

```
client/src/components/blood/
├── BloodTabs.tsx (main tab system)
├── BloodSidebar.tsx (navigation)
├── tabs/ (6 tab components)
├── biomarkers/ (cards + modal)
├── overview/ (score + radars)
├── analysis/ (AI parsing)
└── protocol/ (timeline + supplements)
```

## Developpement local

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test
npm run test:coverage
```

## Build production

```bash
npm run build
npm run preview
```

## Algorithmes cles

- Score calcul: optimal=100, normal=80, suboptimal=55, critical=30
- Global score: weighted avg (hormonal 25%, metabolic 20%, etc.)
- Percentile ranking: interpolation lineaire vs reference data
- Derived metrics: anabolicIndex, recompReadiness, diabetesRisk

## Content guidelines

- Biomarker details: 2000-3000 mots (Definition 700-900, Impact 800-1000, Protocole 800-1200)
- AI analysis: structured markdown with ## headers for parsing
- Citations: format "Author et al. (Year). Title. Journal. DOI."

## Performance targets

- FCP <1.5s, LCP <2.5s, TTI <3.5s
- Bundle size <500KB gzipped
- Lighthouse score >90/100

## Maintenance

- Update bloodBiomarkerDetailsExtended.ts quand nouveaux marqueurs
- Review percentile data yearly (age/sex cohorts)
- Monitor Sentry errors weekly
