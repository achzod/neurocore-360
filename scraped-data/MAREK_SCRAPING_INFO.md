# Marek Health Scraping - Information et Solutions

## Problème Rencontré

Marek Health bloque l'accès depuis les adresses IP non-américaines avec le message suivant:

```
Forbidden

You are trying to access Marek Health from an IP Address outside of our service area.

If you are using a VPN, please move to a US IP Address to access this site.
```

## Solutions Possibles

### Solution 1: Utiliser un VPN US (Recommandé)

1. Connectez-vous à un VPN avec une IP américaine
2. Exécutez le scraper:
   ```bash
   npx tsx /Users/achzod/Desktop/neurocore/scrape-marek-us.ts
   ```

### Solution 2: Utiliser une API de Scraping avec Proxies

Utiliser un service comme:
- ScrapingBee (https://www.scrapingbee.com/)
- ScraperAPI (https://www.scraperapi.com/)
- Bright Data (https://brightdata.com/)

Ces services fournissent des proxies US et contournent les blocages anti-bot.

### Solution 3: Scraping Manuel

Si vous avez déjà accès au contenu:
1. Copiez le HTML des articles que vous voulez
2. Utilisez le script de conversion fourni
3. Générez le JSON manuellement

### Solution 4: Utiliser des Sources Alternatives

Marek Health partage du contenu sur:
- Leur chaîne YouTube
- Leurs podcasts
- Leurs réseaux sociaux

Ces sources peuvent être scrapées plus facilement.

## Scripts Disponibles

### 1. `scrape-marek-us.ts`
Scraper complet qui nécessite une IP US.

**Usage:**
```bash
npx tsx /Users/achzod/Desktop/neurocore/scrape-marek-us.ts
```

### 2. `debug-marek.ts`
Script de débogage pour vérifier l'accès au site.

**Usage:**
```bash
npx tsx /Users/achzod/Desktop/neurocore/debug-marek.ts
```

## Format de Sortie

Les articles sont sauvegardés dans `/Users/achzod/Desktop/neurocore/scraped-data/marek-full.json` avec le format:

```json
[
  {
    "source": "marek_health",
    "title": "Article Title",
    "content": "Full article content...",
    "url": "https://marekhealth.com/blog/article-slug/",
    "category": "bloodwork",
    "keywords": ["testosterone", "bloodwork", "biomarker"],
    "scrapedAt": "2026-01-09T..."
  }
]
```

## Alternatives pour Obtenir le Contenu Marek Health

1. **Newsletter Marek Health**: S'inscrire à leur newsletter
2. **YouTube Transcripts**: Scraper les transcriptions de leurs vidéos
3. **Archive.org**: Vérifier si des snapshots du site sont disponibles
4. **API partenaires**: Vérifier si Marek Health a une API publique
5. **Contact direct**: Demander l'accès à leur contenu pour usage éducatif

## Prochaines Étapes

1. Essayez avec un VPN US
2. Si ça ne fonctionne pas, considérez les alternatives ci-dessus
3. Ou concentrez-vous sur d'autres sources similaires:
   - Peter Attia (https://peterattiamd.com)
   - Huberman Lab (contenu similaire sur les biomarkers)
   - Chris Masterjohn (bloodwork analysis)

## Support

Si vous avez besoin d'aide pour:
- Configurer un VPN US
- Utiliser une API de scraping avec proxies
- Obtenir le contenu autrement

N'hésitez pas à demander!
