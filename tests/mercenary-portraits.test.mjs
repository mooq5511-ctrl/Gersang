import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { mercenaryCardArt } = require('../app/mercenary-portrait-art.ts');
const { merchantMercenaries } = require('../app/mercenary-roster.ts');
const { gersangUnitArt } = require('../app/gersang-visuals.ts');
test('all 19 mercenaries have optimized portraits without changing their battle sprites', () => {
  assert.equal(merchantMercenaries.length, 19);
  for (const spec of merchantMercenaries) {
    const unit = { templateId: 'merchant-' + spec.id, image: gersangUnitArt('merchant-' + spec.id, spec.name) };
    const original = unit.image;
    const portrait = mercenaryCardArt(unit);
    assert.equal(portrait, `/assets/mercenary-portraits/semireal-v1/${spec.id}.jpg`);
    assert.ok(existsSync(new URL('../public' + portrait, import.meta.url)));
    assert.equal(unit.image, original);
    assert.notEqual(portrait, original);
  }
});
test('legacy portraits resolve without migration; heroes, generals and unknown units keep originals', () => {
  assert.match(mercenaryCardArt({ image: '/game-assets/cute-merc-spear-0.png' }), /spear\.jpg$/);
  assert.match(mercenaryCardArt({ templateId: 'merchant-shield', image: '/old.png' }), /shield\.jpg$/);
  for (const unit of [{ uid: 'hero', image: '/game-assets/cute-merc-spear-0.png' }, { templateId: 'general-mulan', image: '/game-assets/cute-merc-spear-0.png' }, { templateId: 'unknown', image: '/game-assets/cute-merc-spear-0.png' }, { image: '/unknown.png' }]) assert.equal(mercenaryCardArt(unit), undefined);
});
test('recruitment, squad and relic avatars use display-only portraits; real battle still uses unit images', () => {
  for (const file of ['mercenary-recruitment.tsx', 'caravan-status.tsx', 'relic-dungeon.tsx']) assert.match(readFileSync(new URL('../app/' + file, import.meta.url), 'utf8'), /<MercenaryPortrait/);
  const battle = readFileSync(new URL('../app/battle-arena.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(battle, /mercenaryCardArt|MercenaryPortrait/);
  assert.match(battle, /image=\{member\.image\}/);
});
