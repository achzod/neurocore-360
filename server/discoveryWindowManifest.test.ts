import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSafeDiscoveryWindowItem,
  buildSafeDiscoveryWindowItem,
  DISCOVERY_WINDOW_ITEM_KEYS,
} from './discoveryWindowManifest';

test('window manifest exposes only non-PII remediation fields', () => {
  const item = buildSafeDiscoveryWindowItem({
    id: 'audit-id',
    email: 'private@example.com',
    user_id: 'private-user-id',
    created_at: new Date('2026-08-06T00:00:00Z'),
    status: 'COMPLETED',
    report_delivery_status: 'SENT',
    report_generated_at: new Date('2026-08-06T00:01:00Z'),
    report_sent_at: new Date('2026-08-06T00:02:00Z'),
    responses: {
      email: 'private@example.com',
      prenom: 'Private Name',
      'sport-frequence': '3-4',
      'tca-historique': 'passe',
    },
    narrative_report: { generationQuality: { mode: 'premium_ai', fallbackUsed: false } },
    report_txt: 'legacy',
    report_html: '<p>legacy</p>',
    tracking_total: 1,
    tracking_accepted: 1,
  });

  assertSafeDiscoveryWindowItem(item);
  assert.deepEqual(Object.keys(item).sort(), [...DISCOVERY_WINDOW_ITEM_KEYS].sort());
  assert.equal(item.tcaMode, 'history');
  assert.equal(item.sportFrequency, '3-4');
  const serialized = JSON.stringify(item);
  assert.doesNotMatch(serialized, /private@example\.com|Private Name|private-user-id/);
  assert.equal(Object.hasOwn(item, 'email'), false);
  assert.equal(Object.hasOwn(item, 'responses'), false);
});
