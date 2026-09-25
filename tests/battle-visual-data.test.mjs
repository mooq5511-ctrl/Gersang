import test from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE_MONSTER_ART, BATTLE_MONSTER_CROP, MONSTER_PLACEHOLDER, battleMonsterImage } from '../app/battle-visual-data.ts';

test('battle monster images are data-driven and fall back to the shared placeholder', () => {
  assert.equal(battleMonsterImage('狂風阿魯塔'), BATTLE_MONSTER_ART['狂風阿魯塔']);
  assert.equal(battleMonsterImage('不存在的怪物'), MONSTER_PLACEHOLDER);
  assert.equal(battleMonsterImage('不存在的怪物', 'e_white_tiger_fierce_tiger'), BATTLE_MONSTER_ART.e_white_tiger_fierce_tiger);
});

test('sprite-sheet crop metadata stays alongside the corresponding visual data', () => {
  assert.deepEqual(BATTLE_MONSTER_CROP['多聞天王'], { size: '260% 205%', position: '42% 100%' });
  assert.ok(BATTLE_MONSTER_ART['多聞天王']);
});

test('Sumeru keeps artwork only for bosses while regular monsters use the placeholder', () => {
  assert.equal(battleMonsterImage('訓練的瘟神', 'e_sumeru_training_plague_god'), MONSTER_PLACEHOLDER);
  assert.equal(battleMonsterImage('神獸玄武', 'e_sumeru_black_tortoise'), MONSTER_PLACEHOLDER);
  assert.equal(battleMonsterImage('多聞天王', 'e_sumeru_vaisravana'), BATTLE_MONSTER_ART['多聞天王']);
  assert.equal(battleMonsterImage('廣目天王', 'e_sumeru_virupaksa'), BATTLE_MONSTER_ART['廣目天王']);
});
