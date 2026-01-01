# Design Guidelines: Audit Métabolique Complet

## Design Approach
**Selected Approach:** Reference-Based (Health & Wellness)
**Primary References:** Headspace (calming professionalism), Notion (clean forms), Apple Health (data clarity)
**Rationale:** Medical/health tools require trust, clarity, and calm aesthetics while handling complex forms and data visualization.

## Core Design Principles
1. **Medical Trust:** Professional, clean, reassuring visual language
2. **Progressive Disclosure:** Show complexity gradually, not all at once
3. **Data Confidence:** Clear, scannable information hierarchy for results
4. **Guided Experience:** Users should never feel lost in the audit process

## Typography
- **Primary:** Inter (via Google Fonts)
- **Headings:** 700 weight, tracking-tight
- **Body:** 400 weight, leading-relaxed for readability
- **Data/Numbers:** 600 weight tabular-nums for consistency
- **Sizes:** text-4xl (headings), text-xl (subheadings), text-base (body), text-sm (labels)

## Layout System
**Spacing Units:** Tailwind 4, 6, 8, 12, 16 for consistent rhythm
- Section padding: py-16 desktop, py-12 mobile
- Card spacing: p-6 to p-8
- Form field gaps: gap-4 to gap-6
- Button padding: px-6 py-3

**Container Strategy:**
- Max width: max-w-4xl for forms, max-w-7xl for dashboards
- Centered layouts: mx-auto
- Form sections: Single column (max-w-2xl) for focus

## Component Library

### Navigation
- Sticky header with progress indicator for multi-step audit
- Breadcrumb trail showing current section
- Desktop: Horizontal nav with step indicators
- Mobile: Condensed hamburger with clear current step

### Forms (Critical Component)
- Input groups with clear labels above fields
- Help text below inputs (text-sm text-gray-600)
- Radio/checkbox groups with ample spacing (gap-4)
- Range sliders with visible current values
- Dropdown selects with search capability for long lists
- Multi-step form with "Save & Continue" + "Back" buttons
- Auto-save indicators for peace of mind

### Cards & Sections
- Audit sections: Rounded corners (rounded-xl), shadow-sm
- Question cards: White background, p-8, mb-6
- Result cards: Grid layout (2 columns desktop), prominent metrics
- Info cards: Border-l-4 accent for tips/warnings

### Data Visualization
- Progress rings for completion percentages
- Bar charts for comparative metrics
- Simple line graphs for trends (if applicable)
- Score displays: Large numbers (text-5xl) with context labels

### Buttons & CTAs
- Primary: Solid background, px-6 py-3, rounded-lg
- Secondary: Outlined, same padding
- Disabled state: Reduced opacity (opacity-50)
- Full-width on mobile, auto-width on desktop

### Results Dashboard
- Hero stats section: Grid of key metrics (3-4 cards)
- Detailed breakdown: Accordion sections by category
- Downloadable PDF report button (prominent)
- Share/save functionality clearly visible

## Hero Section
**Design:** Medical-professional image showing health/wellness context
**Image Description:** Soft-focus image of fresh vegetables, fitness equipment, or peaceful wellness environment. Should convey health without clinical coldness.
**Layout:** 
- 50vh height (not full viewport)
- Overlay with semi-transparent gradient
- Centered text: "Audit Métabolique Complet" (text-5xl)
- Subheading explaining purpose (text-xl)
- Primary CTA: "Commencer l'Audit" with blurred background (backdrop-blur-sm)

## Page Structure

### Landing Page
1. Hero (with image as described above)
2. "Comment ça marche" - 3 steps explanation (grid-cols-1 md:grid-cols-3)
3. "Pourquoi faire cet audit" - Benefits section with icons
4. Testimonials/Trust signals (2-column layout)
5. Final CTA section
6. Footer with legal/contact info

### Audit Form Pages
- Persistent header with progress
- Single-question or grouped-questions layout
- Sidebar with tips/context (desktop only)
- Fixed bottom bar with navigation buttons

### Results Page
- Summary hero (no image, stats-focused)
- Detailed metrics sections (accordion style)
- Recommendations cards
- Next steps CTA

## Images
- **Hero Image:** Required - wellness/health context as described
- **Section Icons:** Use Heroicons throughout (CDN)
- **Results Graphics:** Charts via Chart.js library
- **No other photographic images needed** - focus on data clarity

## Animations
**Minimal approach:**
- Form validation: Subtle shake on error
- Progress bar: Smooth width transitions
- Section reveals: Gentle fade-in (duration-300)
- NO scroll animations or page transitions

## Accessibility
- Clear focus states on all interactive elements (ring-2 ring-offset-2)
- ARIA labels on all form inputs
- Keyboard navigation throughout
- Sufficient contrast ratios (WCAG AA minimum)
- Form error messages announced to screen readers

## Mobile Considerations
- Stack all multi-column layouts to single column
- Touch-friendly tap targets (min 44px height)
- Bottom sheet for mobile selection menus
- Sticky submit buttons within thumb reach
- Simplified header on mobile (logo + hamburger)