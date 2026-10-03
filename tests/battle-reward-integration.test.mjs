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
const { runDungeonAction, selectBattleMapAction } = require('../app/game-battle-actions.ts');
const { serializeGameForStorage } = require('../app/game-state.ts');
const { battleExperienceMultiplier, sharedBattleExperience } = require('../app/dungeon-kill-xp.ts');
const { grantXp } = require('../app/game-progression.ts');
require.extensions['.tsx'] = require.extensions['.ts'];
const { applyGersangVisuals } = require('../app/game-save-normalizers.ts');

const deps = { addLog: (logs, text) => [text, ...logs], grantXp, enterInn: state => state, leaveInn: state => state };
const rolls = { roll: .99, choice: 0, spawnRoll: 0, encounterCountRoll: 0, retaliationRoll: .99, materialRolls: [1, 1, 1], gearDropRoll: 1, fusionCoreRoll: 1 };

test('every redesigned monster awards its registered trade goods once through the real action', () => {
  const { MONSTER_REDESIGN } = require('../data/monsters/monster-redesign.ts');
  const { freshDungeon } = require('../app/dungeon-engine.ts');
  for (const [key, design] of Object.entries(MONSTER_REDESIGN)) {
    let state = {
      hero: { ...makeUnit('hero'), hp: 1e12, maxHp: 1e12, vit: 1e10 }, mercs: [], restingMercs: [], active: [],
      territory: freshTerritory(), kills: 1, starterDeliveryKills: 0, gold: 0, newbieCoins: 0, fusionCores: 0,
      inventory: [], materials: {}, logs: [], battleLogs: [], npcProgress: { activeQuests: [], completedQuests: [] }, dungeon: freshDungeon(),
      hanyangPrologueStep: 'completed',
    };
    state = runDungeonAction(state, 'start', 1000, key, { ...rolls, materialRolls: [0, 0] }, deps);
    if (state.dungeon.status === 'fighting') {
      state = { ...state, dungeon: { ...state.dungeon, realtime: { ...state.dungeon.realtime, winner: 'player' } } };
      state = runDungeonAction(state, 'tick', 1100, key, { ...rolls, materialRolls: [0, 0] }, deps);
    }
    const won = state;
    for (const drop of design.materialDrops) assert.equal(won.materials[drop.item], 1, key);
    assert.equal(won.gold, design.gold, key);
    const retried = runDungeonAction(won, 'tick', 1150, key, { ...rolls, materialRolls: [0, 0] }, deps);
    assert.deepEqual(retried.materials, won.materials, `must not double-pay ${key}`);
    assert.equal(retried.gold, won.gold, key);
  }
});

test('the real game loop advances every boss countdown from 5 to 1 before respawning', () => {
  const { settleGameLoop } = require('../app/game-loop.ts');
  const { freshDungeon, DUNGEONS, isBossMonster } = require('../app/dungeon-engine.ts');
  const loopDeps = {
    ...deps, format: String, grantCreditXp: state => state,
    runDungeon: (state, action, now, key, tickRolls) => runDungeonAction(state, action, now, key, tickRolls, deps),
  };
  for (const [key, monster] of Object.entries(DUNGEONS).filter(([, monster]) => isBossMonster(monster.name))) {
    let state = {
      hero: { ...makeUnit('hero'), vit: 1e10, hp: 1e12, maxHp: 1e12 },
      mercs: [], restingMercs: [], active: [], territory: freshTerritory(),
      stage: 1, idleStamp: 1100, credit: 0, trade: { caravan: null },
      kills: 0, starterDeliveryKills: 0, logs: [], battleLogs: [], gold: 0, inventory: [], materials: {},
      npcProgress: { activeQuests: [], completedQuests: [] },
      dungeon: { ...freshDungeon(), autoHunt: true, lockedEnemyKey: key },
    };
    state = runDungeonAction(state, 'start', 1000, key, rolls, deps);
    state = { ...state, dungeon: { ...state.dungeon, realtime: { ...state.dungeon.realtime, winner: 'player' } } };
    state = settleGameLoop(state, { ...rolls, now: 1100 }, loopDeps);
    assert.equal(state.dungeon.spawnAt, 6100, monster.name);
    const kills = state.kills;
    const xp = state.hero.xp;
    const serial = state.dungeon.spawnSerial;
    const countdown = new Set([5]);
    for (let now = 1300; now < 6100; now += 200) {
      state = settleGameLoop(state, { ...rolls, now }, loopDeps);
      assert.equal(state.dungeon.status, 'respawning', monster.name);
      assert.equal(state.dungeon.stamp, now, monster.name);
      countdown.add(Math.ceil((state.dungeon.spawnAt - state.dungeon.stamp) / 1000));
      assert.equal(state.kills, kills, 'waiting must not repeat kill rewards');
      assert.equal(state.hero.xp, xp, 'waiting must not repeat battle XP');
      assert.equal(state.dungeon.spawnSerial, serial, 'waiting must not spawn early');
    }
    assert.deepEqual([...countdown], [5, 4, 3, 2, 1], monster.name);
    state = settleGameLoop(state, { ...rolls, now: 6100 }, loopDeps);
    assert.equal(state.dungeon.status, 'fighting', monster.name);
    assert.equal(state.dungeon.spawnSerial, serial + 1, monster.name);
  }
});

test('the first story victory always has a sellable material even when both drop rolls miss', () => {
  const { freshDungeon } = require('../app/dungeon-engine.ts');
  let state = {
    hero: { ...makeUnit('hero'), str: 100, hp: 5000, maxHp: 5000 }, mercs: [], restingMercs: [], active: [],
    territory: freshTerritory(), kills: 0, starterDeliveryKills: 0, gold: 0, newbieCoins: 0, inventory: [], materials: {}, logs: [], battleLogs: [],
    npcProgress: { activeQuests: ['npc-first-caravan-delivery'], completedQuests: [] }, dungeon: freshDungeon(), hanyangPrologueStep: 'outskirts',
  };
  state = runDungeonAction(state, 'start', 1000, 'e_starter_raccoon', rolls, deps);
  for (let now = 1200; now < 10000 && !state.kills; now += 200) state = runDungeonAction(state, 'tick', now, undefined, rolls, deps);
  assert.equal(state.materials['碎穀袋'], 1);
  assert.equal(state.materials['古錢箱'], 1);
  assert.equal(state.starterDeliveryKills, 1);
});

test('legacy selected names migrate by stable target ID without resetting the fight or roster', () => {
  const original = { hero: { ...makeUnit('hero'), nation: 'korea', gender: 'male' }, mercs: [], restingMercs: [], inventory: [] };
  const normalized = applyGersangVisuals(original);
  const dungeon = { key: 'e_white_tiger_soul_eater', lockedEnemyKey: 'e_white_tiger_soul_eater', status: 'fighting', stamp: 1000 };
  const migrated = applyGersangVisuals({ ...normalized, dungeon, selectedMonster: '食魂獸' });
  assert.equal(migrated.selectedMonster, '食骨山魈');
  assert.strictEqual(migrated.dungeon, dungeon);
  assert.strictEqual(migrated.hero, normalized.hero);
  assert.strictEqual(applyGersangVisuals(migrated), migrated);
});

test('bandit chief starts at Lv.1 without delivery, waystation, or green equipment', () => {
  const { freshDungeon } = require('../app/dungeon-engine.ts');
  const state = {
    hero: { ...makeUnit('hero'), vit: 500, hp: 5000, maxHp: 5000 }, mercs: [], restingMercs: [], active: [], territory: freshTerritory(),
    kills: 0, starterDeliveryKills: 0, logs: [], battleLogs: [], gold: 0, inventory: [], materials: {},
    npcProgress: { activeQuests: [], completedQuests: [] }, firstGreenEquipped: false,
    newbieBossDefeated: false, dungeon: freshDungeon(),
  };
  const started = runDungeonAction(state, 'start', 1000, 'e_starter_pirate_king', rolls, deps);
  assert.equal(started.dungeon.key, 'e_starter_pirate_king');
  assert.equal(started.dungeon.status, 'fighting');
  assert.equal(started.hero.level, 1);
  assert.equal(started.firstGreenEquipped, false);
  assert.equal(started.territory.buildings.waystation, 0);
  const messages = [];
  const mapDeps = { notify: message => messages.push(message), enemyMax: () => 100, addLog: deps.addLog };
  assert.strictEqual(selectBattleMapAction(started, 'millennium-lake', mapDeps), started);
  assert.match(messages[0], /擊敗山賊首領/);
  const unlocked = selectBattleMapAction({ ...started, newbieBossDefeated: true }, 'millennium-lake', mapDeps);
  assert.equal(unlocked.battleMap, 'millennium-lake');
});

test('all world bosses start without level, delivery, waystation, or equipment prerequisites', () => {
  const { freshDungeon, DUNGEONS, isBossMonster } = require('../app/dungeon-engine.ts');
  const bosses = Object.entries(DUNGEONS).filter(([, monster]) => isBossMonster(monster.name));
  assert.ok(bosses.length >= 8);
  for (const [key, monster] of bosses) {
    const state = {
      hero: { ...makeUnit('hero'), vit: 1e10, hp: 1e12, maxHp: 1e12 },
      mercs: [], restingMercs: [], active: [], territory: freshTerritory(),
      kills: 0, starterDeliveryKills: 0, logs: [], battleLogs: [], gold: 0, inventory: [], materials: {},
      npcProgress: { activeQuests: [], completedQuests: [] }, firstGreenEquipped: false,
      dungeon: { ...freshDungeon(), lockedEnemyKey: key },
    };
    const started = runDungeonAction(state, 'start', 1000, key, rolls, deps);
    assert.equal(started.dungeon.key, key, monster.name);
    assert.equal(started.dungeon.status, 'fighting', monster.name);
    assert.equal(started.hero.level, 1);
  }
});

test('continuous world hunting survives victories and ends permanently on defeat', () => {
  const { freshDungeon } = require('../app/dungeon-engine.ts');
  const makeState = hero => ({
    hero, mercs: [], active: [], territory: freshTerritory(), kills: 0, starterDeliveryKills: 0,
    logs: [], battleLogs: [], gold: 0, inventory: [], materials: {},
    npcProgress: { activeQuests: [] }, dungeon: { ...freshDungeon(), autoHunt: true },
  });
  let winner = makeState({ ...makeUnit('hero'), str: 500, vit: 500, hp: 5000, maxHp: 5000 });
  winner = runDungeonAction(winner, 'start', 1000, 'e_starter_raccoon', rolls, deps);
  let now = 1000;
  for (; now < 20000 && winner.kills < 3; now += 200) winner = runDungeonAction(winner, 'tick', now, undefined, rolls, deps);
  assert(winner.kills >= 3, 'victory should automatically spawn more monsters');
  assert.equal(winner.dungeon.autoHunt, true);

  let loser = makeState({ ...makeUnit('hero'), hp: 1 });
  loser = runDungeonAction(loser, 'start', 1000, 'e_white_tiger_fierce_tiger', rolls, deps);
  for (now = 1200; now < 30000 && loser.dungeon.status !== 'recovering'; now += 200) loser = runDungeonAction(loser, 'tick', now, undefined, rolls, deps);
  assert.equal(loser.dungeon.status, 'recovering');
  assert.equal(loser.dungeon.autoHunt, false);
  assert.equal(loser.dungeon.resumeAutoHuntAfterRecovery, false);
  for (; now < 90000 && loser.dungeon.status === 'recovering'; now += 2000) loser = runDungeonAction(loser, 'tick', now, undefined, rolls, deps);
  assert.equal(loser.dungeon.status, 'idle', 'healing must not restart defeated hunting');
});

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
    const { DUNGEONS } = require('../app/dungeon-engine.ts');
    const expected = sharedBattleExperience(DUNGEONS.e_starter_raccoon.xp * battleExperienceMultiplier(1, members - 1), members);
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
