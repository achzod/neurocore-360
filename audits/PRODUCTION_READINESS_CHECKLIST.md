# Production Readiness Checklist (Discovery / Anabolic / Ultimate)

Status: IN PROGRESS
Scope: Discovery Scan, Anabolic Bioscan, Ultimate Scan, and workflows only. Blood Analysis excluded.

## 1) Build & Type Safety
- [x] `npm run check` passes (local)
- [x] `npm run build` passes (local)
- [ ] No TypeScript errors in CI
- [x] Bundle size warnings addressed (warning limit adjusted for current vendor chunk size)

## 2) CI/CD Workflow
- [x] GitHub Actions CI for typecheck + build (`.github/workflows/ci.yml`)
- [x] Manual smoke workflow for offers (`.github/workflows/smoke-offers.yml`)
- [x] Manual UI smoke workflow against Render (`.github/workflows/smoke-ui.yml`)
- [ ] CI run green on latest main

## 3) Report Generation (Server)
- [x] Discovery generation: `server/test-all-offers.ts` run OK
- [x] Anabolic generation: `server/test-all-offers.ts` run OK
- [x] Ultimate generation: `server/test-all-offers.ts` run OK (set `ULTIMATE_AUDIT_ID`)
- [ ] No AI fallback loops or timeouts in logs

## 4) Public Routes & Access
- [x] `/offers/discovery-scan` renders
- [x] `/offers/anabolic-bioscan` renders
- [x] `/offers/ultimate-scan` renders
- [x] `/audit/:id` pages render for each tier

## 5) Email Workflow
- [ ] Confirmation email sends for each tier
- [ ] CTA upsell from Discovery to Anabolic
- [ ] Review follow-up email sends

## 6) E2E Coverage (Minimal)
- [x] Add smoke tests for Discovery/Anabolic/Ultimate offer pages
- [ ] Run offer smoke tests locally (requires DATABASE_URL for dev server)
- [x] Run offer smoke tests against Render (E2E_BASE_URL)
- [ ] Verify CTA links and report rendering

## 7) Observability
- [ ] Error tracking configured (Sentry or equivalent)
- [x] Basic uptime check configured (Render health check or external)

## 8) Security / Abuse Control
- [x] Rate limiting on public endpoints (Discovery create/analyze, report fetch)
- [x] File upload limits enforced (JSON body limit 50mb for photo payloads)

## 9) Data Integrity
- [ ] Required DB migrations applied
- [ ] `DATABASE_URL` configured on Render
- [ ] `SESSION_SECRET` configured on Render

## 10) Production Gate
- [ ] Checklist complete
- [ ] CI green
- [x] Smoke tests green
- [ ] Manual QA complete (Discovery/Anabolic/Ultimate flows)
