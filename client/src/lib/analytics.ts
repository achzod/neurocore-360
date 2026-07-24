/**
 * Google Analytics 4 + Google Ads tracking utilities
 * Tracks: page_view, click, view_item, begin_checkout, add_payment_info, purchase
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    fbq: (...args: any[]) => void;
  }
}

function gtag(...args: any[]) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

function fbq(...args: any[]) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
}

// Track page views (called on route change)
export function trackPageView(pagePath: string, pageTitle?: string) {
  gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: window.location.href,
  });
}

// Track when user views a product/offer page
export function trackViewItem(itemId: string, itemName: string, price: number, currency = 'EUR') {
  gtag('event', 'view_item', {
    currency,
    value: price,
    items: [{
      item_id: itemId,
      item_name: itemName,
      price,
      currency,
      quantity: 1,
    }],
  });

  // Meta Pixel ViewContent
  fbq('track', 'ViewContent', {
    content_ids: [itemId],
    content_name: itemName,
    content_type: 'product',
    value: price,
    currency,
  });
}

// Track CTA / button clicks
export function trackClick(buttonName: string, destination?: string) {
  gtag('event', 'click', {
    event_category: 'engagement',
    event_label: buttonName,
    link_url: destination || '',
  });
}

// Track high-intent WhatsApp contact clicks without counting them as purchases.
export function trackWhatsAppClick({
  offer,
  placement,
  tier,
  destination,
}: {
  offer: string;
  placement: string;
  tier?: string;
  destination: string;
}) {
  gtag('event', 'whatsapp_click', {
    event_category: 'contact',
    event_label: `${offer}:${placement}`,
    method: 'whatsapp',
    offer,
    placement,
    tier: tier || 'unspecified',
    link_url: destination,
  });

  // Meta standard event for prospects who actively open a conversation.
  fbq('track', 'Contact', {
    content_name: offer,
    content_category: 'whatsapp',
    placement,
    tier: tier || 'unspecified',
  });
}

// Track form submissions (Discovery Scan questionnaire, etc.)
export function trackFormSubmit(formName: string) {
  gtag('event', 'generate_lead', {
    event_category: 'form',
    event_label: formName,
    currency: 'EUR',
    value: 0,
  });

  // Meta Pixel Lead for form submissions
  fbq('track', 'Lead', {
    content_name: formName,
    content_category: 'form_submission',
  });
}

// Track when user starts checkout
export function trackBeginCheckout(itemId: string, itemName: string, price: number, currency = 'EUR') {
  gtag('event', 'begin_checkout', {
    currency,
    value: price,
    items: [{
      item_id: itemId,
      item_name: itemName,
      price,
      currency,
      quantity: 1,
    }],
  });

  // Google Ads conversion for begin_checkout
  gtag('event', 'conversion', {
    send_to: 'AW-706806863/begin_checkout',
    value: price,
    currency,
  });

  // Meta Pixel InitiateCheckout
  fbq('track', 'InitiateCheckout', {
    content_ids: [itemId],
    content_name: itemName,
    content_type: 'product',
    value: price,
    currency,
  });
}

// Track payment info added
export function trackAddPaymentInfo(itemId: string, itemName: string, price: number, paymentMethod: string, currency = 'EUR') {
  gtag('event', 'add_payment_info', {
    currency,
    value: price,
    payment_type: paymentMethod,
    items: [{
      item_id: itemId,
      item_name: itemName,
      price,
      currency,
      quantity: 1,
    }],
  });
}

/**
 * Read `_fbp` / `_fbc` cookies set by the Meta Pixel + current user agent + source url.
 * Forward these with every checkout request so the server-side CAPI Purchase event
 * can match the same user/browser ,  without this, CAPI can't deduplicate with the
 * client Pixel and match quality stays low.
 */
function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const pair = document.cookie.split('; ').find(c => c.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.split('=').slice(1).join('=')) : undefined;
}

export function getMetaAttribution(): {
  fbp?: string;
  fbc?: string;
  userAgent?: string;
  sourceUrl?: string;
} {
  if (typeof window === 'undefined') return {};
  const fbp = readCookie('_fbp');
  // _fbc is only set when the user arrived from a Meta ad (query ?fbclid=…).
  // If absent but fbclid is present in the URL, Meta says you can synthesize:
  //   fbc = fb.1.<timestamp_ms>.<fbclid>
  let fbc = readCookie('_fbc');
  if (!fbc) {
    try {
      const fbclid = new URLSearchParams(window.location.search).get('fbclid');
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    } catch {}
  }
  return {
    fbp,
    fbc,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    sourceUrl: window.location.href,
  };
}

// Build a deterministic event_id for a Stripe/PayPal Purchase. Must match the
// server's event_id in the CAPI call so Meta dedups the client Pixel event and
// the server CAPI event into a single Purchase.
export function buildPurchaseEventId(provider: 'stripe' | 'paypal', externalId: string): string {
  return `${provider}_${externalId}`;
}

// Track successful purchase
export function trackPurchase(
  transactionId: string,
  itemId: string,
  itemName: string,
  price: number,
  currency = 'EUR',
  opts?: { provider?: 'stripe' | 'paypal' }
) {
  const provider = opts?.provider ?? 'stripe';
  const eventId = buildPurchaseEventId(provider, transactionId);

  gtag('event', 'purchase', {
    transaction_id: transactionId,
    currency,
    value: price,
    items: [{
      item_id: itemId,
      item_name: itemName,
      price,
      currency,
      quantity: 1,
    }],
  });

  // Google Ads conversion for purchase
  gtag('event', 'conversion', {
    send_to: 'AW-706806863/purchase',
    value: price,
    currency,
    transaction_id: transactionId,
  });

  // Meta Pixel Purchase ,  pass eventID matching the server-side CAPI event_id
  // so Meta deduplicates the Pixel + CAPI pair into one Purchase.
  fbq('track', 'Purchase', {
    content_ids: [itemId],
    content_name: itemName,
    content_type: 'product',
    value: price,
    currency,
  }, { eventID: eventId });
}

// Track Discovery Scan (free) submission as a lead
export function trackDiscoveryScanLead(auditId: string) {
  gtag('event', 'generate_lead', {
    event_category: 'discovery_scan',
    event_label: auditId,
    currency: 'EUR',
    value: 0,
  });

  // Google Ads conversion for Discovery Scan lead
  gtag('event', 'conversion', {
    send_to: 'AW-706806863/lead',
    value: 0,
    currency: 'EUR',
  });

  // Meta Pixel Lead
  fbq('track', 'Lead', {
    content_name: 'Discovery Scan',
    content_category: 'free_audit',
    value: 0,
    currency: 'EUR',
  });
}
