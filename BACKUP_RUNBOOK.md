# Sauvegarde autonome APEXLABS

## Objectif

Créer chaque jour un dump PostgreSQL complet, le chiffrer avant sa sortie de Render, l’envoyer vers un stockage S3 compatible indépendant, le retélécharger puis prouver qu’il est lisible par `pg_restore`.

## Garanties

- activation explicite et fail-closed ;
- clé AES-256-GCM distincte des identifiants du stockage ;
- objet daté immuable ;
- SHA-256 vérifié après retéléchargement ;
- enveloppe authentifiée et test `pg_restore --list` ;
- verrou PostgreSQL anti-concurrence ;
- nettoyage des fichiers temporaires ;
- multipart incomplet supprimé en cas d’échec ;
- alerte admin au premier échec, puis au maximum une fois par 24 heures ;
- rétention bornée : 14 quotidiens, 8 semaines, 12 mois environ ;
- aucun secret dans Git ou dans les logs.

## Variables Render

- `AUTONOMOUS_BACKUP_ENABLED=true`
- `BACKUP_S3_BUCKET`
- `BACKUP_S3_ENDPOINT`
- `BACKUP_S3_REGION=auto`
- `BACKUP_S3_ACCESS_KEY_ID`
- `BACKUP_S3_SECRET_ACCESS_KEY`
- `BACKUP_ENCRYPTION_KEY_B64` : exactement 32 octets aléatoires en base64
- `BACKUP_S3_PREFIX` : facultatif, défaut `apexlabs-postgres`

## Activation sûre

1. Créer un bucket privé S3 compatible dans une offre gratuite suffisante. Cloudflare R2 est le choix recommandé.
2. Créer un jeton limité à ce bucket, lecture/écriture uniquement.
3. Injecter les variables dans Render sans les écrire dans un fichier.
4. Déployer avec `AUTONOMOUS_BACKUP_ENABLED=false` et vérifier le démarrage.
5. Passer à `true`.
6. Exiger dans les logs `BACKUP_VERIFIED`, avec `entries > 10`.
7. Télécharger le premier objet depuis un poste séparé et conserver la clé de chiffrement dans le gestionnaire de secrets.
8. Faire seulement ensuite la rotation PostgreSQL.

## Restauration d’urgence

Le format est : magic `APEXBK1`, IV 12 octets, ciphertext AES-256-GCM, tag 16 octets. Le worker retélécharge et déchiffre chaque nouvelle sauvegarde avant de lancer `pg_restore --list`. Pour une restauration complète, créer une nouvelle base PostgreSQL vide, déchiffrer l’objet avec la même clé puis exécuter `pg_restore --clean --if-exists --no-owner --no-acl --dbname <nouvelle_base> <dump>`.

Ne jamais restaurer directement sur la production courante sans validation sur une base séparée.
