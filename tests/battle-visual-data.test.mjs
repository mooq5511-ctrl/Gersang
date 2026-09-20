import test from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE_MONSTER_ART, BATTLE_MONSTER_CROP, MONSTER_PLACEHOLDER, battleMonsterImage } from '../app/battle-visual-data.ts';

test('battle monster images are data-driven and fall back to the shared placeholder', () => {
  assert.equal(battleMonsterImage('狂風阿魯塔'), BATTLE_MONSTER_ART['狂風阿魯塔']);
  assert.equal(battleMonsterImage('不存在的怪物'), MONSTER_PLACEHOLDER);
  assert.equal(battleMonsterImage('不存在的怪物', 'e_white_tiger_fierce_tiger'), BATTLE_MONSTER_ART.e_white_tiger_fierce_tiger);
});

test('sprite-sheet crop metadata stays alongside the corresponding visual data', () => {
  assert.deepEqual(BATTLE_MONSTER_CROP['訓練的瘟神'], { size: '300% 100%', position: '50% 50%' });
  assert.ok(BATTLE_MONSTER_ART['訓練的瘟神']);
});
