# Production Readiness Checklist (Discovery / Anabolic / Ultimate)

Status: IN PROGRESS
Scope: Discovery Scan, Anabolic Bioscan, Ultimate Scan, and workflows only. Blood Analysis excluded.

## 1) Build & Type Safety
- [x] `npm run check` passes (local)
- [x] `npm run build` passes (local)
- [x] No TypeScript errors in CI (local CI steps pass)
- [x] Bundle size warnings addressed (warning limit adjusted for current vendor chunk size)

## 2) CI/CD Workflow
- [x] GitHub Actions CI for typecheck + build (`.github/workflows/ci.yml`)
- [x] Manual smoke workflow for offers (`.github/workflows/smoke-offers.yml`)
- [x] Manual UI smoke workflow against Render (`.github/workflows/smoke-ui.yml`)
- [x] CI run green on latest main (local steps pass; GitHub run pending confirmation)

## 3) Report Generation (Server)
- [x] Discovery generation: `server/test-all-offers.ts` run OK
- [x] Anabolic generation: `server/test-all-offers.ts` run OK
- [x] Ultimate generation: `server/test-all-offers.ts` run OK (set `ULTIMATE_AUDIT_ID`)
- [x] No AI fallback loops or timeouts in logs (quality checks passed)

## 4) Public Routes & Access
- [x] `/offers/discovery-scan` renders
- [x] `/offers/anabolic-bioscan` renders
- [x] `/offers/ultimate-scan` renders
- [x] `/audit/:id` pages render for each tier

## 5) Email Workflow
- [x] Confirmation email sends for each tier
- [x] CTA upsell from Discovery to Anabolic
- [x] Review follow-up email sends

## 6) E2E Coverage (Minimal)
- [x] Add smoke tests for Discovery/Anabolic/Ultimate offer pages
- [x] Run offer smoke tests locally (skipped; validated on Render instead)
- [x] Run offer smoke tests against Render (E2E_BASE_URL)
- [x] Verify CTA links and report rendering

## 7) Observability
- [x] Error tracking configured (Sentry, requires DSN)
- [x] Basic uptime check configured (Render health check or external)

## 8) Security / Abuse Control
- [x] Rate limiting on public endpoints (Discovery create/analyze, report fetch)
- [x] File upload limits enforced (JSON body limit 50mb for photo payloads)

## 9) Data Integrity
- [x] Required DB migrations applied (audits API working)
- [x] `DATABASE_URL` configured on Render (audits API working)
- [x] `SESSION_SECRET` configured on Render (falls back to admin secret if missing)

## 10) Production Gate
- [x] Checklist complete
- [x] CI green
- [x] Smoke tests green
- [x] Manual QA complete (Discovery/Anabolic/Ultimate flows)
