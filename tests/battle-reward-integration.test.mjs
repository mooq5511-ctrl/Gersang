import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Execute the real action and its dependencies, rather than matching source strings.
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText, filename);
};
const { HERO_INITIAL_ATTRIBUTES } = require('../app/hero-rules.ts');
const { emptyEquipmentSlots } = require('../app/equipment-slots.ts');
const { freshTerritory } = require('../app/guild-territory.ts');
const makeUnit = uid => ({ ...HERO_INITIAL_ATTRIBUTES, uid, name: uid, level: 1, xp: 0, points: 0, hp: 100, maxHp: 100, mp: 100, maxMp: 100, status: '正常', position: '前排', equip: emptyEquipmentSlots() });
const { runDungeonAction } = require('../app/game-battle-actions.ts');
const { serializeGameForStorage } = require('../app/game-state.ts');
const { battleExperienceMultiplier, sharedBattleExperience } = require('../app/dungeon-kill-xp.ts');
const { grantXp } = require('../app/game-progression.ts');
require.extensions['.tsx'] = require.extensions['.ts'];
const { applyGersangVisuals } = require('../app/game-save-normalizers.ts');

const deps = { addLog: (logs, text) => [text, ...logs], grantXp, enterInn: state => state, leaveInn: state => state };
const rolls = { roll: .99, choice: 0, spawnRoll: 0, encounterCountRoll: 0, retaliationRoll: .99, materialRolls: [1, 1, 1], gearDropRoll: 1, fusionCoreRoll: 1 };

test('visual normalization preserves already-normalized roster and equipment references', () => {
  const hero = { ...makeUnit('hero'), nation: 'korea', gender: 'male' };
  const merc = { ...makeUnit('merc'), templateId: 'merchant-spear', name: '朝鮮槍兵' };
  const original = { hero, mercs: [merc], restingMercs: [], inventory: [] };
  const normalized = applyGersangVisuals(original);
  assert.strictEqual(applyGersangVisuals(normalized), normalized);
  const damaged = { ...normalized, hero: { ...normalized.hero, hp: 50 } };
  const refreshed = applyGersangVisuals(damaged);
  assert.strictEqual(refreshed, damaged);
  assert.strictEqual(refreshed.hero.equip, normalized.hero.equip);
  assert.strictEqual(refreshed.mercs, normalized.mercs);
  assert.equal(original.hero.hp, 100);
});

test('NPC dialog renders outside the tab stacking context and remains safe during server rendering', () => {
  const source = readFileSync(new URL('../app/npc-dialogue-panel.tsx', import.meta.url), 'utf8');
  assert.match(source, /import \{ createPortal \} from "react-dom"/);
  assert.match(source, /if \(typeof document === "undefined"\) return null/);
  assert.match(source, /return createPortal\([\s\S]*document\.body/);
});

test('informational onboarding guide cannot intercept navigation clicks', () => {
  const css = readFileSync(new URL('../app/classic-map-interface.css', import.meta.url), 'utf8');
  assert.match(css, /\.classic-live-game \.village-onboarding-buddy\s*\{\s*pointer-events:none/);
});

for (const [members, tickMs] of [[1, 50], [2, 50], [1, 200], [2, 200]]) {
  test(`one real victory credits kills and XP once for ${members} deployed members at ${tickMs}ms and survives storage`, () => {
    let state = { hero: makeUnit('hero'), mercs: [], active: [], territory: freshTerritory(), kills: 0, starterDeliveryKills: 0, logs: [], battleLogs: [], gold: 0, inventory: [], materials: {}, npcProgress: { activeQuests: ['npc-first-caravan-delivery'] } };
    if (members === 2) {
      const merc = makeUnit('test-merc');
      state.mercs = [merc];
      state.active = [merc.uid];
    }
    const original = structuredClone(state);
    state = runDungeonAction(state, 'start', 1000, 'e_starter_raccoon', rolls, deps);
    let now = 1000;
    for (; now < 10000 && state.kills === 0; now += tickMs) state = runDungeonAction(state, 'tick', now, undefined, rolls, deps);
    assert.equal(state.kills, 1, 'one defeated monster must not count twice');
    assert.equal(state.starterDeliveryKills, 1);
    const expected = sharedBattleExperience(7 * battleExperienceMultiplier(1, members - 1), members);
    assert.equal(state.hero.xp, original.hero.xp + expected);
    if (members === 2) assert.equal(state.mercs[0].xp, original.mercs[0].xp + expected);
    assert.equal(state.logs.filter(text => text.startsWith('擊敗 1 隻怪物，')).length, 1);
    const saved = JSON.parse(serializeGameForStorage(state));
    assert.equal(saved.kills, 1);
    assert.equal(saved.hero.xp, expected);
    const settled = runDungeonAction(state, 'tick', now + 50, undefined, rolls, deps);
    assert.equal(settled.kills, 1, 'idle tick must not re-credit the victory');
    assert.equal(settled.hero.xp, expected);
  });
}
