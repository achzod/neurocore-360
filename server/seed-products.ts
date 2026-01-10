import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating NEUROCORE 360° products in Stripe...');

  // Check if products already exist
  const existingProducts = await stripe.products.list({ limit: 100 });
  const anabolicExists = existingProducts.data.find(p => p.name === 'Anabolic Bioscan');
  const ultimateExists = existingProducts.data.find(p => p.name === 'Ultimate Scan');

  // Create Anabolic Bioscan product (one-time payment €59)
  if (!anabolicExists) {
    const anabolicProduct = await stripe.products.create({
      name: 'Anabolic Bioscan',
      description: 'Audit 360 complet avec rapport détaillé, protocoles personnalisés et plan d\'action 30-60-90 jours.',
      metadata: {
        type: 'PREMIUM',
        category: 'audit',
      }
    });

    const anabolicPrice = await stripe.prices.create({
      product: anabolicProduct.id,
      unit_amount: 5900, // €59.00
      currency: 'eur',
    });

    console.log('Created Anabolic Bioscan product:', anabolicProduct.id);
    console.log('Created Anabolic Bioscan price:', anabolicPrice.id);
  } else {
    console.log('Anabolic Bioscan product already exists:', anabolicExists.id);
  }

  // Create Ultimate Scan product (one-time payment €79)
  if (!ultimateExists) {
    const ultimateProduct = await stripe.products.create({
      name: 'Ultimate Scan',
      description: 'Ultimate Scan avec analyse photo posturale complète, intégration wearables et protocoles avancés 30-60-90 jours.',
      metadata: {
        type: 'ELITE',
        category: 'audit',
      }
    });

    const ultimatePrice = await stripe.prices.create({
      product: ultimateProduct.id,
      unit_amount: 7900, // €79.00
      currency: 'eur',
    });

    console.log('Created Ultimate Scan product:', ultimateProduct.id);
    console.log('Created Ultimate Scan price:', ultimatePrice.id);
  } else {
    console.log('Ultimate Scan product already exists:', ultimateExists.id);
  }

  console.log('Product creation complete!');
}

createProducts().catch(console.error);
