# AUDIT #2: CHECKLIST D'IMPLÉMENTATION

## Vue d'ensemble

**Problème**: 36 citations [SRC:UUID] non-vérifiables dans le rapport AI
**Solution**: Remplacer par citations PubMed (PMID) vérifiables
**Impact**: Crédibilité x10, transparence totale, standard médical
**Temps**: 2-3 jours

---

## Checklist Phase 1: Extraction PMIDs (4h)

- [ ] Créer fonction `extractPMIDs(text: string): string[]`
  - [ ] Pattern: `PMID: 12345678`
  - [ ] Pattern: `PMID:12345678`
  - [ ] Pattern: `pubmed.ncbi.nlm.nih.gov/12345678`
  - [ ] Pattern: `PubMed ID: 12345678`
  - [ ] Validation: 7-8 chiffres
  - [ ] Déduplication

- [ ] Créer test `test-pmid-extraction.ts`
  - [ ] Test sur `huberman-full.json`
  - [ ] Test sur `peter-attia-full.json`
  - [ ] Test sur `examine-full.json`
  - [ ] Calculer % coverage
  - [ ] Si coverage < 30%: discuter enrichissement KB

- [ ] Valider résultats
  - [ ] Coverage: ___% (target: >30%)
  - [ ] Total PMIDs: ___
  - [ ] Avg PMIDs/article: ___

---

## Checklist Phase 2: Schéma DB (1h)

- [ ] Créer migration `db/migrations/add-pmids-column.sql`
  - [ ] `ALTER TABLE knowledge_base ADD COLUMN pmids TEXT[]`
  - [ ] `CREATE INDEX idx_kb_pmids ON knowledge_base USING GIN(pmids)`
  - [ ] Validation query

- [ ] Run migration
  - [ ] `psql $DATABASE_URL -f db/migrations/add-pmids-column.sql`
  - [ ] Vérifier colonne créée
  - [ ] Vérifier index créé

- [ ] Mettre à jour TypeScript types
  - [ ] `server/knowledge/storage.ts` ligne 8: `pmids?: string[]`
  - [ ] `server/knowledge/storage.ts` ligne 86: INSERT avec pmids
  - [ ] `server/knowledge/storage.ts` lignes 155-165: mapping avec pmids

- [ ] Tests
  - [ ] Compiler: `npm run build`
  - [ ] No TypeScript errors

---

## Checklist Phase 3: Réimporter KB (2h)

- [ ] Modifier `scripts/import-blood-knowledge.ts`
  - [ ] Ajouter fonction `extractPMIDs()`
  - [ ] Ligne 57: extraire PMIDs lors de l'import
  - [ ] Passer PMIDs à `saveArticle()`
  - [ ] Log PMIDs extraits

- [ ] Backup actuel (optionnel)
  - [ ] `pg_dump $DATABASE_URL -t knowledge_base > kb_backup.sql`

- [ ] Clear et réimporter
  - [ ] `psql $DATABASE_URL -c "TRUNCATE TABLE knowledge_base;"`
  - [ ] `npm run import-knowledge`
  - [ ] Vérifier logs: articles avec PMIDs

- [ ] Validation
  - [ ] Query: `SELECT COUNT(*), SUM(ARRAY_LENGTH(pmids, 1)) FROM knowledge_base;`
  - [ ] Total articles: ___
  - [ ] Total PMIDs: ___
  - [ ] Sample query: `SELECT title, pmids FROM knowledge_base WHERE pmids IS NOT NULL LIMIT 5;`

---

## Checklist Phase 4: Contexte RAG (4h)

- [ ] Modifier `server/blood-analysis/index.ts` ligne 3119
  - [ ] Builder contexte avec PMIDs au lieu de [SRC:UUID]
  - [ ] Format: `PMIDs: 12345, 67890`
  - [ ] Garder excerpt à 700 chars

- [ ] Test contexte généré
  - [ ] Log le contexte dans console
  - [ ] Vérifier présence PMIDs
  - [ ] Vérifier absence [SRC:UUID]

- [ ] Validation
  - [ ] Contexte lisible
  - [ ] PMIDs visibles
  - [ ] Pas d'erreurs

---

## Checklist Phase 5: Instructions AI (2h)

- [ ] Modifier prompt système ligne 1640
  - [ ] Remplacer "RÈGLES D'UTILISATION DES SOURCES"
  - [ ] Nouvelles règles: citer PMIDs pas UUIDs
  - [ ] Format obligatoire: `(PMID: 12345678)`
  - [ ] INTERDICTION d'inventer PMIDs
  - [ ] Exemples de citations correctes

- [ ] Modifier règle comptage ligne 2778
  - [ ] Compter PMIDs disponibles
  - [ ] Exiger minimum 8 PMIDs (ou 50% disponibles)
  - [ ] Lister PMIDs disponibles dans prompt

- [ ] Validation
  - [ ] Prompt clair et non-ambigu
  - [ ] Exemples concrets fournis
  - [ ] Règles strictes sur invention

---

## Checklist Phase 6: Section Sources (2h)

- [ ] Renommer `extractSourceIds` → `extractPMIDs` (ligne 1928)
  - [ ] Pattern: `\(PMID:\s*(\d{7,8})\)`
  - [ ] Retourner array de PMIDs
  - [ ] Déduplication

- [ ] Remplacer `buildSourcesSectionFromText` (ligne 1955)
  - [ ] Nouveau nom: `buildReferencesSection`
  - [ ] Titre: "## Références scientifiques"
  - [ ] Format: `1. **PMID: 12345** - https://pubmed.ncbi.nlm.nih.gov/12345/`
  - [ ] Si aucun PMID: message fallback

- [ ] (Optionnel) Enrichissement PubMed API
  - [ ] Créer fonction `fetchPubMedMetadata(pmids)`
  - [ ] API: `eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi`
  - [ ] Parser titre, auteurs, journal, année
  - [ ] Format: `Auteurs. Titre. Journal. Année.`
  - [ ] Handle errors gracefully

- [ ] Validation
  - [ ] Section "Références scientifiques" présente
  - [ ] Liens PubMed cliquables
  - [ ] Format professionnel

---

## Checklist Phase 7: Tests (8h)

### Tests unitaires

- [ ] Test `extractPMIDs()`
  - [ ] Pattern avec colon: `PMID: 123`
  - [ ] Pattern sans colon: `PMID 123`
  - [ ] URL PubMed
  - [ ] Multiple PMIDs
  - [ ] Déduplication
  - [ ] Aucun PMID

- [ ] Test `buildReferencesSection()`
  - [ ] Avec PMIDs
  - [ ] Sans PMIDs
  - [ ] Format output correct

### Tests d'intégration

- [ ] Créer `test-rag-with-pmids.ts`
  - [ ] Generate rapport avec test data
  - [ ] Compter PMIDs dans rapport
  - [ ] Vérifier absence [SRC:UUID]
  - [ ] Vérifier présence section Références
  - [ ] Log exemples de citations

- [ ] Run test
  - [ ] `npx ts-node test-rag-with-pmids.ts`
  - [ ] ✅ Total PMIDs: ≥8
  - [ ] ✅ Unique PMIDs: ≥6
  - [ ] ✅ Aucun [SRC:UUID]
  - [ ] ✅ Section Références présente
  - [ ] ✅ Citations échantillons lisibles

### Tests manuels

- [ ] Générer rapport complet avec vraies données
  - [ ] Upload blood report PDF
  - [ ] Wait for generation
  - [ ] Download rapport

- [ ] Vérifier qualité citations
  - [ ] PMIDs présents
  - [ ] Format correct: `(PMID: 12345678)`
  - [ ] Contexte des citations pertinent
  - [ ] Minimum 8-12 PMIDs

- [ ] Vérifier section Références
  - [ ] Titre correct
  - [ ] Tous les PMIDs listés
  - [ ] Liens cliquables
  - [ ] Format professionnel

- [ ] Test vérification client
  - [ ] Copier un PMID du rapport
  - [ ] Google "PMID 32692900"
  - [ ] Vérifier redirection PubMed
  - [ ] Lire abstract
  - [ ] Confirmer cohérence avec rapport

---

## Checklist Phase 8: Déploiement

### Pre-deploy

- [ ] Review code changes
  - [ ] `git diff HEAD server/blood-analysis/index.ts`
  - [ ] `git diff HEAD server/knowledge/storage.ts`
  - [ ] `git diff HEAD scripts/import-blood-knowledge.ts`

- [ ] Tests passent
  - [ ] `npm run test`
  - [ ] `npm run build`
  - [ ] No errors

- [ ] Documentation
  - [ ] Update README si nécessaire
  - [ ] Update CHANGELOG
  - [ ] Update API docs si exposé

### Deploy

- [ ] Backup production DB
  - [ ] `pg_dump $PROD_DB > backup_before_pmids.sql`

- [ ] Run migration production
  - [ ] `psql $PROD_DB -f db/migrations/add-pmids-column.sql`

- [ ] Deploy code
  - [ ] `git push production main`
  - [ ] Verify deploy succeeded
  - [ ] Check logs

- [ ] Réimporter KB production
  - [ ] `npm run import-knowledge` on prod
  - [ ] Verify PMIDs extracted
  - [ ] Check logs

### Post-deploy

- [ ] Test production
  - [ ] Generate test rapport
  - [ ] Verify PMIDs present
  - [ ] Verify [SRC:UUID] absent
  - [ ] Verify References section

- [ ] Monitor
  - [ ] Check error logs
  - [ ] Check performance
  - [ ] Check user feedback

---

## Checklist Phase 9: Validation finale

### Critères de succès

- [ ] ✅ 0 citations `[SRC:UUID]` dans nouveaux rapports
- [ ] ✅ Minimum 8-12 citations `(PMID: ...)` par rapport
- [ ] ✅ Section "Références scientifiques" avec liens PubMed
- [ ] ✅ PMIDs vérifiables sur PubMed en 10 secondes
- [ ] ✅ Format professionnel et crédible
- [ ] ✅ Aucune régression sur qualité du rapport

### Métriques à tracker

- [ ] % rapports avec PMIDs: ___%
- [ ] Avg PMIDs par rapport: ___
- [ ] % PMIDs valides (vérifiables sur PubMed): ___%
- [ ] Feedback clients: ___
- [ ] Questions "source?": -___%

---

## Rollback Plan

Si problème critique:

- [ ] Rollback code
  - [ ] `git revert HEAD`
  - [ ] `git push production main`

- [ ] Rollback DB (si nécessaire)
  - [ ] `psql $PROD_DB -c "ALTER TABLE knowledge_base DROP COLUMN pmids;"`

- [ ] Restore backup
  - [ ] `psql $PROD_DB < backup_before_pmids.sql`

- [ ] Notify team
  - [ ] Document issue
  - [ ] Plan fix

---

## Notes

### Discovered during implementation

- [ ] Issue #1: ___
- [ ] Issue #2: ___
- [ ] Issue #3: ___

### Improvements for v2

- [ ] PubMed API caching
- [ ] Better metadata (titles, authors)
- [ ] Multi-language support
- [ ] DOI support in addition to PMID
- [ ] Link to full-text PDF when available

---

## Sign-off

- [ ] Dev: Implementation complete ___________
- [ ] QA: Tests passed ___________
- [ ] PM: Requirements met ___________
- [ ] Deploy: Production verified ___________

Date: ___________

---

## Quick Reference

**Documents**:
- Full audit: `AUDIT_2_SOURCES_CITATIONS.md` (22K)
- Summary: `AUDIT_2_SUMMARY.txt` (9.5K)
- Examples: `AUDIT_2_EXAMPLES_COMPARISON.md` (14K)
- Implementation: `AUDIT_2_IMPLEMENTATION_GUIDE.md` (20K)
- This checklist: `AUDIT_2_CHECKLIST.md`

**Key files to modify**:
- `scripts/import-blood-knowledge.ts` (+50 lines)
- `server/knowledge/storage.ts` (3 changes)
- `server/blood-analysis/index.ts` (5 changes)
- `db/migrations/add-pmids-column.sql` (new)

**Estimated time**: 2-3 days
**Impact**: Crédibilité x10, transparence totale
