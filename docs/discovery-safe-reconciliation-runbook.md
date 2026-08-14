# Discovery Scan — runbook de réconciliation sûre

Ce runbook remplace les anciens batchs `batch_91` et `remediate-sent-discovery`. Ils ne doivent plus être exécutés : leurs coûts, commits, seuils et cohortes ne correspondent plus au moteur actuel.

## Contrat de sécurité

1. Les migrations `003` à `005` sont appliquées avant le nouveau process. Le reconciler et le one-shot vérifient physiquement les colonnes, PK, contraintes, FK et index v005 avant toute opération ; un schéma partiel échoue fermé.
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
2. Confirmer avant le déploiement que génération, livraison et workers batch Discovery sont OFF.
3. Configurer sur le service Render actif le pre-deploy exact :

   ```text
   npm run db:migrate:discovery-005
   ```

   `render.yaml` porte la même commande. Elle applique `005` et vérifie le catalogue dans une seule transaction sous advisory lock. Une erreur annule la transaction et bloque le déploiement avant le démarrage du nouveau process.
4. Déployer le commit audité. Ne lancer aucun job, shell applicatif, reconciler, one-shot ni worker entre le succès du pre-deploy et le démarrage automatique du nouveau process. Ne jamais utiliser une commande de démarrage qui exécute la migration en parallèle du serveur.
5. Archiver la preuve `DISCOVERY_BATCH_SCHEMA_MIGRATION_OK:v5` du pre-deploy. Son absence est un NO-GO.
6. Vérifier `/api/version`, `/api/health`, commit exact, HTTP 200 et DB connectée.
7. Exécuter uniquement un manifeste `--summary-only`; son gate catalogue v005 doit passer avant la première lecture métier.
8. Vérifier zéro job actif avant toute approbation.

Ne jamais démarrer le nouveau code avant la preuve v005. Pour une migration manuelle séparée, suspendre d'abord le service afin qu'aucun ancien worker ne tourne, exécuter `npm run db:migrate:discovery-005`, vérifier la preuve, puis seulement démarrer le SHA audité. Ne pas reprendre le service entre ces étapes.

## 3. Manifeste read-only

```bash
npx tsx scripts/discovery-safe-reconciler.ts \
  --out /chemin/unique/discovery-manifest.json
```

Sans `--run-generation` ni `--run-delivery`, aucune écriture DB, aucun provider et aucun email. Le fichier est créé avec `wx` : un fichier existant n’est jamais écrasé.

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

## 6. Livraison contrôlée

La livraison utilise un nouveau manifeste. Seuls `valid_never_sent`, gate vert, zéro tracking, zéro claim, hashes identiques sont éligibles.

Un audit portant une preuve de hard-fail SMTP est représenté par `smtpHardFailProven: true`, `tracking.hardFailed > 0`, le cohort `ambiguous` et la raison `smtp_hard_fail_proven_terminal`. La preuve est limitée à un statut provider `bounced`, un événement structuré `hard_fail`/`bounce`, ou un code SMTP 5xx synchronisé lié à un identifiant provider. Un simple statut générique `failed` ne constitue pas à lui seul cette preuve. L'audit reste résolvable par son `targetAuditIds` exact pour revue opérateur, mais les étapes génération et livraison le rejettent avant tout provider : aucun envoi ni retry automatique.

Garde-fou d'exploitation : laisser `DISCOVERY_REPORT_DELIVERY_ENABLED=false`. Le chemin historique hors reconciler traite encore certains statuts `failed` comme réessayables ; il ne doit pas être réactivé pour Discovery tant qu'il ne consomme pas lui aussi la disposition terminale hard-fail. Le contrôleur sûr n'emprunte pas ce chemin.

Approbation : `stage = DELIVERY`, `globalBudgetUsd = 0`, `targetAuditIds` exacts et nouveau `approvalBindingSha256`, palier `ONE`, puis `THREE`, `FIVE`, `REST` avec un manifeste frais à chaque fois.

Variables :

```bash
DISCOVERY_BATCH_DELIVERY_WORKER_ENABLED=true
DISCOVERY_REPORT_DELIVERY_ENABLED=false
REMEDIATION_SIDE_EFFECTS_DISABLED=true
APP_URL=https://apexlabs.onrender.com
```

Commande opérateur :

```bash
npx tsx scripts/discovery-safe-reconciler.ts \
  --run-delivery \
  --approval /chemin/approval-delivery-one.json
```

Le worker :

1. revalide rapport, destinataire et hashes ;
2. promeut par CAS vers `BATCH_READY` ;
3. crée le claim unique ;
4. marque `PROVIDER_POST_STARTED` avant le POST ;
5. n’écrit `SENT` que si SendPulse confirme l’acceptation ;
6. marque toute issue incertaine `AMBIGUOUS` et arrête le palier.

Une acceptation SendPulse ne garantit pas l’arrivée en inbox. La preuve de livraison finale doit être enrichie par SMTP confirmé, ouverture ou retour client lorsque disponible.

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
