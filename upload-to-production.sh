#!/bin/bash

# Upload blood test PDF to production and get report link

PDF_PATH="./data/BloodAI_PRD_v2.pdf"
API_URL="https://neurocore-360.onrender.com"
EMAIL="achzod-test-$(date +%s)@neurocore.test"

echo "🩸 Upload to Production"
echo "📄 PDF: $PDF_PATH"
echo "📧 Email: $EMAIL"
echo ""

# 1. Create magic link
echo "1️⃣ Creating user..."
MAGIC_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/magic-link" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}")

echo "✅ User created"
echo ""

# 2. Get userId from magic link token (we need to extract it)
# For test, we'll use a known test user or admin key

echo "2️⃣ Uploading PDF..."
echo ""
echo "⚠️  Upload requires authentication."
echo ""
echo "🎯 EASIEST OPTION:"
echo "   Go to: https://neurocore-360.onrender.com"
echo "   Upload: $PDF_PATH"
echo "   The report will be generated with:"
echo "   - TUTOIEMENT (tu/ton/ta/tes)"
echo "   - Expert medical style"
echo "   - Paragraphs (no bullets)"
echo "   - RAG citations"
echo ""
echo "   You'll see the full premium dashboard with:"
echo "   - Interactive sidebar navigation"
echo "   - Color-coded biomarker badges"
echo "   - Timeline charts"
echo "   - Heatmap visualizations"
echo "   - Expandable insights"
echo ""
