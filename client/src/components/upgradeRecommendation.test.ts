import assert from 'node:assert/strict';
import test from 'node:test';
import type { Metric } from './ultrahuman/types';
import { analyzeDiscoveryRecommendation } from './upgradeRecommendation';

const metric = (key: string, value: number): Metric => ({
  key,
  value,
  max: 10,
  label: key,
  description: key,
});

test('does not infer multiple blockages from domain words in a strong report', () => {
  const result = analyzeDiscoveryRecommendation([
    metric('sommeil', 4),
    metric('stress', 8),
    metric('energie', 9.5),
    metric('digestion', 9.5),
    metric('training', 9),
    metric('nutrition', 9.5),
    metric('lifestyle', 6),
    metric('mindset', 9.5),
  ], 8);

  assert.deepEqual(result.weakDomains, ['sommeil']);
  assert.equal(result.hasMultipleWeakAreas, false);
  assert.equal(result.type, 'default');
});

test('recommends a complete analysis only for three measured weak domains', () => {
  const result = analyzeDiscoveryRecommendation([
    metric('sommeil', 4),
    metric('stress', 5),
    metric('nutrition', 5.5),
    metric('mindset', 8),
  ], 6.5);

  assert.deepEqual(result.weakDomains, ['sommeil', 'stress', 'nutrition']);
  assert.equal(result.hasMultipleWeakAreas, true);
  assert.equal(result.type, 'ultimate');
});

test('uses the global score as a fail-safe for a severely low profile', () => {
  const result = analyzeDiscoveryRecommendation([], 4.9);

  assert.equal(result.hasMultipleWeakAreas, true);
  assert.equal(result.type, 'ultimate');
});
