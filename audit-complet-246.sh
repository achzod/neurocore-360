#!/bin/bash

KEY="e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e"

echo "🔍 AUDIT COMPLET 246 COMMANDES (17 MARS - 24 MARS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Récupérer TOUTES les commandes
echo "📦 Récupération des 246 commandes..."
curl -s "https://apexlabs.achzodcoaching.com/api/admin/orders?limit=200&offset=0" -H "x-admin-key: $KEY" > /tmp/orders_p1.json
curl -s "https://apexlabs.achzodcoaching.com/api/admin/orders?limit=200&offset=200" -H "x-admin-key: $KEY" > /tmp/orders_p2.json
jq -s '.[0].orders + .[1].orders' /tmp/orders_p1.json /tmp/orders_p2.json > /tmp/all_orders_full.json

# Filtrer paid depuis 17 mars
jq '[.[] | select(.status == "paid" and .createdAt >= "2026-03-17")]' /tmp/all_orders_full.json > /tmp/orders_march17.json

TOTAL=$(jq 'length' /tmp/orders_march17.json)
echo "✅ $TOTAL commandes payées depuis le 17 mars"
echo ""

# 2. Récupérer TOUS les audits
echo "📝 Récupération de tous les audits..."
curl -s "https://apexlabs.achzodcoaching.com/api/admin/audits?limit=5000" -H "x-admin-key: $KEY" > /tmp/all_audits.json
TOTAL_AUDITS=$(jq '.audits | length' /tmp/all_audits.json)
echo "✅ $TOTAL_AUDITS audits dans la base"
echo ""

# 3. Analyse détaillée
echo "🔍 ANALYSE DÉTAILLÉE CLIENT PAR CLIENT..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

jq -r --slurpfile audits /tmp/all_audits.json '
  .[] |
  {
    email,
    productType,
    auditId,
    createdAt,
    audit: (if .auditId then ($audits[0].audits[] | select(.id == .auditId)) else null end)
  } |
  if .audit then
    "\(.email)|\(.productType)|\(.auditId)|\(.audit.reportDeliveryStatus)|FOUND|\(.createdAt)"
  else
    "\(.email)|\(.productType)|\(.auditId // "NULL")|MISSING|NOT_FOUND|\(.createdAt)"
  end
' /tmp/orders_march17.json > /tmp/audit_status.txt

echo "Status par client (email|type|auditId|status|found|date):"
echo ""
head -20 /tmp/audit_status.txt
echo ""
echo "... (voir /tmp/audit_status.txt pour le détail complet)"
echo ""

# 4. Statistiques globales
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 STATISTIQUES GLOBALES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SENT=$(grep "|SENT|" /tmp/audit_status.txt | wc -l | xargs)
READY=$(grep "|READY|" /tmp/audit_status.txt | wc -l | xargs)
SCHEDULED=$(grep "|SCHEDULED|" /tmp/audit_status.txt | wc -l | xargs)
PENDING=$(grep "|PENDING|" /tmp/audit_status.txt | wc -l | xargs)
GENERATING=$(grep "|GENERATING|" /tmp/audit_status.txt | wc -l | xargs)
NEED_PHOTOS=$(grep "|NEED_PHOTOS|" /tmp/audit_status.txt | wc -l | xargs)
EMAIL_FAILED=$(grep "|EMAIL_FAILED|" /tmp/audit_status.txt | wc -l | xargs)
MISSING=$(grep "|MISSING|" /tmp/audit_status.txt | wc -l | xargs)

echo "✅ SENT (envoyés):              $SENT"
echo "📅 SCHEDULED (programmés):      $SCHEDULED"
echo "✅ READY (prêts):               $READY"
echo "⏳ PENDING (en attente):        $PENDING"
echo "🔄 GENERATING (génération):     $GENERATING"
echo "📸 NEED_PHOTOS (photos):        $NEED_PHOTOS"
echo "❌ EMAIL_FAILED (échec email):  $EMAIL_FAILED"
echo "🔴 MISSING (audit n'existe pas): $MISSING"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TOTAL: $TOTAL commandes"
echo ""

# 5. Breakdown par date
echo "📅 BREAKDOWN PAR DATE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for date in 17 18 19 20 21 22 23 24; do
  COUNT=$(grep "2026-03-$date" /tmp/audit_status.txt | wc -l | xargs)
  SENT_DATE=$(grep "2026-03-$date" /tmp/audit_status.txt | grep "|SENT|" | wc -l | xargs)
  MISSING_DATE=$(grep "2026-03-$date" /tmp/audit_status.txt | grep "|MISSING|" | wc -l | xargs)
  echo "📅 $date mars: $COUNT commandes ($SENT_DATE envoyés, $MISSING_DATE manquants)"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ AUDIT COMPLET TERMINÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 Fichiers générés:"
echo "   - /tmp/audit_status.txt (détail 246 clients)"
echo "   - /tmp/orders_march17.json (toutes les commandes)"
echo "   - /tmp/all_audits.json (tous les audits)"
echo ""
