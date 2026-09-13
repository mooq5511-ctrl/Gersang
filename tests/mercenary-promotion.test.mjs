import test from 'node:test';
import assert from 'node:assert/strict';
import { canPromoteMercenary, MERCENARY_PROMOTIONS } from '../app/mercenary-promotion.ts';
import { calculateLevelBasedBonus, LEVEL_ATTRIBUTE_MILESTONES } from '../app/mercenary-promotions.ts';

const first = MERCENARY_PROMOTIONS['merchant-samurai'][0];
const second = MERCENARY_PROMOTIONS['merchant-swordmaster'][0];
const samurai = Object.freeze({ templateId: 'merchant-samurai', tier: 0, level: 40 });
const progress = Object.freeze({
  stage: 10,
  newbieBossDefeated: true,
  lakeBossDefeated: false,
  goldenStarfishDefeated: false,
  fusionCores: 2,
  soulStones: 0,
  awakeningStones: 0,
});

test('promotion needs matching class and tier plus every unlock, level, and item requirement', () => {
  assert.equal(canPromoteMercenary(samurai, first, progress), true);
  assert.equal(canPromoteMercenary({ ...samurai, templateId: 'merchant-shield' }, first, progress), false);
  assert.equal(canPromoteMercenary({ ...samurai, tier: 1 }, first, progress), false);
  assert.equal(canPromoteMercenary({ ...samurai, level: 39 }, first, progress), false);
  assert.equal(canPromoteMercenary(samurai, first, { ...progress, stage: 9 }), false);
  assert.equal(canPromoteMercenary(samurai, first, { ...progress, newbieBossDefeated: false }), false);
  assert.equal(canPromoteMercenary(samurai, first, { ...progress, fusionCores: 1 }), false);
  assert.equal(canPromoteMercenary(samurai, first, progress), true);
});

test('higher promotion checks every item and leaves inputs unchanged', () => {
  const swordmaster = Object.freeze({ templateId: 'merchant-swordmaster', tier: 2, level: 80 });
  const ready = Object.freeze({ ...progress, stage: 20, lakeBossDefeated: true, soulStones: 10, awakeningStones: 1 });
  assert.equal(canPromoteMercenary(swordmaster, second, ready), true);
  assert.equal(canPromoteMercenary(swordmaster, second, { ...ready, awakeningStones: 0 }), false);
  assert.equal(canPromoteMercenary(swordmaster, second, { ...ready, soulStones: 9 }), false);
  assert.deepEqual(swordmaster, { templateId: 'merchant-swordmaster', tier: 2, level: 80 });
  assert.equal(ready.soulStones, 10);
});

test('level based promotion bonus interpolates milestones and caps at max level', () => {
  for (const milestone of LEVEL_ATTRIBUTE_MILESTONES) assert.equal(calculateLevelBasedBonus(milestone.level), milestone.points);
  assert.equal(calculateLevelBasedBonus(39), 0);
  assert.equal(calculateLevelBasedBonus(50), 324);
  assert.equal(calculateLevelBasedBonus(250), 10000);
  assert.equal(calculateLevelBasedBonus(300), 10000);
});
