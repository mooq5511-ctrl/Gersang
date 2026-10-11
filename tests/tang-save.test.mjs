import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require = createRequire(import.meta.url);
const { freshGame } = require('../app/game-hero-factory.ts');
const { actTangPrologue } = require('../app/tang-prologue.ts');
const { restoreGame, writeCharacterSave, readCharacterSave } = require('../app/game-profile-storage.ts');

test('real save writer and loader retain Tang checkpoints in the correct character slot', () => {
  const data = new Map();
  const storage = { setItem: (key, value) => data.set(key, value), getItem: key => data.get(key) ?? null };
  let game = { ...freshGame('唐測試'), gold: 20 };
  const legacy = freshGame('原角色');
  writeCharacterSave(storage, 1, legacy);
  const untouched = readCharacterSave(storage, 1);
  for (const action of ['talk', 'accept', 'buy', 'deliver']) {
    game = actTangPrologue(game, action);
    writeCharacterSave(storage, 0, game);
    const restored = restoreGame(JSON.parse(readCharacterSave(storage, 0)));
    assert.deepEqual(restored.tangPrologue, game.tangPrologue);
    assert.equal(restored.gold, game.gold);
    assert.deepEqual(restored.inventory, game.inventory);
    assert.equal(restored.hanyangPrologueStep, game.hanyangPrologueStep);
    assert.equal(readCharacterSave(storage, 1), untouched);
  }
  assert.equal(restoreGame(JSON.parse(untouched)).tangPrologue, undefined);
});
