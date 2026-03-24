#!/bin/bash

ADMIN_KEY="e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e"
BASE_URL="https://apexlabs.achzodcoaching.com"

echo "🧪 TESTING ALL NEW ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1️⃣ Testing GET /api/admin/email-stats"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "${BASE_URL}/api/admin/email-stats" \
  -H "x-admin-key: ${ADMIN_KEY}" | jq '.'
echo ""
echo ""

echo "2️⃣ Testing GET /api/admin/audits-pending"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "${BASE_URL}/api/admin/audits-pending" \
  -H "x-admin-key: ${ADMIN_KEY}" | jq '.counts'
echo ""
echo ""

echo "3️⃣ Testing GET /api/admin/email-trackings (old endpoint)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "${BASE_URL}/api/admin/email-trackings?limit=5" \
  -H "x-admin-key: ${ADMIN_KEY}" | jq '.total'
echo ""
echo ""

echo "4️⃣ Testing POST /api/admin/force-send-email (with test email)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "${BASE_URL}/api/admin/force-send-email" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -d '{"email":"nicolasgourvenec1@orange.fr"}' | jq '.'
echo ""
echo ""

echo "✅ ALL TESTS COMPLETE"
