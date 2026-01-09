# NEUROCORE 360 - Knowledge Base Scraper

## Applied Metabolics Full Scraper

Le scraper Applied Metabolics permet d'extraire TOUS les articles du site avec 100% du contenu (nécessite login).

### Prérequis

- Node.js 20+
- Compte Applied Metabolics avec accès premium
- Email: `achkou@gmail.com`

### Scripts disponibles

#### Option 1: Script Bash
```bash
./scrape-applied-metabolics.sh 'VOTRE_MOT_DE_PASSE' 1000
```

#### Option 2: Script Node.js
```bash
node scrape-am.mjs 'VOTRE_MOT_DE_PASSE' 1000
```

### Paramètres

- **password** (requis): Mot de passe du compte Applied Metabolics
- **limit** (optionnel, défaut: 1000): Nombre maximum d'articles à scraper

### Fonctionnement

Le scraper va:

1. Se connecter au site Applied Metabolics via WordPress login
2. Parcourir TOUTES les archives mensuelles depuis septembre 2014
3. Extraire les liens de tous les articles
4. Pour chaque article:
   - Récupérer le titre complet
   - Extraire le contenu HTML complet (jusqu'à 50,000 caractères)
   - Nettoyer le HTML (supprimer scripts, styles, nav, etc.)
   - Catégoriser automatiquement (bloodwork, hormones, nutrition, etc.)
   - Extraire les mots-clés pertinents
5. Sauvegarder dans la base de données PostgreSQL
6. Créer un fichier JSON de backup

### Sortie

Les articles sont sauvegardés dans:

- **Base de données**: Table `knowledge_articles`
- **Fichier JSON**: `/Users/achzod/Desktop/neurocore/scraped-data/applied-metabolics-full.json`

### Format des données

```typescript
{
  source: "applied_metabolics",
  title: "Article Title",
  content: "Full article content (cleaned HTML)...",
  url: "https://www.appliedmetabolics.com/...",
  category: "hormones" | "bloodwork" | "nutrition" | etc.,
  keywords: ["testosterone", "training", ...],
  scrapedAt: "2026-01-09T..."
}
```

### Catégories disponibles

- `bloodwork`: Tests sanguins, biomarqueurs
- `hormones`: Testostérone, cortisol, thyroïde, etc.
- `sommeil`: Sleep, circadian rhythms
- `nutrition`: Protéines, calories, macros
- `performance`: VO2max, strength, hypertrophy
- `recuperation`: Recovery, HRV, rest
- `stress`: Stress management, HPA axis
- `supplements`: Vitamines, minéraux, creatine
- `metabolisme`: Métabolisme, insulin, fat loss
- `general`: Articles non catégorisés

### Exemple de sortie

```
=========================================
NEUROCORE 360 - Applied Metabolics Scraper
=========================================
Limit: 1000 articles
Email: achkou@gmail.com

[Scraper] Starting Applied Metabolics (FULL SCRAPE)...
[Scraper] Applied Metabolics logged in
[Scraper] Applied Metabolics: 124 monthly archives to scrape (NO LIMIT)
[Scraper] AM: processed 20/124 archives, found 523 links
[Scraper] AM: processed 40/124 archives, found 1047 links
...
[Scraper] Applied Metabolics: found 3421 unique article links (processing up to 1000)
[Scraper] AM: 10 articles saved (Testosterone and Aging...)
[Scraper] AM: 20 articles saved (The Truth About SARMs...)
...
[Scraper] ✓ Applied Metabolics: 1000 articles (COMPLETE)

[CLI] ========================================
[CLI] COMPLETE: 1000 articles scraped
[CLI] Saved: 987, Duplicates: 13
[CLI] ========================================
[CLI] Articles also saved to: /Users/achzod/Desktop/neurocore/scraped-data/applied-metabolics-full.json
```

### Dépannage

**Erreur: "no password configured"**
- Vérifiez que vous avez bien passé le mot de passe en paramètre

**Erreur: "login failed"**
- Vérifiez vos identifiants Applied Metabolics
- Assurez-vous d'avoir un accès premium actif

**Erreur: "DATABASE_URL is required"**
- Le script utilise automatiquement `postgresql://dummy` en interne
- Si vous voyez cette erreur, contactez le support

**Pas d'articles extraits**
- Vérifiez votre connexion internet
- Le site peut avoir changé de structure HTML

### Autres sources disponibles

Le scraper supporte également:

- `huberman`: Huberman Lab podcasts
- `sbs`: Stronger By Science
- `examine`: Examine.com supplements
- `peter_attia`: Peter Attia MD
- `marek_health`: Marek Health
- `chris_masterjohn`: Chris Masterjohn PhD
- `renaissance_periodization`: RP Strength
- `mpmd`: More Plates More Dates
- `newsletter`: Newsletters ACHZOD (SendPulse)
- `all`: Toutes les sources

Pour scraper une autre source:
```bash
DATABASE_URL="postgresql://..." npx tsx server/knowledge/scraper.ts [source] [limit]
```
