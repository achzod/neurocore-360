# NEUROCORE 360° - Audit Métabolique Complet

## Description
Plateforme d'audit métabolique complète qui analyse 15 domaines de santé via un questionnaire de 180 questions. Les utilisateurs reçoivent un rapport personnalisé 100% IA avec des recommandations basées sur leurs réponses.

## Stack Technique
- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Express.js (Node.js)
- **State Management**: TanStack Query (React Query v5)
- **Routing**: Wouter
- **UI Components**: Shadcn/UI (Radix primitives)
- **Styling**: Tailwind CSS avec design tokens personnalisés

## Architecture des Fichiers

```
/client
  /src
    /components        # Composants réutilisables
      /ui              # Composants Shadcn
      Header.tsx       # Header avec navigation
      Footer.tsx       # Footer
    /pages             # Pages de l'application
      Landing.tsx      # Page d'accueil
      Questionnaire.tsx # Questionnaire 180 questions
      Checkout.tsx     # Sélection du plan
      Dashboard.tsx    # Dashboard utilisateur
      AuditDetail.tsx  # Détail d'un audit
      /auth
        Login.tsx      # Connexion Magic Link
        CheckEmail.tsx # Vérification email
    /lib
      questionnaire-data.ts  # Données des 180 questions
      queryClient.ts   # Configuration React Query
      utils.ts         # Utilitaires

/server
  routes.ts            # API routes Express
  storage.ts           # Interface de stockage en mémoire
  index.ts             # Entry point serveur

/shared
  schema.ts            # Types et schémas Zod partagés
```

## Routes API

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/questionnaire/save-progress` | POST | Sauvegarde progression questionnaire |
| `/api/questionnaire/progress/:email` | GET | Récupère progression |
| `/api/audit/create` | POST | Crée un nouvel audit |
| `/api/audits` | GET | Liste les audits (query: email) |
| `/api/audits/:id` | GET | Récupère un audit spécifique |
| `/api/auth/magic-link` | POST | Envoie magic link |
| `/api/auth/check-email` | POST | Vérifie si email existe |

## Pages Principales

1. **Landing** (`/` ou `/audit-complet`)
   - Hero section avec stats
   - 15 domaines d'expertise
   - Processus en 3 étapes
   - Tarification (Gratuit, Premium 79€, Elite 129€)
   - CTA final

2. **Questionnaire** (`/audit-complet/questionnaire`)
   - 15 sections, 180 questions
   - Types: text, number, select, radio, checkbox, scale, textarea
   - Sauvegarde progressive (localStorage + API)
   - Barre de progression

3. **Checkout** (`/audit-complet/checkout`)
   - Sélection du plan après questionnaire
   - 3 options de tarification

4. **Dashboard** (`/dashboard`)
   - Liste des audits
   - Stats globales
   - Accès aux rapports

5. **Détail Audit** (`/dashboard/:auditId`)
   - Score global et par domaine
   - Plan d'action 30 jours
   - Recommandations détaillées
   - Sections verrouillées pour plan gratuit

## Design System

- **Couleurs primaires**: Vert émeraude (hsl 160 84%)
- **Accent**: Violet (hsl 280 70%)
- **Police**: Inter
- **Border radius**: Petit (rounded-md)
- **Approche**: Clean, médical, rassurant

## Fonctionnalités Clés

- ✅ Questionnaire dynamique selon le sexe (180 questions / 15 sections)
- ✅ Questions spécifiques hommes (testosterone, erections matinales)
- ✅ Questions spécifiques femmes (cycle menstruel, SPM, contraception, estrogenes)
- ✅ Sauvegarde progressive (localStorage + API)
- ✅ 3 plans tarifaires (Gratuit, Premium 79€, Elite 129€/an)
- ✅ Dashboard utilisateur
- ✅ Rapport 100% IA généré par Gemini 3 Pro Preview (via Replit AI Integrations)
- ✅ Sections verrouillées selon le plan
- ✅ Design responsive
- ✅ Animations Framer Motion
- ✅ Recommandations en bullet points avec icônes
- ✅ Graphique radar (spider chart) pour les 15 domaines
- ✅ Export HTML/PDF stylisé

## Moteur de Génération IA

Le fichier `server/expertProtocols.ts` contient les protocoles détaillés pour chaque section :
- Protocoles de suppléments avec dosages, timing, marques
- Stack spécifiques par problématique (sommeil, stress, neurotransmetteurs...)
- Références aux experts (Peter Attia, Andrew Huberman, etc.)

Le fichier `server/geminiPremiumEngine.ts` génère les rapports avec :
- Modèle: gemini-3-pro-preview via Replit AI Integrations
- 19 sections générées progressivement avec cache
- Prompt système ACHZOD (coach solo)
- Règles de génération strictes (pas de phrases vagues, citations des réponses)
- Style expert niveau Peter Attia

## Architecture de génération des rapports

**Flow complet :**
1. Questionnaire → responses stockées dans `audit.responses`
2. `reportJobManager.ts` lance la génération via Gemini
3. `geminiPremiumEngine.ts` génère le rapport TXT
4. TXT stocké dans `audit.reportTxt` + `audit.narrativeReport.txt`
5. `audit.reportGeneratedAt` timestamp ajouté
6. Dashboard (`AuditDetail.tsx`) affiche via iframe `/api/audits/:id/view-html`
7. `txtToHtmlConverter.ts` convertit TXT → HTML à la volée

**Endpoints clés :**
| Route | Description |
|-------|-------------|
| `/api/audits/:id/view-html` | Affiche le rapport HTML (convertit TXT→HTML) |
| `/api/audits/:id/export/html` | Télécharge le rapport HTML |
| `/api/audits/:id/narrative-start` | Lance génération asynchrone |
| `/api/audits/:id/narrative-status` | Status de génération (polling) |

**Champs Audit pour traçabilité :**
- `reportTxt`: Texte brut généré par Gemini (stockage permanent)
- `reportHtml`: HTML pré-généré (optionnel, cache)
- `reportGeneratedAt`: Date/heure de génération

## Données de Test

Dans `server/generatePremiumReport.ts` :
- `TEST_CLIENT_DATA` : Profil test "Achkan K." (homme, 26-35 ans)
- `TEST_PHOTO_URLS` : 3 vues (face, dos, profil) dans `server/test-data/photos/`
- `runPremiumGeneration()` : Génère un audit complet avec photos

**Photos de test permanentes :**
```
server/test-data/photos/
├── front.jpeg   # Vue de face
├── back.jpeg    # Vue de dos
└── side.jpeg    # Vue de profil
```

**Endpoint de test :**
`POST /api/test/full-premium-workflow` avec `{ "email": "test@example.com" }`

## Démarrage

```bash
npm install
npm run dev
```

L'application sera disponible sur le port 5000.
