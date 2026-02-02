import { chromium } from "playwright";

async function auditProdReport() {
  console.log("🔍 Auditing production report...\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    const url = "https://neurocore-360.onrender.com/analysis/92b8b8a3-1fa9-4b82-9232-63dfec2d152c?key=Badboy007";
    console.log(`📍 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(5000);

    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Check if error message
    const errorMsg = await page.locator('text="Rapport introuvable"').count();
    if (errorMsg > 0) {
      console.log("\n❌ ERROR: Rapport introuvable");
      await page.screenshot({ path: "/tmp/prod-report-error.png", fullPage: true });
      console.log("📸 Screenshot saved: /tmp/prod-report-error.png");
      return;
    }

    // Check background color
    const bodyBg = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return computed.backgroundColor;
    });
    console.log(`\n🎨 DESIGN:`);
    console.log(`   Body background: ${bodyBg}`);

    // Check for premium components
    const gradientMesh = await page.locator('.opacity-20').count();
    console.log(`   AnimatedGradientMesh: ${gradientMesh > 0 ? "✅ YES" : "❌ NO"}`);

    const progressCircle = await page.locator('svg circle[stroke="url(#scoreGradient)"]').count();
    console.log(`   BiometricProgressCircle: ${progressCircle > 0 ? "✅ YES" : "❌ NO"}`);

    const biomarkerCards = await page.locator('.grain-texture').count();
    console.log(`   BiomarkerCardPremium: ${biomarkerCards > 0 ? `✅ YES (${biomarkerCards} cards)` : "❌ NO"}`);

    // Check for AI content
    const hasContent = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.length;
    });
    console.log(`\n📝 CONTENT:`);
    console.log(`   Total text length: ${hasContent} characters`);

    // Check for specific sections
    const sections = await page.evaluate(() => {
      const nav = Array.from(document.querySelectorAll('nav a')).map(a => a.textContent?.trim());
      return nav;
    });
    console.log(`   Navigation sections: ${sections.length > 0 ? sections.join(', ') : 'NONE'}`);

    // Check markers count
    const markersCount = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/(\d+)\s+marqueurs/);
      return match ? match[1] : null;
    });
    console.log(`   Markers detected: ${markersCount || 'NONE'}`);

    // Check for AI analysis
    const aiSections = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h2, h3')).map(h => h.textContent?.trim());
      return headings;
    });
    console.log(`\n📊 AI SECTIONS:`);
    if (aiSections.length > 0) {
      aiSections.slice(0, 10).forEach(s => console.log(`   - ${s}`));
    } else {
      console.log(`   ❌ NO AI SECTIONS FOUND`);
    }

    // Take screenshots
    await page.screenshot({
      path: "/tmp/prod-report-full.png",
      fullPage: true
    });
    console.log(`\n📸 Screenshot saved: /tmp/prod-report-full.png`);

    // Check for empty state
    const isEmpty = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('introuvable') ||
             text.includes('erreur') ||
             text.length < 500;
    });

    if (isEmpty) {
      console.log(`\n❌ PROBLEM: Report appears to be empty or error state`);
    } else {
      console.log(`\n✅ Report has content`);
    }

    console.log(`\n✅ Audit complete!`);

  } catch (error) {
    console.error("❌ Error during audit:", error);
  } finally {
    await browser.close();
  }
}

auditProdReport();
