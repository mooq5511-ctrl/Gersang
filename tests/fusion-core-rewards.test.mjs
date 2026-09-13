import test from 'node:test';
import assert from 'node:assert/strict';
import { awardFusionCores } from '../app/fusion-core-rewards.ts';

test('awardFusionCores returns a new state and clamps invalid amounts', () => {
  const state = { fusionCores: 2 };
  const awarded = awardFusionCores(state, 3.9);
  assert.deepEqual(awarded, { fusionCores: 5 });
  assert.notEqual(awarded, state);
  assert.equal(awardFusionCores(state, -1), state);
  assert.equal(awardFusionCores(state, Number.NaN), state);
});
