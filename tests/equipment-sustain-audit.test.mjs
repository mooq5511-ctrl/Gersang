import test from 'node:test';
import assert from 'node:assert/strict';
import { measureSustain } from '../scripts/audit-equipment-sustain.mjs';
test('successive curve trials carry HP and MP across all encounters without mutating a fresh fixture', () => {
  const result = measureSustain(72, 'e_white_tiger_soul_eater', 'candidate', 4);
  assert.ok(result.fights.length > 1);
  assert.ok(result.remaining.some(unit => unit.hp < unit.maxHp));
  assert.deepEqual(result, measureSustain(72, 'e_white_tiger_soul_eater', 'candidate', 4));
  for (const fight of result.fights) assert.equal(fight.enemyCount, 4);
});
test('observation timeout is distinct from defeated state', () => {
  const result = measureSustain(72, 'relic_sunken_king', 'candidate', 1, 1);
  assert.equal(result.fights[0].timedOut, true);
  assert.equal(result.fights[0].status, 'fighting');
  assert.equal(result.victories, 0);
});
