import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file,
}).outputText, file);
const { MONSTER_REDESIGN } = require('../data/monsters/monster-redesign.ts');
const { WORLD_MONSTER_PROGRESSION, WORLD_ENTRY_MONSTERS } = require('../data/monsters/world-progression.ts');
const { selectBattleMapAction } = require('../app/game-battle-actions.ts');
const { dungeonStep, freshDungeon } = require('../app/dungeon-engine.ts');
const { vitalStats, combatStats } = require('../app/vitals-engine.ts');
const { equipmentAtTier, EQUIPMENT_TIER_LEVELS, makeTierEquipment } = require('../app/tier-equipment.ts');
const { mercenarySpec } = require('../app/mercenary-roster.ts');
const { getMercenaryStats } = require('../app/mercenary-growth-v1.ts');

test('eight real maps have bounded levels and all three encounter tiers', () => {
  assert.equal(Object.keys(WORLD_MONSTER_PROGRESSION).length, 8);
  for (const [map, band] of Object.entries(WORLD_MONSTER_PROGRESSION)) {
    const entries = Object.values(MONSTER_REDESIGN).filter(m => m.region === map);
    assert.deepEqual(new Set(entries.map(m => m.encounterTier)), new Set(['入口怪', '主力怪', '菁英']));
    assert.ok(entries.every(m => m.level >= band.min && m.level <= band.max));
    assert.equal(MONSTER_REDESIGN[WORLD_ENTRY_MONSTERS[map]].encounterTier, '入口怪');
  }
});

test('travel always selects and locks an entry monster from the destination without touching vitals', () => {
  const state = { stage: 50, newbieBossDefeated: true, lakeBossDefeated: true, goldenStarfishDefeated: true,
    hero: { hp: 51, mp: 7 }, mercs: [{ uid: 'companion', hp: 12 }], dungeon: freshDungeon(), logs: [] };
  const deps = { notify: () => {}, enemyMax: () => 100, addLog: (logs, text) => [...logs, text] };
  for (const [map, id] of Object.entries(WORLD_ENTRY_MONSTERS)) {
    const moved = selectBattleMapAction(state, map, deps);
    assert.equal(moved.dungeon.key, id); assert.equal(moved.dungeon.lockedEnemyKey, id);
    assert.equal(moved.hero, state.hero); assert.equal(moved.mercs, state.mercs);
    const healing = { ...state, dungeon: { ...state.dungeon, status: 'recovering' } };
    assert.equal(selectBattleMapAction(healing, map, deps), healing);
  }
});

// Lv.36+: hero (rear) + three same-level, fully unlocked promoted spearmen (front).
// Lv.1–35 retains the original ordinary roster to protect the established onboarding balance.
// Tests drive the real dungeon engine, including defense, formation and enemy targeting.
export function referenceParty(level, upgrade = false, size = 4, mixed = false, rankOverride) {
  const tier = [...EQUIPMENT_TIER_LEVELS].reverse().find(l => l <= level);
  const templates = level < 36 ? ['hero', 'merchant-shield', 'merchant-archer', 'merchant-shaman'] :
    Array.from({ length: size }, (_, i) => i === 0 ? 'hero' : mixed && i > 3 ? 'merchant-promotion-bow' : 'merchant-spear');
  return templates.map((templateId, i) => {
    const spec = mercenarySpec(templateId);
    const equip = Object.fromEntries(equipmentAtTier(tier).map(e => [e.slot, makeTierEquipment(e, e.id, 'benchmark')]));
    if (upgrade) for (const e of Object.values(equip)) { e.atk *= 1.5; e.def *= 1.5; e.hp *= 1.5; }
    const unit = { templateId, level, str: spec?.ratings[1] ?? 20, agi: 15, vit: spec?.ratings[0] ?? 20,
      intel: 10, maxHp: 100 + (level - 1) * 20, equip,
      promotionStage: rankOverride ?? getMercenaryStats(level).stage };
    const v = vitalStats(unit), c = combatStats(unit);
    return { uid: i ? 'companion-' + i : 'hero', templateId, name: templateId,
      hp: v.maxHp, maxHp: v.maxHp, mp: v.maxMp, maxMp: v.maxMp,
      position: level < 36 ? (i < 2 ? '前排' : '後排') : i && templateId === 'merchant-spear' ? '前排' : '後排',
      attack: c.attack, defense: c.defense, accuracy: c.accuracy, attackInterval: 2.2 - c.speed / 100 };
  });
}
export function benchmark(id, upgrade = false, countRoll = .5, options = {}) {
  const design = MONSTER_REDESIGN[id], level = options.level ?? design.level;
  const party = referenceParty(level, upgrade, options.size ?? 4, options.mixed ?? false, options.rank);
  const autoSkill = options.autoSkill ?? level >= 36;
  const h = party[0], hero = { ...h, str: 20, dex: 15, attack: h.attack, defense: h.defense, mercenaryIntelligence: 0 };
  const start = options.start ?? 1000;
  let result = dungeonStep(freshDungeon(), hero, 'start', start, id, .99, 0, 0, .99, party, 0, [1, 1], autoSkill, countRoll);
  let now = start;
  while (result.state.status === 'fighting' && now < start + 120000) {
    now += 50;
    result = dungeonStep(result.state, { ...hero, hp: result.hp, mp: result.mp }, 'tick', now, id, .99, 0, 0, .99, result.party, 0, [1, 1], autoSkill, countRoll);
  }
  return { id, tier: design.encounterTier, seconds: (now - start) / 1000, won: !!result.reward,
    remaining: result.party.reduce((sum, p) => sum + p.hp, 0) / party.reduce((sum, p) => sum + p.maxHp, 0) };
}
test('four-member parties with appropriate promotion ranks can farm entry encounters; better equipment helps', () => {
  for (const id of Object.values(WORLD_ENTRY_MONSTERS)) {
    const base = benchmark(id), better = benchmark(id, true);
    assert.ok(base.won, JSON.stringify(base));
    assert.ok(base.seconds < 30, JSON.stringify(base));
    assert.ok(better.won && better.seconds <= base.seconds && better.remaining >= base.remaining, JSON.stringify({ base, better }));
  }
});
test('same-level promoted parties with skills meet entry/main/elite pacing targets', () => {
  const targets = { 入口怪: [5, 8.5], 主力怪: [8, 15], 菁英: [15, 25] };
  for (const [id, monster] of Object.entries(MONSTER_REDESIGN)) {
    if (!WORLD_MONSTER_PROGRESSION[monster.region] || ['e_starter_raccoon', 'e_starter_wako', 'e_starter_black_bandit'].includes(id)) continue;
    const result = benchmark(id), [min, max] = targets[monster.encounterTier];
    assert.ok(result.won && result.seconds >= min && result.seconds <= max, JSON.stringify(result));
  }
});
test('the Lv.250 benchmark uses actual stage-eight stats, not a Lv.1 recruit polynomial', () => {
  const stats = getMercenaryStats(250), party = referenceParty(250);
  assert.equal(stats.hp, 4096631); assert.equal(stats.atk, 438170); assert.equal(stats.def, 183236);
  assert.ok(party[1].maxHp >= stats.hp && party[1].attack >= stats.atk && party[1].defense >= stats.def);
  const monster = MONSTER_REDESIGN.e_shambhala_scribe;
  assert.ok(monster.hp > 3000000 && monster.atk > 400000);
  assert.ok(monster.hp > party.slice(1).reduce((sum, member) => sum + member.attack * 1.4 * 1.2, 0));
  const won = benchmark('e_shambhala_scribe');
  assert.ok(won.won && won.seconds >= 15 && won.seconds <= 25 && won.remaining < .9, JSON.stringify(won));
});
test('high-level maps survive multiple seeds and mixed promoted spear/bow formations at four, six and twelve members', () => {
  const ids = ['e_white_tiger_trainer', 'e_snow', 'e_taj_assassin', 'e_sumeru_white_tiger', 'e_shambhala_scribe'];
  for (const id of ids) for (const size of [4, 6, 12]) for (const seed of [1, 98765, 524288]) {
    const result = benchmark(id, false, size === 4 ? .5 : .999, { size, mixed: true, start: seed });
    assert.ok(result.won && result.seconds > 1 && result.seconds < 60, JSON.stringify({ size, seed, ...result }));
    assert.ok(result.remaining > .15 && result.remaining < .98, JSON.stringify({ size, seed, ...result }));
  }
});
test('promotion rank matters: an underpromoted endgame party cannot farm the Lv.250 elite', () => {
  const capped = benchmark('e_shambhala_scribe', false, .5, { rank: 1 });
  assert.equal(capped.won, false);
  assert.ok(capped.seconds < 120, JSON.stringify(capped));
});
test('unlocking the next promotion is a real improvement against a fixed monster, not dynamic enemy scaling', () => {
  const id = 'e_sumeru_training_plague_god', hp = MONSTER_REDESIGN[id].hp;
  const before = benchmark(id, false, .5, { level: 161, rank: 6 });
  const after = benchmark(id, false, .5, { level: 162, rank: 7 });
  assert.ok(before.won && after.won && after.seconds < before.seconds, JSON.stringify({ before, after }));
  assert.equal(MONSTER_REDESIGN[id].hp, hp);
});
test('full normal forest parties do not receive the old double-stat penalty', () => {
  const key = 'e_white_tiger_spider', party = referenceParty(55);
  while (party.length < 12) party.push({ ...party[1], uid: 'companion-' + party.length });
  const h = party[0];
  const result = dungeonStep(freshDungeon(), { ...h, str: 20, dex: 15, attack: h.attack, mercenaryIntelligence: 0 }, 'start', 1000, key, .99, 0, 0, .99, party);
  assert.equal(result.state.realtime.enemies[0].maxHp, MONSTER_REDESIGN[key].hp);
  assert.equal(result.state.realtime.enemies[0].atk, MONSTER_REDESIGN[key].atk);
});
