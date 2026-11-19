# Délivrabilité : état DNS et changements à appliquer

Relevé en lecture seule le 19/11/2026 avec `dig` (résolveur 1.1.1.1 et serveur
autoritaire `ns-cloud-e1.googledomains.com`). Rien n'a été modifié.

## Où modifier

- Serveurs DNS : `ns-cloud-e1` à `ns-cloud-e4.googledomains.com`.
- Bureau d'enregistrement (RDAP Verisign) : **Squarespace Domains II LLC**
  (ancien Google Domains). Les enregistrements se gèrent dans Squarespace :
  Domaines > achzodcoaching.com > DNS > Enregistrements personnalisés.
- Le domaine expire le **13/12/2026** : vérifier que le renouvellement est actif,
  sinon le site et tous les mails tombent.

## État actuel

| Type | Nom | Valeur | Avis |
| --- | --- | --- | --- |
| MX | @ | 1 aspmx.l.google.com, 5 alt1/alt2, 10 alt3/alt4 | Google Workspace, OK |
| TXT (SPF) | @ | `v=spf1 include:_spf.google.com include:mxsspf.sendpulse.com ~all` | OK (Brevo passe par sa propre adresse de retour, aligné en DKIM) |
| TXT | @ | `brevo-code:ceb58bc6...`, `google-site-verification=...` | OK |
| TXT (DKIM Google) | google._domainkey | **deux enregistrements**, tous deux RSA 2048 bits (clé A `...tkNiKAq2FaXRDkJoUq91...`, clé B `...hLuJGq6HhA9JkC0fPw9T...`) | Doublon à supprimer |
| TXT (DKIM SendPulse) | sign._domainkey | RSA **1024 bits** | C'est la clé 1024 bits de l'audit |
| CNAME (DKIM Brevo) | brevo1._domainkey, brevo2._domainkey | b1/b2.achzodcoaching-com.dkim.brevo.com (2048 bits) | OK |
| TXT (DMARC) | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:rua@dmarc.brevo.com` | Déjà en quarantine à 100 %, rapports envoyés à Brevo seulement |
| CNAME | apexlabs | apexlabs.onrender.com | Pas d'envoi depuis ce sous-domaine (les mails partent de coaching@achzodcoaching.com) |
| CNAME | www | cdn.webflow.com | Sans effet sur l'envoi |

Deux TXT sur `google._domainkey` : un vérificateur peut prendre l'un ou
l'autre, et la signature Google échoue dès qu'il tombe sur la mauvaise clé.

## Changements à appliquer, dans l'ordre

### 1. DKIM Google 2048 bits, un seul enregistrement

1. admin.google.com > Applications > Google Workspace > Gmail > Authentifier
   les e-mails, domaine achzodcoaching.com.
2. Option simple : lire la valeur affichée. Si elle correspond à la clé A ou B
   ci-dessus, **supprimer dans Squarespace le TXT `google._domainkey` qui ne
   correspond pas**, garder l'autre.
3. Option propre (si la valeur affichée ne correspond à aucune des deux, ou
   en cas de doute) : « Générer un nouvel enregistrement », longueur 2048,
   préfixe `google`. Dans Squarespace, supprimer les **deux** TXT
   `google._domainkey`, puis ajouter un seul TXT :
   - Hôte : `google._domainkey`
   - Valeur : la chaîne `v=DKIM1; k=rsa; p=...` donnée par la console
4. Attendre la propagation (jusqu'à 48 h), puis cliquer « Commencer
   l'authentification ». Vérifier : `dig +short TXT google._domainkey.achzodcoaching.com`
   doit renvoyer une seule ligne.

### 2. DMARC : rapports aussi chez Ach

Créer d'abord dans Google Workspace un alias ou un groupe
`dmarc@achzodcoaching.com` qui arrive chez Ach (une adresse Gmail perso ne
marche pas : gmail.com ne publie pas l'autorisation de réception des rapports).

Remplacer le TXT `_dmarc` par :

```
v=DMARC1; p=quarantine; rua=mailto:rua@dmarc.brevo.com,mailto:dmarc@achzodcoaching.com
```

### 3. Progression de la politique

La politique est **déjà** `p=quarantine` à 100 %. Étapes suivantes, seulement
si les rapports le permettent :

1. Lire les rapports 2 à 4 semaines (un lecteur gratuit type dmarcian ou
   Postmark DMARC aide à les lire).
2. Condition pour avancer : Google, SendPulse et Brevo passent DKIM aligné sur
   au moins 98 % des volumes, et aucune source légitime inconnue n'échoue
   (Stripe, Webflow, Shopify ou autre outil qui enverrait avec une adresse
   @achzodcoaching.com).
3. Alors : `v=DMARC1; p=reject; pct=25; rua=mailto:rua@dmarc.brevo.com,mailto:dmarc@achzodcoaching.com`
   pendant 2 semaines, puis la même chose sans `pct=25`.
4. Si une source légitime échoue : rester en `p=quarantine`, corriger son
   DKIM ou son SPF d'abord.

### 4. Optionnel : clé SendPulse 1024 bits

`sign._domainkey` (SendPulse) est en 1024 bits. Gmail l'accepte encore. Si
SendPulse propose une clé 2048 bits dans SMTP > Paramètres > domaine
expéditeur, la générer et remplacer le TXT `sign._domainkey` par la nouvelle
valeur. Non vérifiable depuis le DNS seul.

## Lien avec List-Unsubscribe

RFC 8058 exige que la signature DKIM couvre les en-têtes `List-Unsubscribe` et
`List-Unsubscribe-Post`. Les en-têtes ajoutés par le code partent par le
relais SMTP SendPulse (signé `sign._domainkey`) ou par Brevo (signé
`brevo1`/`brevo2`). Après activation, vérifier sur un mail reçu dans Gmail
(Afficher l'original) que `List-Unsubscribe` apparaît et que DKIM est PASS.
