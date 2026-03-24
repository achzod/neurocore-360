#!/bin/bash

curl -s 'https://apexlabs.achzodcoaching.com/api/admin/audits?limit=1000' \
  -H "x-admin-key: e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e" \
  | jq '{
      total: .audits | length,
      sent: [.audits[] | select(.reportDeliveryStatus == "SENT")] | length,
      ready: [.audits[] | select(.reportDeliveryStatus == "READY")] | length,
      generating: [.audits[] | select(.reportDeliveryStatus == "GENERATING")] | length,
      pending: [.audits[] | select(.reportDeliveryStatus == "PENDING")] | length,
      failed: [.audits[] | select(.reportDeliveryStatus == "EMAIL_FAILED")] | length,
      need_photos: [.audits[] | select(.reportDeliveryStatus == "NEED_PHOTOS")] | length
    }'
