# Discovery knowledge restoration runbook

## Canonical offline inventory

The repository contains six tracked datasets with 890 raw records:

| File | Source | Raw | Unique | SHA-256 |
| --- | --- | ---: | ---: | --- |
| `huberman-full.json` | `huberman` | 367 | 355 | `3772b7ba4d87cb2b1bbb20b570a8f614ed5156cc4ca870d7a85de61b47988c79` |
| `examine-full.json` | `examine` | 43 | 43 | `fad4c308a6d053497a19c15d54dc223138208ddd908c72d4f0efb004be83df07` |
| `mpmd-full.json` | `mpmd` | 235 | 235 | `52e15cd61f1d88c50568789e4a7801b3de0b725e631902d33d6073f099025f6b` |
| `peter-attia-full.json` | `peter_attia` | 200 | 200 | `6499b9462bceeb1045647b6868c462d17dfc33b8b2dc2112879bb68bce3b3a07` |
| `rp-full.json` | `renaissance_periodization` | 30 | 30 | `9ee72c8b151724d5f4523c11dfacc25bdadad2dbbc4a2fc32566c6e6d6d43e10` |
| `sbs-full.json` | `sbs` | 15 | 15 | `f9a2d81f16681e451353494a51efff54f877899f2afa3d1e79c2d50622ecad0a` |

All 890 records have a non-empty title, URL and content of at least 100
characters. The validator rejects 12 duplicate payloads from two known
Huberman scraper failures. The safe import set is therefore exactly 878 unique
content hashes. The six-source raw manifest hash is
`c6f6449ca5be2f97bc13f6b4208f0b8b1f2b6214748751861f469c9fc9d1dbb8`;
the unique manifest hash is
`be7eb848902accc0245b42c46cd04dc38a4841d74c98e6954847a303c4e8d5a4`.

The older `server/knowledge/search.ts` comments describe 608 articles across
eight sources (100/17/316/66/28/68/7/6). That is historical documentation, not
the tracked restore manifest. The two missing historical sources are
`applied_metabolics` and `newsletter`; no offline tracked dataset exists for
either, so this restoration must not fabricate or publicly scrape them.

## Safe execution

1. Deploy the route lockdown and fail-closed Discovery knowledge policy first.
2. Keep Discovery delivery disabled.
3. Run `npm run knowledge:restore`. This is offline-only and must print
   `DRY_RUN_PASS` with 890 raw, 878 unique and non-zero retrieval for all eight
   Discovery domains.
4. Take an infrastructure-level PostgreSQL snapshot.
5. Run the explicit apply command from a one-off private Render shell:

   ```sh
   KB_RESTORE_APPLY=I_UNDERSTAND_878_UNIQUE \
     npx tsx scripts/restore-discovery-knowledge.ts --apply
   ```

   Apply uses a temporary staging table and one transaction. It inserts with
   `ON CONFLICT (content_hash) DO NOTHING`, performs no delete/update, compares
   every staged payload with the live row, verifies retrieval for all eight
   domains, then commits. Any mismatch rolls back.
6. Re-run the default dry-run, inspect live counts by source, and perform one
   generation-only canary. Delivery remains off until its eight domains and
   report artifacts pass the premium gate.

## Historical premium classification

Before the fail-closed knowledge patch, Discovery explicitly continued in a
degraded mode when knowledge retrieval was empty. The generated report did not
persist the knowledge article IDs or a corpus manifest hash. Consequently, an
OpenAI-generated report alone cannot prove that the knowledge base informed
its synthesis or eight sections.

If the production table/retrieval was empty during the seven-day incident,
all 41 reports previously labelled premium must be reclassified as unverified
and regenerated after restoration. Content length and OpenAI provenance are
not evidence of knowledge grounding. The 24 template fallbacks already require
regeneration independently.
