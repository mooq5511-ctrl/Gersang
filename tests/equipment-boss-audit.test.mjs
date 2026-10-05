import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BOSS_CASES, auditWorldBosses, measureRelicBoss } from '../scripts/audit-equipment-bosses.mjs';
test('world boss diagnostic includes every actual boss ID and keeps party and monster levels separate', () => {
  assert.equal(WORLD_BOSS_CASES.length, 14);
  const altur = WORLD_BOSS_CASES.find(row => row.key === 'e_lake_gale_altur');
  assert.equal(altur.monsterLevel, 10);
  assert.equal(altur.partyLevel, 56);
  for (const row of auditWorldBosses(1)) assert.equal(row.enemyCount, 1, row.key);
});
test('relic audit uses full real action, resting party only, and agrees with live readiness', () => {
  for (const level of [72, 112]) for (const count of [1, 3, 6]) for (const boss of [0, 1, 2, 3]) {
    const result = measureRelicBoss(level, 'candidate', boss, count);
    assert.equal(result.status === 'cleared', result.preview.ready, JSON.stringify(result));
    assert.equal(result.turns, result.preview.turns);
    assert.equal(result.initialBossHp, result.preview.bossHp);
    if (result.status === 'cleared') assert.ok(result.reward.gold > 0);
    else assert.equal(result.reward.gold, 0);
  }
  assert.throws(() => measureRelicBoss(72, 'candidate', 4), RangeError);
  assert.throws(() => measureRelicBoss(72, 'candidate', 0, 0), RangeError);
});
