import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vitalStats, normalizeVitals, recoverVitals, resolveVitalBattle, spellCost } from '../app/vitals-engine.ts';
const unit = { level: 1, vit: 10, intel: 10, equip: {} };
const fighter = { uid: 'hero', name: '主角', skill: '法術', hp: 500, mp: 24, power: 100, intelligence: 10, defense: 0, cost: 12 };
const enemy = { hp: 100000, attack: 1, physical: 0, magic: 0 };
test('old saves initialize full HP and MP; saved zero stays zero', () => {
  const full = normalizeVitals(unit);
  assert.equal(full.hp, vitalStats(unit).maxHp);
  assert.equal(full.mp, vitalStats(unit).maxMp);
  assert.equal(normalizeVitals({ ...unit, hp: 0, mp: 0 }).hp, 0);
  assert.equal(normalizeVitals({ ...unit, hp: 0, mp: 0 }).mp, 0);
});
test('level, attributes and equipment affect maximum resources', () => {
  assert.ok(vitalStats({ ...unit, level: 10 }).maxHp > vitalStats(unit).maxHp);
  assert.ok(vitalStats({ ...unit, intel: 50 }).maxMp > vitalStats(unit).maxMp);
  assert.ok(vitalStats({ ...unit, equip: { armor: { hp: 100, bonus: { vit: 5 } } } }).maxHp > vitalStats(unit).maxHp);
  assert.ok(spellCost({ ...unit, level: 20 }) > spellCost(unit));
});
test('spells pay MP exactly; insufficient MP falls back to attacks', () => {
  const result = resolveVitalBattle([fighter], enemy);
  assert.equal(result.casts, 2);
  assert.equal(result.spentMp, 24);
  assert.equal(result.fighters[0].mp, 0);
  assert.equal(result.attacks, 28);
  assert.equal(fighter.mp, 24);
});
test('fallen units cannot cast or attack; damage never makes HP negative', () => {
  const fallen = resolveVitalBattle([{ ...fighter, hp: 0 }], enemy);
  assert.equal(fallen.casts, 0);
  assert.equal(fallen.rounds, 0);
  const defeated = resolveVitalBattle([{ ...fighter, hp: 1 }], { ...enemy, attack: 100 });
  assert.equal(defeated.fighters[0].hp, 0);
  assert.equal(defeated.won, false);
});
test('victory prevents extra spells and enemy counterattack', () => {
  const result = resolveVitalBattle([fighter, { ...fighter, uid: 'merc' }], { ...enemy, hp: 1 });
  assert.equal(result.casts, 1);
  assert.equal(result.fighters[1].mp, 24);
  assert.equal(result.receivedDamage, 0);
});
test('resources persist across encounters and recover without exceeding caps', () => {
  const first = resolveVitalBattle([fighter], { ...enemy, hp: 1 });
  const second = resolveVitalBattle(first.fighters, { ...enemy, hp: 1 });
  assert.equal(second.fighters[0].mp, 0);
  const half = recoverVitals({ ...unit, hp: 0, mp: 0 }, 0.5, 0.5);
  assert.equal(half.hp, Math.floor(vitalStats(unit).maxHp / 2));
  const full = recoverVitals(half);
  assert.equal(full.hp, vitalStats(unit).maxHp);
  assert.equal(full.mp, vitalStats(unit).maxMp);
});
