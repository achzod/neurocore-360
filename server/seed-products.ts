import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating NEUROCORE 360° products in Stripe...');

  // Check if products already exist
  const existingProducts = await stripe.products.list({ limit: 100 });
  const premiumExists = existingProducts.data.find(p => p.name === 'Audit Premium');
  const eliteExists = existingProducts.data.find(p => p.name === 'Audit Elite');

  // Create Premium product (one-time payment €59)
  if (!premiumExists) {
    const premiumProduct = await stripe.products.create({
      name: 'Audit Premium',
      description: 'Audit 360 complet avec rapport détaillé de 20+ pages, plan d\'action personnalisé 30 jours, et accès à toutes les recommandations.',
      metadata: {
        type: 'PREMIUM',
        category: 'audit',
      }
    });

    const premiumPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 5900, // €59.00
      currency: 'eur',
    });

    console.log('Created Premium product:', premiumProduct.id);
    console.log('Created Premium price:', premiumPrice.id);
  } else {
    console.log('Premium product already exists:', premiumExists.id);
  }

  // Create Elite product (one-time payment €79)
  if (!eliteExists) {
    const eliteProduct = await stripe.products.create({
      name: 'Audit Elite',
      description: 'Ultimate Scan avec analyse photo posturale complète, intégration wearables et protocoles avancés 30-60-90 jours.',
      metadata: {
        type: 'ELITE',
        category: 'audit',
      }
    });

    const elitePrice = await stripe.prices.create({
      product: eliteProduct.id,
      unit_amount: 7900, // €79.00
      currency: 'eur',
    });

    console.log('Created Elite product:', eliteProduct.id);
    console.log('Created Elite price:', elitePrice.id);
  } else {
    console.log('Elite product already exists:', eliteExists.id);
  }

  console.log('Product creation complete!');
}

createProducts().catch(console.error);
