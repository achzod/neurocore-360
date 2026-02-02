import { chromium } from "playwright";

async function auditCodexImplementation() {
  console.log("🔍 Auditing Codex's biohacking premium UI implementation...\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    // Navigate to the blood report
    const url = "http://localhost:5000/analysis/726f914f-171e-450e-9f8b-0369d49f47e1?key=Badboy007";
    console.log(`📍 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check background color
    const bodyBg = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return computed.backgroundColor;
    });
    console.log(`\n🎨 DESIGN ELEMENTS:`);
    console.log(`   Body background: ${bodyBg}`);

    // Check if premium components are present
    const gradientMesh = await page.locator(".opacity-20").count();
    console.log(`   AnimatedGradientMesh present: ${gradientMesh > 0 ? "✅ YES" : "❌ NO"}`);

    // Check BiometricProgressCircle
    const progressCircle = await page.locator('svg circle[stroke="url(#scoreGradient)"]').count();
    console.log(`   BiometricProgressCircle present: ${progressCircle > 0 ? "✅ YES" : "❌ NO"}`);

    // Check BiomarkerCardPremium
    const biomarkerCards = await page.locator('.grain-texture').count();
    console.log(`   BiomarkerCardPremium (grain-texture): ${biomarkerCards > 0 ? `✅ YES (${biomarkerCards} cards)` : "❌ NO"}`);

    // Check font families
    const fonts = await page.evaluate(() => {
      const displays = Array.from(document.querySelectorAll('.font-display'));
      const bodies = Array.from(document.querySelectorAll('.font-body'));
      const datas = Array.from(document.querySelectorAll('.font-data'));

      return {
        display: displays.length,
        body: bodies.length,
        data: datas.length,
      };
    });
    console.log(`\n📝 TYPOGRAPHY:`);
    console.log(`   font-display elements: ${fonts.display}`);
    console.log(`   font-body elements: ${fonts.body}`);
    console.log(`   font-data elements: ${fonts.data}`);

    // Check status glows
    const glows = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[class*="shadow-[0_0_"]'));
      return elements.length;
    });
    console.log(`\n✨ EFFECTS:`);
    console.log(`   Status glow effects: ${glows > 0 ? `✅ ${glows} elements` : "❌ NONE"}`);

    // Check animations
    const animations = await page.evaluate(() => {
      const motionDivs = Array.from(document.querySelectorAll('[class*="motion"]'));
      return motionDivs.length;
    });
    console.log(`   Framer Motion animations: ${animations > 0 ? `✅ ${animations} elements` : "❌ NONE"}`);

    // Check for emojis (should be ZERO)
    const emojis = await page.evaluate(() => {
      const text = document.body.innerText;
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      const matches = text.match(emojiRegex);
      return matches ? matches.length : 0;
    });
    console.log(`\n🚫 PROFESSIONAL CHECK:`);
    console.log(`   Emojis found: ${emojis === 0 ? "✅ NONE (perfect!)" : `❌ ${emojis} emojis still present`}`);

    // Check theme (should be dark medical)
    const isDark = await page.evaluate(() => {
      const html = document.documentElement;
      return html.classList.contains('dark') || html.classList.contains('blood-report-premium');
    });
    console.log(`   Dark medical theme: ${isDark ? "✅ YES" : "❌ NO (still light theme)"}`);

    // Performance checks
    const bundleSize = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.length;
    });
    console.log(`\n⚡ PERFORMANCE:`);
    console.log(`   Script tags loaded: ${bundleSize}`);

    // Check for barrel imports (should be direct imports now)
    const hasDirectImports = await page.evaluate(() => {
      // This is a proxy check - we can't directly check imports from browser
      // but we can check if icons are rendering
      const icons = Array.from(document.querySelectorAll('svg'));
      return icons.length;
    });
    console.log(`   SVG icons rendered: ${hasDirectImports > 0 ? `✅ ${hasDirectImports} icons` : "❌ NONE"}`);

    // Take screenshots
    await page.screenshot({
      path: "/tmp/codex-implementation-full.png",
      fullPage: true
    });
    console.log(`\n📸 Screenshot saved: /tmp/codex-implementation-full.png`);

    // Scroll to biomarker cards and take close-up
    const cardsSection = await page.locator('.grain-texture').first();
    if (await cardsSection.count() > 0) {
      await cardsSection.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "/tmp/codex-biomarker-cards.png"
      });
      console.log(`📸 Biomarker cards screenshot: /tmp/codex-biomarker-cards.png`);
    }

    // Scroll to progress circle
    const circleSection = await page.locator('svg circle[stroke="url(#scoreGradient)"]').first();
    if (await circleSection.count() > 0) {
      await circleSection.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "/tmp/codex-progress-circle.png"
      });
      console.log(`📸 Progress circle screenshot: /tmp/codex-progress-circle.png`);
    }

    console.log(`\n✅ Audit complete!`);

  } catch (error) {
    console.error("❌ Error during audit:", error);
  } finally {
    await browser.close();
  }
}

auditCodexImplementation();
