import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURE_QUESTS, dailyQuests, normalizeQuestLedger, questDay, questAvailability, questValue, syncQuestProgress, claimAdventureQuest } from '../app/adventure-quests.ts';
import { serializeGameForStorage } from '../app/game-state.ts';
const now = Date.parse('2026-09-30T12:00:00+08:00');
const equipment = (uid) => ({ uid, rarity: '普通' });
const state = (overrides = {}) => ({
  hero: { uid: 'hero', level: 1, xp: 0, equip: {} }, mercs: [], restingMercs: [], materials: {}, inventory: [],
  gold: 0, fusionCores: 0, logs: [], kills: 0, trade: { trips: 0, totalProfit: 0 },
  relicDungeon: { clearedRuns: 0, materialsFound: 0, equipmentFound: 0, relicShards: 0 },
  territory: { buildings: { waystation: 0 } }, hanyangPrologueStep: 'completed',
  questLedger: normalizeQuestLedger(undefined, now, 1), ...overrides,
});
const grantXp = (hero, xp) => ({ ...hero, xp: hero.xp + xp });

test('all 25 ten-level bands cover 1–250 with six missions and valid dependencies', () => {
  assert.equal(ADVENTURE_QUESTS.length, 150);
  assert.equal(new Set(ADVENTURE_QUESTS.map(quest => quest.id)).size, 150);
  for (let level = 1; level <= 250; level++) assert.equal(ADVENTURE_QUESTS.filter(quest => level >= quest.minLevel && level <= quest.maxLevel).length, 6);
  for (const quest of ADVENTURE_QUESTS) {
    assert.ok(quest.conditions.length > 0);
    assert.ok(quest.reward.gold > 0 && quest.reward.xp > 0);
    for (const id of quest.prerequisites) assert.ok(ADVENTURE_QUESTS.find(item => item.id === id));
  }
  for (const level of [1, 50, 100, 150, 200, 250]) assert.equal(dailyQuests(level).length, 5);
});

test('every chapter can be completed through authoritative metrics with exact, single-use rewards', () => {
  let game = state({ hero: { uid: 'hero', level: 250, xp: 0, equip: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, equipment(`hero-${i}`)])) }, kills: 1_000_000, trade: { trips: 1_000, totalProfit: 0, cargoLevel: 20 }, territory: { buildings: { waystation: 5, training: 5 } }, newbieBossDefeated: true, lakeBossDefeated: true, goldenStarfishDefeated: true, relicDungeon: { clearedRuns: 100, materialsFound: 1, relicShards: 0, equipmentFound: 0 }, mercs: Array.from({ length: 8 }, (_, i) => ({ uid: `merc-${i}`, level: 250, equip: { weapon: equipment(`merc-gear-${i}`), armor: equipment(`merc-armor-${i}`) } })) });
  const before = structuredClone(game);
  for (const quest of ADVENTURE_QUESTS) {
    const claimed = claimAdventureQuest(game, quest.id, now, grantXp);
    assert.notEqual(claimed, game, quest.id);
    assert.equal(claimed.gold - game.gold, quest.reward.gold);
    assert.equal(claimed.hero.xp - game.hero.xp, quest.reward.xp);
    assert.equal(claimed.fusionCores - game.fusionCores, quest.reward.cores);
    assert.equal(claimAdventureQuest(claimed, quest.id, now, grantXp), claimed);
    game = syncQuestProgress(game, claimed, now);
    assert.ok(game.questLedger.claimed.includes(quest.id), 'central update must preserve newly claimed IDs');
  }
  assert.equal(game.questLedger.claimed.length, 150);
  assert.equal(game.fusionCores, 15);
  assert.equal(before.questLedger.claimed.length, 0);
});

test('level locks, feature locks, prerequisites, and objectives prevent premature claims', () => {
  const game = state();
  for (const id of ['unknown', 'journey-250-growth', 'journey-10-chapter', 'journey-10-hunt', 'daily-hunt']) assert.equal(claimAdventureQuest(game, id, now, grantXp), game);
  const quest = ADVENTURE_QUESTS.find(item => item.id === 'journey-10-trade');
  const locked = state({ hanyangPrologueStep: 'arrival', trade: { trips: 10 }, hero: { level: 10, equip: {} } });
  assert.equal(questAvailability(locked, quest, locked.questLedger).unlocked, false);
  const growth = ADVENTURE_QUESTS.find(item => item.id === 'journey-10-growth');
  assert.equal(questAvailability(locked, growth, locked.questLedger).unlocked, false, 'series navigation cannot skip the prologue');
});

test('daily progress tracks positive changes, survives spending, ignores equipment moves, and is capped', () => {
  const old = state({ hero: { level: 20, equip: {} }, questLedger: normalizeQuestLedger(undefined, now, 20), inventory: [equipment('owned')] });
  const next = syncQuestProgress(old, { ...old, kills: 5, trade: { trips: 1 }, materials: { 肉類: 3 }, hero: { level: 20, equip: { weapon: equipment('owned') } }, inventory: [equipment('new')] }, now);
  assert.deepEqual(next.questLedger.daily.counts, { kills: 5, trips: 1, relic: 0, materials: 3, newEquipment: 1 });
  const spent = syncQuestProgress(next, { ...next, materials: {} }, now);
  assert.equal(spent.questLedger.daily.counts.materials, 3);
  const filled = syncQuestProgress(spent, { ...spent, kills: 100_000, materials: { 肉類: 100_000 } }, now);
  assert.equal(filled.questLedger.daily.counts.kills, dailyQuests(20)[0].conditions[0].target);
  assert.equal(filled.questLedger.daily.counts.materials, dailyQuests(20)[3].conditions[0].target);
});

test('Taiwan midnight resets daily claims and counters but retains permanent completion', () => {
  const beforeMidnight = Date.parse('2026-09-30T23:59:59+08:00');
  const midnight = beforeMidnight + 1000;
  assert.equal(questDay(midnight), '2026-10-01');
  const game = state({ hero: { level: 100, equip: {} }, questLedger: normalizeQuestLedger({ claimed: ['journey-10-growth'], daily: { day: '2026-09-30', level: 20, claimed: ['daily-hunt'], counts: { kills: 14 } } }, beforeMidnight, 100) });
  const reset = syncQuestProgress(game, { ...game, kills: 500 }, midnight);
  assert.deepEqual(reset.questLedger.claimed, ['journey-10-growth']);
  assert.deepEqual(reset.questLedger.daily.claimed, []);
  assert.equal(reset.questLedger.daily.counts.kills, 0, 'do not assign an un-timestamped offline batch to today');
  assert.equal(reset.questLedger.daily.level, 100);
  assert.equal(normalizeQuestLedger(game.questLedger, now - 86400000, 100).daily.claimed[0], 'daily-hunt');
});

test('daily claim is single-use, rejects stale yesterday progress, and freezes reward tier until reset', () => {
  const game = state({ hero: { level: 20, xp: 0, equip: {} }, questLedger: normalizeQuestLedger(undefined, now, 20) });
  game.questLedger.daily.counts.kills = 14;
  const claimed = claimAdventureQuest(game, 'daily-hunt', now, grantXp);
  assert.equal(claimed.gold, dailyQuests(20)[0].reward.gold);
  assert.equal(claimAdventureQuest(claimed, 'daily-hunt', now, grantXp), claimed);
  assert.equal(claimAdventureQuest(game, 'daily-hunt', now + 86400000, grantXp), game);
  const leveled = syncQuestProgress(claimed, { ...claimed, hero: { ...claimed.hero, level: 100 } }, now);
  assert.equal(leveled.questLedger.daily.level, 20);
});

test('legacy/corrupt storage is normalized and reload does not reset claims', () => {
  const ledger = normalizeQuestLedger({ claimed: ['journey-10-growth', 'journey-10-growth', 'fake'], daily: { day: '2026-09-30', level: 20, claimed: ['daily-hunt', 'fake'], counts: { kills: -99, materials: 'NaN' } } }, now, 1);
  assert.deepEqual(ledger.claimed, ['journey-10-growth']);
  assert.equal(ledger.daily.counts.kills, 0);
  assert.equal(ledger.daily.counts.materials, 0);
  assert.deepEqual(normalizeQuestLedger(JSON.parse(JSON.stringify(ledger)), now, 1), ledger);
  assert.deepEqual(normalizeQuestLedger(undefined, now).claimed, []);
  const quest = dailyQuests(20)[0];
  assert.equal(questValue(state(), quest.conditions[0], ledger, true), 0);
  const saved = JSON.parse(serializeGameForStorage(state({ questLedger: ledger })));
  assert.deepEqual(normalizeQuestLedger(saved.questLedger, now, 1), ledger);
});

test('unchanged realtime ticks retain ledger identity and avoid allocating a new game state', () => {
  const game = state();
  assert.equal(syncQuestProgress(game, game, now), game);
  const hpTick = { ...game, hero: { ...game.hero, hp: 98 }, mercs: game.mercs.map(unit => ({ ...unit, hp: 80 })) };
  assert.equal(syncQuestProgress(game, hpTick, now), hpTick);
  assert.equal(hpTick.questLedger, game.questLedger);
});

test('all five daily activities grant the advertised reward exactly once through central updates', () => {
  let game = state({ hero: { level: 250, xp: 0, equip: {} }, questLedger: normalizeQuestLedger(undefined, now, 250) });
  const missions = dailyQuests(250);
  for (const quest of missions) game.questLedger.daily.counts[quest.conditions[0].metric] = quest.conditions[0].target;
  for (const quest of missions) {
    const next = claimAdventureQuest(game, quest.id, now, grantXp);
    assert.equal(next.gold - game.gold, quest.reward.gold, quest.id);
    assert.equal(next.hero.xp - game.hero.xp, quest.reward.xp, quest.id);
    assert.equal(next.fusionCores, 0);
    game = syncQuestProgress(game, next, now);
    assert.equal(claimAdventureQuest(game, quest.id, now, grantXp), game);
  }
  assert.equal(game.questLedger.daily.claimed.length, 5);
});
