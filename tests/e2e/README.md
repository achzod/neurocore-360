# E2E Tests - Blood Analysis Dashboard

End-to-end tests for the ultra-premium blood analysis dashboard UI/UX refonte.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

3. **Blood dashboard tests are fixture-driven:**
   - `tests/e2e/blood-dashboard.spec.ts` mocks `/api/blood-analysis/report/:id`
   - No database seed and no `TEST_REPORT_ID` required for this spec

## Running Tests

### Run all tests (headless mode)
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### View test report
```bash
npm run test:e2e:report
```

### Run specific test file
```bash
npx playwright test tests/e2e/blood-dashboard.spec.ts
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Debug mode
```bash
npx playwright test --debug
```

## Test Suites

The E2E tests are organized into 6 test suites:

### 1. **Overview Tab Tests**
- Verifies RadialScoreChart displays correctly
- Verifies InteractiveHeatmap shows 6 categories
- Verifies AnimatedStatCards grid displays 6 panels
- Tests heatmap click navigation to Biomarkers tab
- Tests counter animations
- Tests glassmorphism and grain texture effects

### 2. **Keyboard Navigation Tests**
- Tests Tab key navigation through heatmap categories
- Tests Enter key activation of heatmap categories
- Tests Space key activation of heatmap categories
- Verifies visible focus states

### 3. **Responsive Layout Tests**
- Tests desktop layout (1920x1080)
- Tests tablet layout (768x1024)
- Tests mobile layout (375x667)
- Verifies no horizontal overflow on all breakpoints

### 4. **Accessibility Tests**
- Verifies ARIA attributes on RadialScoreChart
- Verifies ARIA attributes on InteractiveHeatmap
- Verifies ARIA attributes on AnimatedStatCards
- Tests prefers-reduced-motion support
- Verifies minimum touch target size (44px WCAG AA)

### 5. **Performance Tests**
- Tests page load time (<5 seconds)
- Verifies lazy loading of premium components
- Tests animation smoothness

## Test Configuration

Tests are configured in `playwright.config.ts`:

- **Test directory:** `tests/e2e`
- **Base URL:** `http://localhost:5000`
- **Browser:** Chromium (Desktop Chrome)
- **Retries:** 2 retries in CI, 0 locally
- **Web server:** Auto-starts dev server if not running

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TEST_REPORT_ID` | Legacy specs requiring real DB report | No |
| `E2E_BASE_URL` | Run tests against an existing deployment | No |
| `DISCOVERY_AUDIT_ID` | Discovery Scan audit ID for report smoke test | No |
| `ANABOLIC_AUDIT_ID` | Anabolic Bioscan audit ID for report smoke test | No |
| `ULTIMATE_AUDIT_ID` | Ultimate Scan audit ID for report smoke test | No |
| `CI` | Set to `true` in CI environment | No |

## Example Usage

```bash
# 1. Start dev server (optional - Playwright will auto-start)
npm run dev

# 2. Run tests locally
npm run test:e2e

# 2b. Run offer smoke tests against production
E2E_BASE_URL=https://neurocore-360.onrender.com npx playwright test tests/e2e/offers.spec.ts

# 2c. Run report smoke tests against production
E2E_BASE_URL=https://neurocore-360.onrender.com npx playwright test tests/e2e/reports.spec.ts

# 3. View report
npm run test:e2e:report
```

## CI/CD Integration

In CI environments, tests will:
- Auto-start the dev server
- Run with 2 retries
- Use single worker for stability
- Generate HTML report

Example GitHub Actions workflow:

```yaml
- name: Run E2E tests
  run: npm run test:e2e
```

## Troubleshooting

### Tests are skipped
**Cause:** You are running a legacy spec that needs seeded IDs (`reports.spec.ts`).
**Fix:** Set the matching env var (`DISCOVERY_AUDIT_ID`, `ANABOLIC_AUDIT_ID`, `ULTIMATE_AUDIT_ID`) or run fixture-driven specs.

### Dev server timeout
**Cause:** Dev server takes too long to start.
**Fix:** Increase `webServer.timeout` in `playwright.config.ts`.

### Browser not found
**Cause:** Playwright browsers not installed.
**Fix:** Run `npx playwright install chromium`.

### Tests fail on CI
**Cause:** Different screen sizes or timing issues.
**Fix:** Check screenshots in test report, adjust timeouts if needed.

## Test Coverage

Current test coverage:

- ✅ Blood dashboard overview rendering (score radial, heatmap, panel cards)
- ✅ Score visibility regressions (no hidden counters off-screen)
- ✅ Keyboard navigation via heatmap (Enter/Space -> Biomarkers tab)
- ✅ 8 tabs coverage (Overview, Biomarqueurs, Synthèse, Données & Tests, Axes, Plan, Protocoles, Annexes)
- ✅ Theme switching stability (M1, Claude, Titanium, Sand)
- ✅ Responsive overflow checks (desktop + mobile)
- ✅ Loading state when `aiReport` is absent
- ✅ Offer smoke tests including Blood Analysis CTA

## Future Improvements

Potential additions:

- [ ] Screenshot comparison tests
- [ ] Lighthouse performance audit integration
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Visual regression testing
- [ ] API mocking for offline testing
- [ ] Test data fixtures/factories

## Maintainers

- Created: 2026-01-31
- Last updated: 2026-01-31
- Maintainer: Claude Sonnet 4.5

For issues or questions, refer to the main project documentation.
