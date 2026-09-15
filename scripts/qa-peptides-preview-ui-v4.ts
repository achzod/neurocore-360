import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { buildPeptidesPreview, getLivePeptauraPreviewCatalog, peptidesPreviewInputSchema } from "../server/peptidesPreview";

const checkpointPath = process.argv[2];
const baseUrl = process.argv[3] || "http://127.0.0.1:4178/";
const outputDir = process.argv[4];
if (!checkpointPath || !outputDir) throw new Error("Usage: tsx scripts/qa-peptides-preview-ui-v4.ts <checkpoint.json> <base-url> <output-dir>");
fs.mkdirSync(outputDir, { recursive: true });
const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8")) as { results: Array<{ id: string; requestBody: string }> };
const goalLabels: Record<string, RegExp> = {
  recovery: /Récupération Tendons/,
  "gh-antiaging": /Axe GH Récupération/,
  fatloss: /Perte de graisse Appétit/,
  sleep: /^Sommeil/,
  cognitive: /Cognition Focus/,
  endurance: /Endurance Capacité/,
  libido: /Libido Réponse/,
  "testo-boost": /Axe testostérone Production/,
  "skin-hair": /Peau et cheveux/,
};
const secondaryLabels: Record<string, string> = {
  recovery: "Récupération", "gh-antiaging": "Axe GH", fatloss: "Perte de graisse", sleep: "Sommeil", cognitive: "Cognition",
  endurance: "Endurance", libido: "Libido", "testo-boost": "Axe testostérone", "skin-hair": "Peau et cheveux",
};
const browser = await chromium.launch({ headless: true });
const audits: Array<Record<string, unknown>> = [];

for (const [index, row] of checkpoint.results.entries()) {
  const sourceInput = peptidesPreviewInputSchema.parse(JSON.parse(row.requestBody));
  const page = await browser.newPage({ viewport: { width: index % 2 === 0 ? 390 : 1440, height: index % 2 === 0 ? 844 : 1000 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text()); });
  await page.addInitScript(() => {
    history.replaceState({}, "", "/peptides-preview");
    localStorage.setItem("apexlabs_cookie_consent", "essential");
  });
  let servedResult: ReturnType<typeof buildPeptidesPreview> | null = null;
  await page.route("**/api/peptides-preview/analyze", async (route) => {
    const submitted = peptidesPreviewInputSchema.parse(JSON.parse(route.request().postData() || "{}"));
    const live = await getLivePeptauraPreviewCatalog(submitted.country);
    servedResult = buildPeptidesPreview(submitted, live.snapshots, live.checkedAt, live.shippingQuotes);
    const checkoutUrl = servedResult.nextStep === "blood_analysis" ? "/offers/blood-analysis" : servedResult.nextStep === "peptides_engine" ? "/peptides-engine?tier=solo" : "/offers/peptides-engine#offres";
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, result: servedResult, checkoutUrl }) });
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByLabel("Prénom").fill(sourceInput.firstName);
  await page.getByLabel("Email").fill(sourceInput.email);
  await page.getByLabel("Âge").fill(String(sourceInput.age));
  await page.getByLabel("Sexe").selectOption(sourceInput.sex);
  await page.getByLabel("Poids actuel").fill(String(sourceInput.weightKg));
  await page.getByLabel("Taille").fill(String(sourceInput.heightCm));
  await page.getByLabel("Masse grasse estimée").selectOption(sourceInput.bodyFatRange);
  await page.getByRole("button", { name: /Continuer/ }).click();

  await page.getByRole("button", { name: goalLabels[sourceInput.primaryGoal] }).click();
  for (const secondary of sourceInput.secondaryGoals) await page.getByRole("button", { name: secondaryLabels[secondary], exact: true }).click();
  await page.getByLabel("Horizon de résultat souhaité").selectOption(sourceInput.timeline);
  if ([sourceInput.primaryGoal, ...sourceInput.secondaryGoals].includes("recovery")) await page.getByLabel("Étendue").selectOption(sourceInput.recoveryScope);
  if ([sourceInput.primaryGoal, ...sourceInput.secondaryGoals].includes("fatloss")) await page.getByLabel("Historique GLP 1").selectOption(sourceInput.glp1History);
  if ([sourceInput.primaryGoal, ...sourceInput.secondaryGoals].includes("cognitive")) await page.getByLabel("Stress cognitif").selectOption(sourceInput.cognitiveStress);
  await page.getByLabel("Situation, historique, résultat attendu").fill(sourceInput.goalDetails);
  await page.getByRole("button", { name: /Continuer/ }).click();

  if (!sourceInput.conditions.includes("none")) for (const condition of sourceInput.conditions) await page.getByRole("button", { name: new RegExp(condition, "i") }).click();
  await page.getByLabel("Bilan sanguin").selectOption(sourceInput.bloodwork);
  await page.getByLabel("Tension artérielle").selectOption(sourceInput.bloodPressure);
  await page.getByLabel("Sommeil moyen").fill(String(sourceInput.sleepHours));
  await page.getByLabel("Médicaments actuels").fill(sourceInput.medications);
  await page.getByLabel("Allergies").fill(sourceInput.allergies);
  await page.getByRole("button", { name: /Continuer/ }).click();

  await page.getByLabel("Expérience peptides").selectOption(sourceInput.experience);
  await page.getByLabel("Entraînements par semaine").selectOption(sourceInput.trainingFrequency);
  await page.getByLabel("Peptides actuels").fill(sourceInput.currentPeptides);
  await page.getByLabel("Peptides passés et résultats").fill(sourceInput.pastPeptides);
  await page.getByRole("button", { name: /Continuer/ }).click();

  await page.getByLabel("Confort injections").selectOption(sourceInput.injectionComfort);
  await page.getByLabel("Fréquence acceptable").selectOption(sourceInput.injectionFrequency);
  await page.getByLabel("Stockage au froid").selectOption(sourceInput.refrigeration);
  await page.getByLabel("Budget total du cycle en USD").fill(String(sourceInput.budgetTotalUsd));
  await page.getByLabel("Pays").selectOption(sourceInput.country);
  await page.getByLabel("Début souhaité").selectOption(sourceInput.startWhen);
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Calculer mon devis/ }).click();
  await page.getByText(sourceInput.firstName, { exact: false }).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(200);

  if (!servedResult) throw new Error(`No result served for ${row.id}`);
  const result = servedResult as ReturnType<typeof buildPeptidesPreview>;
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const rawEnumLeak = /twice-daily|few-week|yes-private|yes-shared|review_required|bilan_hormonal_recent_requis|medicaments_a_integrer/.test(text);
  const fakeQuote = result.status === "review_required" && (/À valider|DEVIS COMPLET ESTIMÉ/.test(text) || /\$\d+\.\d{2}/.test(text));
  const completeEligible = result.status !== "eligible" || (text.includes("Calcul vérifiable") && text.includes("Total rendu estimé") && result.molecules.every((molecule) => text.includes(molecule.reason)));
  const completeReview = result.status !== "review_required" || (text.includes("Aucune molécule, aucun dosage et aucun prix affichés") && result.analysisPoints.every((point) => text.includes(point)) && result.requiredMarkers.every((marker) => text.includes(marker)));
  const pass = !overflow && !rawEnumLeak && !fakeQuote && completeEligible && completeReview && errors.length === 0;
  const screenshot = path.join(outputDir, `${index + 1}-${row.id}-${index % 2 === 0 ? "mobile" : "desktop"}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  audits.push({ id: row.id, status: result.status, headline: result.headline, molecules: result.molecules.map((molecule) => molecule.name), overflow, rawEnumLeak, fakeQuote, completeEligible, completeReview, errors, screenshot, pass });
  await page.close();
}
await browser.close();
const report = { status: audits.every((audit) => audit.pass) ? "PASS" : "FAIL", auditedAt: new Date().toISOString(), cases: audits };
fs.writeFileSync(path.join(outputDir, "audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exit(1);
