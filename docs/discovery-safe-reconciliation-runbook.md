# Discovery Scan — runbook de réconciliation sûre

Ce runbook remplace les anciens batchs `batch_91` et `remediate-sent-discovery`. Ils ne doivent plus être exécutés : leurs coûts, commits, seuils et cohortes ne correspondent plus au moteur actuel.

## Contrat de sécurité

1. Les migrations `003` à `010` sont appliquées avant le nouveau process. Le reconciler vérifie physiquement le schéma v009 avant toute opération, y compris le versioning append-only `ACTIVE`/`SUPERSEDED` des artefacts, la provenance narrative legacy immuable et le scellement de l'artefact `ACTIVE` ; un schéma partiel échoue fermé. Le schéma v010 est en plus obligatoire avant toute inspection ou exécution du replay offline Alexandre.
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
   npm run db:migrate:discovery-006 && npm run db:migrate:discovery-007 && npm run db:migrate:discovery-008 && npm run db:migrate:discovery-009 && npm run db:migrate:discovery-010
   ```

   `render.yaml` porte la même chaîne fail-fast. Chaque runner applique sa migration dans sa propre transaction sous advisory lock, vérifie immédiatement son catalogue physique, puis autorise seulement la migration suivante. V008 exécute d'abord `CREATE EXTENSION IF NOT EXISTS pgcrypto`, puis vérifie physiquement l'extension et un digest SHA-256 connu ; une extension indisponible ou un rôle sans permission de création fait échouer la transaction avant toute mutation V008. V009 scelle dans chaque item le tuple complet de l'éventuel artefact `ACTIVE`. V010 ajoute la preuve append-only des replays offline. Une erreur sur `006`, `007`, `008`, `009` ou `010` annule la transaction concernée, interrompt la chaîne `&&` et bloque le déploiement avant le démarrage du nouveau process. Ne jamais inverser l'ordre : `010` dépend de `009`, qui dépend de `008`, qui dépend du socle `007`.
4. Déployer le commit audité. Ne lancer aucun job, shell applicatif, reconciler, one-shot ni worker entre le succès du pre-deploy et le démarrage automatique du nouveau process. Ne jamais utiliser une commande de démarrage qui exécute la migration en parallèle du serveur.
5. Archiver les cinq preuves distinctes et ordonnées `DISCOVERY_BATCH_SCHEMA_MIGRATION_OK:v6`, `DISCOVERY_BATCH_SCHEMA_MIGRATION_OK:v7`, `DISCOVERY_BATCH_SCHEMA_MIGRATION_OK:v8`, `DISCOVERY_BATCH_SCHEMA_MIGRATION_OK:v9` et `DISCOVERY_BATCH_SCHEMA_MIGRATION_OK:v10`. L'absence, l'inversion ou la duplication trompeuse d'une version est un NO-GO.
6. Vérifier `/api/version`, `/api/health`, commit exact, HTTP 200 et DB connectée.
7. Exécuter uniquement un manifeste `--summary-only`; son gate physique v009 doit passer avant la première lecture métier. Vérifier qu'il ne lit que l'unique artefact `ACTIVE` de chaque audit, jamais les versions `SUPERSEDED`, et qu'il en scelle l'identifiant avec les hashes TXT, HTML et contenu.
8. Vérifier zéro job actif avant toute approbation.

Le service Render actif peut encore avoir un ancien pre-deploy au moment de la release. Ne jamais remplacer cette commande pendant qu'un SHA ne contenant pas les cinq runners est susceptible de redémarrer. La séquence opérateur sûre est de confirmer les automatismes Discovery OFF, suspendre temporairement l'auto-deploy si Render peut redéployer sur la sauvegarde de configuration, enregistrer la chaîne exacte `006 && 007 && 008 && 009 && 010` sur le service actif `apexlabs`, pousser uniquement le SHA audité, puis réactiver l'auto-deploy et exiger les cinq preuves avant le démarrage. Le comportement exact de Render doit être vérifié en lecture seule avant cette séquence ; toute incertitude est un NO-GO.

Ne jamais démarrer le nouveau code avant les preuves v6, v7, v8, v9 et v10. Pour une migration manuelle séparée, suspendre d'abord le service afin qu'aucun ancien worker ne tourne, exécuter la chaîne composite exacte, vérifier les cinq preuves dans l'ordre, puis seulement démarrer le SHA audité. Ne pas reprendre le service entre ces étapes.

### Rollback release

Les migrations v006 à v010 sont additives et restent appliquées lors d'un rollback applicatif : ne jamais tenter de migration descendante en urgence. Garder génération, livraison, remédiation et worker batch Discovery OFF, vérifier qu'aucun lock, claim, job ou réservation provider n'est actif, puis redéployer uniquement un SHA explicitement audité comme compatible avec le schéma v010. Après rollback, confirmer `/api/version`, `/api/health`, HTTP 200, DB connectée, zéro nouveau `READY`, `SENDING` ou `SENT`, et exécuter seulement `--summary-only`. Un SHA ancien qui lit toutes les versions d'artefacts, modifie un artefact en place ou ignore les preuves offline append-only est incompatible et ne doit pas être redémarré.

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

## 6. Replay réel d’un Discovery historique invalide

Le replay est un cycle en trois opérations distinctes : `prepare`, nouveau
`preflight`, puis `run`. Il cible exactement un audit et s'arrête après sa
persistance en `BATCH_READY`. Il ne livre rien. Ne jamais réutiliser le
manifeste ou l'approbation de préparation pour le run : `prepare` change
volontairement l'état canonique et les rend périmés.

### 6.1 Inventaire et approbation fraîche de préparation

1. Confirmer en lecture seule : identité et email attendus, audit non-test,
   statut éligible, exactement un appel provider historique, zéro tracking,
   zéro claim de livraison, aucun batch actif et un seul artefact `ACTIVE` si
   la source est un rapport persisté invalide.
2. Créer un manifeste dans un chemin neuf et non réutilisable :

   ```bash
   npx tsx scripts/discovery-safe-reconciler.ts \
     --summary-only \
     --out /preuves/replay/AUDIT_ID/01-manifest-prepare.json
   ```

3. Archiver le fichier, son `manifestSha256`, le commit exact et son hash de
   fichier. Créer ensuite une approbation **fraîche**, non expirée, de stage
   `REGENERATION`, tier `ONE`, ciblant uniquement `AUDIT_ID`. Son
   `manifestSha256`, son `commitSha`, sa liste ordonnée, ses limites et son
   `approvalBindingSha256` doivent correspondre exactement. Une ancienne
   approbation ou une approbation couvrant plusieurs audits est un NO-GO.
4. Exécuter `prepare` avec les automatismes persistants du service toujours
   OFF. Les variables ci-dessous sont limitées à ce processus shell ; ne pas
   les enregistrer dans Render :

   ```bash
   env \
     DISCOVERY_UNIFIED_GENERATION_ENABLED=false \
     DISCOVERY_REPORT_DELIVERY_ENABLED=false \
     DISCOVERY_BATCH_DELIVERY_WORKER_ENABLED=false \
     DISCOVERY_SENT_REMEDIATION_ENABLED=false \
     REMEDIATION_SIDE_EFFECTS_DISABLED=true \
     npx tsx scripts/discovery-safe-reconciler.ts \
       --prepare-regeneration \
       --approval /preuves/replay/AUDIT_ID/01-approval-prepare.json
   ```

5. Archiver immédiatement la ligne `DISCOVERY_REGENERATION_PREPARED` avec
   `auditId`, `candidateId`, type de source et hashes de provenance. Vérifier
   qu'aucun provider n'a été appelé, qu'aucun email/claim/tracking n'existe,
   que le snapshot historique est présent et immuable, et que le statut est
   maintenant `BATCH_REVIEW`. Toute sortie partielle ou incertaine bloque le
   replay ; ne jamais relancer `prepare` à l'aveugle.

### 6.2 Nouveau manifeste, nouvelle approbation et preflight

Après `prepare`, reconstruire obligatoirement l'inventaire dans un **nouveau**
fichier. Le manifeste et l'approbation précédents sont désormais invalides :

```bash
npx tsx scripts/discovery-safe-reconciler.ts \
  --summary-only \
  --out /preuves/replay/AUDIT_ID/02-manifest-run.json
```

Vérifier que l'audit expose le même `candidateId` en `QUARANTINED`,
`retryCandidateAttemptNo=1`, `providerAttemptCount=1`, zéro tracking/claim,
`BATCH_REVIEW`, `regenerationEligible=true` et les hashes attendus. Archiver le
nouveau fichier et ses hashes. Créer une **deuxième approbation fraîche** de
stage `REGENERATION` liée au nouveau `manifestSha256` et au même commit exact ;
elle doit avoir une nouvelle référence, une nouvelle expiration et un nouveau
`approvalBindingSha256`. Ne jamais copier seulement l'ancien hash.

Lancer ensuite le preflight sans écriture de rapport ni appel provider :

```bash
env \
  DISCOVERY_UNIFIED_GENERATION_ENABLED=false \
  DISCOVERY_REPORT_DELIVERY_ENABLED=false \
  DISCOVERY_BATCH_DELIVERY_WORKER_ENABLED=false \
  DISCOVERY_SENT_REMEDIATION_ENABLED=false \
  REMEDIATION_SIDE_EFFECTS_DISABLED=true \
  npx tsx scripts/discovery-safe-reconciler.ts \
    --preflight-regeneration \
    --target-audit-id AUDIT_ID
```

Archiver `DISCOVERY_BATCH_REGENERATION_PREFLIGHT_COMPLETE` et vérifier : même
`manifestSha256`, même commit, même auditId et `responsesSha256`, huit scopes
présents, `providerCalls=0`, coût worst-case inférieur ou égal au hard cap.
Tout changement entre manifeste et preflight impose un nouvel inventaire et
une nouvelle approbation.

### 6.3 Run one-shot et preuves postflight

La génération n'est activée que pour le processus one-shot ci-dessous. La
configuration persistante Render reste OFF avant, pendant et après la commande :

```bash
env \
  DISCOVERY_UNIFIED_GENERATION_ENABLED=true \
  DISCOVERY_REPORT_DELIVERY_ENABLED=false \
  DISCOVERY_BATCH_DELIVERY_WORKER_ENABLED=false \
  DISCOVERY_SENT_REMEDIATION_ENABLED=false \
  REMEDIATION_SIDE_EFFECTS_DISABLED=true \
  AI_COST_ALERTS_ENABLED=false \
  AI_USAGE_PERSISTENCE_DISABLED=false \
  npx tsx scripts/discovery-safe-reconciler.ts \
    --run-regeneration \
    --approval /preuves/replay/AUDIT_ID/02-approval-run.json
```

Arrêter au premier message autre qu'un résultat complet. Après succès,
archiver dans un répertoire en lecture seule :

1. les deux manifestes, leurs hashes de fichiers et `manifestSha256` ;
2. les deux références d'approbation, expirations, `approvalBindingSha256` et
   hashes des fichiers d'approbation (les fichiers restent à accès restreint) ;
3. commit SHA, `auditId`, `candidateId`, `batchId`, item id et état final ;
4. ancien et nouveau `artifactId`, relation
   `new.supersedes_artifact_id = old.id`, états `SUPERSEDED`/`ACTIVE`,
   `superseded_at`, hashes TXT/HTML/contenu et provenance historique ;
5. ancien `response_id`, nouveau `response_id`, exactement deux tentatives
   cumulées, tokens et coût réel du replay ;
6. hash questionnaire identique au manifeste, gate final, statut
   `BATCH_READY`, zéro tracking, zéro claim email, zéro nouveau `SENT` ;
7. zéro lock, job, réservation ou batch actif, puis un troisième manifeste
   read-only postflight créé sous un nouveau chemin avec `wx` ;
8. `/api/version`, `/api/health`, HTTP 200 et DB connectée.

L'artefact historique doit être byte-identique à sa preuve pré-run et protégé
contre `UPDATE`/`DELETE`; seul son passage unique `ACTIVE` → `SUPERSEDED` avec
`superseded_at` est autorisé. Le nouvel artefact doit être l'unique `ACTIVE`.
Un ID/hash absent, un retry supplémentaire, une livraison, ou un état ambigu
est un incident à conserver tel quel : aucune correction manuelle et aucun
nouveau replay automatique.

## 7. Livraison hors périmètre et désactivée

Cette release ne livre aucun rapport. Le chemin livraison du reconciler est hard-disabled et ne possède aucune procédure opérateur autorisée. Conserver en permanence `DISCOVERY_REPORT_DELIVERY_ENABLED=false`, `DISCOVERY_BATCH_DELIVERY_WORKER_ENABLED=false`, `DISCOVERY_SENT_REMEDIATION_ENABLED=false` et `REMEDIATION_SIDE_EFFECTS_DISABLED=true` pendant tout le chantier.

Ne jamais activer un worker, créer une approbation `DELIVERY`, appeler un flag de livraison, utiliser un endpoint de force-send ou modifier manuellement un rapport vers `READY`, `SCHEDULED`, `SENDING` ou `SENT`. Les rapports validés s'arrêtent en `BATCH_READY` pour revue humaine. Une future livraison exigera un code distinct, une nouvelle revue, de nouvelles preuves et une autorisation explicite ; ce runbook ne fournit aucun chemin d'activation.

## 8. Postflight de chaque palier

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
