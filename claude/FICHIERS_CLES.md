# Fichiers Clés - Guide Rapide

## Backend Core

### `server/reportJobManager.ts`
**Rôle**: Orchestration de la génération asynchrone des rapports

**Fonctions importantes**:
- `generateReportAsync(auditId)` - Point d'entrée principal
- `extractPhotosFromAudit(audit)` - Récupère les photos depuis responses
- Heartbeat toutes les 15s pour mettre à jour le progress

**Points d'attention**:
- Ligne ~189: Fail-fast si <3 photos pour PREMIUM
- Ligne ~298: `completeReportJob()` doit être APRÈS génération HTML
- Timeout: 40 minutes (`AI_CALL_TIMEOUT_MS`)

---

### `server/openaiPremiumEngine.ts`
**Rôle**: Appels OpenAI GPT-5.2, retry logic, génération par sections

**Fonctions importantes**:
- `callOpenAI(section, systemPrompt, userPrompt, maxTokens)` - Appel unitaire avec retry
- `generateAuditTxtWithOpenAI(clientData, photoAnalysis, tier, auditId)` - Génère toutes les sections
- `getMaxCompletionTokensForSection(section)` - Caps adaptatifs par section

**Configuration**:
```typescript
const OPENAI_CONFIG = {
  OPENAI_MODEL: "gpt-5.2-2025-12-11",
  MAX_RETRIES: 8,
  OPENAI_SECTION_CONCURRENCY: 2,
  // ...
}
```

**Points d'attention**:
- Empty response = 3 retries rapides puis mode dégradé
- `degradedSectionText(section)` génère le fallback
- Circuit breaker: pause 3 min si burst d'erreurs

---

### `server/exportService.ts`
**Rôle**: Conversion TXT → HTML premium

**Fonctions importantes**:
- `generateExportHTMLFromTxt(txt, auditId, photos)` - Point d'entrée principal
- `parseTxtToSections(txt)` - Parse le TXT en sections structurées
- `buildDashboardFromSections(sections)` - Extrait scores et metadata

**Éléments HTML générés**:
- Hero avec prénom + email + date
- TOC interactive (toujours visible)
- Radar SVG "Profil 360"
- Gauge SVG score global
- Sections accordéon
- CTA coaching premium
- Règles nutrition

**Points d'attention**:
- Thème light par défaut
- Filtrage emojis ligne ~312
- `truncateAtWord()` pour labels non tronqués

---

### `server/photoAnalysisAI.ts`
**Rôle**: Analyse des photos corporelles via vision AI

**Fonctions importantes**:
- `analyzePhotosWithAI(photos)` - Appel vision model
- `formatPhotoAnalysisForReport(analysis, firstName)` - Formate pour injection dans prompt

**Output**: Analyse posturale, distribution graisseuse, asymétries

---

### `server/routes.ts`
**Rôle**: Tous les endpoints API

**Endpoints clés**:
```
POST /api/audits                    # Créer audit (valide 3 photos)
GET  /api/audits/:id                # Récupérer audit
GET  /api/audits/:id/narrative-status  # Polling statut
GET  /api/audits/:id/export/html    # Download HTML
POST /api/create-checkout-session   # Stripe
GET  /api/admin/init-db             # Reset DB
```

**Points d'attention**:
- `extractPhotosFromAudit()` définie ici
- Validation photos lignes ~180-200

---

### `server/storage.ts`
**Rôle**: Abstraction base de données PostgreSQL

**Méthodes importantes**:
- `createAudit(data)` / `getAudit(id)` / `updateAudit(id, data)`
- `createOrUpdateReportJob(job)` / `completeReportJob(auditId)`
- `updateReportJobProgress(auditId, progress, section)`

---

## Frontend Core

### `client/src/pages/Questionnaire.tsx`
**Rôle**: Formulaire multi-étapes

**Points d'attention**:
- Upload photos obligatoire pour PREMIUM
- Validation Zod

### `client/src/pages/Results.tsx`
**Rôle**: Affichage rapport + polling statut

**Points d'attention**:
- Poll `/narrative-status` toutes les 10s
- Affiche progress bar

---

## Shared

### `shared/schema.ts`
**Rôle**: Types TypeScript + Zod schemas

**Types importants**:
```typescript
interface Audit {
  id: string;
  email: string;
  responses: Record<string, any>;
  narrativeReport: any;
  reportTxt?: string;
  reportHtml?: string;
  reportDeliveryStatus: ReportDeliveryStatusEnum;
  // ...
}

enum ReportDeliveryStatusEnum {
  PENDING, GENERATING, READY, SENT, FAILED, NEED_PHOTOS
}
```

---

## Config

### `package.json`
**Attention**: `@rollup/rollup-linux-x64-gnu` en `optionalDependencies` pour Render

### `tsconfig.json`
**Attention**: Exclude Replit folders pour éviter erreurs tsc

---

## Tests

### `test-workflow-gpt-complet.ts`
**Rôle**: Test E2E complet avec photos homme

**Utilisation**:
```bash
RENDER_EXTERNAL_URL=https://neurocore-360.onrender.com npx tsx test-workflow-gpt-complet.ts
```

**Ce qu'il fait**:
1. Charge 3 photos depuis `test-photos/`
2. Crée un audit via API
3. Poll jusqu'à COMPLETED
4. Télécharge le HTML
5. Vérifie la qualité

