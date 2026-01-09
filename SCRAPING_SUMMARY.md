# Résumé du Scraping Marek Health

## Statut: ÉCHEC - Blocage Géographique

### Problème

Marek Health bloque tous les accès depuis des IP non-américaines:

```
Forbidden
You are trying to access Marek Health from an IP Address outside of our service area.
If you are using a VPN, please move to a US IP Address to access this site.
```

### Résultats

- **Articles scrapés**: 0
- **Raison**: Blocage IP géographique
- **Fichier de sortie**: `/Users/achzod/Desktop/neurocore/scraped-data/marek-full.json` (vide)

### Scripts Créés

1. **scrape-marek-us.ts** (8.0 KB)
   - Scraper complet avec détection IP US
   - Nécessite VPN américain
   - Prêt à l'emploi si VPN configuré

2. **debug-marek.ts** (2.2 KB)
   - Script de diagnostic
   - Vérifie l'accès au site
   - Prend des screenshots pour debugging

3. **MAREK_SCRAPING_INFO.md**
   - Documentation complète
   - Solutions alternatives
   - Instructions détaillées

### Fichiers de Diagnostic

- `marek-debug.html` (1.3 KB) - Page HTML reçue (message d'erreur)
- `marek-debug.png` (37 KB) - Screenshot de la page bloquée

## Pour Continuer

### Option 1: VPN US (Rapide)

```bash
# 1. Connectez-vous à un VPN US (ExpressVPN, NordVPN, etc.)
# 2. Exécutez:
npx tsx /Users/achzod/Desktop/neurocore/scrape-marek-us.ts
```

### Option 2: Service de Scraping Professionnel

Utilisez un service avec proxies US intégrés:

```bash
# Exemple avec ScraperAPI
npm install scraperapi-sdk
# Puis modifiez le script pour utiliser leur API
```

### Option 3: Sources Alternatives

Scrapez d'autres sources de contenu similaire:

**Déjà disponibles:**
- Peter Attia: `/Users/achzod/Desktop/neurocore/scraped-data/peter-attia-full.json` (287 KB)
- Chris Masterjohn: `/Users/achzod/Desktop/neurocore/scraped-data/masterjohn-full.json` (297 KB)
- Huberman Lab: `/Users/achzod/Desktop/neurocore/scraped-data/huberman-full.json` (1.1 MB)
- MPMD: `/Users/achzod/Desktop/neurocore/scraped-data/mpmd-full.json` (510 KB)
- SBS: `/Users/achzod/Desktop/neurocore/scraped-data/sbs-full.json` (405 KB)
- RP: `/Users/achzod/Desktop/neurocore/scraped-data/rp-full.json` (253 KB)

**Total contenu disponible: ~2.8 MB d'articles scientifiques**

### Option 4: YouTube Transcripts

Marek Health a une chaîne YouTube active. Vous pourriez:
1. Utiliser l'API YouTube
2. Scraper les transcriptions automatiques
3. Convertir en format article

## Recommandation

Étant donné que vous avez déjà 6 sources de haute qualité avec du contenu similaire (bloodwork, hormones, performance), je recommande:

1. **Court terme**: Utiliser les sources existantes qui couvrent les mêmes sujets
2. **Moyen terme**: Configurer un VPN US pour scraper Marek Health
3. **Long terme**: Scraper les transcriptions YouTube de Marek Health

## Commande Rapide pour Utiliser les Données Existantes

```bash
# Voir le contenu disponible
ls -lh /Users/achzod/Desktop/neurocore/scraped-data/*.json

# Exemple: lire les articles Peter Attia (similar à Marek)
cat /Users/achzod/Desktop/neurocore/scraped-data/peter-attia-full.json | jq '.[0:3]'
```

## Support

Pour toute question ou pour configurer le scraping avec VPN US, n'hésitez pas à demander!
