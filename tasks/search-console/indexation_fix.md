# APEXLABS — diagnostic et correction d’indexation

Source : `inspection_results.json` (export du 7 octobre 2026).

## Diagnostic

- 411 URL inspectées, toutes en HTTP 200 au moment de l’export.
- 270 URL APEXLABS : 104 indexées, 151 explorées non indexées, 11 inconnues et 4 détectées non indexées.
- Aucun blocage robots, interdiction d’indexation ou désaccord de canonical sur les URL APEXLABS inspectées.
- Le catalogue contenait 243 articles, dont 22 articles redondants exposés comme pages autonomes, plus 3 anciennes formes de slug non canoniques (accents ou majuscules).
- Les 25 anciennes URL apparaissaient dans GSC : 22 explorées non indexées, 2 indexées et 1 inconnue.
- Le sitemap publiait 270 URL, y compris les doublons et anciens slugs.

La cause technique principale n’était donc pas robots/canonical : le site demandait à Google d’indexer plusieurs pages visant la même intention, tout en diluant le maillage de certains contenus et hubs encore inconnus.

## Correction

- 25 anciennes URL consolidées par redirection permanente 301 vers 22 articles préférés.
- Aucun contenu distinct supprimé : les contenus redondants restent dans les sources éditoriales, mais ne sont plus publiés comme pages concurrentes.
- Flux public ramené de 243 à 221 articles canoniques.
- Sitemap ramené de 270 à 248 URL, uniquement des routes canoniques connues : 221 articles, 12 catégories, 4 piliers et 11 pages statiques.
- Slugs avec accents/majuscules normalisés, avec 301 depuis les anciennes URL.
- Les 15 URL inconnues/détectées de l’export sont toutes traitées : l’ancien slug MCU-20 est redirigé ; les 14 pages canoniques restantes (8 catégories et 6 articles) reçoivent maintenant un lien HTML direct depuis `/blog`, côté React et dans le HTML SSR/noscript.
- Les canoniques des pages conservées restent auto-référentes et les alias ne sont plus présents dans le JSON public ni le sitemap.

## Garde-fous

`npm run test:blog:indexation` vérifie notamment :

- l’absence de cycles et de cibles manquantes dans les redirections ;
- l’exclusion des alias du flux public et du sitemap ;
- l’unicité et le domaine de toutes les URL du sitemap ;
- la correspondance entre articles canoniques, catégories et sitemap ;
- la présence du maillage prioritaire dans le rendu client et SSR ;
- la présence de redirections HTTP 301.

Google reste seul décisionnaire du délai de recrawl et de l’indexation finale. Après déploiement, il faudra laisser Google retraiter les 301 et le sitemap ; aucune promesse de date ou de couverture totale n’est possible côté code.
