# GSC fixes - achzodcoaching.com - 2026-07-19

Source: `achzodcoaching.com-Coverage-2026-07-19.zip` + live crawl of:
- `https://www.achzodcoaching.com/sitemap.xml`
- `https://apexlabs.achzodcoaching.com/sitemap.xml`

## GSC counts

Critical issues exported:
- Page avec redirection: 10
- Autre page avec balise canonique correcte: 9
- Exploree, actuellement non indexee: 138
- Exclue par la balise noindex: 1
- Detectee, actuellement non indexee: 89
- Introuvable 404: 5
- Soft 404: 3
- Page en double sans URL canonique selectionnee: 3
- Page en double ou Google n'a pas choisi la meme canonique: 5

## Live crawl result

APEX (`apexlabs.achzodcoaching.com`):
- 266 sitemap URLs crawled.
- 0 non-200.
- 0 redirect in sitemap.
- 0 canonical mismatch.
- 0 noindex in sitemap.
- 0 thin/no-description/no-H1 pages found in sitemap crawl.
- Local code fix applied: APEX blog CTAs now use `https://www.achzodcoaching.com` instead of the non-canonical `https://achzodcoaching.com`.

Webflow main site (`www.achzodcoaching.com`):
- 145 sitemap URLs crawled.
- 0 non-200 in sitemap.
- 0 redirect in sitemap.
- 0 canonical mismatch.
- 0 noindex in sitemap.
- 8 pages have weak SEO metadata / low-value indexability.
- Internal crawl found real broken links and legacy redirects.

## Webflow corrections to apply

These changes must be made in Webflow because the main site is served by Webflow, not this repo.

### 1. 301 redirects

Add these in Webflow Site settings > Publishing > 301 redirects, then publish.

| Old path | Redirect to |
|---|---|
| `/coaching-sans-suivi` | `/coaching-essential` |
| `/produits/essential` | `/coaching-essential` |
| `/produits/elite` | `/coaching-elite` |
| `/blogs/blog/glucides-et-musculation-le-guide-partie-1` | `/blog/glucides-et-musculation-le-guide-partie-1` |
| `/blogs/blog/proteines-acides-amines-le-guide-chapitre-1` | `/blog/proteines-acides-amines-le-guide-chapitre-1` |
| `/blogs/blog/macronutriments-obtenir-les-bonnes-quantites-pour-la-croissance` | `/blog/macronutriments-obtenir-les-bonnes-quantites-pour-la-croissance` |
| `/collections/ebooks/products/un-maximum-de-muscles-et-un-minimum-de-gras-en-10-semaines-prise-de-masse-seche-perte-de-gras` | `/product/liberer-son-potentiel-genetique-en-10-semaines-perte-de-gras-et-prise-de-muscles` |
| `/%24%7Bebook.link%7D` | `/ebooks` |
| `/product/%24%7Bebook.link%7D` | `/ebooks` |
| `/blog/%24%7Bebook.link%7D` | `/blog` |
| `/freebies/%24%7Bebook.link%7D` | `/freebies` |
| `/categorie/%24%7Bebook.link%7D` | `/blog` |

If Webflow rejects the encoded `%24%7Bebook.link%7D` syntax, try the decoded path `${ebook.link}` in the old path field.

### 2. Fix internal links in Webflow

Replace these live links:
- `https://achzodcoaching.com/checkout` -> `https://www.achzodcoaching.com/checkout`
- `/coaching-sans-suivi` -> `/coaching-essential` or remove the old "sans suivi" card if that offer is retired.
- `https://www.achzodcoaching.com/produits/essential` -> `https://www.achzodcoaching.com/coaching-essential`
- `https://www.achzodcoaching.com/produits/elite` -> `https://www.achzodcoaching.com/coaching-elite`
- `https://achzodcoaching.com/blogs/blog/glucides-et-musculation-le-guide-partie-1` -> `https://www.achzodcoaching.com/blog/glucides-et-musculation-le-guide-partie-1`
- `https://achzodcoaching.com/blogs/blog/proteines-acides-amines-le-guide-chapitre-1` -> `https://www.achzodcoaching.com/blog/proteines-acides-amines-le-guide-chapitre-1`
- `https://achzodcoaching.com/blogs/blog/macronutriments-obtenir-les-bonnes-quantites-pour-la-croissance` -> `https://www.achzodcoaching.com/blog/macronutriments-obtenir-les-bonnes-quantites-pour-la-croissance`

### 3. Fix `${ebook.link}` custom code leak

The published Webflow HTML contains JavaScript strings like:

```js
<a href="${ebook.link}" target="_blank" class="download-button w-button">Telecharger</a>
```

Google can extract that literal as a URL. Rewrite the custom code so no `href="${...}"` appears in the source.

Safe pattern:

```js
const item = document.createElement("div");
item.className = "w-commerce-commercedownloadsitem download-item";

const name = document.createElement("div");
name.className = "download-text";
name.textContent = ebook.name || "Telechargement";

const link = document.createElement("a");
link.className = "download-button w-button";
link.target = "_blank";
link.rel = "noopener";
link.textContent = "Telecharger";
link.href = ebook.link || "/ebooks";

item.append(name, link);
downloadsList.appendChild(item);
```

### 4. Remove/noindex low-value transaction pages

These pages are in the Webflow sitemap and have no description. They should not be index targets:
- `/checkout`
- `/order-confirmation`
- `/paypal-checkout`

Recommended Webflow setting:
- Remove from sitemap.
- Add `noindex, follow`.
- Keep canonical self-referencing.

### 5. Fix category page metadata

These category pages all have title `AchzodCoaching` and no meta description:
- `/categorie/complements-alimentaires`
- `/categorie/entrainements`
- `/categorie/nutrition`
- `/categorie/performance-et-sante`
- `/categorie/recettes`

Set unique titles and descriptions.

Recommended titles:
- `Complements alimentaires - Guides supplementaires | AchzodCoaching`
- `Entrainements musculation - Guides et methodes | AchzodCoaching`
- `Nutrition sportive - Guides et strategies | AchzodCoaching`
- `Performance et sante - Optimisation physique | AchzodCoaching`
- `Recettes fitness - Nutrition simple et efficace | AchzodCoaching`

### 6. Fix `/ton-audit`

Live page has only about 102 visible text chars and no H1. This is a soft-404 candidate.

Pick one:
- Best conversion fix: 301 `/ton-audit` -> `https://apexlabs.achzodcoaching.com/offers/discovery-scan`
- Or make it a real landing page with H1, 700+ words useful content, CTA to Discovery Scan, and schema.

### 7. After publish

Re-crawl:
- `https://www.achzodcoaching.com/sitemap.xml`
- `https://apexlabs.achzodcoaching.com/sitemap.xml`

Then in Google Search Console, validate only after the live checks pass:
- Introuvable 404
- Soft 404
- Page avec redirection
- Autre page avec balise canonique correcte
- Exploree/detectee non indexee
