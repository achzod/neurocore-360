/**
 * iHerb Product Database with Affiliate Links
 * Code affiliation: KAN0746
 * Format: https://fr.iherb.com/pr/[product-slug]/[product-id]?rcode=KAN0746
 */

export const AFFILIATE_CODE = "KAN0746";

export interface IHerbProduct {
  name: string;
  brand: string;
  slug: string;
  productId: number;
  dose: string;
  count: string;
  priceRange: string;
  whyThisOne: string;
}

export interface SupplementProducts {
  [ingredientId: string]: IHerbProduct[];
}

// Base de donnees des produits iHerb recommandes
// 3 options par supplement, du meilleur au plus accessible
export const IHERB_PRODUCTS: SupplementProducts = {

  // === MAGNESIUM ===
  "magnesium_bisglycinate": [
    {
      name: "Magnesium Glycinate 400mg",
      brand: "Doctor's Best",
      slug: "doctor-s-best-high-absorption-magnesium-100-chelated-with-albion-minerals-100-mg-240-tablets",
      productId: 16567,
      dose: "100mg elementaire par tablet",
      count: "240 tablets",
      priceRange: "15-20€",
      whyThisOne: "Chelate Albion TRAACS, haute biodisponibilite, rapport qualite-prix imbattable"
    },
    {
      name: "Magnesium Bisglycinate Chelate",
      brand: "NOW Foods",
      slug: "now-foods-magnesium-bisglycinate-powder-8-oz-227-g",
      productId: 18113,
      dose: "200mg par cuillere",
      count: "227g poudre",
      priceRange: "18-25€",
      whyThisOne: "Poudre pure sans additifs, dosage flexible, ideal pour les gros besoins"
    },
    {
      name: "Magnesium Glycinate",
      brand: "Pure Encapsulations",
      slug: "pure-encapsulations-magnesium-glycinate-180-capsules",
      productId: 52956,
      dose: "120mg par capsule",
      count: "180 capsules",
      priceRange: "35-45€",
      whyThisOne: "Marque pharma-grade, zero additifs, hypoallergenique"
    }
  ],

  // === GLYCINE ===
  "glycine": [
    {
      name: "Glycine Powder",
      brand: "NOW Foods",
      slug: "now-foods-glycine-pure-powder-1-lb-454-g",
      productId: 475,
      dose: "3g par cuillere",
      count: "454g (~150 doses)",
      priceRange: "12-18€",
      whyThisOne: "Poudre pure USP grade, gout legerement sucre, excellent rapport qualite-prix"
    },
    {
      name: "Glycine 1000mg",
      brand: "Source Naturals",
      slug: "source-naturals-glycine-1000-mg-200-capsules",
      productId: 2174,
      dose: "1000mg par capsule",
      count: "200 capsules",
      priceRange: "15-20€",
      whyThisOne: "Format capsule pratique si tu n'aimes pas la poudre"
    },
    {
      name: "Glycine Powder",
      brand: "Thorne",
      slug: "thorne-research-glycine-250-capsules",
      productId: 18657,
      dose: "500mg par capsule",
      count: "250 capsules",
      priceRange: "25-30€",
      whyThisOne: "Marque medicale de reference, tests tiers systematiques"
    }
  ],

  // === OMEGA-3 ===
  "omega3_epa_dha": [
    {
      name: "Super Omega-3 EPA/DHA",
      brand: "Life Extension",
      slug: "life-extension-super-omega-3-epa-dha-fish-oil-sesame-lignans-olive-extract-120-softgels",
      productId: 44065,
      dose: "2000mg huile (EPA 700mg + DHA 500mg)",
      count: "120 softgels",
      priceRange: "25-35€",
      whyThisOne: "IFOS 5 etoiles, forme triglyceride, antioxydants ajoutes"
    },
    {
      name: "Ultimate Omega",
      brand: "Nordic Naturals",
      slug: "nordic-naturals-ultimate-omega-lemon-1280-mg-120-soft-gels",
      productId: 6706,
      dose: "1280mg (EPA 650mg + DHA 450mg)",
      count: "120 softgels",
      priceRange: "40-50€",
      whyThisOne: "Reference qualite nordique, forme TG, zero arriere-gout"
    },
    {
      name: "Omega-3 Fish Oil",
      brand: "California Gold Nutrition",
      slug: "california-gold-nutrition-omega-3-premium-fish-oil-180-epa-120-dha-240-fish-gelatin-softgels",
      productId: 61413,
      dose: "1000mg (EPA 180mg + DHA 120mg)",
      count: "240 softgels",
      priceRange: "15-20€",
      whyThisOne: "Budget-friendly, qualite correcte, necessite 3-4 caps/jour"
    }
  ],

  // === VITAMINE D3 ===
  "vitamin_d3": [
    {
      name: "Vitamin D3 5000 IU",
      brand: "NOW Foods",
      slug: "now-foods-vitamin-d-3-high-potency-5-000-iu-240-softgels",
      productId: 10421,
      dose: "5000 UI par softgel",
      count: "240 softgels",
      priceRange: "12-18€",
      whyThisOne: "Dosage optimal maintenance, huile olive pour absorption, prix imbattable"
    },
    {
      name: "Vitamin D3 + K2",
      brand: "Sports Research",
      slug: "sports-research-vitamin-k2-mk7-vitamin-d3-60-veggie-softgels",
      productId: 76498,
      dose: "5000 UI D3 + 100mcg K2 MK-7",
      count: "60 softgels",
      priceRange: "18-25€",
      whyThisOne: "Combo ideal D3+K2 pour metabolisme calcium, forme MK-7 longue duree"
    },
    {
      name: "Vitamin D3 Liquid",
      brand: "Thorne",
      slug: "thorne-research-vitamin-d-k2-liquid-1-fl-oz-30-ml",
      productId: 30332,
      dose: "1000 UI D3 + 200mcg K2 par goutte",
      count: "30ml (~600 gouttes)",
      priceRange: "25-35€",
      whyThisOne: "Dosage ultra-precis, marque medicale, ideal pour ajustement fin"
    }
  ],

  // === ASHWAGANDHA ===
  "ashwagandha": [
    {
      name: "KSM-66 Ashwagandha",
      brand: "Jarrow Formulas",
      slug: "jarrow-formulas-ashwagandha-300-mg-120-veggie-caps",
      productId: 60553,
      dose: "300mg KSM-66 (5% withanolides)",
      count: "120 capsules",
      priceRange: "20-28€",
      whyThisOne: "KSM-66 = gold standard, 5% withanolides garantis, etudes cliniques solides"
    },
    {
      name: "Sensoril Ashwagandha",
      brand: "NOW Foods",
      slug: "now-foods-ashwagandha-450-mg-180-veg-capsules",
      productId: 14875,
      dose: "450mg extrait standardise",
      count: "180 capsules",
      priceRange: "18-25€",
      whyThisOne: "Sensoril = autre forme brevete efficace, excellent rapport qualite-prix"
    },
    {
      name: "Ashwagandha Root Extract",
      brand: "Pure Encapsulations",
      slug: "pure-encapsulations-ashwagandha-60-capsules",
      productId: 70793,
      dose: "500mg extrait standardise",
      count: "60 capsules",
      priceRange: "30-40€",
      whyThisOne: "Pharma-grade, hypoallergenique, zero excipients"
    }
  ],

  // === L-THEANINE ===
  "l_theanine": [
    {
      name: "Suntheanine L-Theanine",
      brand: "Sports Research",
      slug: "sports-research-suntheanine-l-theanine-200-mg-60-softgels",
      productId: 72392,
      dose: "200mg Suntheanine",
      count: "60 softgels",
      priceRange: "15-22€",
      whyThisOne: "Suntheanine = forme brevete pure L-theanine, absorption optimale en softgel"
    },
    {
      name: "L-Theanine 200mg",
      brand: "NOW Foods",
      slug: "now-foods-l-theanine-200-mg-120-veg-capsules",
      productId: 17368,
      dose: "200mg par capsule",
      count: "120 capsules",
      priceRange: "18-25€",
      whyThisOne: "Bon rapport qualite-prix, dosage standard efficace"
    },
    {
      name: "L-Theanine",
      brand: "Thorne",
      slug: "thorne-research-theanine-90-capsules",
      productId: 19090,
      dose: "200mg par capsule",
      count: "90 capsules",
      priceRange: "28-38€",
      whyThisOne: "Qualite pharmaceutique Thorne, ideal si sensibilite aux additifs"
    }
  ],

  // === CREATINE ===
  "creatine_monohydrate": [
    {
      name: "Creatine Monohydrate Powder",
      brand: "NOW Foods",
      slug: "now-foods-creatine-monohydrate-2-2-lbs-1-kg",
      productId: 8420,
      dose: "5g par cuillere",
      count: "1kg (~200 doses)",
      priceRange: "20-28€",
      whyThisOne: "Creapure inside, poudre micronisee, le meilleur rapport qualite-prix"
    },
    {
      name: "Creatine Monohydrate",
      brand: "Thorne",
      slug: "thorne-research-creatine-16-oz-450-g",
      productId: 18619,
      dose: "5g par cuillere",
      count: "450g (~90 doses)",
      priceRange: "35-45€",
      whyThisOne: "NSF Certified for Sport, ideal si tu es teste (competition)"
    },
    {
      name: "Micronized Creatine",
      brand: "Optimum Nutrition",
      slug: "optimum-nutrition-micronized-creatine-powder-unflavored-1-32-lb-600-g",
      productId: 68616,
      dose: "5g par cuillere",
      count: "600g (~120 doses)",
      priceRange: "22-30€",
      whyThisOne: "Marque sport reconnue, dissolution parfaite"
    }
  ],

  // === ZINC ===
  "zinc": [
    {
      name: "Zinc Picolinate 50mg",
      brand: "NOW Foods",
      slug: "now-foods-zinc-picolinate-50-mg-120-veg-capsules",
      productId: 1547,
      dose: "50mg zinc picolinate",
      count: "120 capsules",
      priceRange: "10-15€",
      whyThisOne: "Forme picolinate tres biodisponible, dosage therapeutique"
    },
    {
      name: "Zinc Bisglycinate",
      brand: "Thorne",
      slug: "thorne-research-zinc-picolinate-60-capsules",
      productId: 18654,
      dose: "30mg zinc picolinate",
      count: "60 capsules",
      priceRange: "15-20€",
      whyThisOne: "Dosage modere ideal maintenance, qualite Thorne"
    },
    {
      name: "Zinc Balance",
      brand: "Jarrow Formulas",
      slug: "jarrow-formulas-zinc-balance-100-veggie-caps",
      productId: 3462,
      dose: "15mg zinc + 1mg cuivre",
      count: "100 capsules",
      priceRange: "8-12€",
      whyThisOne: "Ratio zinc/cuivre optimal pour usage long terme sans carence"
    }
  ],

  // === TONGKAT ALI ===
  "tongkat_ali": [
    {
      name: "LJ100 Tongkat Ali",
      brand: "Source Naturals",
      slug: "source-naturals-tongkat-ali-60-tablets",
      productId: 44866,
      dose: "80mg LJ100 standardise",
      count: "60 tablets",
      priceRange: "25-35€",
      whyThisOne: "LJ100 = extrait brevete le plus etudie, standardisation garantie"
    },
    {
      name: "Tongkat Ali 200:1",
      brand: "NOW Foods",
      slug: "now-foods-testojack-200-120-veg-capsules",
      productId: 22668,
      dose: "200mg extrait 200:1 + autres",
      count: "120 capsules",
      priceRange: "28-38€",
      whyThisOne: "Combo tongkat + autres adaptogenes pour synergie testosterone"
    },
    {
      name: "Tongkat Ali Extract",
      brand: "Double Wood",
      slug: "double-wood-supplements-tongkat-ali-1000-mg-120-capsules",
      productId: 107188,
      dose: "500mg extrait 100:1",
      count: "120 capsules",
      priceRange: "22-30€",
      whyThisOne: "Bon rapport qualite-prix, dosage solide"
    }
  ],

  // === MUCUNA PRURIENS ===
  "mucuna_pruriens": [
    {
      name: "Mucuna Dopa",
      brand: "Source Naturals",
      slug: "source-naturals-mucuna-dopa-100-mg-120-capsules",
      productId: 14235,
      dose: "100mg extrait (15% L-DOPA = 15mg)",
      count: "120 capsules",
      priceRange: "15-22€",
      whyThisOne: "Standardise 15% L-DOPA, dosage precis et securitaire"
    },
    {
      name: "DOPA Mucuna",
      brand: "NOW Foods",
      slug: "now-foods-dopa-mucuna-90-veg-capsules",
      productId: 16623,
      dose: "800mg extrait (15% L-DOPA = 120mg)",
      count: "90 capsules",
      priceRange: "12-18€",
      whyThisOne: "Dosage plus eleve si tolerance etablie, bon prix"
    },
    {
      name: "Mucuna Pruriens",
      brand: "Himalaya",
      slug: "himalaya-mucuna-60-caplets",
      productId: 14168,
      dose: "Extrait standardise ayurvedique",
      count: "60 caplets",
      priceRange: "12-16€",
      whyThisOne: "Marque ayurvedique authentique, extraction traditionnelle"
    }
  ],

  // === APIGENINE ===
  "apigenine": [
    {
      name: "Apigenin 50mg",
      brand: "Swanson",
      slug: "swanson-apigenin-50-mg-90-capsules",
      productId: 39591,
      dose: "50mg apigenine pure",
      count: "90 capsules",
      priceRange: "12-18€",
      whyThisOne: "Une des rares sources pures d'apigenine, dosage efficace sommeil"
    },
    {
      name: "Chamomile Extract",
      brand: "NOW Foods",
      slug: "now-foods-chamomile-350-mg-100-veg-capsules",
      productId: 4692,
      dose: "350mg extrait camomille (source naturelle apigenine)",
      count: "100 capsules",
      priceRange: "8-12€",
      whyThisOne: "Source naturelle moins concentree mais plus douce, ideal debut"
    }
  ],

  // === ACETYL-L-CARNITINE ===
  "acetyl_l_carnitine": [
    {
      name: "Acetyl-L-Carnitine 500mg",
      brand: "NOW Foods",
      slug: "now-foods-acetyl-l-carnitine-500-mg-200-veg-capsules",
      productId: 97,
      dose: "500mg ALCAR",
      count: "200 capsules",
      priceRange: "25-35€",
      whyThisOne: "Forme acetyle traverse barriere hemato-encephalique, bon prix"
    },
    {
      name: "ALCAR Powder",
      brand: "NOW Foods",
      slug: "now-foods-acetyl-l-carnitine-pure-powder-3-oz-85-g",
      productId: 100,
      dose: "Poudre pure",
      count: "85g",
      priceRange: "15-22€",
      whyThisOne: "Economique en poudre, dosage flexible"
    },
    {
      name: "Acetyl-L-Carnitine",
      brand: "Life Extension",
      slug: "life-extension-acetyl-l-carnitine-500-mg-100-vegetarian-capsules",
      productId: 28117,
      dose: "500mg ALCAR",
      count: "100 capsules",
      priceRange: "22-30€",
      whyThisOne: "Qualite Life Extension, tests tiers"
    }
  ],

  // === COENZYME Q10 ===
  "coq10": [
    {
      name: "CoQ10 Ubiquinol 100mg",
      brand: "NOW Foods",
      slug: "now-foods-ubiquinol-100-mg-120-softgels",
      productId: 20598,
      dose: "100mg ubiquinol (forme active)",
      count: "120 softgels",
      priceRange: "35-48€",
      whyThisOne: "Ubiquinol = forme deja reduite, absorption superieure surtout apres 40 ans"
    },
    {
      name: "CoQ10 200mg",
      brand: "Doctor's Best",
      slug: "doctor-s-best-high-absorption-coq10-with-bioperine-200-mg-180-veggie-caps",
      productId: 15665,
      dose: "200mg ubiquinone + BioPerine",
      count: "180 capsules",
      priceRange: "30-42€",
      whyThisOne: "Ubiquinone avec piperine pour absorption, excellent rapport qualite-prix"
    },
    {
      name: "Super Ubiquinol CoQ10",
      brand: "Life Extension",
      slug: "life-extension-super-ubiquinol-coq10-with-enhanced-mitochondrial-support-100-mg-60-softgels",
      productId: 66578,
      dose: "100mg ubiquinol + shilajit",
      count: "60 softgels",
      priceRange: "40-55€",
      whyThisOne: "Formule premium avec PQQ et shilajit pour synergie mitochondriale"
    }
  ],

  // === VITAMINE B COMPLEXE ===
  "b_complex": [
    {
      name: "B-Complex Plus",
      brand: "Pure Encapsulations",
      slug: "pure-encapsulations-b-complex-plus-120-capsules",
      productId: 70675,
      dose: "Formes methylees (methylfolate, methylcobalamine)",
      count: "120 capsules",
      priceRange: "35-45€",
      whyThisOne: "Formes actives methylees, zero additifs, ideal MTHFR"
    },
    {
      name: "B-Right",
      brand: "Jarrow Formulas",
      slug: "jarrow-formulas-b-right-100-veggie-caps",
      productId: 3459,
      dose: "Formes coenzymees optimales",
      count: "100 capsules",
      priceRange: "18-25€",
      whyThisOne: "Excellent rapport qualite-prix, formes actives"
    },
    {
      name: "Coenzyme B-Complex",
      brand: "NOW Foods",
      slug: "now-foods-co-enzyme-b-complex-120-veg-capsules",
      productId: 16588,
      dose: "Formes coenzymees",
      count: "120 capsules",
      priceRange: "22-30€",
      whyThisOne: "Bon compromis qualite-prix, formes actives"
    }
  ]
};

/**
 * Genere le lien iHerb complet avec code affiliation
 */
export function getIHerbLink(product: IHerbProduct): string {
  return `https://fr.iherb.com/pr/${product.slug}/${product.productId}?rcode=${AFFILIATE_CODE}`;
}

/**
 * Recupere les produits recommandes pour un ingredient
 */
export function getProductsForIngredient(ingredientId: string): IHerbProduct[] {
  return IHERB_PRODUCTS[ingredientId] || [];
}

/**
 * Genere le HTML des liens produits pour un supplement
 */
export function generateProductLinksHTML(ingredientId: string): string {
  const products = getProductsForIngredient(ingredientId);

  if (products.length === 0) {
    return '';
  }

  const linksHTML = products.map((product, idx) => {
    const link = getIHerbLink(product);
    const badge = idx === 0 ? 'TOP CHOIX' : idx === 1 ? 'ALTERNATIVE' : 'BUDGET';
    const badgeColor = idx === 0 ? '#22c55e' : idx === 1 ? '#3b82f6' : '#f59e0b';

    return `
      <a href="${link}" target="_blank" rel="noopener noreferrer" class="iherb-product-link" style="display: block; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; text-decoration: none; transition: all 0.2s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <span style="background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em;">${badge}</span>
            <h5 style="font-size: 1rem; font-weight: 600; color: var(--text); margin: 8px 0 4px 0;">${product.brand} - ${product.name}</h5>
          </div>
          <span style="color: var(--primary); font-weight: 600; font-size: 0.9rem;">${product.priceRange}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 8px 0;">${product.dose} | ${product.count}</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; font-style: italic;">${product.whyThisOne}</p>
      </a>
    `;
  }).join('');

  return `
    <div class="iherb-products" style="margin-top: 16px;">
      <h5 style="font-size: 0.85rem; font-weight: 700; color: var(--primary); margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">OU ACHETER (liens iHerb)</h5>
      ${linksHTML}
    </div>
  `;
}
