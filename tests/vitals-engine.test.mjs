import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combatStats, enemyCombatStats, damageAfterDefense, vitalStats, normalizeVitals, recoverVitals, resolveVitalBattle, spellCost } from '../app/vitals-engine.ts';
const unit = { level: 1, vit: 10, intel: 10, equip: {} };
const fighter = { uid: 'hero', name: '主角', skill: '法術', hp: 500, mp: 24, attack: 100, intelligence: 10, defense: 0, cost: 12 };
const enemy = { hp: 100000, attack: 1, defense: 0, physical: 0, magic: 0 };
test('equipment, attributes and promotion increase combat stats', () => {
  const base = { ...unit, str: 20, agi: 10 };
  const stats = combatStats(base);
  const equipped = combatStats({ ...base, equip: { weapon: { atk: 40, def: 20, enhance: 1, magic: [{ stat: 'atk', value: 12 }, { stat: 'def', value: 14 }] } } });
  assert.ok(equipped.attack > stats.attack && equipped.defense > stats.defense);
  assert.ok(combatStats({ ...base, str: 50 }).attack > stats.attack);
  assert.ok(combatStats({ ...base, vit: 50 }).defense > stats.defense);
  assert.ok(combatStats({ ...base, tier: 2 }).attack > stats.attack);
});
test('monster attack and defense scale with stages and bosses', () => {
  const base = enemyCombatStats(1, 250);
  const later = enemyCombatStats(10, 1000);
  const boss = enemyCombatStats(10, 1000, true);
  assert.ok(later.attack > base.attack && later.defense > base.defense);
  assert.ok(boss.attack > later.attack && boss.defense > later.defense);
});
test('attack increases damage and armor reduces it without healing', () => {
  assert.ok(damageAfterDefense(200, 50) > damageAfterDefense(100, 50));
  assert.ok(damageAfterDefense(100, 200) < damageAfterDefense(100, 0));
  assert.equal(damageAfterDefense(1, 999999, 85), 1);
});
test('monster defense and party defense both affect actual encounters', () => {
  const physical = { ...fighter, mp: 0, hp: 100000 };
  const normal = resolveVitalBattle([physical], { ...enemy, attack: 100 });
  const monsterArmor = resolveVitalBattle([physical], { ...enemy, attack: 100, defense: 200 });
  const partyArmor = resolveVitalBattle([{ ...physical, defense: 200 }], { ...enemy, attack: 100 });
  assert.ok(monsterArmor.enemyHp > normal.enemyHp);
  assert.ok(partyArmor.receivedDamage < normal.receivedDamage);
});
test('equipped physical and magic resistance reduce matching incoming attacks', () => {
  const stats = vitalStats({ ...unit, physicalResist: 5, equip: { armor: { resist: { physical: 30, magic: 20 } } } });
  assert.equal(stats.physicalResist, 35);
  assert.equal(stats.magicResist, 20);
  const base = { ...fighter, hp: 100000, mp: 0, attack: 0, defense: 0, speed: 1, position: '前排' };
  const hostile = { ...enemy, hp: 1e9, attack: 100, speed: 100 };
  const plain = resolveVitalBattle([base], hostile);
  const physical = resolveVitalBattle([{ ...base, physicalResist: stats.physicalResist }], hostile);
  const magical = resolveVitalBattle([{ ...base, magicResist: stats.magicResist }], { ...hostile, magicAttack: true });
  assert.ok(physical.receivedDamage < plain.receivedDamage);
  assert.ok(magical.receivedDamage < plain.receivedDamage);
});
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
