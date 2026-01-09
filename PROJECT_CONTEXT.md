# PROJECT_CONTEXT.md — Source de vérité (à lire avant toute action)

## 0) RÈGLE D'OR (obligatoire)
Ce fichier est la SOURCE DE VÉRITÉ du projet.

- À CHAQUE SESSION : l'assistant DOIT lire ce fichier en premier.
- S'il n'existe pas : l'assistant DOIT le créer en utilisant ce template.
- S'il existe : l'assistant DOIT proposer une mise à jour sous forme de diff (changements clairs), et N'APPLIQUER que ce que l'utilisateur valide.
- Aucune décision technique (API, modèles, archi, tokens, fichiers) ne doit être prise sans se référer à ce fichier.

Phrase obligatoire au début de chaque réponse technique :
> "Référence : PROJECT_CONTEXT.md (sections X, Y, Z)"

---

## 1) ULTRATHINK (vision + standard de qualité)
On n'est pas ici pour "faire marcher". On est ici pour faire propre.

- Think different : questionner l'évidence, mais sans casser les contraintes.
- Obsess over details : chaque coin de code doit avoir une raison d'être.
- Plan like a Vinci : plan clair avant d'écrire du code.
- Craft, don't code : noms, abstractions, bords, tests. Tout doit chanter.
- Iterate relentlessly : version 1 = brouillon, on raffine.
- Simplify ruthlessly : supprimer la complexité inutile, sans perdre la puissance.

IMPORTANT : Ultrathink ne signifie PAS inventer. L'élégance vient de la rigueur, pas du bluff.

---

## 2) NON NÉGOCIABLES (anti-folie / anti-hallucinations)
Règles absolues :

1) ZÉRO INVENTION
- Si une info n'est pas certaine à 100% (API, paramètre, fonction, endpoint, modèle, version, comportement), écrire :
  "JE NE SAIS PAS – information manquante"
  puis demander l'info.

2) ZÉRO SUPPOSITION SILENCIEUSE
- Toute hypothèse doit être listée explicitement.

3) ZÉRO CHANGEMENT D'ARCHI SANS ACCORD
- Refactor, changements de modèle, changements de flux, modifications structurelles = PROPOSITION + validation.

4) UNE TÂCHE = UN OBJECTIF
- Si l'utilisateur demande plusieurs choses, demander la priorité ou découper.

---

## 3) OBJECTIF PRODUIT

### Produit principal : NEUROCORE 360
- Description courte : Plateforme d'audits métaboliques et de santé avec analyses IA, questionnaires, rapports PDF et dashboards interactifs.
- Entrées : Réponses questionnaires (50-210 questions), photos corporelles, données wearables, bilans sanguins
- Sorties : Rapports PDF personnalisés (25-45 pages), dashboards interactifs, scores de santé, protocoles d'action
- Critères de succès : Génération de rapports précis sans inventions, synchronisation SendPulse fonctionnelle, emails envoyés
- Non-objectifs : Pas de diagnostic médical, pas de conseils pharmaceutiques

### Sous-projet actif : APEXLABS PRE-LAUNCH
- URL production : https://apexlabsprelaunch.achzodcoaching.com
- Objectif : Landing page de pré-lancement avec waitlist
- Offres présentées :
  - Discovery Scan (Gratuit) - 50 questions, 5 piliers
  - Anabolic Bioscan (49€) - 150 questions, rapport 25 pages
  - Pro Panel 360 (99€) - 210 questions, 45 pages, photos
  - Blood Analysis (99€) - Analyse bilan sanguin, 50+ biomarqueurs
  - Burnout Engine (39€) - 80 questions, détection burnout

---

## 4) CONTRAINTES MÉTIER (Achzod / audits)
- Ne JAMAIS inventer des chiffres, claims marketing, ou fonctionnalités non existantes
- Les prix sont FIXES : Discovery=Gratuit, Anabolic=49€, Pro Panel=99€, Blood=99€, Burnout=39€
- Tutoiement obligatoire dans les communications (pas de "vous")
- Pas de tirets longs IA "—" dans le contenu
- Pas de claims "500+ clients" ou chiffres inventés
- Pas de promesse de remboursement (services digitaux)
- Le coaching n'est PAS inclus dans les audits

---

## 5) ARCHITECTURE TECHNIQUE

### Stack :
- Frontend : React + TypeScript + Vite + TailwindCSS + Framer Motion
- Backend : Express.js + TypeScript
- DB : PostgreSQL (Neon/Render)
- Hébergement : Render.com
- Email : SendPulse API (SMTP + Address Books)
- Domaine : achzodcoaching.com (Squarespace DNS)

### Flux waitlist (pre-launch) :
1. User remplit formulaire (email, name, objective)
2. POST /api/waitlist/subscribe
3. Save DB (waitlist_subscribers) avec ON CONFLICT
4. Sync SendPulse (APEXLABS_WAITLIST address book)
5. Envoi email bienvenue ApexLabs

---

## 6) APIS & MODÈLES

### SendPulse :
- Auth : OAuth client_credentials (SENDPULSE_USER_ID + SENDPULSE_SECRET)
- Email SMTP : /smtp/emails (base64 encoded HTML)
- Address Books : /addressbooks + /addressbooks/{id}/emails
- Liste waitlist : APEXLABS_WAITLIST

### OpenAI (pour audits - pas pour pre-launch) :
- Modèle principal : gpt-4o
- Modèle fallback : gpt-4o-mini
- Usage : Génération de rapports d'audit

### Google (fallback audits) :
- Modèle : gemini-1.5-pro

### Politique :
- Pre-launch n'utilise PAS d'IA pour le contenu
- Les audits utilisent OpenAI en priorité, Gemini en fallback

---

## 7) VARIABLES D'ENV (Render)

### Requises :
- DATABASE_URL= (PostgreSQL connection string)
- SENDPULSE_USER_ID=
- SENDPULSE_SECRET=
- ADMIN_SECRET= (pour /api/admin/waitlist)

### Optionnelles (audits) :
- OPENAI_API_KEY=
- ANTHROPIC_API_KEY=
- GOOGLE_API_KEY=

### Règles :
- Jamais de clés en dur dans le code
- ADMIN_SECRET obligatoire pour endpoints admin
- Vérifier présence au démarrage, logger erreur si manquante

---

## 8) STRUCTURE DES FICHIERS

### Fichiers clés :
- `/client/src/pages/ApexLabs.tsx` - Landing page pre-launch
- `/server/routes.ts` - Tous les endpoints API
- `/server/emailService.ts` - Templates email + SendPulse API
- `/server/index.ts` - Entry point serveur

### Endpoints waitlist :
- POST /api/waitlist/subscribe - Inscription waitlist
- GET /api/waitlist/spots - Places restantes
- GET /api/admin/waitlist?key=XXX - Liste subscribers (protégé)

### Table DB :
```sql
waitlist_subscribers (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  objective TEXT,
  source TEXT,
  sendpulse_synced BOOLEAN,
  email_sent BOOLEAN,
  created_at TIMESTAMP
)
```

---

## 9) PROTOCOLE DE TRAVAIL

A) DIAGNOSTIC (court)
- Ce que je comprends
- Ce que je vais changer
- Risques / impacts

B) PLAN (si changement > 20 lignes ou multi-fichiers)
- Étapes numérotées
- "Definition of done"

C) EXÉCUTION
- Patch minimal d'abord
- Puis refactor si demandé

D) VÉRIFICATION
- Compilation / lint / tests
- Scénarios manuels à vérifier
- Hypothèses listées

---

## 10) DEFINITION OF DONE (DoD)
Une tâche est "faite" si :
- Le code compile
- Les tests passent (ou justification)
- Les erreurs sont gérées proprement
- Pas de changement silencieux d'architecture
- Les contraintes métier sont respectées (section 4)
- Le comportement est décrit (input -> output)
- PR créée et mergée sur main

---

## 11) CHANGELOG

### 2026-01-09
- **Security audit** : Suppression endpoint admin non protégé, suppression admin key hardcodée
- **Waitlist robuste** : Auto-création table DB, validation email, sanitization XSS
- **Doublons gérés** : Message "Tu es déjà inscrit" si email existe
- **SendPulse fix** : Liste unique APEXLABS_WAITLIST, payload simplifié
- **UI fixes** : Badge avis dynamique, boutons offres scrollent vers waitlist

### 2026-01-08
- Corrections descriptions offres (prix, pas d'inventions)
- Email templates en tutoiement
- Custom domain apexlabsprelaunch.achzodcoaching.com
- Redirect root vers /apexlabs

---

## 12) BOOT SEQUENCE

Au début de chaque session :
1. Lire PROJECT_CONTEXT.md
2. Résumer : objectif, contraintes métier, stack, APIs, DoD
3. Dire : "Je vais respecter ces contraintes"
4. Poser UNE question si info bloquante
5. Proposer plan + exécution
