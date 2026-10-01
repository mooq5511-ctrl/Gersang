import test from 'node:test';
import assert from 'node:assert/strict';
import { pauseHanyangTutorialBattle } from '../app/hanyang-prologue.ts';
import { freshDungeon, dungeonStep } from '../app/dungeon-engine.ts';

const make = (step, status = 'fighting') => ({
  hanyangPrologueStep: step, logs: [], gold: 123, kills: 3,
  hero: { hp: 40, maxHp: 100 }, inventory: [{ uid: 'reward' }],
  dungeon: { ...freshDungeon(), status, autoHunt: true, spawnAt: 999,
    resumeAutoHuntAfterRecovery: true, realtime: { running: true }, events: [{ id: 1 }] },
});

test('town tutorial steps stop ongoing encounters without altering rewards or vitals', () => {
  for (const step of ['arrival', 'first-sale', 'journey-fund', 'medicine', 'guild', 'formation', 'caravan-crisis', 'caravan-delivery', 'return', 'departure']) {
    for (const status of ['fighting', 'respawning']) {
      const original = make(step, status), next = pauseHanyangTutorialBattle(original);
      assert.equal(next.dungeon.status, 'idle');
      assert.equal(next.dungeon.autoHunt, false);
      assert.equal(next.dungeon.resumeAutoHuntAfterRecovery, false);
      assert.equal(next.dungeon.spawnAt, 0);
      assert.equal(next.dungeon.realtime, undefined);
      assert.strictEqual(next.hero, original.hero);
      assert.strictEqual(next.inventory, original.inventory);
      assert.equal(next.gold, 123);
      assert.equal(next.kills, 3);
      assert.equal(original.dungeon.autoHunt, true);
      assert.strictEqual(pauseHanyangTutorialBattle(next), next);
    }
  }
});

test('healing remains free but cannot restart hunting after tutorial pause', () => {
  const original = make('medicine', 'recovering');
  original.dungeon.autoHunt = false;
  original.dungeon.innHealAt = 1000;
  const next = pauseHanyangTutorialBattle(original);
  assert.equal(next.dungeon.status, 'recovering');
  assert.equal(next.dungeon.innHealAt, 1000);
  assert.equal(next.dungeon.resumeAutoHuntAfterRecovery, false);
  const result = dungeonStep(next.dungeon, { hp: 90, maxHp: 100, mp: 0, maxMp: 100, str: 20, dex: 15, attack: 10, defense: 0 }, 'tick', 1000);
  assert.equal(result.state.status, 'idle');
  assert.equal(result.state.autoHunt, false);
});

test('battle tutorial steps and completed prologue retain normal auto hunting', () => {
  for (const step of ['outskirts', 'first-battle', 'bandit-trial', 'completed', undefined]) {
    const original = make(step);
    assert.strictEqual(pauseHanyangTutorialBattle(original), original);
  }
});

test('idle town save with a stale recovery flag is cleaned once', () => {
  const original = make('medicine', 'idle');
  original.dungeon.autoHunt = false;
  const next = pauseHanyangTutorialBattle(original);
  assert.equal(next.dungeon.resumeAutoHuntAfterRecovery, false);
  assert.strictEqual(pauseHanyangTutorialBattle(next), next);
});
