import test from 'node:test';
import assert from 'node:assert/strict';
import { equipmentFixture, measureEquipment } from '../scripts/measure-equipment-early.mjs';

test('early comparison changes gear only; levels, rank and paid attributes stay fixed', () => {
  for (const level of [1, 12, 24, 35]) {
    const variants = ['empty', 'current', 'candidate'].map(variant => equipmentFixture(level, variant));
    const identity = fixture => fixture.units.map(({ uid, level, str, agi, vit, intel, position, promotionStage }) => ({ uid, level, str, agi, vit, intel, position, promotionStage }));
    assert.deepEqual(identity(variants[0]), identity(variants[1]));
    assert.deepEqual(identity(variants[0]), identity(variants[2]));
    assert.equal(Object.keys(variants[2].units[0].equip).length, 7);
  }
});
test('comparison settles the whole one/two-enemy encounter, not just a partial kill', () => {
  for (const countRoll of [0, .75]) {
    const result = measureEquipment(1, 'e_starter_black_bandit', 'candidate', countRoll, 1, 1);
    assert.equal(result.victories, 1);
    assert.equal(result.fights[0].enemyCount, countRoll === 0 ? 1 : 2);
    assert.ok(result.remaining.every(unit => unit.hp > 0));
  }
});
test('continuing fights retain lost HP; new fixtures remain untouched', () => {
  const result = measureEquipment(1, 'e_starter_black_bandit', 'candidate', 0, 1, 10);
  assert.equal(result.victories, 10);
  for (const unit of result.remaining) assert.ok(unit.hp <= unit.maxHp);
  assert.ok(result.remaining.some(unit => unit.hp < unit.maxHp));
  const fresh = equipmentFixture(1, 'candidate');
  assert.ok(fresh.party.every(unit => unit.hp === unit.maxHp));
  assert.throws(() => equipmentFixture(250, 'candidate'), RangeError);
});
test('random-size mode is reproducible and exercises both live encounter counts', () => {
  const first = measureEquipment(1, 'e_starter_black_bandit', 'candidate', null, 7, 10);
  assert.deepEqual(first, measureEquipment(1, 'e_starter_black_bandit', 'candidate', null, 7, 10));
  assert.deepEqual(new Set(first.fights.map(fight => fight.enemyCount)), new Set([1, 2]));
});
test('revised Lv24 draft sustains ten main-enemy fights across thirty combat seeds', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const result = measureEquipment(24, 'e_lake_horn_fire', 'candidate', .75, seed, 10);
    assert.equal(result.victories, 10, JSON.stringify({ seed, result }));
  }
});
