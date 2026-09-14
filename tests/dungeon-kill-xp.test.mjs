import test from 'node:test';
import assert from 'node:assert/strict';
import { newlyDefeatedExperience } from '../app/dungeon-kill-xp.ts';

test('each newly defeated monster grants exactly one monster of XP', () => {
  const first = newlyDefeatedExperience(0, [0, 16, 16], 9);
  assert.deepEqual(first, { creditedKills: 1, kills: 1, xp: 9 });
  const second = newlyDefeatedExperience(first.creditedKills, [0, 0, 16], 9);
  assert.deepEqual(second, { creditedKills: 2, kills: 1, xp: 9 });
  assert.deepEqual(newlyDefeatedExperience(second.creditedKills, [0, 0, 16], 9), { creditedKills: 2, kills: 0, xp: 0 });
});

test('defeats survive a later party loss and never repay on reload', () => {
  const lost = newlyDefeatedExperience(0, [0, 0, 16], 7);
  assert.equal(lost.xp, 14);
  assert.equal(newlyDefeatedExperience(lost.creditedKills, [0, 0, 16], 7).xp, 0);
  assert.equal(newlyDefeatedExperience(0, [16, 16, 16], 7).xp, 0);
});

test('full-party victory grants exactly the enemy count, including a boss', () => {
  assert.equal(newlyDefeatedExperience(0, [0, 0, 0], 7).xp, 21);
  assert.equal(newlyDefeatedExperience(0, [0], 30_000).xp, 30_000);
});
