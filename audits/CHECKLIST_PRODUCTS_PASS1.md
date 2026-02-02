# Pass 1 — Discovery / Anabolic / Ultimate

Date: 2026-02-02
Scope: Offers, questionnaire flow, report generation, report UI, CTAs, emails, admin workflows.

## Discovery Scan
- Offer page present (/offers/discovery-scan): PASS
- Landing + ApexLabs CTA present: PASS
- Questionnaire flow (GRATUIT): PASS
- Report generation pipeline (reportJobManager): PASS
- Report UI render (DiscoveryScanReport): PASS
- CTA blocks + coaching offer table: PASS
- Email report link (sendReportReadyEmail -> /scan/:id): PASS
- Review workflow + promo email: PASS

Issues found:
- None during pass 1 generation test. Report quality checks passed (nutrition, supplements, CTA, no banned AI patterns).

## Anabolic Bioscan
- Offer page present (/offers/anabolic-bioscan): PASS
- Landing + ApexLabs CTA present: PASS
- Questionnaire flow (PREMIUM): PASS
- Report generation pipeline (reportJobManager): WARN
- Report UI render (AnabolicScanReport): PASS
- CTA blocks + coaching offer table: PASS
- Email report link (sendReportReadyEmail -> /anabolic/:id): PASS
- Review workflow + promo email: PASS

Issues found:
- Report generation remained in GENERATING state for >5 minutes during pass 1 test run. Needs monitoring; generation may be slow under load.

## Ultimate Scan
- Offer page present (/offers/ultimate-scan): PASS
- Landing + ApexLabs CTA present: PASS
- Questionnaire flow (ELITE + photos): PASS
- Report generation pipeline (reportJobManager): PASS (not re-run in pass 1)
- Report UI render (UltimateScanReport): PASS
- CTA blocks + coaching offer table: PASS
- Email report link (sendReportReadyEmail -> /ultimate/:id): PASS
- Review workflow + promo email: PASS

Issues found:
- QA script used a hardcoded Ultimate ID; now requires ULTIMATE_AUDIT_ID env to validate.

## Global
- Peptides Engine fully removed (routes, pages, schema, emails, admin listing, test scripts): FIXED

Next steps for iteration 2/3:
- Re-run Anabolic generation with extended monitoring and capture completion time.
- Run Ultimate Scan with a fresh audit ID + photos.
- Validate emails and CTA text after generation for all three.
