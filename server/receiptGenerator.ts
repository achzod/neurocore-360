import { Order } from "@shared/schema";

const STATUS_FR: Record<string, string> = {
  paid: "Payé",
  refunded: "Remboursé",
  partial_refund: "Partiellement remboursé",
  pending: "En attente",
  failed: "Échoué",
  cancelled: "Annulé",
};

function formatCents(cents: number, currency = "eur"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(d: Date | string | null): string {
  if (!d) return ", ";
  return new Date(d).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateReceiptHTML(order: Order): string {
  const statusLabel = STATUS_FR[order.status] || order.status;
  const hasDiscount = order.discountCents > 0;
  const hasRefund = order.refundAmountCents > 0;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu #${order.id.slice(0, 8)} ,  APEXLABS by Achzod</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8f9fa; color: #1a1a2e; line-height: 1.6;
      padding: 24px;
    }
    .receipt {
      max-width: 600px; margin: 0 auto; background: #fff;
      border: 1px solid #e0e0e0; border-radius: 8px;
      padding: 40px;
    }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #0ff; padding-bottom: 24px; }
    .header h1 { font-size: 20px; letter-spacing: 2px; color: #0a0a1a; }
    .header p { font-size: 12px; color: #666; margin-top: 4px; }
    .badge {
      display: inline-block; padding: 4px 12px; border-radius: 4px;
      font-size: 12px; font-weight: 600; text-transform: uppercase;
    }
    .badge-paid { background: #d4edda; color: #155724; }
    .badge-refunded { background: #f8d7da; color: #721c24; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; }
    .row-label { color: #555; }
    .row-value { font-weight: 500; text-align: right; }
    .divider { border-top: 1px solid #eee; margin: 16px 0; }
    .total { font-size: 18px; font-weight: 700; }
    .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { border: none; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>APEXLABS by Achzod</h1>
      <p>Optimisation Humaine &amp; Bio-Data</p>
    </div>

    <div class="section">
      <div class="section-title">Reçu de paiement</div>
      <div class="row">
        <span class="row-label">N° de commande</span>
        <span class="row-value">${order.id.slice(0, 8).toUpperCase()}</span>
      </div>
      <div class="row">
        <span class="row-label">Date</span>
        <span class="row-value">${formatDate(order.paidAt || order.createdAt)}</span>
      </div>
      <div class="row">
        <span class="row-label">Statut</span>
        <span class="row-value">
          <span class="badge badge-${order.status === "paid" ? "paid" : order.status.includes("refund") ? "refunded" : "pending"}">${statusLabel}</span>
        </span>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">Client</div>
      <div class="row">
        <span class="row-label">Email</span>
        <span class="row-value">${order.email}</span>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">Produit</div>
      <div class="row">
        <span class="row-label">${order.productName}</span>
        <span class="row-value">${formatCents(order.amountCents, order.currency)}</span>
      </div>
      ${hasDiscount ? `<div class="row">
        <span class="row-label">Réduction${order.promoCode ? ` (${order.promoCode})` : ""}</span>
        <span class="row-value" style="color:#28a745">-${formatCents(order.discountCents, order.currency)}</span>
      </div>` : ""}
      <div class="divider"></div>
      <div class="row total">
        <span>Total</span>
        <span>${formatCents(order.finalAmountCents, order.currency)}</span>
      </div>
      ${hasRefund ? `<div class="row" style="color:#dc3545">
        <span class="row-label">Remboursé</span>
        <span class="row-value">-${formatCents(order.refundAmountCents, order.currency)}</span>
      </div>` : ""}
    </div>

    <div class="footer">
      <p>APEXLABS by Achzod ,  achzodcoaching.com</p>
      <p>Ce document fait office de reçu. Conservez-le pour vos archives.</p>
    </div>
  </div>
</body>
</html>`;
}
