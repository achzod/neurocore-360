-- Extend the durable Discovery delivery claim to every delivery path, not only
-- remediation batches. Existing batch claims keep their foreign key; ordinary
-- live deliveries use a NULL batch_id and the same per-audit uniqueness guard.

ALTER TABLE discovery_email_delivery_claims
  ALTER COLUMN batch_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS discovery_email_delivery_claims_state_idx
  ON discovery_email_delivery_claims(state, updated_at);
