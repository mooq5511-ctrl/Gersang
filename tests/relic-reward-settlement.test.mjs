import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const monsters=require('../data/monsters/relic-dungeon-monsters.ts');
const source=readFileSync(new URL('../app/relic-dungeon.tsx',import.meta.url),'utf8');
const pure=source.slice(source.indexOf('const RELIC_ROOMS'),source.indexOf('export function RelicDungeonPanel'));
const context=vm.createContext({...monsters,Math,Date});
vm.runInContext(ts.transpileModule(pure.replace(/^export /gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
const {freshRelicDungeon,relicDungeonAction}=context;
const {settleRelicRewards,relicRewardRandom}=require('../app/relic-reward-settlement.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {rollEquipment}=require('../app/game-equipment-factory.ts');
const {v1Definition}=require('../app/equipment-v1-policy.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {settleDueRelicDispatch}=require('../app/relic-dispatch-tick.ts');
const {settleCurrentGame}=require('../app/game-loop.ts');
const party={partyReady:true,partyNames:['遠征槍兵'],partyUids:['merc-1'],maxHp:10_000_000,currentHp:10_000_000,partyEquipmentScore:480,now:1,dispatchDurationMs:30_000};

test('dispatch report distinguishes boss floor from exploration segment without changing settlement',()=>{
  for(const clearedRuns of [0,1,3]) {
    const initial={...freshRelicDungeon(party.maxHp),progress:18,clearedRuns};
    const before=relicDungeonAction(initial,'dispatch',1_000_000,party);
    const after=relicDungeonAction(before,'claim',1_000_000,{...party,now:30_001});
    assert.ok(after.logs.some(log=>log.startsWith(`第 ${clearedRuns+1} 層・探索區段 2 遠征戰報：`)));
    assert.equal(after.clearedRuns,clearedRuns);
    assert.ok(after.progress>18);
    assert.ok(after.lastReward.gold>0);
    assert.equal(after.dispatchEndsAt,0);
    const replay=relicDungeonAction(after,'claim',1_000_000,{...party,now:30_001});
    assert.equal(replay.progress,after.progress);
    assert.equal(replay.materialsFound,after.materialsFound);
  }
});

test('actual expedition settles once after deadline and retains all 240 existing inventory items through reload',()=>{
  const inventory=Array.from({length:240},(_,i)=>({...rollEquipment(20,false,'weapon',()=>0),uid:`existing-${i}`}));
  const before=relicDungeonAction(freshRelicDungeon(party.maxHp),'dispatch',1_000_000,party);
  const game={...freshGame('遠征結算'),inventory,relicDungeon:before};
  const early=relicDungeonAction(before,'claim',1_000_000,{...party,now:30_000});
  const waiting=settleRelicRewards(game,before,early,'claim',()=>assert.fail('no early loot rolls'));
  assert.equal(waiting.gold,game.gold);assert.strictEqual(waiting.inventory,inventory);
  const after=relicDungeonAction(before,'claim',1_000_000,{...party,now:30_001});
  assert.ok(after.lastReward.equipment>0);
  const result=settleRelicRewards(game,before,after,'claim',relicRewardRandom(.2));
  assert.equal(result.inventory.length,240+after.lastReward.equipment);
  assert.deepEqual(result.inventory.slice(0,240).map(item=>item.uid),inventory.map(item=>item.uid));
  assert.equal(result.gold,game.gold+after.lastReward.gold);
  assert.equal(result.materials['遺跡材料'],after.lastReward.materials);
  assert.ok(result.inventory.slice(240).every(item=>v1Definition(item)));
  assert.ok(result.logs.some(log=>log.includes('遠征結算')));
  assert.strictEqual(settleRelicRewards(result,before,after,'claim',()=>assert.fail('stale replay')),result);
  const replay=relicDungeonAction(after,'claim',1_000_000,party);
  const noReward=settleRelicRewards(result,after,replay,'claim',()=>assert.fail('duplicate claim'));
  assert.equal(noReward.gold,result.gold);assert.strictEqual(noReward.inventory,result.inventory);
  const restored=restoreGame(JSON.parse(serializeGameForStorage(result)));
  assert.equal(restored.inventory.length,result.inventory.length);
  assert.deepEqual(restored.inventory.map(item=>item.uid),result.inventory.map(item=>item.uid));
  assert.equal(game.inventory.length,240);assert.equal(game.relicDungeon.status,'dispatching');
});

test('real boss victory awards gear and seals only on the cleared-run increment',()=>{
  const prepared=relicDungeonAction(freshRelicDungeon(party.maxHp),'challenge-boss',1_000_000,party);
  const before={...prepared,bossHp:1};
  const game={...freshGame('首領結算'),relicDungeon:before};
  const after=relicDungeonAction(before,'attack-boss',1_000_000,party);
  assert.equal(after.status,'cleared');assert.equal(after.clearedRuns,1);
  const result=settleRelicRewards(game,before,after,'attack-boss',()=>0);
  assert.equal(result.inventory.length,after.lastReward.equipment);
  assert.ok(result.inventory.every(item=>item.rarity==='稀有'&&v1Definition(item)));
  assert.equal(result.materials['修羅兵符'],1);
  assert.strictEqual(settleRelicRewards(result,before,after,'attack-boss',()=>assert.fail('stale boss reward')),result);
  const replay=relicDungeonAction(after,'attack-boss',1_000_000,party);
  const noReward=settleRelicRewards(result,after,replay,'attack-boss',()=>assert.fail('duplicate boss reward'));
  assert.equal(noReward.materials['修羅兵符'],1);assert.equal(noReward.gold,result.gold);
  assert.strictEqual(noReward.inventory,result.inventory);
});

test('same event seed produces identical reward content if the state updater is evaluated again',()=>{
  const before=relicDungeonAction(freshRelicDungeon(party.maxHp),'dispatch',1_000_000,party);
  const after=relicDungeonAction(before,'claim',1_000_000,{...party,now:30_001});
  const game={...freshGame('亂數結算'),relicDungeon:before};
  const first=settleRelicRewards(game,before,after,'claim',relicRewardRandom(.7654));
  const second=settleRelicRewards(game,before,after,'claim',relicRewardRandom(.7654));
  const content=result=>result.inventory.map(({uid,...item})=>item);
  assert.deepEqual(content(first),content(second));assert.deepEqual(first.materials,second.materials);
  assert.deepEqual(first.logs,second.logs);assert.equal(first.gold,second.gold);
});

test('global loop claims due dispatch without the relic UI, including return after a long offline gap',()=>{
  const before=relicDungeonAction(freshRelicDungeon(party.maxHp),'dispatch',1_000_000,party);
  const game={...freshGame('跨頁派遣'),relicDungeon:before,idleStamp:30_001};
  assert.strictEqual(settleDueRelicDispatch(game,30_000,.1),game);
  const rolls={now:30_001,roll:.1,choice:1,spawnRoll:1,encounterCountRoll:0,retaliationRoll:1,materialRolls:[1,1,1],gearChoiceRoll:.1};
  const result=settleCurrentGame(game,rolls);
  assert.notEqual(result.relicDungeon.status,'dispatching');
  assert.equal(result.relicDungeon.dispatchEndsAt,0);
  assert.ok(result.inventory.length>0);
  assert.equal(result.gold,game.gold+result.relicDungeon.lastReward.gold);
  const again=settleCurrentGame(result,rolls);
  assert.equal(again.gold,result.gold);assert.strictEqual(again.inventory,result.inventory);
  const restored=restoreGame(JSON.parse(serializeGameForStorage(game)));
  const offline=settleDueRelicDispatch(restored,7*24*60*60*1000,.1);
  assert.equal(offline.gold,restored.gold+offline.relicDungeon.lastReward.gold);
  assert.equal(offline.inventory.length,restored.inventory.length+offline.relicDungeon.lastReward.equipment);
  assert.strictEqual(settleDueRelicDispatch(offline,7*24*60*60*1000,.1),offline);
  assert.equal(before.status,'dispatching');
});
