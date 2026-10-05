import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {relicDungeonAction,freshRelicDungeon}=require('../app/relic-dungeon.tsx');
const {settleDueRelicBossBattle,normalizeRelicBossAutomation,RELIC_OFFLINE_ROUNDS_PER_TICK}=require('../app/relic-boss-automation.ts');
const {settleCurrentGame}=require('../app/game-loop.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {settleRelicRewards,relicRewardRandom}=require('../app/relic-reward-settlement.ts');
function fixture(power=1_000_000,hp=10_000_000,run=0) {
  const context={now:1000,maxHp:hp,currentHp:hp,partyPower:power,partyReady:true,partyNames:['遠征槍兵'],partyUids:['merc-1']};
  const boss=relicDungeonAction({...freshRelicDungeon(hp),clearedRuns:run},'challenge-boss',power,context);
  const enabled=relicDungeonAction(boss,'toggle-auto-battle',power,context);
  return {...freshGame('自動首領'),idleStamp:2000,relicDungeon:enabled};
}
const tick=now=>({now,roll:.1,choice:1,spawnRoll:1,encounterCountRoll:0,retaliationRoll:1,materialRolls:[1,1,1],gearChoiceRoll:.1});

test('persisted toggle and global clock run one strike per scheduled second, not per render',()=>{
  const game=fixture();
  assert.equal(game.relicDungeon.autoBattle,true);assert.equal(game.relicDungeon.nextBossAttackAt,2000);
  assert.strictEqual(settleDueRelicBossBattle(game,1999,.1),game);
  const once=settleCurrentGame(game,tick(2000));
  assert.equal(once.relicDungeon.bossTurn,1);assert.equal(once.relicDungeon.nextBossAttackAt,3000);
  assert.ok(once.relicDungeon.bossHp<game.relicDungeon.bossHp);
  const repeat=settleCurrentGame(once,tick(2000));
  assert.equal(repeat.relicDungeon.bossTurn,1);assert.equal(repeat.relicDungeon.hp,once.relicDungeon.hp);
  const restored=restoreGame(JSON.parse(serializeGameForStorage(once)));
  assert.equal(restored.relicDungeon.autoBattle,true);assert.equal(restored.relicDungeon.nextBossAttackAt,3000);
  const twice=settleDueRelicBossBattle(restored,3000,.1);
  assert.equal(twice.relicDungeon.bossTurn,2);
  const stoppedState=relicDungeonAction(twice.relicDungeon,'toggle-auto-battle',1_000_000,{now:3000});
  const stopped={...twice,relicDungeon:stoppedState};
  assert.equal(stoppedState.autoBattle,false);assert.equal(stoppedState.nextBossAttackAt,0);
  assert.strictEqual(settleDueRelicBossBattle(stopped,100_000,.1),stopped);
});

test('offline catch-up matches real manual strikes, awards once, and stops at victory',()=>{
  const game=restoreGame(JSON.parse(serializeGameForStorage(fixture())));let manual=game;
  while(manual.relicDungeon.status==='boss') {
    const before=manual.relicDungeon;
    const after=relicDungeonAction(before,'attack-boss',before.dispatchPower,{now:before.nextBossAttackAt});
    manual=settleRelicRewards(manual,before,after,'attack-boss',relicRewardRandom(.1));
  }
  const offline=settleDueRelicBossBattle(game,7*24*60*60*1000,.1);
  assert.equal(offline.relicDungeon.status,'cleared');
  for(const field of ['hp','bossHp','bossTurn','clearedRuns'])assert.equal(offline.relicDungeon[field],manual.relicDungeon[field]);
  assert.equal(offline.gold,manual.gold);assert.deepEqual(offline.materials,manual.materials);
  assert.equal(offline.inventory.length,manual.inventory.length);
  assert.deepEqual(offline.inventory.map(({uid,...item})=>item),manual.inventory.map(({uid,...item})=>item));
  assert.equal(offline.relicDungeon.autoBattle,false);assert.equal(offline.relicDungeon.nextBossAttackAt,0);
  assert.strictEqual(settleDueRelicBossBattle(offline,8*24*60*60*1000,.1),offline);
});

test('weak expedition stops on actual defeat without free healing, rewards or re-challenge',()=>{
  const game=fixture(100,100);
  const result=settleDueRelicBossBattle(game,100_000,.1);
  assert.equal(result.relicDungeon.status,'defeated');assert.equal(result.relicDungeon.hp,0);
  assert.equal(result.relicDungeon.autoBattle,false);assert.equal(result.gold,game.gold);
  assert.strictEqual(result.inventory,game.inventory);assert.equal(result.relicDungeon.clearedRuns,0);
  assert.strictEqual(settleDueRelicBossBattle(result,200_000,.1),result);
});

test('manual attack reschedules the next automatic second and retreat cancels the timer',()=>{
  const game=fixture(),before=game.relicDungeon;
  const after=relicDungeonAction(before,'attack-boss',before.dispatchPower,{now:2500});
  const attacked=settleRelicRewards(game,before,after,'attack-boss',relicRewardRandom(.1));
  assert.equal(attacked.relicDungeon.nextBossAttackAt,3500);
  assert.strictEqual(settleDueRelicBossBattle(attacked,3499,.1),attacked);
  const retreat=relicDungeonAction(after,'retreat',before.dispatchPower);
  const left=settleRelicRewards(attacked,after,retreat,'retreat',()=>assert.fail('no retreat loot'));
  assert.equal(left.relicDungeon.autoBattle,false);assert.equal(left.relicDungeon.nextBossAttackAt,0);
});

test('invalid saved clocks are disabled and bounded catch-up retains unprocessed seconds',()=>{
  const game=fixture();
  for(const value of [0,-1,Infinity,NaN,'2000']) {
    const state=normalizeRelicBossAutomation({...game.relicDungeon,nextBossAttackAt:value});
    assert.equal(state.autoBattle,false);assert.equal(state.nextBossAttackAt,0);
  }
  assert.equal(RELIC_OFFLINE_ROUNDS_PER_TICK,300);
  const first=settleDueRelicBossBattle(game,1e9,.1,1);
  assert.equal(first.relicDungeon.status,'boss');assert.equal(first.relicDungeon.bossTurn,1);
  assert.equal(first.relicDungeon.nextBossAttackAt,3000);
  const second=settleDueRelicBossBattle(first,1e9,.1,1);
  assert.equal(second.relicDungeon.bossTurn,2);assert.equal(second.relicDungeon.nextBossAttackAt,4000);
  assert.equal(second.gold,game.gold);assert.strictEqual(second.inventory,game.inventory);
});

test('every existing relic boss uses the same real offline outcome without advancing to an invented next boss',()=>{
  for(let run=0;run<4;run++) {
    const game=fixture(10_000_000,100_000_000,run);
    let manual=game.relicDungeon;
    for(let round=0;manual.status==='boss'&&round<300;round++)manual=relicDungeonAction(manual,'attack-boss',manual.dispatchPower,{now:manual.nextBossAttackAt});
    const result=settleDueRelicBossBattle(game,1000*60*60*24,.3);
    for(const field of ['status','hp','bossHp','bossTurn','clearedRuns','bossMonsterId'])assert.equal(result.relicDungeon[field],manual[field]);
    assert.equal(result.relicDungeon.status,'cleared');
    assert.equal(result.relicDungeon.clearedRuns,run+1);
    assert.equal(result.relicDungeon.autoBattle,false);
    assert.strictEqual(settleDueRelicBossBattle(result,1000*60*60*48,.3),result);
  }
});
