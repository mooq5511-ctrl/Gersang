import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = file => readFileSync(new URL('../app/' + file, import.meta.url), 'utf8');

test('detail windows reuse accessible dialog triggers, titles, descriptions and close controls', () => {
  const dialog = source('game-detail-dialog.tsx');
  for (const component of ['DialogTrigger', 'DialogTitle', 'DialogDescription', 'DialogClose']) assert.match(dialog, new RegExp('<' + component));
  assert.match(dialog, /type="button"/);
  assert.match(dialog, /game-detail-body/);
});

test('ability allocation remains inside an on-demand dialog; skills use existing roster details', () => {
  const caravan = source('caravan-status.tsx');
  assert.match(caravan, /trigger="查看能力"><AbilityPanel hero=\{unit\} allocate=\{heroAllocate\}/);
  assert.match(caravan, /trigger="查看能力"><MercenaryStatusWindow/);
  for (const field of ['activeEffect', 'passiveEffect', 'cooldown', 'mp']) assert.ok(caravan.includes('spec.' + field) || caravan.includes('spec?.' + field));
  assert.match(caravan, /尚未提供獨立技能效果/);
});

test('quest dialog leaves the compact objective and map layout unchanged', () => {
  const game = source('game-v15.tsx');
  assert.match(game, /className="main-objective is-collapsed"/);
  assert.match(game, /data-objective-collapsed=\{true\}/);
  assert.match(game, /objectiveExpanded=\{false\}/);
  assert.match(game, /<Dialog open=\{objectiveExpanded\} onOpenChange=\{setObjectiveExpanded\}/);
  assert.match(game, /aria-label="查看任務詳情"/);
  assert.match(game, /setObjectiveExpanded\(false\);\s*if \(destination === "current"\) goToObjective\(\)/);
  const css = source('game-detail-dialog.css');
  assert.match(css, /max-height: calc\(100dvh - 24px\)/);
  assert.match(css, /overflow: auto/);
});
