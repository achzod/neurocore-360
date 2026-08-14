-- Bind every controlled batch item to the exact source status captured by the
-- approved manifest. Existing rows are intentionally left NULL and cannot be
-- persisted by the stricter code until a fresh batch is prepared.
ALTER TABLE discovery_batch_items
  ADD COLUMN IF NOT EXISTS expected_source_status TEXT;

-- Bind each delivery claim to the durable discovery-global fence epoch that
-- existed when it was created. NULL is the valid epoch before the first batch.
ALTER TABLE discovery_email_delivery_claims
  ADD COLUMN IF NOT EXISTS fence_token UUID;
