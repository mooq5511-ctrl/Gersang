import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sharedBattleExperience } from '../app/dungeon-kill-xp.ts';

const progressionSource = readFileSync(new URL('../app/game-progression.ts', import.meta.url), 'utf8');
const actionsSource = readFileSync(new URL('../app/game-battle-actions.ts', import.meta.url), 'utf8');

test('battle XP is divided across the party without losing the remainder', () => {
  const share = sharedBattleExperience(7, 11);
  assert.ok(share > 0);
  assert.ok(Math.abs(share * 11 - 7) < Number.EPSILON * 16);
  assert.equal(sharedBattleExperience(0, 11), 0);
  assert.equal(sharedBattleExperience(7, 0), 7);
  assert.match(actionsSource, /sharedBattleExperience\(result\.xpEarned, battleMembers\)/);
});

test('territory XP bonus preserves fractional battle shares on units', () => {
  const share = sharedBattleExperience(7, 11);
  const awarded = Array.from({ length: 11 }, () => share * (1 + 0.05)).reduce((sum, xp) => sum + xp, 0);
  assert.ok(Math.abs(awarded - 7.35) < 1e-12);
  assert.match(progressionSource, /return grantXp\(unit, amount \* \(1 \+ territoryBonus\(game\.territory, "xp"\)\)\)/);
});
