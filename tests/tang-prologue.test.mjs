import test from 'node:test';
import assert from 'node:assert/strict';
import { actTangPrologue, normalizeTangPrologue } from '../app/tang-prologue.ts';
import { TANG_VILLAGE_NPCS } from '../app/tang-village-npcs.ts';

test('quest transitions are ordered and purchases cannot deduct twice', () => {
  let game = { gold: 20, inventory: [{ uid: 'existing' }], hanyangPrologueStep: 'guild' };
  assert.equal(actTangPrologue(game, 'buy'), game);
  game = actTangPrologue(game, 'talk');
  game = actTangPrologue(game, 'accept');
  const poor = { ...game, gold: 7 };
  assert.equal(actTangPrologue(poor, 'buy'), poor);
  game = actTangPrologue(game, 'buy');
  assert.equal(game.gold, 12);
  assert.equal(actTangPrologue(game, 'buy'), game);
  game = actTangPrologue(game, 'deliver');
  assert.equal(game.tangPrologue.step, 'p02-completed');
  assert.equal(game.tangPrologue.grainPouch, false);
  assert.equal(game.hanyangPrologueStep, 'guild');
  assert.deepEqual(game.inventory, [{ uid: 'existing' }]);
  assert.equal(actTangPrologue(game, 'deliver'), game);
});

test('all quest checkpoints survive JSON round trips; legacy and malformed states are safe', () => {
  let game = { gold: 20 };
  assert.equal(normalizeTangPrologue(undefined), undefined);
  for (const action of ['talk', 'accept', 'buy', 'deliver']) {
    game = actTangPrologue(game, action);
    assert.deepEqual(normalizeTangPrologue(JSON.parse(JSON.stringify(game)).tangPrologue), game.tangPrologue);
  }
  assert.equal(normalizeTangPrologue({ step: 'unknown', grainPouch: true }).step, 'not-started');
  assert.equal(normalizeTangPrologue({ step: 'p02-completed', grainPouch: true }).grainPouch, false);
});

test('seven independently positioned residents have unique identifiers and portrait slots', () => {
  assert.equal(TANG_VILLAGE_NPCS.length, 7);
  assert.equal(new Set(TANG_VILLAGE_NPCS.map(npc => npc.number)).size, 7);
  assert.equal(new Set(TANG_VILLAGE_NPCS.map(npc => npc.id)).size, 7);
  assert.equal(new Set(TANG_VILLAGE_NPCS.map(npc => `${npc.x}:${npc.y}`)).size, 7);
  assert.ok(TANG_VILLAGE_NPCS.every(npc => npc.x > 0 && npc.x < 100 && npc.y > 0 && npc.y < 100 && npc.line));
});
