#!/bin/bash

KEY="e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e"

echo "Récupération de TOUTES les commandes..."

# Page 1
curl -s "https://apexlabs.achzodcoaching.com/api/admin/orders?limit=200&offset=0" -H "x-admin-key: $KEY" > /tmp/orders_p1.json

# Page 2
curl -s "https://apexlabs.achzodcoaching.com/api/admin/orders?limit=200&offset=200" -H "x-admin-key: $KEY" > /tmp/orders_p2.json

# Combine
jq -s '.[0].orders + .[1].orders' /tmp/orders_p1.json /tmp/orders_p2.json > /tmp/all_orders.json

echo "✅ Toutes les commandes récupérées"

# Stats
jq -r '
  {
    total: length,
    paid_all: [.[] | select(.status == "paid")] | length,
    paid_since_march17: [.[] | select(.status == "paid" and .createdAt >= "2026-03-17")] | length,
    paid_march17_with_audit: [.[] | select(.status == "paid" and .createdAt >= "2026-03-17" and .auditId)] | length,
    paid_march17_no_audit: [.[] | select(.status == "paid" and .createdAt >= "2026-03-17" and (.auditId == null or .auditId == ""))] | length
  }
' /tmp/all_orders.json
