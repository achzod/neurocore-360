import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { buildPeptidesPreview, getLivePeptauraPreviewCatalog, type PeptidesPreviewInput } from "../server/peptidesPreview";
import { buildPeptidesPreviewAdminNotificationContent, buildPeptidesPreviewResultEmailContent } from "../server/peptidesPreviewEmailContent";

const inputPath = process.argv[2];
const outputDir = process.argv[3];
if (!inputPath || !outputDir) throw new Error("Usage: tsx scripts/qa-peptides-preview-email-v3.ts <checkpoint.json> <output-dir>");
fs.mkdirSync(outputDir, { recursive: true });
const checkpoint = JSON.parse(fs.readFileSync(inputPath, "utf8")) as { results: Array<{ id: string; leadId: string; requestBody: string }> };
const browser = await chromium.launch({ headless: true });
const audits: Array<Record<string, unknown>> = [];

for (const [index, row] of checkpoint.results.entries()) {
  const input = JSON.parse(row.requestBody) as PeptidesPreviewInput;
  const live = await getLivePeptauraPreviewCatalog(input.country);
  const result = buildPeptidesPreview(input, live.snapshots, live.checkedAt, live.shippingQuotes);
  const checkoutPath = result.nextStep === "blood_analysis"
    ? "/offers/blood-analysis?utm_source=peptides_preview&utm_medium=result&utm_campaign=pre_peptides_engine"
    : result.nextStep === "peptides_engine"
      ? "/peptides-engine?tier=solo&utm_source=peptides_preview&utm_medium=result&utm_campaign=pre_peptides_engine"
      : "/offers/peptides-engine?utm_source=peptides_preview&utm_medium=result&utm_campaign=pre_peptides_engine#offres";
  const client = buildPeptidesPreviewResultEmailContent(input, result, checkoutPath);
  const admin = buildPeptidesPreviewAdminNotificationContent(input, result, row.leadId, true);
  const prefix = `${index + 1}-${row.id}`;
  fs.writeFileSync(path.join(outputDir, `${prefix}-client.html`), client.html);
  fs.writeFileSync(path.join(outputDir, `${prefix}-client.txt`), `${client.subject}\n\n${client.text}`);
  fs.writeFileSync(path.join(outputDir, `${prefix}-admin.html`), admin.html);
  fs.writeFileSync(path.join(outputDir, `${prefix}-admin.txt`), `${admin.subject}\n\n${admin.text}`);

  const clientPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const clientErrors: string[] = [];
  clientPage.on("pageerror", (error) => clientErrors.push(error.message));
  await clientPage.setContent(client.html, { waitUntil: "load" });
  const clientOverflow = await clientPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await clientPage.screenshot({ path: path.join(outputDir, `${prefix}-client-mobile.png`), fullPage: true });
  await clientPage.close();

  const adminPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const adminErrors: string[] = [];
  adminPage.on("pageerror", (error) => adminErrors.push(error.message));
  await adminPage.setContent(admin.html, { waitUntil: "load" });
  const adminOverflow = await adminPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await adminPage.screenshot({ path: path.join(outputDir, `${prefix}-admin-mobile.png`), fullPage: true });
  await adminPage.close();

  const clientHasRecommendation = result.status === "eligible"
    ? result.molecules.every((molecule) => client.text.includes(molecule.name) && client.text.includes(molecule.doseSummary) && client.text.includes(molecule.calculationBasis))
    : client.text.includes("Pourquoi je ne t’envoie pas un faux devis") && !client.text.includes("Ton devis estimatif complet");
  const clientHasQuote = result.status === "eligible"
    ? client.text.includes(`Total rendu estimé : $${result.estimatedGrandTotalUsd?.toFixed(2)}`) && client.text.includes(`Livraison : $${result.estimatedShippingCostUsd?.toFixed(2)}`)
    : !client.html.includes("DEVIS COMPLET ESTIMÉ") && !client.text.includes("À valider");
  const adminHasCopy = admin.text.includes("MAIL PRÊT À COPIER COLLER") && admin.text.includes(client.text);
  const supplierLeak = [client.html, client.text, admin.html, admin.text].some((value) => /Supplier Secret|productUrl|https:\/\/www\.peptaura\.com\/products/i.test(value));
  const pass = clientHasRecommendation && clientHasQuote && adminHasCopy && !supplierLeak && !clientOverflow && !adminOverflow && clientErrors.length === 0 && adminErrors.length === 0;
  audits.push({ id: row.id, status: result.status, nextStep: result.nextStep, clientSubject: client.subject, adminSubject: admin.subject, clientHasRecommendation, clientHasQuote, adminHasCopy, supplierLeak, clientOverflow, adminOverflow, clientErrors, adminErrors, pass });
}
await browser.close();
const report = { status: audits.every((audit) => audit.pass) ? "PASS" : "FAIL", auditedAt: new Date().toISOString(), cases: audits };
fs.writeFileSync(path.join(outputDir, "audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exit(1);
