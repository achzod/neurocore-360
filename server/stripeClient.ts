import Stripe from 'stripe';

/**
 * Stripe Client - Version Render (sans Replit Connectors)
 * Utilise directement les variables d'environnement
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';

if (!STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not configured - payments will fail');
}

// Client Stripe singleton
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripeClient;
}

// Aliases pour compatibilité avec l'ancien code
export async function getUncachableStripeClient(): Promise<Stripe> {
  return getStripeClient();
}

export async function getStripePublishableKey(): Promise<string> {
  if (!STRIPE_PUBLISHABLE_KEY) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is required');
  }
  return STRIPE_PUBLISHABLE_KEY;
}

export async function getStripeSecretKey(): Promise<string> {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }
  return STRIPE_SECRET_KEY;
}

// Stripe Sync pour la DB (optionnel)
let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync && process.env.DATABASE_URL) {
    try {
      const { StripeSync } = await import('stripe-replit-sync');
      stripeSync = new StripeSync({
        poolConfig: {
          connectionString: process.env.DATABASE_URL,
          max: 2,
        },
        stripeSecretKey: STRIPE_SECRET_KEY,
      });
    } catch (e) {
      console.warn('[Stripe] StripeSync not available:', e);
    }
  }
  return stripeSync;
}
