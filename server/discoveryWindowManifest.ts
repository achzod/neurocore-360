import { discoveryArtifactHash } from './discoverySentRemediation';
import {
  evaluateCanonicalDiscoveryArtifacts,
  resolveCanonicalDiscoveryArtifacts,
} from './discoveryDeliveryGate';
import { deriveDiscoverySafetyPolicy } from './discoverySafetyPolicy';
import { isDiscoverySupersededTerminal } from './discoverySupersededPolicy';

export const DISCOVERY_WINDOW_ITEM_KEYS = [
  'id',
  'createdAt',
  'status',
  'reportDeliveryStatus',
  'reportGeneratedAt',
  'reportSentAt',
  'artifactHash',
  'hasArtifacts',
  'premium',
  'gateErrorCodes',
  'tcaMode',
  'sportFrequency',
  'superseded',
  'generationMode',
  'fallbackUsed',
  'remediationMode',
  'trackingTotal',
  'trackingAccepted',
] as const;

export function safeDiscoveryGateCode(error: unknown): string {
  return String(error || 'unknown').split(':', 1)[0].slice(0, 120);
}

export function buildSafeDiscoveryWindowItem(row: any): Record<string, unknown> {
  const canonical = resolveCanonicalDiscoveryArtifacts({
    narrativeReport: row.narrative_report,
    reportTxt: row.report_txt,
    reportHtml: row.report_html,
  });
  const gate = evaluateCanonicalDiscoveryArtifacts(canonical);
  const safety = deriveDiscoverySafetyPolicy(row.responses || {});
  const reportDeliveryStatus = row.report_delivery_status || null;
  const narrative = row.narrative_report || {};
  const item: Record<(typeof DISCOVERY_WINDOW_ITEM_KEYS)[number], unknown> = {
    id: String(row.id),
    createdAt: new Date(row.created_at).toISOString(),
    status: row.status || null,
    reportDeliveryStatus,
    reportGeneratedAt: row.report_generated_at ? new Date(row.report_generated_at).toISOString() : null,
    reportSentAt: row.report_sent_at ? new Date(row.report_sent_at).toISOString() : null,
    artifactHash: discoveryArtifactHash(row.report_txt, row.report_html),
    hasArtifacts: Boolean(String(row.report_txt || '').trim() && String(row.report_html || '').trim()),
    premium: gate.ok,
    gateErrorCodes: [...new Set(gate.errors.map(safeDiscoveryGateCode))],
    tcaMode: safety.tcaMode,
    sportFrequency: String(row.responses?.['sport-frequence'] || 'unknown').slice(0, 40),
    superseded: isDiscoverySupersededTerminal({
      type: 'GRATUIT',
      reportDeliveryStatus,
      narrativeReport: narrative,
    }),
    generationMode: narrative?.generationQuality?.mode || null,
    fallbackUsed: narrative?.generationQuality?.fallbackUsed === true,
    remediationMode: narrative?.remediation?.mode || null,
    trackingTotal: Number(row.tracking_total || 0),
    trackingAccepted: Number(row.tracking_accepted || 0),
  };
  return item;
}

export function assertSafeDiscoveryWindowItem(item: Record<string, unknown>): void {
  const keys = Object.keys(item).sort();
  const allowed = [...DISCOVERY_WINDOW_ITEM_KEYS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(allowed)) {
    throw new Error(`Unsafe Discovery manifest keys: ${keys.join(',')}`);
  }
}
