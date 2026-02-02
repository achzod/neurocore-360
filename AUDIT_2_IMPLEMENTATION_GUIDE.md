# AUDIT #2: GUIDE D'IMPLÉMENTATION - REMPLACER [SRC:UUID] PAR PMIDs

## Quick Start

**Objectif**: Remplacer les citations `[SRC:UUID]` par des citations PubMed `(PMID: 12345678)` vérifiables.

**Temps estimé**: 2-3 jours

**Impact**: Crédibilité x10, transparence totale, conformité standard médical.

---

## Phase 1: Extraction des PMIDs (4h)

### 1.1 Créer la fonction d'extraction

**Fichier**: `/Users/achzod/Desktop/neurocore/neurocore-github/scripts/import-blood-knowledge.ts`

**Ajouter après ligne 108**:

```typescript
/**
 * Extract PubMed IDs from article content
 */
function extractPMIDs(text: string): string[] {
  const pmidPatterns = [
    /PMID:?\s*(\d{7,8})/gi,                    // PMID: 12345678 or PMID:12345678
    /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{7,8})/gi, // pubmed.ncbi.nlm.nih.gov/12345678
    /PubMed ID:?\s*(\d{7,8})/gi,               // PubMed ID: 12345678
    /doi\.org\/[^\s]+PMID[:\s]+(\d{7,8})/gi,  // DOI URLs with PMID
  ];

  const pmids: Set<string> = new Set();

  for (const pattern of pmidPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const pmid = match[1];
      // Validate: PMIDs are typically 7-8 digits
      if (pmid.length >= 7 && pmid.length <= 8) {
        pmids.add(pmid);
      }
    }
  }

  return Array.from(pmids);
}
```

### 1.2 Tester l'extraction

**Créer fichier test**: `test-pmid-extraction.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';

function extractPMIDs(text: string): string[] {
  // [Copy function from above]
}

// Test on Huberman articles
const hubermanFile = path.join(__dirname, 'scraped-data', 'huberman-full.json');
const hubermanData = JSON.parse(fs.readFileSync(hubermanFile, 'utf-8'));

let totalArticles = 0;
let articlesWithPMIDs = 0;
let totalPMIDs = 0;

for (const article of hubermanData.articles || hubermanData) {
  totalArticles++;
  const content = article.content || article.text || '';
  const pmids = extractPMIDs(content);

  if (pmids.length > 0) {
    articlesWithPMIDs++;
    totalPMIDs += pmids.length;
    console.log(`\n${article.title}`);
    console.log(`  PMIDs found: ${pmids.join(', ')}`);
  }
}

console.log(`\n--- STATS ---`);
console.log(`Total articles: ${totalArticles}`);
console.log(`Articles with PMIDs: ${articlesWithPMIDs} (${(articlesWithPMIDs/totalArticles*100).toFixed(1)}%)`);
console.log(`Total PMIDs: ${totalPMIDs}`);
console.log(`Avg PMIDs per article: ${(totalPMIDs/articlesWithPMIDs).toFixed(1)}`);
```

**Run**:
```bash
npx ts-node test-pmid-extraction.ts
```

**Expected output** (example):
```
Vitamin D and Testosterone
  PMIDs found: 31917448, 29279619

Omega-3 Fatty Acids
  PMIDs found: 32692900, 28336346, 25149563

--- STATS ---
Total articles: 245
Articles with PMIDs: 89 (36.3%)
Total PMIDs: 342
Avg PMIDs per article: 3.8
```

**Decision point**:
- If coverage > 30%: Proceed with Phase 2
- If coverage < 30%: Consider enriching KB with primary studies

---

## Phase 2: Modifier le schéma DB (1h)

### 2.1 Migration SQL

**Créer**: `db/migrations/add-pmids-column.sql`

```sql
-- Add PMIDs column to knowledge_base
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS pmids TEXT[];

-- Add GIN index for array search
CREATE INDEX IF NOT EXISTS idx_kb_pmids
ON knowledge_base USING GIN(pmids);

-- Validate
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'knowledge_base'
  AND column_name = 'pmids';
```

**Run migration**:
```bash
psql $DATABASE_URL -f db/migrations/add-pmids-column.sql
```

### 2.2 Mettre à jour le type TypeScript

**Fichier**: `/Users/achzod/Desktop/neurocore/neurocore-github/server/knowledge/storage.ts`

**Ligne 8** - Modifier interface:
```typescript
export interface ScrapedArticle {
  id?: string;
  source: /* ... */;
  title: string;
  content: string;
  url: string;
  category?: string;
  keywords?: string[];
  pmids?: string[];  // ← NOUVEAU
  scrapedAt: Date;
  contentHash?: string;
}
```

**Ligne 86** - Modifier INSERT:
```typescript
await pool.query(
  `INSERT INTO knowledge_base (source, title, content, url, category, keywords, pmids, content_hash, scraped_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
   ON CONFLICT (content_hash) DO NOTHING`,
  [
    article.source,
    article.title,
    article.content,
    article.url,
    article.category || null,
    article.keywords || [],
    article.pmids || [],  // ← NOUVEAU
    contentHash,
    article.scrapedAt
  ]
);
```

**Ligne 155-165** - Modifier mapping:
```typescript
return result.rows.map(row => ({
  id: row.id,
  source: row.source,
  title: row.title,
  content: row.content,
  url: row.url,
  category: row.category,
  keywords: row.keywords,
  pmids: row.pmids,  // ← NOUVEAU
  scrapedAt: row.scraped_at
}));
```

---

## Phase 3: Réimporter avec PMIDs (2h)

### 3.1 Modifier le script d'import

**Fichier**: `scripts/import-blood-knowledge.ts`

**Ligne 57** - Ajouter extraction PMIDs:
```typescript
try {
  const pmids = extractPMIDs(content);  // ← NOUVEAU

  const result = await saveArticle({
    source: config.source,
    title,
    content,
    url,
    category: config.category,
    keywords,
    pmids,  // ← NOUVEAU
    scrapedAt: new Date(article.date || Date.now())
  });

  if (result.duplicate) {
    duplicates++;
  } else {
    saved++;
    if (pmids.length > 0) {
      console.log(`  ✓ ${title} [${pmids.length} PMIDs]`);  // ← NOUVEAU
    }
  }
```

### 3.2 Vider et réimporter

**Option A**: Clear specific source
```bash
psql $DATABASE_URL -c "DELETE FROM knowledge_base WHERE source = 'huberman';"
```

**Option B**: Clear all (si schema changé)
```bash
psql $DATABASE_URL -c "TRUNCATE TABLE knowledge_base CASCADE;"
```

**Réimporter**:
```bash
npm run import-knowledge
# ou
npx ts-node scripts/import-blood-knowledge.ts
```

**Expected output**:
```
📚 Importing huberman...
  ✓ Vitamin D and Testosterone [2 PMIDs]
  ✓ Omega-3 Fatty Acids [3 PMIDs]
  ✓ Sleep and Performance [1 PMID]
  ✓ 89 articles saved, 0 duplicates, 0 errors
  ✓ 342 total PMIDs extracted

📚 Importing peter_attia...
  ✓ 67 articles saved, 0 duplicates, 0 errors
  ✓ 234 total PMIDs extracted

[...etc]
```

---

## Phase 4: Modifier le contexte RAG (4h)

### 4.1 Passer les PMIDs au contexte AI

**Fichier**: `/Users/achzod/Desktop/neurocore/neurocore-github/server/blood-analysis/index.ts`

**Ligne 3119** - Modifier `buildContext`:

**AVANT**:
```typescript
const context = articles
  .map((article) => {
    if (!article.id) return "";
    const label = SOURCE_LABELS[article.source] || article.source;
    const idTag = `[SRC:${article.id}]`;
    const excerpt = article.content.replace(/\s+/g, " ").trim().slice(0, 700);
    return `${idTag} ${label} — ${article.title}\n${excerpt}${excerpt.length >= 700 ? "..." : ""}`;
  })
  .filter(Boolean)
  .join("\n\n---\n\n");
```

**APRÈS**:
```typescript
const context = articles
  .map((article) => {
    if (!article.id) return "";
    const label = SOURCE_LABELS[article.source] || article.source;

    // Build PMID info
    const pmidInfo = article.pmids && article.pmids.length > 0
      ? `\nPMIDs: ${article.pmids.join(", ")}`
      : "";

    const excerpt = article.content.replace(/\s+/g, " ").trim().slice(0, 700);

    return `${label} — ${article.title}${pmidInfo}\n${excerpt}${excerpt.length >= 700 ? "..." : ""}`;
  })
  .filter(Boolean)
  .join("\n\n---\n\n");
```

**Exemple de contexte généré**:

**AVANT**:
```
[SRC:bf7e1cc5-...] Huberman Lab — Vitamin D and Testosterone
Recent studies show that vitamin D supplementation in deficient men...
```

**APRÈS**:
```
Huberman Lab — Vitamin D and Testosterone
PMIDs: 31917448, 29279619
Recent studies show that vitamin D supplementation in deficient men...
```

---

## Phase 5: Modifier les instructions AI (2h)

### 5.1 Modifier le prompt système

**Fichier**: `server/blood-analysis/index.ts`

**Ligne 1640-1650** - Remplacer section RÈGLES D'UTILISATION DES SOURCES:

**AVANT**:
```typescript
RÈGLES D'UTILISATION DES SOURCES
- Quand tu attribues une idée à un expert ou une ressource (Huberman/Attia/MPMD/Masterjohn/Examine),
  tu DOIS mettre une citation [SRC:ID] qui correspond à un chunk fourni.
- Interdiction absolue d'inventer : numéros d'épisodes, citations verbatim, DOI, titres d'articles,
  liens, ou positions attribuées.
- Si tu n'as pas de chunk : tu peux expliquer une idée comme connaissance générale SANS attribution,
  ou tu dis "source non fournie".
- La section "Sources (bibliothèque)" liste UNIQUEMENT les IDs réellement utilisés.
```

**APRÈS**:
```typescript
RÈGLES D'UTILISATION DES SOURCES SCIENTIFIQUES
- Tu disposes d'une bibliothèque de connaissances avec des PMIDs (PubMed identifiers) extraits.
- PRIORITÉ #1: Quand disponible, tu DOIS citer le PMID de l'étude primaire, PAS la source secondaire.
- Format obligatoire: (PMID: 12345678) directement après l'affirmation scientifique.
- Si PMID disponible pour une étude citée dans un article Huberman/Attia, cite le PMID pas Huberman.
- Si PMID non disponible: cite "selon consensus médical" ou "selon Dr. [Expert]" mais JAMAIS [SRC:UUID].
- INTERDICTION ABSOLUE d'inventer des PMIDs. Seulement ceux fournis dans le contexte.
- Si tu cites plusieurs études sur un même point, liste les PMIDs séparés par virgule: (PMID: 111, 222, 333).
- La section finale "Références scientifiques" liste tous les PMIDs utilisés avec références complètes.

EXEMPLES DE CITATIONS CORRECTES:
✅ "Une méta-analyse de 2020 (n=3324) a montré une amélioration de +3.2 nmol/L (PMID: 31917448)."
✅ "Les oméga-3 réduisent les triglycérides de 20-30% selon l'AHA (PMID: 32692900)."
✅ "L'inflammation inhibe la GnRH via IL-1β et TNF-α (PMID: 18541591)."

EXEMPLES INTERDITS:
❌ "Une méta-analyse récente a montré... [SRC:bf7e1cc5-...]"
❌ "Selon Huberman Lab épisode 42..."
❌ (Ne jamais inventer un PMID non fourni)
```

### 5.2 Modifier la règle de comptage des sources

**Ligne 2778** - Remplacer:

**AVANT**:
```typescript
const citationsRule = minSources
  ? `- Tu dois utiliser au moins ${minSources} IDs [SRC:ID] uniques dans le rapport.`
  : "- Si aucune source n'est fournie, ecris clairement \"source non fournie\" quand tu attribues.";
```

**APRÈS**:
```typescript
// Count available PMIDs
const availablePMIDs = new Set(
  articles.flatMap(a => a.pmids || [])
);

const citationsRule = availablePMIDs.size > 0
  ? `- Tu dois citer AU MINIMUM ${Math.min(8, Math.floor(availablePMIDs.size / 2))} PMIDs uniques dans le rapport.
     - PMIDs disponibles dans le contexte: ${Array.from(availablePMIDs).slice(0, 10).join(", ")}${availablePMIDs.size > 10 ? "..." : ""}`
  : `- Aucun PMID fourni. Utilise "selon consensus médical" ou cite les experts (Huberman, Attia) sans [SRC:UUID].`;
```

---

## Phase 6: Modifier la section Sources finale (2h)

### 6.1 Extraire PMIDs du rapport généré

**Ligne 1928** - Modifier `extractSourceIds`:

**Renommer et modifier**:
```typescript
const extractPMIDs = (text: string): string[] => {
  const matches = Array.from(text.matchAll(/\(PMID:\s*(\d{7,8})\)/g))
    .map((match) => match[1].trim());
  return Array.from(new Set(matches.filter(Boolean)));
};
```

### 6.2 Builder la section Références

**Ligne 1955** - Remplacer `buildSourcesSectionFromText`:

**AVANT**:
```typescript
const buildSourcesSectionFromText = (text: string): string => {
  const ids = extractSourceIds(text);
  if (!ids.length) {
    return "## Sources (bibliotheque)\n- Aucune source fournie";
  }
  return `## Sources (bibliotheque)\n${ids.map((id) => `- [SRC:${id}]`).join("\n")}`;
};
```

**APRÈS**:
```typescript
const buildReferencesSection = (text: string): string => {
  const pmids = extractPMIDs(text);

  if (!pmids.length) {
    return "## Références\n- Consensus médical et sources secondaires (Huberman Lab, The Drive, etc.)";
  }

  const references = pmids.map((pmid, index) => {
    return `${index + 1}. **PMID: ${pmid}** - https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  });

  return `## Références scientifiques

Les affirmations scientifiques de ce rapport sont basées sur les études suivantes:

${references.join("\n")}

Note: Vous pouvez vérifier chaque étude en cliquant sur le lien PubMed ou en recherchant
le PMID sur https://pubmed.ncbi.nlm.nih.gov/`;
};
```

### 6.3 (Optionnel) Enrichir avec titres complets

Si vous voulez les titres/auteurs complets (recommandé):

```typescript
interface PubMedReference {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  url: string;
}

async function fetchPubMedMetadata(pmids: string[]): Promise<Record<string, PubMedReference>> {
  const apiUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json'
  });

  try {
    const response = await fetch(`${apiUrl}?${params}`);
    const data = await response.json();

    const references: Record<string, PubMedReference> = {};

    for (const pmid of pmids) {
      const article = data.result[pmid];
      if (!article) continue;

      const firstAuthor = article.authors?.[0]?.name || 'Unknown';
      const year = article.pubdate?.split(' ')[0] || 'Unknown';

      references[pmid] = {
        pmid,
        title: article.title || 'Unknown',
        authors: `${firstAuthor} et al.`,
        journal: article.source || 'Unknown',
        year,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
      };
    }

    return references;
  } catch (error) {
    console.error('Error fetching PubMed metadata:', error);
    return {};
  }
}

const buildReferencesSection = async (text: string): Promise<string> => {
  const pmids = extractPMIDs(text);

  if (!pmids.length) {
    return "## Références\n- Consensus médical et sources secondaires";
  }

  // Fetch metadata from PubMed
  const metadata = await fetchPubMedMetadata(pmids);

  const references = pmids.map((pmid, index) => {
    const ref = metadata[pmid];
    if (!ref) {
      return `${index + 1}. **PMID: ${pmid}** - https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
    }

    return `${index + 1}. **PMID: ${pmid}** - ${ref.authors}. ${ref.title}. *${ref.journal}.* ${ref.year}.
   ${ref.url}`;
  });

  return `## Références scientifiques

${references.join("\n\n")}`;
};
```

---

## Phase 7: Tests (8h)

### 7.1 Test unitaire extraction PMIDs

```typescript
import { extractPMIDs } from './utils';

describe('extractPMIDs', () => {
  it('should extract PMID with colon', () => {
    const text = 'A study (PMID: 12345678) showed...';
    expect(extractPMIDs(text)).toEqual(['12345678']);
  });

  it('should extract PMID without colon', () => {
    const text = 'A study (PMID 12345678) showed...';
    expect(extractPMIDs(text)).toEqual(['12345678']);
  });

  it('should extract PubMed URL', () => {
    const text = 'See https://pubmed.ncbi.nlm.nih.gov/12345678/ for details';
    expect(extractPMIDs(text)).toEqual(['12345678']);
  });

  it('should extract multiple PMIDs', () => {
    const text = 'Studies (PMID: 11111111, 22222222) and (PMID: 33333333)';
    expect(extractPMIDs(text)).toEqual(['11111111', '22222222', '33333333']);
  });

  it('should deduplicate PMIDs', () => {
    const text = 'Study (PMID: 12345678) and again (PMID: 12345678)';
    expect(extractPMIDs(text)).toEqual(['12345678']);
  });

  it('should return empty array if no PMIDs', () => {
    const text = 'No citations here';
    expect(extractPMIDs(text)).toEqual([]);
  });
});
```

### 7.2 Test d'intégration RAG

**Créer**: `test-rag-with-pmids.ts`

```typescript
import { generateBloodReport } from './server/blood-analysis';

async function testRagWithPMIDs() {
  // Use test blood data
  const testPDF = {
    crp: 8.6,
    triglycerides: 530,
    hdl: 26,
    vitaminD: 25,
    // ...etc
  };

  const report = await generateBloodReport(testPDF, {
    prenom: 'Nicolas',
    nom: 'Test',
    gender: 'M',
    age: 44
  });

  console.log('\n=== TESTING PMID CITATIONS ===\n');

  // Extract PMIDs from report
  const pmidMatches = report.matchAll(/\(PMID:\s*(\d{7,8})\)/g);
  const pmids = Array.from(pmidMatches).map(m => m[1]);

  console.log(`✓ Total PMID citations: ${pmids.length}`);
  console.log(`✓ Unique PMIDs: ${new Set(pmids).size}`);

  if (pmids.length === 0) {
    console.error('❌ NO PMIDs FOUND! Check prompt instructions.');
    return;
  }

  // Check for old [SRC:UUID] format
  const oldFormatMatches = report.match(/\[SRC:[a-f0-9-]+\]/g);
  if (oldFormatMatches) {
    console.error(`❌ Found ${oldFormatMatches.length} old [SRC:UUID] citations!`);
    console.error(`   Examples: ${oldFormatMatches.slice(0, 3).join(', ')}`);
  } else {
    console.log('✓ No old [SRC:UUID] format found');
  }

  // Check references section
  if (report.includes('## Références scientifiques')) {
    console.log('✓ References section present');

    // Count references
    const refMatches = report.match(/^\d+\.\s+\*\*PMID:/gm);
    if (refMatches) {
      console.log(`✓ ${refMatches.length} references listed`);
    }
  } else {
    console.error('❌ References section missing!');
  }

  // Sample citations
  console.log('\n=== SAMPLE CITATIONS ===\n');
  const sampleMatches = report.matchAll(/[^.!?]*\(PMID:\s*\d{7,8}\)[^.!?]*[.!?]/g);
  const samples = Array.from(sampleMatches).slice(0, 3);
  samples.forEach((match, i) => {
    console.log(`${i+1}. ${match[0].trim()}`);
  });
}

testRagWithPMIDs().catch(console.error);
```

**Run**:
```bash
npx ts-node test-rag-with-pmids.ts
```

**Expected output**:
```
=== TESTING PMID CITATIONS ===

✓ Total PMID citations: 12
✓ Unique PMIDs: 9
✓ No old [SRC:UUID] format found
✓ References section present
✓ 9 references listed

=== SAMPLE CITATIONS ===

1. Une méta-analyse de 2020 (n=3324) a démontré une amélioration significative
   de +3.2 nmol/L (PMID: 31917448).

2. Les oméga-3 réduisent les triglycérides de 20-30% selon l'AHA (PMID: 32692900).

3. L'inflammation inhibe la synthèse de testostérone via IL-1β (PMID: 18541591).
```

---

## Quick Reference: Files to Modify

| File | Lines | Action |
|------|-------|--------|
| `scripts/import-blood-knowledge.ts` | +50 | Add extractPMIDs() |
| `scripts/import-blood-knowledge.ts` | 57 | Extract PMIDs on import |
| `server/knowledge/storage.ts` | 8 | Add pmids?: string[] to interface |
| `server/knowledge/storage.ts` | 86 | Add pmids to INSERT |
| `server/knowledge/storage.ts` | 155-165 | Add pmids to mapping |
| `server/blood-analysis/index.ts` | 1640 | Replace RÈGLES sources |
| `server/blood-analysis/index.ts` | 2778 | Replace citationsRule |
| `server/blood-analysis/index.ts` | 3119 | Modify context builder |
| `server/blood-analysis/index.ts` | 1928 | Rename to extractPMIDs |
| `server/blood-analysis/index.ts` | 1955 | Replace with buildReferencesSection |

---

## Rollback Plan

Si quelque chose ne fonctionne pas:

```bash
# Revert DB changes
psql $DATABASE_URL -c "ALTER TABLE knowledge_base DROP COLUMN pmids;"

# Revert code changes
git diff HEAD server/blood-analysis/index.ts
git checkout server/blood-analysis/index.ts

# Revert imports
git checkout scripts/import-blood-knowledge.ts
git checkout server/knowledge/storage.ts
```

---

## Success Criteria

✅ 0 citations `[SRC:UUID]` dans les nouveaux rapports
✅ Minimum 8-12 citations `(PMID: ...)` par rapport
✅ Section "Références scientifiques" avec liens PubMed
✅ Tests passent avec PMIDs extraits
✅ Client peut cliquer et vérifier chaque étude

---

## Next Steps (post-launch)

1. **Monitor PMID coverage**: Track % rapports avec PMIDs
2. **Enrichir KB**: Ajouter études primaires si coverage faible
3. **PubMed API caching**: Cache metadata pour éviter rate limits
4. **User feedback**: Mesurer satisfaction avec nouvelles citations
5. **A/B test**: Compare conversion avant/après changement

---

## Support

Questions? Check:
- Full audit: `AUDIT_2_SOURCES_CITATIONS.md`
- Examples: `AUDIT_2_EXAMPLES_COMPARISON.md`
- Summary: `AUDIT_2_SUMMARY.txt`
