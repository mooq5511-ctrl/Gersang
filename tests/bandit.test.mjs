import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandit, isBanditEncounter } from '../app/bandit.ts';
import { resolveVitalBattle } from '../app/vitals-engine.ts';
const hero = { uid: 'hero', name: '主角', skill: '', hp: 10000, mp: 0, attack: 10, intelligence: 0, defense: 0, cost: 12 };
const enemy = { ...bandit, hp: 100000, attack: 10, defense: 0, bandit: true, terrain: 'mountain' };
test('bandits occupy early odd Korea stages without replacing bosses or other maps', () => {
  assert.deepEqual(Array.from({ length: 11 }, (_, i) => i + 1).filter(s => isBanditEncounter('korea-field', s)), [1,3,5,7,9]);
  assert.equal(isBanditEncounter('millennium-lake', 1), false);
  assert.equal(isBanditEncounter('korea-field', 0), false);
});
test('home ground reduces damage for exactly two rounds only on matching terrain', () => {
  const ground = resolveVitalBattle([hero], enemy);
  const plain = resolveVitalBattle([hero], { ...enemy, terrain: 'sea' });
  assert.equal(ground.enemyHp - plain.enemyHp, 4);
  assert.equal(ground.enemySkills.filter(s => s.startsWith('山寨地利')).length, 1);
  assert.equal(plain.enemySkills.some(s => s.startsWith('山寨地利')), false);
});
test('slash begins round two and has three-round cooldown', () => {
  const result = resolveVitalBattle([hero], enemy);
  assert.deepEqual(result.enemySkills.filter(s => s.includes('攔路劈砍')).map(s => Number(s.match(/第 (\d+)/)[1])), [2,5,8,11,14,17,20,23,26,29]);
  assert.equal(result.receivedDamage, 330);
});
test('slash slow changes next-round initiative and can prevent a fatal attack', () => {
  const result = resolveVitalBattle([{ ...hero, hp: 29, attack: 20 }], { ...enemy, hp: 81, terrain: 'sea' });
  assert.equal(result.rounds, 3);
  assert.equal(result.won, false);
  assert.equal(result.attacks, 2);
});
test('sand triggers once below half HP and blinds exactly the next attack', () => {
  const result = resolveVitalBattle([{ ...hero, attack: 60 }], { ...enemy, hp: 200, terrain: 'sea' }, () => 0.99);
  assert.equal(result.enemySkills.filter(s => s.includes('揚沙偷襲')).length, 1);
  assert.equal(result.misses, 1);
  assert.equal(result.won, true);
  assert.equal(result.fighters[0].speed, undefined);
  assert.equal(hero.hp, 10000);
});
test('sand may miss spells but still charges MP; accuracy succeeds below 0.8', () => {
  const mage = { ...hero, skill: '火球', mp: 100, attack: 30 };
  const missed = resolveVitalBattle([mage], { ...enemy, hp: 200, terrain: 'sea' }, () => 0.8);
  const hit = resolveVitalBattle([mage], { ...enemy, hp: 200, terrain: 'sea' }, () => 0.79);
  assert.equal(missed.misses, 1);
  assert.equal(hit.misses, 0);
  assert.equal(missed.spentMp, missed.casts * mage.cost);
  assert.ok(missed.spentMp > hit.spentMp);
});
test('dead bandits never trigger abilities and ordinary enemies keep old behavior', () => {
  const kill = resolveVitalBattle([{ ...hero, attack: 10000 }], { ...enemy, hp: 1 });
  assert.equal(kill.receivedDamage, 0);
  assert.equal(kill.enemySkills.filter(s => s.includes('第 ')).length, 0);
  const ordinary = resolveVitalBattle([hero], { ...enemy, bandit: false });
  assert.deepEqual(ordinary.enemySkills, []);
  assert.equal(ordinary.receivedDamage, 300);
});
