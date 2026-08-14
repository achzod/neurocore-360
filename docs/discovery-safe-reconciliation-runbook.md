# Discovery Scan — runbook de réconciliation sûre

Ce runbook remplace les anciens batchs `batch_91` et `remediate-sent-discovery`. Ils ne doivent plus être exécutés : leurs coûts, commits, seuils et cohortes ne correspondent plus au moteur actuel.

## Contrat de sécurité

1. Les migrations `003` à `006` sont appliquées avant le nouveau process. Le reconciler vérifie physiquement les colonnes, types, nullabilité, PK, contraintes, FK et index v006 avant toute opération ; un schéma partiel échoue fermé.
2. Le manifeste lit tous les audits `GRATUIT`, sans filtre de date ni de statut.
3. Quatre cohortes seulement : `already_accepted`, `valid_never_sent`, `ambiguous`, `invalid`.
4. Aucune action automatique sur `already_accepted`, `ambiguous`, un audit superseded ou un doublon potentiel.
5. Génération par paliers `ONE`, `THREE`, `FIVE`, puis `REST`. Chaque palier a un manifeste et une approbation liés au commit exact.
6. Un seul appel provider maximum par audit. Le compteur durable passe à 1 avant l’appel. Aucun retry SDK ou applicatif.
7. Réservation de 0,75 USD avant chaque appel. Arrêt après le rapport courant si le coût réel dépasse 0,25 USD. Refus de stockage et arrêt immédiat au-dessus de 0,75 USD.
8. Le coût réel provient de `ai_usage_events`, avec exactement une réponse Discovery depuis le claim provider. Zéro ou plusieurs lignes rendent le résultat ambigu et bloquent le batch.
9. Un rapport n’est stocké que si les deux gates passent. L’artefact et l’audit sont écrits dans une seule transaction, avec hashes et CAS du questionnaire.
10. Le statut de sortie génération est `BATCH_READY`, ignoré par AutoSend.
11. La livraison est une étape distincte. Le claim unique durable est créé avant le POST SendPulse. Une issue incertaine devient `AMBIGUOUS` et ne peut jamais être retentée automatiquement.
12. Arrêt au premier échec, écart de hash, changement de questionnaire, coût anormal, gate rouge, perte de lock ou issue provider incertaine.

## 1. Préflight local

```bash
DATABASE_URL=postgresql://x:x@127.0.0.1:1/x \
  npx tsx --test server/discovery*.test.ts server/openaiResponsesIsolation.test.ts

# Cette suite exige un vrai PostgreSQL éphémère local, jamais la production.
DATABASE_URL=postgresql://postgres@127.0.0.1:PORT/apex_discovery_test \
  npm run test:discovery:postgres

git diff --check
```

Attendu : tous les tests Discovery passent. Le typecheck global peut rester rouge uniquement sur les erreurs préexistantes hors Discovery ; aucune erreur ne doit viser `discoveryBatchControl.ts` ou `discovery-safe-reconciler.ts`.

## 2. Déploiement sûr

Ordre obligatoire :

1. Sauvegarde DB.
2. Capturer et archiver les variables du service Render actif avant le push. Exiger au minimum `DISCOVERY_UNIFIED_GENERATION_ENABLED=false`, `DISCOVERY_REPORT_DELIVERY_ENABLED=false`, `DISCOVERY_BATCH_DELIVERY_WORKER_ENABLED=false`, `DISCOVERY_SENT_REMEDIATION_ENABLED=false` et `REMEDIATION_SIDE_EFFECTS_DISABLED=true`. Toute valeur absente, opposée ou non vérifiable est un NO-GO.
3. Configurer sur le service Render actif le pre-deploy exact :

   ```text
   npm run db:migrate:discovery-006
   ```

   `render.yaml` porte la même commande. Elle applique `006` et vérifie le catalogue dans une seule transaction sous advisory lock. Une erreur annule la transaction et bloque le déploiement avant le démarrage du nouveau process.
4. Déployer le commit audité. Ne lancer aucun job, shell applicatif, reconciler, one-shot ni worker entre le succès du pre-deploy et le démarrage automatique du nouveau process. Ne jamais utiliser une commande de démarrage qui exécute la migration en parallèle du serveur.
5. Archiver la preuve `DISCOVERY_BATCH_SCHEMA_MIGRATION_OK:v6` du pre-deploy. Son absence est un NO-GO.
6. Vérifier `/api/version`, `/api/health`, commit exact, HTTP 200 et DB connectée.
7. Exécuter uniquement un manifeste `--summary-only`; son gate catalogue v006 doit passer avant la première lecture métier.
8. Vérifier zéro job actif avant toute approbation.

Le service Render actif peut encore avoir un pre-deploy v005 au moment de la release. Ne jamais remplacer cette commande pendant que l'ancien SHA est susceptible de redémarrer : le script v006 n'existe pas dans cet ancien code. La séquence opérateur sûre est de confirmer les automatismes Discovery OFF, suspendre temporairement l'auto-deploy si Render peut redéployer sur la sauvegarde de configuration, enregistrer `npm run db:migrate:discovery-006` sur le service actif `apexlabs`, pousser uniquement le SHA audité, puis réactiver l'auto-deploy et exiger la preuve v6 avant le démarrage. Le comportement exact de Render doit être vérifié en lecture seule avant cette séquence ; toute incertitude est un NO-GO.

Ne jamais démarrer le nouveau code avant la preuve v006. Pour une migration manuelle séparée, suspendre d'abord le service afin qu'aucun ancien worker ne tourne, exécuter `npm run db:migrate:discovery-006`, vérifier la preuve, puis seulement démarrer le SHA audité. Ne pas reprendre le service entre ces étapes.

### Rollback release

La migration v006 est additive et reste appliquée lors d'un rollback applicatif : ne jamais tenter de migration descendante en urgence. Garder génération, livraison, remédiation et worker batch Discovery OFF, vérifier qu'aucun lock, claim, job ou réservation provider n'est actif, puis redéployer le SHA antérieur exact. Après rollback, confirmer `/api/version`, `/api/health`, HTTP 200, DB connectée, zéro nouveau `READY`, `SENDING` ou `SENT`, et exécuter seulement `--summary-only`. Le SHA antérieur ne doit pas servir à reprendre une régénération centrale v006.

## 3. Manifeste read-only

```bash
npx tsx scripts/discovery-safe-reconciler.ts \
  --out /chemin/unique/discovery-manifest.json
```

Sans mode d'exécution génération ou régénération, aucune écriture DB, aucun provider et aucun email. Le fichier est créé avec `wx` : un fichier existant n’est jamais écrasé.

Audit obligatoire :

1. Nombre total égal au nombre d’audits `GRATUIT`.
2. `already_accepted` possède une preuve provider explicite, pas un simple `report_sent_at`.
3. `valid_never_sent` a un gate vert, zéro tracking et zéro claim.
4. `ambiguous` contient les sent markers sans preuve, failed/pending, superseded et doublons.
5. `invalid` contient seulement les rapports intacts mais non livrables.

## 4. Fichier d’approbation d’un palier génération

```json
{
  "schemaVersion": 1,
  "manifestSha256": "HASH_DU_MANIFEST",
  "commitSha": "COMMIT_EXACT",
  "approvalReference": "telegram:MESSAGE_ID",
  "expiresAt": "2026-08-13T03:00:00.000Z",
  "stage": "GENERATION",
  "tier": "ONE",
  "targetAuditIds": [
    "AUDIT_ID_EXACT_DE_SOPHIE"
  ],
  "approvalBindingSha256": "SHA256_CANONIQUE_DE_TOUTE_L_APPROBATION_SANS_CE_CHAMP",
  "maxItems": 1,
  "globalBudgetUsd": 0.75,
  "softPerScanUsd": 0.25,
  "hardPerScanUsd": 0.75
}
```

`targetAuditIds` est obligatoire, ordonné et exhaustif. Le reconciler ne cherche plus « le premier invalide » : il résout uniquement ces identifiants exacts dans le manifeste. Un identifiant absent, dupliqué, mal formé ou inéligible bloque tout le palier avant le provider.

`approvalBindingSha256` est calculé avec `discoveryApprovalBindingHash()` sur tous les champs de l’approbation sauf le hash lui-même. Changer un auditId, son ordre, le manifeste, le commit, le budget ou le palier invalide l’approbation.

Avant de signer l’approbation, confirmer pour chaque auditId : nom/client attendu, email réel valide, non-test, non désabonné, non superseded et non doublon potentiel.

Pour `THREE`, `FIVE` et `REST`, refaire un manifeste après chaque palier et créer une nouvelle approbation avec la liste exacte des 3, 5 ou audits restants autorisés. Le budget global doit couvrir `nombre ciblé × 0,75` ; ce montant est un plafond réservé, pas une dépense attendue.

### Transport sans fichier temporaire

Le mode `--approval-base64` lit exclusivement `DISCOVERY_BATCH_APPROVAL_B64`. Le payload n'est jamais accepté directement dans les arguments du processus, ni écrit dans un fichier temporaire, ni affiché ou persisté. La valeur doit être un base64 canonique UTF-8 de 16 Kio maximum ; toute source multiple, donnée non canonique ou JSON invalide bloque l'exécution avec un code générique sans refléter le contenu.

```bash
DISCOVERY_BATCH_APPROVAL_B64="$APPROVAL_B64" \
npx tsx scripts/discovery-safe-reconciler.ts \
  --run-generation \
  --approval-base64
```

Ne jamais mettre le base64 directement après un flag CLI : les arguments sont visibles dans la liste des processus et peuvent rester dans l'historique shell.

## 5. Génération contrôlée

Variables obligatoires :

```bash
DISCOVERY_UNIFIED_GENERATION_ENABLED=true
DISCOVERY_REPORT_DELIVERY_ENABLED=false
REMEDIATION_SIDE_EFFECTS_DISABLED=true
AI_COST_ALERTS_ENABLED=false
AI_USAGE_PERSISTENCE_DISABLED=false
```

Commande :

```bash
npx tsx scripts/discovery-safe-reconciler.ts \
  --run-generation \
  --approval /chemin/approval-generation-one.json
```

Après `ONE`, auditer manuellement le rapport complet, son questionnaire et les huit domaines. Ne passer à `THREE` que si :

1. un seul `response_id` et `provider_calls = 1` ;
2. coût réel ≤ 0,25 USD ;
3. huit domaines uniques et suffisamment longs ;
4. aucune contradiction avec les réponses ;
5. aucune prescription médicale, causalité inventée ou conseil TCA dangereux ;
6. TXT/HTML/gate/hashes cohérents ;
7. statut `BATCH_READY`, aucun tracking, aucun email.

Même audit après `THREE` et `FIVE`. Le premier échec bloque `REST`.

## 6. Livraison hors périmètre et désactivée

Cette release ne livre aucun rapport. Le chemin livraison du reconciler est hard-disabled et ne possède aucune procédure opérateur autorisée. Conserver en permanence `DISCOVERY_REPORT_DELIVERY_ENABLED=false`, `DISCOVERY_BATCH_DELIVERY_WORKER_ENABLED=false`, `DISCOVERY_SENT_REMEDIATION_ENABLED=false` et `REMEDIATION_SIDE_EFFECTS_DISABLED=true` pendant tout le chantier.

Ne jamais activer un worker, créer une approbation `DELIVERY`, appeler un flag de livraison, utiliser un endpoint de force-send ou modifier manuellement un rapport vers `READY`, `SCHEDULED`, `SENDING` ou `SENT`. Les rapports validés s'arrêtent en `BATCH_READY` pour revue humaine. Une future livraison exigera un code distinct, une nouvelle revue, de nouvelles preuves et une autorisation explicite ; ce runbook ne fournit aucun chemin d'activation.

## 7. Postflight de chaque palier

Vérifier et archiver :

1. batch id, manifeste, commit, approval reference ;
2. items sélectionnés et états finaux ;
3. response ids uniques, tokens et coût exact ;
4. hashes questionnaire/TXT/HTML ;
5. artefact unique par contenu ;
6. claims email uniques ;
7. absence de retry et de doublon ;
8. zéro job actif ;
9. site HTTP 200 et DB connectée ;
10. inventaire frais avant le palier suivant.

Ne jamais transformer automatiquement `AMBIGUOUS` en retry. Il faut d’abord réconcilier la preuve provider en lecture seule.
