import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../app/relic-dungeon.tsx', import.meta.url), 'utf8');
const pureSource = source.slice(source.indexOf('const RELIC_ROOMS'), source.indexOf('export function RelicDungeonPanel'));
const boss = {id:'relic_sunken_king',name:'沉沒王',level:82,hp:884760,atk:1680,skill:'王朝反擊'};
const monster = {id:'relic_moss_warden',name:'苔甲守衛',hp:100,defense:5,atk:40,kind:'守衛',skill:'苔甲反震'};
const context = vm.createContext({
  RELIC_DUNGEON_MONSTERS: {[boss.id]: boss, [monster.id]: monster},
  relicBossForRun: () => boss,
  relicMonsterForProgress: () => monster,
  Math,
});
vm.runInContext(ts.transpileModule(pureSource.replace(/^export /gm, ''), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, context);
const {freshRelicDungeon,relicDungeonAction} = context;

test('dispatch guidance does not present exploration progress as a manual Boss gate', () => {
  assert.match(source, /手動討伐不需等探索進度達100%/);
  assert.match(source, /派遣中的隊伍須先等回報/);
  assert.match(source, /自動探索仍會先探索再接續挑戰首領/);
  assert.doesNotMatch(source, /探索進度達 100% 後，才能打開/);
  assert.doesNotMatch(source, /探索進度達 100% 後，依通關次數解鎖下一位/);
});

test('relic boss can be challenged at zero progress without a prior dispatch', () => {
  const state = freshRelicDungeon(1000);
  const result = relicDungeonAction(state, 'challenge-boss', 100, {
    partyReady: true, partyNames: ['新夥伴'], partyUids: ['merc-new'],
    maxHp: 500, currentHp: 300, partyEquipmentScore: 0,
  });
  assert.equal(result.status, 'boss');
  assert.equal(result.progress, 0);
  assert.equal(result.dispatchPower, 100);
  assert.equal(result.hp, 300);
  assert.equal(result.maxHp, 500);
  assert.equal(result.partyCount, 1);
  assert.equal(result.dispatchPartyUids[0], 'merc-new');
  assert.equal(state.status, 'idle');
  assert.equal(state.bossUnlocked, false);
});

test('direct relic challenge still requires a living party and cannot reset an active fight or expedition', () => {
  const state = freshRelicDungeon(1000);
  const empty = relicDungeonAction(state, 'challenge-boss', 100, { partyReady: false, partyNames: [], partyUids: [] });
  assert.equal(empty.status, 'idle');
  assert.match(empty.logs[0], /至少 1 名/);
  for (const status of ['boss', 'dispatching']) {
    const current = { ...state, status, bossHp: 123, bossTurn: 5 };
    const result = relicDungeonAction(current, 'challenge-boss', 1000, { partyReady: true, partyNames: ['夥伴'] });
    assert.equal(result.status, status);
    assert.equal(result.bossHp, 123);
    assert.equal(result.bossTurn, 5);
  }
});

test('Boss preparation predicts the observed beginner defeat and matches actual combat', () => {
  for (const [power, hp, count, equipment] of [[280, 772, 1, 0], [140000, 6800, 6, 0], [250000, 20000, 6, 480]]) {
    const preview = context.relicBossReadiness(power, hp, count, equipment);
    let state = relicDungeonAction({ ...freshRelicDungeon(hp), status: 'ready', bossUnlocked: true, dispatchPower: power, partyCount: count, dispatchEquipmentScore: equipment }, 'challenge-boss', power);
    for (let turn = 0; state.status === 'boss' && turn < 200; turn++) state = relicDungeonAction(state, 'attack-boss', power);
    assert.equal(preview.ready, state.status === 'cleared');
    assert.equal(preview.turns, state.bossTurn);
  }
  assert.equal(context.relicBossReadiness(280, 772, 1).ready, false);
  assert.equal(context.relicBossReadiness(250000, 20000, 6, 480).ready, true);
  const target = context.relicBossReadiness(280, 772, 1);
  assert.equal(context.relicBossReadiness(target.powerTarget, target.hpTarget, 1).ready, true, 'displayed preparation targets must be sufficient together');
});

const dispatchContext = equipmentScore => ({
  now: 1,
  dispatchDurationMs: 30_000,
  maxHp: 2000,
  currentHp: 2000,
  partyPower: 50000,
  partyEquipmentScore: equipmentScore,
  partyNames: ['劍豪','御林旗手'],
  partyUids: ['a','b'],
  partyReady: true,
});

test('relic dispatch records equipment quality and rewards stronger builds', () => {
  const lowDispatch = relicDungeonAction(freshRelicDungeon(2000), 'dispatch', 50000, dispatchContext(0));
  const highDispatch = relicDungeonAction(freshRelicDungeon(2000), 'dispatch', 50000, dispatchContext(160));
  assert.equal(lowDispatch.dispatchEquipmentScore, 0);
  assert.equal(highDispatch.dispatchEquipmentScore, 160);
  const lowClaim = relicDungeonAction(lowDispatch, 'claim', 50000, { now: 30001 });
  const highClaim = relicDungeonAction(highDispatch, 'claim', 50000, { now: 30001 });
  assert.ok(highClaim.progress > lowClaim.progress);
  assert.ok(highClaim.lastReward.gold >= lowClaim.lastReward.gold);
  assert.match(highClaim.logs.join(' '), /裝備品質貢獻/);
});

test('relic boss attack uses equipment quality for damage and retaliation', () => {
  const makeBossState = equipmentScore => ({
    ...freshRelicDungeon(100000),
    status: 'boss',
    bossHp: 100000,
    bossMaxHp: 100000,
    hp: 100000,
    maxHp: 100000,
    dispatchPower: 50000,
    partyPower: 50000,
    partyCount: 2,
    partyEquipmentScore: equipmentScore,
    dispatchEquipmentScore: equipmentScore,
  });
  const low = relicDungeonAction(makeBossState(0), 'attack-boss', 50000);
  const high = relicDungeonAction(makeBossState(160), 'attack-boss', 50000);
  assert.ok(high.bossHp < low.bossHp);
  assert.ok(high.hp > low.hp);
});
