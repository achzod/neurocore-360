# Design Reference - Ultrahuman

Reference materials scraped from Ultrahuman website for design inspiration.

## Contents

### /ultrahuman-style/
Full React component implementation of Ultrahuman-style dashboard:
- `App.tsx` - Main dashboard with all sections
- `components/` - Reusable UI components
- `data.ts` - Sample data structure
- `types.ts` - TypeScript types

### /ultrahuman-images/
UI assets from Ultrahuman:
- `bmi_stress_activity.avif` - BMI, stress & activity metrics visualization
- `cno_pro.avif` - CNO Pro device display
- `hr_hrv.avif` - Heart rate & HRV chart styles
- `pilot_study.avif` - Scientific study reference
- `sleep_ramadan.avif` - Sleep tracking visualization

## Key Design Elements

### Color Palette (Dark Theme)
- Background: `#0A0A0A` / `#121212`
- Card Background: `#1A1A1A`
- Accent Green: `#22C55E` (good)
- Accent Red: `#EF4444` (alert)
- Accent Amber: `#F59E0B` (warning)
- Text Primary: `#FFFFFF`
- Text Secondary: `#9CA3AF`

### Typography
- Font: System fonts / SF Pro Display
- Headings: Bold, large sizes
- Body: Regular, high contrast

### UI Components
1. **Score Rings** - Circular progress indicators
2. **Metric Cards** - Glass morphism effect
3. **Charts** - Minimal, dark background
4. **KPI Badges** - Rounded, colored backgrounds
5. **Section Headers** - Clean, uppercase labels

### Animation
- Smooth transitions (300ms ease)
- Scale on hover (1.02x)
- Fade in on scroll

## Usage in APEX LABS

These references are used for:
1. Dashboard design (`exportServicePremium.ts`)
2. Report HTML export styling
3. Mobile-responsive layouts
4. Dark mode color system

---
Scraped: January 2026
