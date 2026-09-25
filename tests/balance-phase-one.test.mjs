import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { settleCaravanIdle } from '../app/caravan-idle.ts';
import { LEVEL_CAP_TOTAL_XP, LEVEL_PROGRESSION } from '../app/level-progression.ts';
import { TRADE_ROUTES, upgradeCost, voyageQuote } from '../app/trade-engine.ts';
import { ECOLOGY_MONSTERS } from '../app/monster-ecology.ts';

test('idle rewards progress but stay capped and cannot be claimed twice', () => {
  const hour = settleCaravanIdle(1000, 3_601_000, 101);
  assert.equal(hour.gold, 108_000);
  assert.equal(hour.credit, 36_000);
  const day = settleCaravanIdle(1000, 86_401_000, 101);
  const week = settleCaravanIdle(1000, 604_801_000, 101);
  assert.equal(day.gold, 864_000);
  assert.equal(week.gold, day.gold);
  assert.equal(settleCaravanIdle(day.stamp, 86_401_000, 101).gold, 0);
  assert.equal(settleCaravanIdle(1000, 3_601_000, 10_000).gold, hour.gold);
});

test('cargo upgrade follows 1.15 growth and every route remains profitable', () => {
  assert.equal(upgradeCost(1), 30_000);
  assert.equal(upgradeCost(2), 34_500);
  assert.ok(upgradeCost(19) < 400_000);
  for (const route of TRADE_ROUTES) {
    const early = voyageQuote(route, 1, 0, 0);
    const late = voyageQuote(route, 20, 0, 0);
    assert.ok(early.revenue > early.cost);
    assert.ok(late.revenue > late.cost);
    assert.ok(late.revenue - late.cost < (early.revenue - early.cost) * 10.5);
  }
});

test('experience progression is smooth and reaches exactly two billion', () => {
  assert.equal(ECOLOGY_MONSTERS.e_starter_wako.xp, 9);
  assert.equal(LEVEL_PROGRESSION[0].xpToNext, 100);
  assert.equal(LEVEL_PROGRESSION[1].xpToNext, 500);
  assert.equal(LEVEL_PROGRESSION.at(-1).totalXp, LEVEL_CAP_TOTAL_XP);
  assert.ok(LEVEL_PROGRESSION[49].xpToNext < 137_196);
  for (let index = 1; index < LEVEL_PROGRESSION.length - 1; index++) {
    assert.ok(LEVEL_PROGRESSION[index].xpToNext >= LEVEL_PROGRESSION[index - 1].xpToNext);
  }
});

test('thunder altar keeps fixed boss HP and individual timers with burst cooldown', () => {
  const source = readFileSync(new URL('../app/thunder-altar-raid.tsx', import.meta.url), 'utf8');
  for (const hp of ['5_000_000', '8_000_000', '11_000_000']) assert.ok(source.includes(`hp: ${hp}`));
  assert.equal((source.match(/time: 240/g) || []).length, 3);
  assert.ok(source.includes('const BURST_COOLDOWN = 10'));
  assert.ok(source.includes('setBurstCooldown(BURST_COOLDOWN)'));
  assert.ok(source.includes('raidPower * .25'));
  assert.ok(source.includes('raid-action-grid'));
  assert.ok(source.includes('狂雷倒數'));
  assert.ok(source.includes('const stabilize'));
  assert.ok(source.includes('const interrupt'));
});
