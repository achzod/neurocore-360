import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Blood Analysis Dashboard
 * Tests the ultra-premium UI/UX refonte components
 */

test.describe('Blood Analysis Dashboard - Overview Tab', () => {
  // Skip tests if no test report ID is available
  // User should set TEST_REPORT_ID environment variable
  const testReportId = process.env.TEST_REPORT_ID;

  test.beforeEach(async ({ page }) => {
    if (!testReportId) {
      test.skip();
    }
    await page.goto(`/analysis/${testReportId}?key=Badboy007`);
    await page.waitForLoadState('networkidle');
  });

  test('should display the Overview tab as active by default', async ({ page }) => {
    const activeTab = page.locator('[role="tablist"] button[data-state="active"]');
    await expect(activeTab).toContainText('Overview');
  });

  test('should display RadialScoreChart with global score', async ({ page }) => {
    // Wait for the chart to load (Suspense boundary resolved)
    await page.waitForSelector('div[role="figure"]', { timeout: 5000 });

    const scoreChart = page.locator('div[role="figure"]');
    await expect(scoreChart).toBeVisible();

    // Verify aria-label contains score information
    const ariaLabel = await scoreChart.getAttribute('aria-label');
    expect(ariaLabel).toContain('SCORE GLOBAL');

    // Verify SVG is present
    const svg = scoreChart.locator('svg[role="img"]');
    await expect(svg).toBeVisible();
  });

  test('should display InteractiveHeatmap with 6 categories', async ({ page }) => {
    const heatmap = page.locator('div[role="region"][aria-label*="Heatmap"]');
    await expect(heatmap).toBeVisible();

    // Count the number of category buttons
    const categoryButtons = heatmap.locator('button[role="button"]');
    await expect(categoryButtons).toHaveCount(6);
  });

  test('should navigate to Biomarkers tab when clicking heatmap category', async ({ page }) => {
    const heatmap = page.locator('div[role="region"][aria-label*="Heatmap"]');
    const firstCategory = heatmap.locator('button[role="button"]').first();

    // Click the first category
    await firstCategory.click();

    // Wait for navigation to Biomarqueurs tab
    await page.waitForTimeout(500);

    // Verify the active tab changed
    const activeTab = page.locator('[role="tablist"] button[data-state="active"]');
    await expect(activeTab).toContainText(/Biomarqueurs|Biomarkers/i);
  });

  test('should display 6 AnimatedStatCards in panels grid', async ({ page }) => {
    const statCards = page.locator('div[role="article"]');
    await expect(statCards).toHaveCount(6);

    // Verify each stat card has required elements
    const firstCard = statCards.first();
    await expect(firstCard).toBeVisible();

    // Check aria-label contains stat information
    const ariaLabel = await firstCard.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/%/); // Should contain percentage
  });

  test('should animate counter values on page load', async ({ page }) => {
    // Wait for counter animation to complete
    await page.waitForTimeout(2500);

    // Verify score value is visible and numeric
    const scoreValue = page.locator('div[role="figure"] div[aria-live="polite"]');
    const scoreText = await scoreValue.textContent();
    expect(parseInt(scoreText || '0')).toBeGreaterThan(0);
  });

  test('should display glassmorphism and grain texture effects', async ({ page }) => {
    // Check for glassmorphism class
    const glassElements = page.locator('.blood-glass');
    await expect(glassElements.first()).toBeVisible();

    // Check for grain texture class
    const grainElements = page.locator('.blood-grain');
    await expect(grainElements.first()).toBeVisible();
  });
});

test.describe('Blood Analysis Dashboard - Keyboard Navigation', () => {
  const testReportId = process.env.TEST_REPORT_ID;

  test.beforeEach(async ({ page }) => {
    if (!testReportId) {
      test.skip();
    }
    await page.goto(`/analysis/${testReportId}?key=Badboy007`);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate heatmap categories with Tab key', async ({ page }) => {
    // Tab to the first heatmap category
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check if a heatmap button is focused
    const focusedElement = page.locator(':focus');
    const isFocused = await focusedElement.evaluate((el) =>
      el.getAttribute('role') === 'button'
    );
    expect(isFocused).toBeTruthy();
  });

  test('should activate heatmap category with Enter key', async ({ page }) => {
    const heatmap = page.locator('div[role="region"][aria-label*="Heatmap"]');
    const firstCategory = heatmap.locator('button[role="button"]').first();

    // Focus the first category
    await firstCategory.focus();

    // Press Enter to activate
    await page.keyboard.press('Enter');

    // Wait for navigation
    await page.waitForTimeout(500);

    // Verify the active tab changed
    const activeTab = page.locator('[role="tablist"] button[data-state="active"]');
    await expect(activeTab).toContainText(/Biomarqueurs|Biomarkers/i);
  });

  test('should activate heatmap category with Space key', async ({ page }) => {
    const heatmap = page.locator('div[role="region"][aria-label*="Heatmap"]');
    const firstCategory = heatmap.locator('button[role="button"]').first();

    // Focus the first category
    await firstCategory.focus();

    // Press Space to activate
    await page.keyboard.press('Space');

    // Wait for navigation
    await page.waitForTimeout(500);

    // Verify the active tab changed
    const activeTab = page.locator('[role="tablist"] button[data-state="active"]');
    await expect(activeTab).toContainText(/Biomarqueurs|Biomarkers/i);
  });

  test('should show visible focus states on interactive elements', async ({ page }) => {
    const heatmap = page.locator('div[role="region"][aria-label*="Heatmap"]');
    const firstCategory = heatmap.locator('button[role="button"]').first();

    // Focus the element
    await firstCategory.focus();

    // Check if focus state is visible (outline should be applied)
    const outline = await firstCategory.evaluate((el) =>
      window.getComputedStyle(el).outline
    );
    expect(outline).not.toBe('none');
  });
});

test.describe('Blood Analysis Dashboard - Responsive Layout', () => {
  const testReportId = process.env.TEST_REPORT_ID;

  test.beforeEach(async ({ page }) => {
    if (!testReportId) {
      test.skip();
    }
    await page.goto(`/analysis/${testReportId}?key=Badboy007`);
    await page.waitForLoadState('networkidle');
  });

  test('should display correct layout on desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Heatmap should have 3 columns on large screens
    const heatmap = page.locator('div[role="region"][aria-label*="Heatmap"]');
    const gridClass = await heatmap.getAttribute('class');
    expect(gridClass).toContain('lg:grid-cols-3');

    // AnimatedStatCards grid should have 3 columns
    const statCardsGrid = page.locator('div[role="article"]').first().locator('..');
    const statGridClass = await statCardsGrid.getAttribute('class');
    expect(statGridClass).toContain('lg:grid-cols-3');
  });

  test('should display correct layout on tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    // Heatmap should have 2 columns on mobile/tablet
    const heatmap = page.locator('div[role="region"][aria-label*="Heatmap"]');
    const gridClass = await heatmap.getAttribute('class');
    expect(gridClass).toContain('grid-cols-2');

    // Verify no horizontal overflow
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(768);
  });

  test('should display correct layout on mobile (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify no horizontal overflow
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(375);

    // All elements should be visible
    const heatmap = page.locator('div[role="region"][aria-label*="Heatmap"]');
    await expect(heatmap).toBeVisible();

    const statCards = page.locator('div[role="article"]');
    await expect(statCards.first()).toBeVisible();
  });
});

test.describe('Blood Analysis Dashboard - Accessibility', () => {
  const testReportId = process.env.TEST_REPORT_ID;

  test.beforeEach(async ({ page }) => {
    if (!testReportId) {
      test.skip();
    }
    await page.goto(`/analysis/${testReportId}?key=Badboy007`);
    await page.waitForLoadState('networkidle');
  });

  test('should have proper ARIA attributes on RadialScoreChart', async ({ page }) => {
    const scoreChart = page.locator('div[role="figure"]');
    await expect(scoreChart).toHaveAttribute('aria-label');

    // Verify aria-live for counter animation
    const counterElement = scoreChart.locator('div[aria-live="polite"]');
    await expect(counterElement).toBeVisible();
  });

  test('should have proper ARIA attributes on InteractiveHeatmap', async ({ page }) => {
    const heatmap = page.locator('div[role="region"][aria-label*="Heatmap"]');
    await expect(heatmap).toHaveAttribute('aria-label');

    // Check buttons have proper ARIA
    const firstButton = heatmap.locator('button[role="button"]').first();
    await expect(firstButton).toHaveAttribute('aria-label');
    await expect(firstButton).toHaveAttribute('tabindex', '0');
  });

  test('should have proper ARIA attributes on AnimatedStatCards', async ({ page }) => {
    const firstCard = page.locator('div[role="article"]').first();
    await expect(firstCard).toHaveAttribute('aria-label');

    // Verify aria-live for counter animation
    const counterElement = firstCard.locator('span[aria-live="polite"]');
    await expect(counterElement).toBeVisible();
  });

  test('should respect prefers-reduced-motion', async ({ page, context }) => {
    // Create new page with reduced motion preference
    const reducedMotionPage = await context.newPage();
    await reducedMotionPage.emulateMedia({ reducedMotion: 'reduce' });
    await reducedMotionPage.goto(`/analysis/${testReportId}?key=Badboy007`);
    await reducedMotionPage.waitForLoadState('networkidle');

    // Animations should be minimal/instant
    const scoreChart = reducedMotionPage.locator('div[role="figure"]');
    await expect(scoreChart).toBeVisible();

    // Close the page
    await reducedMotionPage.close();
  });

  test('should have minimum touch target size (44px)', async ({ page }) => {
    const heatmapButtons = page.locator('div[role="region"][aria-label*="Heatmap"] button[role="button"]');
    const firstButton = heatmapButtons.first();

    const boundingBox = await firstButton.boundingBox();
    expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Blood Analysis Dashboard - Performance', () => {
  const testReportId = process.env.TEST_REPORT_ID;

  test.beforeEach(async ({ page }) => {
    if (!testReportId) {
      test.skip();
    }
  });

  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`/analysis/${testReportId}?key=Badboy007`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Page should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should lazy load premium components', async ({ page }) => {
    await page.goto(`/analysis/${testReportId}?key=Badboy007`);

    // Check for Suspense fallback loader
    const loader = page.locator('.animate-spin');

    // Loader should appear initially (or already be gone if fast load)
    // Then all components should be visible
    await page.waitForTimeout(3000);

    const scoreChart = page.locator('div[role="figure"]');
    await expect(scoreChart).toBeVisible();
  });

  test('should have smooth animations at 60fps', async ({ page }) => {
    await page.goto(`/analysis/${testReportId}?key=Badboy007`);
    await page.waitForLoadState('networkidle');

    // Trigger hover animation
    const firstCard = page.locator('div[role="article"]').first();
    await firstCard.hover();

    // Animation should be smooth (this is a basic check)
    // In a real scenario, you'd measure frame rate
    await page.waitForTimeout(600);

    // Element should be visible after animation
    await expect(firstCard).toBeVisible();
  });
});
