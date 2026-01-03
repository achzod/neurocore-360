# Sources de Connaissances - NEUROCORE 360

## 1. Huberman Lab (Public)
**URL:** https://www.hubermanlab.com/episodes
**Contenu:** Podcasts neuroscience, protocoles sommeil/hormones/stress
**Fréquence scraping:** 1x/semaine (nouveaux épisodes)
**Catégories:** sommeil, hormones, stress, performance, neuroscience

## 2. Stronger By Science (Public)
**URLs:**
- https://www.strongerbyscience.com/research-spotlight/
- https://www.strongerbyscience.com/articles/
**Contenu:** Analyses d'études scientifiques, nutrition, entraînement evidence-based
**Fréquence scraping:** 1x/semaine
**Catégories:** nutrition, performance, hypertrophie, force, récupération

## 3. Applied Metabolics (Privé - Login requis)
**URL:** https://www.appliedmetabolics.com
**Credentials:**
- Email: achkou@gmail.com
- Password: variable d'environnement `APPLIED_METABOLICS_PASSWORD`
**Contenu:** Articles avancés métabolisme, protocoles hormonaux
**Fréquence scraping:** 1x/mois
**Catégories:** hormones, métabolisme, protocoles avancés

## 4. Newsletters SendPulse (API)
**API:** SendPulse REST API
**Credentials:**
- Client ID: variable `SENDPULSE_USER_ID`
- Secret: variable `SENDPULSE_SECRET`
**Contenu:** Newsletters ACHZOD, tips, protocoles terrain
**Fréquence:** 1x/semaine
**Catégories:** conseils pratiques, protocoles terrain

---

## API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/knowledge/status` | GET | Stats de la base |
| `/api/knowledge/build` | POST | Scraper toutes les sources |
| `/api/knowledge/scrape/:source` | POST | Scraper une source |
| `/api/knowledge/search?q=...` | GET | Rechercher par mots-clés |
| `/api/knowledge/search/full?q=...` | GET | Recherche full-text |
| `/api/knowledge/articles` | GET | Lister les articles |
| `/api/knowledge/articles/:id` | GET | Détail d'un article |
| `/api/knowledge/source/:source` | DELETE | Supprimer une source |

---

## Variables d'environnement requises

```
APPLIED_METABOLICS_PASSWORD=xxx
SENDPULSE_USER_ID=xxx
SENDPULSE_SECRET=xxx
```
