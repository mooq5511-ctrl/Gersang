import test from 'node:test';
import assert from 'node:assert/strict';
import { ECOLOGY_MONSTERS } from '../app/monster-ecology.ts';
import { monsterDungeonKeys } from '../app/monster-ids.ts';
import { sourceEnemies, sourceEnemyForDungeonKey, sourceEnemyForMap } from '../app/v17-content.ts';

test('every playable monster has one stable dungeon ID and one combat stat source', () => {
  const playable = sourceEnemies.filter(enemy => enemy.dungeonId);
  assert.equal(playable.length, Object.keys(monsterDungeonKeys).length);
  assert.equal(new Set(playable.map(enemy => enemy.dungeonId)).size, playable.length);
  for (const enemy of playable) {
    const combat = ECOLOGY_MONSTERS[enemy.dungeonId];
    assert.equal(enemy.dungeonId, monsterDungeonKeys[enemy.name]);
    assert.equal(enemy.hp, combat.hp);
    assert.equal(enemy.mp, combat.mp);
    assert.equal(enemy.attack, combat.atk);
    assert.equal(enemy.xp, combat.xp);
    assert.equal(sourceEnemyForDungeonKey(enemy.dungeonId), enemy);
  }
});

test('legacy road-only monsters retain their own stats and have no dungeon ID', () => {
  const roadOnly = sourceEnemies.filter(enemy => !enemy.dungeonId);
  assert.equal(roadOnly.length, 8);
  assert.equal(roadOnly.find(enemy => enemy.name === '鹿').xp, 6);
  assert.equal(sourceEnemyForDungeonKey('e_raccoon'), undefined);
});

test('map selection and rewards use the same monster record', () => {
  const selected = sourceEnemyForMap('millennium-lake', 1, true, '狂風阿魯塔');
  assert.equal(selected.dungeonId, 'e_lake_gale_altur');
  assert.equal(sourceEnemyForDungeonKey(selected.dungeonId), selected);
  assert.ok(selected.drops.includes('天照的手套'));
});
