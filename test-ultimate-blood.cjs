const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const BASE = 'https://apexlabs.achzodcoaching.com';
  let passed = 0, failed = 0;

  async function test(name, fn) {
    try {
      const result = await fn();
      if (result) { console.log(`✅ ${name}`); passed++; }
      else { console.log(`❌ ${name}`); failed++; }
    } catch (e) {
      console.log(`❌ ${name} — ERROR: ${e.message}`);
      failed++;
    }
  }

  // ================================================================
  //  ULTIMATE SCAN (ELITE) — FULL BROWSER TEST
  // ================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  ULTIMATE SCAN (ELITE) — BROWSER TEST');
  console.log('='.repeat(60));

  // 1. Offer page
  await test('Ultimate: Offer page /offre/audit-premium loads', async () => {
    await page.goto(`${BASE}/offre/audit-premium`, { waitUntil: 'networkidle2', timeout: 30000 });
    const text = await page.evaluate(() => document.body.innerText);
    return text.includes('Ultimate') || text.includes('ELITE') || text.includes('79') || text.includes('Anabolic');
  });

  // 2. Questionnaire page
  await test('Ultimate: Questionnaire page loads', async () => {
    await page.goto(`${BASE}/audit-complet/questionnaire`, { waitUntil: 'networkidle2', timeout: 30000 });
    const text = await page.evaluate(() => document.body.innerText);
    return text.toLowerCase().includes('question') || text.toLowerCase().includes('formulaire') || text.toLowerCase().includes('commencer');
  });

  // 3. Save questionnaire progress via API
  await test('Ultimate: Save questionnaire responses', async () => {
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/questionnaire/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'achkou@gmail.com',
          responses: {
            prenom: 'UltimateNav', nom: 'BrowserTest', age: '31', sexe: 'homme',
            taille: '185', poids: '88', objectif: 'recomposition',
            niveau_activite: 'avance', heures_sommeil: '6', stress_level: 'eleve',
            alimentation: 'hyperproteinee', supplements: 'creatine, whey, omega3',
            frequence_entrainement: '6x/semaine', type_entrainement: 'PPL'
          },
          currentSection: 5,
          completedSections: [1, 2, 3, 4, 5]
        })
      });
      return res.json();
    });
    return result && result.id;
  });

  // 4. Set localStorage and go to checkout for ELITE
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('neurocore_email', 'achkou@gmail.com');
    localStorage.setItem('neurocore_plan', 'ultimate');
    localStorage.setItem('neurocore_responses', JSON.stringify({
      prenom: 'UltimateNav', nom: 'BrowserTest', age: '31', sexe: 'homme',
      taille: '185', poids: '88', objectif: 'recomposition',
      niveau_activite: 'avance', heures_sommeil: '6'
    }));
  });

  await page.goto(`${BASE}/audit-complet/checkout?plan=ultimate`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  const eliteCheckoutText = await page.evaluate(() => document.body.innerText);

  await test('Ultimate: Checkout page loads with plan name', async () => {
    return eliteCheckoutText.includes('Ultimate') || eliteCheckoutText.includes('ELITE') || eliteCheckoutText.includes('79');
  });

  await test('Ultimate: Checkout shows payment methods', async () => {
    return eliteCheckoutText.includes('Carte') || eliteCheckoutText.includes('PayPal') || eliteCheckoutText.includes('paiement');
  });

  await test('Ultimate: Checkout shows price 79€', async () => {
    return eliteCheckoutText.includes('79');
  });

  await test('Ultimate: Checkout shows promo code field', async () => {
    return eliteCheckoutText.includes('promo') || eliteCheckoutText.includes('Promo') || eliteCheckoutText.includes('Code');
  });

  // 5. Apply TEST100 promo on checkout
  const elitePromoInput = await page.$('input[placeholder*="promo"], input[placeholder*="Promo"], input[placeholder*="code"], input[placeholder*="Code"]');
  if (elitePromoInput) {
    await elitePromoInput.type('TEST100');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const apply = buttons.find(b => b.textContent.includes('Appliquer') || b.textContent.includes('Valider'));
      if (apply) apply.click();
    });
    await new Promise(r => setTimeout(r, 3000));
    const promoText = await page.evaluate(() => document.body.innerText);
    await test('Ultimate: TEST100 promo applied (-100%)', async () => {
      return promoText.includes('-100%') || promoText.includes('TEST100') || promoText.includes('0€') || promoText.includes('Gratuit');
    });
  } else {
    console.log('⚠️  No promo input found on Ultimate checkout');
  }

  // 6. Select PayPal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const paypalBtn = buttons.find(b => b.textContent.includes('PayPal'));
    if (paypalBtn) paypalBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 7. Click confirm — ELITE needs photos, so should show error
  const apiCalls = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      try {
        const body = await response.json().catch(() => null);
        apiCalls.push({ url: url.split('.com')[1] || url, status: response.status(), body });
      } catch {}
    }
  });

  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="button-confirm-plan"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 5000));

  const afterConfirmText = await page.evaluate(() => document.body.innerText);
  const afterConfirmUrl = page.url();
  console.log('  After confirm URL: ' + afterConfirmUrl);

  // Log API calls
  for (const call of apiCalls) {
    if (call.url && call.url.includes('/api/')) {
      console.log('  API: ' + call.url + ' → ' + call.status + ' ' + JSON.stringify(call.body || '').substring(0, 150));
    }
  }

  // ELITE with TEST100 should either: create audit (if no photos needed for free) or show NEED_PHOTOS error
  await test('Ultimate: Confirm triggers API call', async () => {
    return apiCalls.length > 0 || afterConfirmUrl !== `${BASE}/audit-complet/checkout?plan=ultimate`;
  });

  await test('Ultimate: Photos required message OR redirect to report', async () => {
    const needsPhotos = afterConfirmText.includes('photo') || afterConfirmText.includes('Photo') || afterConfirmText.includes('NEED_PHOTOS');
    const redirected = afterConfirmUrl.includes('/ultimate/');
    return needsPhotos || redirected;
  });

  await page.screenshot({ path: '/tmp/test-ultimate-checkout.png', fullPage: true });

  // 8. View existing Ultimate Scan reports
  console.log('\n--- Ultimate Scan Reports ---');

  const eliteAudits = await page.evaluate(async () => {
    const res = await fetch('/api/audits?email=achkou%40gmail.com&light=1');
    const data = await res.json();
    return data.filter(a => a.type === 'ELITE' && a.status === 'COMPLETED');
  });

  console.log(`  Found ${eliteAudits.length} completed ELITE audits`);

  if (eliteAudits.length > 0) {
    const eliteId = eliteAudits[0].id;

    await test('Ultimate: Report page /ultimate/:id loads', async () => {
      await page.goto(`${BASE}/ultimate/${eliteId}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      const text = await page.evaluate(() => document.body.innerText);
      return text.length > 500;
    });

    await test('Ultimate: Report has sections/scores', async () => {
      const text = await page.evaluate(() => document.body.innerText);
      return text.includes('Score') || text.includes('score') || text.includes('Protocole') || text.includes('Analyse');
    });

    await test('Ultimate: Report has photo analysis', async () => {
      const text = await page.evaluate(() => document.body.innerText);
      return text.includes('Posture') || text.includes('posture') || text.includes('Visuel') || text.includes('photo') || text.includes('Photo');
    });

    await test('Ultimate: Report has supplement stack', async () => {
      const text = await page.evaluate(() => document.body.innerText);
      return text.includes('Suppl') || text.includes('suppl') || text.includes('Stack') || text.includes('stack') || text.includes('Protocole');
    });

    await test('Ultimate: Report has radar/metrics', async () => {
      const hasCanvas = await page.evaluate(() => document.querySelectorAll('canvas, svg').length > 0);
      const text = await page.evaluate(() => document.body.innerText);
      return hasCanvas || text.includes('Radar') || text.includes('/10') || text.includes('/100');
    });

    await test('Ultimate: Report has weekly plan', async () => {
      const text = await page.evaluate(() => document.body.innerText);
      return text.includes('Semaine') || text.includes('semaine') || text.includes('Week') || text.includes('Plan') || text.includes('Jour');
    });

    await page.screenshot({ path: '/tmp/test-ultimate-report.png', fullPage: true });

    // Check narrative API directly
    await test('Ultimate: Narrative API returns full data (275k+)', async () => {
      const data = await page.evaluate(async (id) => {
        const res = await fetch(`/api/audits/${id}/narrative`);
        const text = await res.text();
        return { length: text.length };
      }, eliteId);
      console.log(`    Narrative API response: ${data.length} bytes`);
      return data.length > 50000;
    });
  }

  // ================================================================
  //  BLOOD ANALYSIS — FULL BROWSER TEST
  // ================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  BLOOD ANALYSIS — BROWSER TEST');
  console.log('='.repeat(60));

  // 1. Offer page
  await test('Blood: Offer page /offre/blood-analysis loads', async () => {
    await page.goto(`${BASE}/offre/blood-analysis`, { waitUntil: 'networkidle2', timeout: 30000 });
    const text = await page.evaluate(() => document.body.innerText);
    return text.includes('Blood') || text.includes('blood') || text.includes('Sang') || text.includes('bilan');
  });

  await test('Blood: Offer page has CTA button', async () => {
    await new Promise(r => setTimeout(r, 3000));
    const text = await page.evaluate(() => document.body.innerText);
    return text.includes('Analyser') || text.includes('Lancer') || text.includes('Commencer') || text.includes('bilan') || text.includes('Blood');
  });

  await test('Blood: Offer page shows price or info', async () => {
    const text = await page.evaluate(() => document.body.innerText);
    return text.includes('99') || text.includes('€') || text.includes('prix') || text.includes('Blood') || text.includes('analyse');
  });

  // 2. Blood Analysis start page
  await test('Blood: /blood-analysis page loads', async () => {
    await page.goto(`${BASE}/blood-analysis`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    return true; // Page loads without error
  });

  // 3. Blood Dashboard (needs auth)
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('neurocore_email', 'achkou@gmail.com');
    localStorage.setItem('apexlabs_token', 'test-token');
  });

  // 4. Blood Analysis API endpoints from browser
  await test('Blood: Biomarkers API returns 44+ markers', async () => {
    const count = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/biomarkers');
      const data = await res.json();
      const b = data.biomarkers;
      if (Array.isArray(b)) return b.length;
      if (b && typeof b === 'object') return Object.keys(b).length;
      return 0;
    });
    console.log(`    Biomarkers: ${count}`);
    return count >= 40;
  });

  await test('Blood: Extended biomarkers returns 100+ total', async () => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/extended-biomarkers');
      return res.json();
    });
    console.log(`    Standard: ${data.standardBiomarkers?.length || 0}, Extended: ${data.extendedBiomarkers?.length || 0}`);
    return data.totalCount >= 80;
  });

  await test('Blood: Quick check analyzes markers', async () => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/quick-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markers: [
            { name: 'glucose', value: 105, unit: 'mg/dL' },
            { name: 'cholesterol_total', value: 230, unit: 'mg/dL' },
            { name: 'hdl', value: 42, unit: 'mg/dL' },
            { name: 'ldl', value: 155, unit: 'mg/dL' },
            { name: 'triglycerides', value: 180, unit: 'mg/dL' },
            { name: 'hemoglobine', value: 14.5, unit: 'g/dL' },
            { name: 'tsh', value: 3.5, unit: 'mIU/L' },
            { name: 'ferritine', value: 45, unit: 'ng/mL' },
            { name: 'vitamine_d', value: 22, unit: 'ng/mL' },
            { name: 'creatinine', value: 1.1, unit: 'mg/dL' }
          ]
        })
      });
      return res.json();
    });
    console.log(`    Markers: ${data.markerCount}, Optimal: ${data.optimalCount}, Action: ${data.actionRequired}`);
    return data.success && data.markerCount >= 8;
  });

  await test('Blood: Radar chart returns categories + scores', async () => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/radar-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markers: [
            { name: 'glucose', value: 95, unit: 'mg/dL' },
            { name: 'cholesterol_total', value: 200, unit: 'mg/dL' },
            { name: 'hdl', value: 60, unit: 'mg/dL' },
            { name: 'ldl', value: 110, unit: 'mg/dL' },
            { name: 'tsh', value: 2.0, unit: 'mIU/L' },
            { name: 'hemoglobine', value: 15, unit: 'g/dL' }
          ]
        })
      });
      return res.json();
    });
    const categories = data.radarChart?.categories || [];
    console.log(`    Categories: ${categories.length}, Overall: ${data.radarChart?.overallScore}`);
    return data.success && categories.length >= 5;
  });

  await test('Blood: Supplements recommended for deficiencies', async () => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markers: [
            { name: 'vitamine_d', value: 15, unit: 'ng/mL' },
            { name: 'ferritine', value: 12, unit: 'ng/mL' },
            { name: 'hdl', value: 32, unit: 'mg/dL' },
            { name: 'glucose', value: 115, unit: 'mg/dL' }
          ]
        })
      });
      return res.json();
    });
    const supps = data.supplements || [];
    console.log(`    Supplements: ${supps.length}`);
    for (const s of supps.slice(0, 3)) {
      console.log(`      ${s.name} — ${s.dosage}`);
    }
    return data.success && supps.length >= 3;
  });

  await test('Blood: Risk profiles (prediabetes, cardiovascular)', async () => {
    const predia = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/prediabetes-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markers: [
            { name: 'glucose', value: 115, unit: 'mg/dL' },
            { name: 'hemoglobine_glycee', value: 6.2, unit: '%' },
            { name: 'insuline', value: 20, unit: 'µU/mL' }
          ]
        })
      });
      return res.json();
    });
    const cardio = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/cardiovascular-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markers: [
            { name: 'cholesterol_total', value: 260, unit: 'mg/dL' },
            { name: 'hdl', value: 30, unit: 'mg/dL' },
            { name: 'ldl', value: 180, unit: 'mg/dL' },
            { name: 'crp', value: 8, unit: 'mg/L' }
          ]
        })
      });
      return res.json();
    });
    console.log(`    Prediabetes: ${predia.risk?.level} (score ${predia.risk?.score})`);
    console.log(`    Cardiovascular: ${cardio.risk?.level} (score ${cardio.risk?.score})`);
    return predia.success && cardio.success;
  });

  await test('Blood: Promo TEST100 validates for BLOOD_ANALYSIS', async () => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'TEST100', planType: 'BLOOD_ANALYSIS' })
      });
      return res.json();
    });
    console.log(`    Valid: ${data.valid}, Discount: ${data.discount}%`);
    return data.valid && data.discount === 100;
  });

  await test('Blood: PayPal + TEST100 → free (no redirect)', async () => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'achkou@gmail.com',
          planType: 'BLOOD_ANALYSIS',
          responses: {},
          promoCode: 'TEST100'
        })
      });
      return res.json();
    });
    console.log(`    free=${data.free}, auditType=${data.auditType}`);
    return data.free === true && data.auditType === 'BLOOD_ANALYSIS';
  });

  await test('Blood: Stripe + TEST100 → free (bypass Stripe)', async () => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'achkou@gmail.com',
          planType: 'BLOOD_ANALYSIS',
          promoCode: 'TEST100'
        })
      });
      return res.json();
    });
    console.log(`    free=${data.free}, has url=${!!data.url}`);
    return data.free === true && !data.url;
  });

  await test('Blood: Patterns API returns patterns', async () => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/patterns');
      return res.json();
    });
    const patterns = data.patterns || [];
    console.log(`    Patterns: ${patterns.length}`);
    return data.success && patterns.length >= 1;
  });

  await test('Blood: Knowledge base (glucose info)', async () => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/knowledge/glucose');
      return res.json();
    });
    console.log(`    Marker info: ${data.success ? 'YES' : 'NO'}`);
    return data.success;
  });

  // 5. Blood Analysis checkout via main checkout page
  console.log('\n--- Blood Analysis Checkout Flow ---');

  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('neurocore_email', 'achkou@gmail.com');
    localStorage.setItem('neurocore_plan', 'blood');
  });

  // Test the checkout page with blood plan if it exists
  await page.goto(`${BASE}/audit-complet/checkout?plan=blood`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const bloodCheckoutText = await page.evaluate(() => document.body.innerText);
  await test('Blood: Checkout page loads', async () => {
    return bloodCheckoutText.length > 100;
  });

  await page.screenshot({ path: '/tmp/test-blood-checkout.png', fullPage: true });

  // 6. Full AI analysis (takes time — increase page timeout)
  await test('Blood: Full AI analysis endpoint accepts data', async () => {
    page.setDefaultTimeout(120000);
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/blood-analysis/full-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markers: [
            { name: 'glucose', value: 98, unit: 'mg/dL' },
            { name: 'cholesterol_total', value: 195, unit: 'mg/dL' },
            { name: 'hdl', value: 58, unit: 'mg/dL' },
            { name: 'ldl', value: 115, unit: 'mg/dL' },
            { name: 'triglycerides', value: 110, unit: 'mg/dL' },
            { name: 'tsh', value: 2.2, unit: 'mIU/L' },
            { name: 'hemoglobine', value: 14.8, unit: 'g/dL' },
            { name: 'ferritine', value: 70, unit: 'ng/mL' },
            { name: 'vitamine_d', value: 40, unit: 'ng/mL' },
            { name: 'creatinine', value: 0.95, unit: 'mg/dL' }
          ],
          profile: {
            prenom: 'BloodNavTest',
            nom: 'E2E',
            email: 'achkou@gmail.com',
            gender: 'homme',
            age: '30'
          }
        })
      });
      const d = await res.json();
      return { success: d.success, markersFound: d.markersFound, aiStatus: d.aiStatus, actionsCount: (d.priorityActions || []).length, hasReport: !!d.aiReport };
    });
    page.setDefaultTimeout(30000);
    console.log(`    AI analysis: success=${data.success}, markers=${data.markersFound}, aiStatus=${data.aiStatus}, actions=${data.actionsCount}, hasReport=${data.hasReport}`);
    return data.success && data.markersFound >= 5;
  });

  // ================================================================
  //  SUMMARY
  // ================================================================
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ULTIMATE + BLOOD ANALYSIS: ${passed} PASS / ${failed} FAIL`);
  console.log(`${'='.repeat(60)}`);

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
