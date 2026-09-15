import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { buildPeptidesPreview, getLivePeptauraPreviewCatalog, type PeptidesPreviewInput } from "../server/peptidesPreview";
import { buildPeptidesPreviewAdminNotificationContent, buildPeptidesPreviewDestinationPath, buildPeptidesPreviewResultEmailContent } from "../server/peptidesPreviewEmailContent";

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
  const checkoutPath = buildPeptidesPreviewDestinationPath(result.nextStep, "email");
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

  const clientHasEstimate = client.text.includes(`Nombre de molécules estimé : ${result.moleculeCount}`) && client.text.includes(`Durée estimée : ${result.durationLabel}`) && (result.estimatedProtocolCostUsd == null || client.text.includes(`Produits : $${result.estimatedProtocolCostUsd.toFixed(2)}`)) && (result.estimatedShippingCostUsd == null || client.text.includes(`Livraison : $${result.estimatedShippingCostUsd.toFixed(2)}`)) && (result.estimatedGrandTotalUsd == null || client.text.includes(`Total rendu estimé : $${result.estimatedGrandTotalUsd.toFixed(2)}`));
  const namesOrDosesLeaked = result.molecules.some((molecule) => client.text.includes(molecule.name) || client.text.includes(molecule.doseSummary) || client.text.includes(molecule.calculationBasis));
  const directConversion = result.nextStep === "peptides_engine" && client.text.includes("protocole plus poussé et plus précis") && client.text.includes("Accéder à Peptides Engine") && !/Blood Analysis|Vérifier mes marqueurs|validation personnalisée|informations supplémentaires/i.test(client.text);
  const adminHasCopy = admin.text.includes("MAIL PRÊT À COPIER COLLER") && admin.text.includes(client.text);
  const supplierLeak = [client.html, client.text, admin.html, admin.text].some((value) => /Supplier Secret|productUrl|https:\/\/www\.peptaura\.com\/products/i.test(value));
  const trackingCorrect = client.text.includes("utm_source=peptides_preview_email&utm_medium=email") && ![client.html, client.text, admin.html, admin.text].some((value) => value.includes("peptides_preview_admin"));
  const pass = clientHasEstimate && !namesOrDosesLeaked && directConversion && adminHasCopy && trackingCorrect && !supplierLeak && !clientOverflow && !adminOverflow && clientErrors.length === 0 && adminErrors.length === 0;
  audits.push({ id: row.id, status: result.status, nextStep: result.nextStep, clientSubject: client.subject, adminSubject: admin.subject, clientHasEstimate, namesOrDosesLeaked, directConversion, adminHasCopy, trackingCorrect, supplierLeak, clientOverflow, adminOverflow, clientErrors, adminErrors, pass });
}
await browser.close();
const report = { status: audits.every((audit) => audit.pass) ? "PASS" : "FAIL", auditedAt: new Date().toISOString(), cases: audits };
fs.writeFileSync(path.join(outputDir, "audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exit(1);
