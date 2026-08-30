import Stripe from 'stripe';

/**
 * Stripe Client - Version Render (sans Replit Connectors)
 * Utilise directement les variables d'environnement
 */

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not configured - payments will fail');
}

// Stripe client singletons by rail. STRIPE_SECRET_KEY is the primary APEX rail
// (AE); STRIPE_SECRET_KEY_FR is reserved for Klarna-only checkout sessions.
const stripeClients = new Map<string, Stripe>();

function getStripeClientForKey(secretKey: string, rail: string): Stripe {
  if (!secretKey) {
    throw new Error(`${rail} Stripe secret key is required`);
  }
  const cacheKey = `${rail}:${secretKey.slice(-8)}`;
  let client = stripeClients.get(cacheKey);
  if (!client) {
    client = new Stripe(secretKey);
    stripeClients.set(cacheKey, client);
  }
  return client;
}

export function getStripeClient(): Stripe {
  return getStripeClientForKey(process.env.STRIPE_SECRET_KEY || '', 'primary');
}

export function getStripeKlarnaClient(): Stripe {
  return getStripeClientForKey(process.env.STRIPE_SECRET_KEY_FR || '', 'klarna-fr');
}

// Aliases pour compatibilité avec l'ancien code
export async function getUncachableStripeClient(): Promise<Stripe> {
  return getStripeClient();
}

export async function getStripePublishableKey(): Promise<string> {
  const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
  if (!STRIPE_PUBLISHABLE_KEY) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is required');
  }
  return STRIPE_PUBLISHABLE_KEY;
}

export async function getStripeSecretKey(): Promise<string> {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
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
      const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
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
