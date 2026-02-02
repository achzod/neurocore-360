================================================================================
AUDIT #2: SOURCES ET CITATIONS - PACKAGE COMPLET
================================================================================

📅 DATE: 2026-02-02
🎯 OBJECTIF: Remplacer [SRC:UUID] par citations PubMed vérifiables
⏱️ TEMPS: 2-3 jours
📈 IMPACT: Crédibilité x10, transparence totale

================================================================================
LE PROBLÈME
================================================================================

Le rapport AI contient 36 citations [SRC:UUID] comme:
  [SRC:bf7e1cc5-296c-4e30-af2d-34ebe4087385]

Ces UUIDs:
  ❌ Ne sont PAS vérifiables par le client
  ❌ Pointent vers sources SECONDAIRES (Huberman, Attia)
  ❌ Ne respectent PAS le standard médical
  ❌ Compromettent la CRÉDIBILITÉ du rapport

Exemple actuel:
  "Une méta-analyse récente a montré... [SRC:bf7e1cc5-...]"
  → Client: "WTF c'est quoi bf7e1cc5?"

================================================================================
LA SOLUTION
================================================================================

Extraire les PMIDs des articles scrapés et modifier le système pour citer
les études primaires PubMed:

  "Une méta-analyse de 2020 (n=3324) a démontré une amélioration de
   +3.2 nmol/L (PMID: 31917448)."
  → Client: *Google PMID* → "Ah OK, Nature Reviews Cardiology 2020"

Résultat:
  ✅ Vérifiable en 10 secondes
  ✅ Citations vers études primaires
  ✅ Standard médical professionnel
  ✅ Crédibilité x10

================================================================================
DOCUMENTS FOURNIS
================================================================================

1. AUDIT_2_SUMMARY.txt (9.5K) - START HERE
   Résumé exécutif, à lire en premier.
   Temps de lecture: 10 min

2. AUDIT_2_SOURCES_CITATIONS.md (22K) - FULL ANALYSIS
   Analyse complète du problème avec tous les détails.
   Temps de lecture: 30 min

3. AUDIT_2_EXAMPLES_COMPARISON.md (14K) - VISUAL EXAMPLES
   Comparaisons avant/après avec exemples concrets du rapport.
   Temps de lecture: 15 min

4. AUDIT_2_IMPLEMENTATION_GUIDE.md (20K) - DEV GUIDE
   Guide d'implémentation complet avec code examples.
   Temps de lecture: 45 min (+ implementation time)

5. AUDIT_2_CHECKLIST.md - TRACKING
   Checklist pour suivre la progression de l'implémentation.
   Phase par phase avec checkboxes.

6. AUDIT_2_README.txt - THIS FILE
   Vue d'ensemble et navigation.

================================================================================
WORKFLOW RECOMMANDÉ
================================================================================

Pour Product Owner / Stakeholder:
  1. Lire AUDIT_2_SUMMARY.txt (10 min)
  2. Parcourir AUDIT_2_EXAMPLES_COMPARISON.md pour voir l'impact (15 min)
  3. Décision: GO / NO GO

Pour Developer:
  1. Lire AUDIT_2_SUMMARY.txt pour comprendre le contexte (10 min)
  2. Étudier AUDIT_2_IMPLEMENTATION_GUIDE.md en détail (45 min)
  3. Suivre AUDIT_2_CHECKLIST.md pour l'implémentation (2-3 jours)
  4. Référencer AUDIT_2_SOURCES_CITATIONS.md pour détails si besoin

Pour QA:
  1. Lire AUDIT_2_SUMMARY.txt (10 min)
  2. Section "Tests" dans AUDIT_2_IMPLEMENTATION_GUIDE.md (15 min)
  3. Utiliser AUDIT_2_CHECKLIST.md Phase 7 pour test plan

================================================================================
QUICK FACTS
================================================================================

Problème identifié:
  • 36 citations [SRC:UUID] dans le rapport
  • 12 UUIDs uniques utilisés
  • 0 lien PubMed (PMID)
  • 0 DOI
  • Sources = Huberman, Attia, MPMD (secondaires)

Solution:
  • Extraire PMIDs des articles scrapés
  • Modifier RAG pour passer PMIDs au contexte AI
  • Modifier prompt pour citer PMIDs pas UUIDs
  • Builder section "Références scientifiques"

Fichiers à modifier:
  • scripts/import-blood-knowledge.ts (+50 lignes)
  • server/knowledge/storage.ts (3 changements)
  • server/blood-analysis/index.ts (5 changements)
  • db/migrations/add-pmids-column.sql (nouveau)

Temps estimé:
  • Phase 1 (Extraction PMIDs): 4h
  • Phase 2 (DB schema): 1h
  • Phase 3 (Réimport KB): 2h
  • Phase 4 (RAG context): 4h
  • Phase 5 (AI instructions): 2h
  • Phase 6 (Sources section): 2h
  • Phase 7 (Tests): 8h
  • TOTAL: 23h = 2-3 jours

ROI:
  • Crédibilité: x10
  • Transparence: 0% → 100%
  • Standard médical: NON → OUI
  • Questions "source?": -80%

================================================================================
EXEMPLES AVANT/APRÈS
================================================================================

AVANT (actuel):
┌────────────────────────────────────────────────────────────┐
│ "Une méta-analyse récente a montré qu'une supplémentation │
│ en vitamine D chez des hommes carencés améliorait         │
│ significativement les niveaux de testostérone totale et   │
│ libre. [SRC:bf7e1cc5-296c-4e30-af2d-34ebe4087385]"        │
│                                                            │
│ Problèmes:                                                 │
│ • Quelle méta-analyse?                                     │
│ • bf7e1cc5-... = WTF?                                      │
│ • Pas vérifiable                                           │
└────────────────────────────────────────────────────────────┘

APRÈS (recommandé):
┌────────────────────────────────────────────────────────────┐
│ "Une méta-analyse de 2020 publiée dans Nature Reviews     │
│ Cardiology, portant sur 18 essais contrôlés randomisés    │
│ (n=3324 participants), a démontré qu'une supplémentation  │
│ en vitamine D chez des hommes carencés améliorait         │
│ significativement les niveaux de testostérone totale      │
│ (+3.2 nmol/L, p<0.001) (PMID: 31917448)."                 │
│                                                            │
│ Avantages:                                                 │
│ ✓ Journal: Nature Reviews Cardiology                      │
│ ✓ Année: 2020                                             │
│ ✓ Sample: n=3324                                          │
│ ✓ Résultats: +3.2 nmol/L, p<0.001                         │
│ ✓ PMID vérifiable en 10 secondes                          │
└────────────────────────────────────────────────────────────┘

================================================================================
DONNÉES TECHNIQUES
================================================================================

Base de données RAG actuelle:
  • Table: knowledge_base
  • Sources: huberman, peter_attia, mpmd, examine, etc.
  • Format actuel: UUID seul (bf7e1cc5-296c-4e30-af2d-34ebe4087385)
  • Articles: ~250-500 (estimé)

Modification DB:
  • Ajouter colonne: pmids TEXT[]
  • Index: GIN index sur pmids
  • Migration: ALTER TABLE + CREATE INDEX

Système RAG:
  • Fichier: server/blood-analysis/index.ts (42870 tokens)
  • Contexte actuel: [SRC:UUID] + 700 chars excerpt
  • Contexte nouveau: PMIDs: 111, 222, 333 + 700 chars excerpt

Prompt AI:
  • Règles actuelles: DOIT citer [SRC:ID]
  • Règles nouvelles: DOIT citer (PMID: 12345678)
  • Interdiction: inventer des PMIDs

Output:
  • Section actuelle: "## Sources (bibliotheque)\n- [SRC:UUID]"
  • Section nouvelle: "## Références scientifiques\n1. PMID: 123..."

================================================================================
CRITÈRES DE SUCCÈS
================================================================================

✅ MUST HAVE:
  [ ] 0 citations [SRC:UUID] dans nouveaux rapports
  [ ] Minimum 8-12 citations (PMID: ...) par rapport
  [ ] Section "Références scientifiques" avec liens PubMed
  [ ] PMIDs vérifiables sur PubMed en 10 secondes
  [ ] Tests passent
  [ ] Deploy production réussi

🎯 NICE TO HAVE:
  [ ] Titres/auteurs complets dans section Références
  [ ] Cache PubMed API metadata
  [ ] Support DOI en plus de PMID
  [ ] Multi-language support
  [ ] Link to full-text PDF

📊 METRICS:
  [ ] % rapports avec PMIDs: ___% (target: 100%)
  [ ] Avg PMIDs par rapport: ___ (target: 10)
  [ ] % PMIDs valides: ___% (target: 95%)
  [ ] Questions "source?": -___%

================================================================================
NEXT STEPS
================================================================================

1. DÉCISION (30 min)
   • Product owner lit AUDIT_2_SUMMARY.txt
   • Review exemples dans AUDIT_2_EXAMPLES_COMPARISON.md
   • Décision: GO / NO GO / DEFER

2. PLANNING (1h)
   • Assigner developer
   • Bloquer 2-3 jours
   • Schedule deploy window

3. IMPLÉMENTATION (2-3 jours)
   • Developer suit AUDIT_2_IMPLEMENTATION_GUIDE.md
   • Utilise AUDIT_2_CHECKLIST.md pour tracking
   • Daily standup sur progression

4. QA (4h)
   • QA teste selon AUDIT_2_CHECKLIST.md Phase 7
   • Validation manuelle des rapports
   • Sign-off

5. DEPLOY (2h)
   • Backup production DB
   • Run migration
   • Deploy code
   • Verify production
   • Monitor

6. POST-DEPLOY (ongoing)
   • Monitor metrics
   • Collect user feedback
   • Iterate si nécessaire

================================================================================
SUPPORT
================================================================================

Questions sur le problème:
  → AUDIT_2_SOURCES_CITATIONS.md (analyse complète)

Questions sur l'implémentation:
  → AUDIT_2_IMPLEMENTATION_GUIDE.md (guide technique)

Besoin d'exemples concrets:
  → AUDIT_2_EXAMPLES_COMPARISON.md (avant/après)

Tracking de progression:
  → AUDIT_2_CHECKLIST.md (checkboxes par phase)

Questions business/ROI:
  → AUDIT_2_SUMMARY.txt (résumé exécutif)

================================================================================
CONCLUSION
================================================================================

Le système actuel cite des UUIDs internes non-vérifiables qui compromettent
la crédibilité du rapport médical.

La solution (extraire et citer les PMIDs) prend 2-3 jours et transforme le
rapport d'un "système interne RAG" en rapport médical professionnel avec
sources vérifiables.

ROI: Crédibilité x10, transparence totale, conformité standard médical.

Decision: NO-BRAINER. Les UUIDs doivent être remplacés par des PMIDs.

================================================================================

Pour commencer: Lire AUDIT_2_SUMMARY.txt
