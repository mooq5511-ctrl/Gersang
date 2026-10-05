import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {makeTierEquipment,equipmentAtTier}=require('../app/tier-equipment.ts');
const {smeltLowRarityEquipmentAction}=require('../app/game-inventory-actions.ts');
const {planEquipmentFusion}=require('../app/equipment-fusion.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {relicCraftEquipmentLevel}=require('../app/relic-equipment-rewards.ts');
const {v1RandomEquipmentTier,v1Definition}=require('../app/equipment-v1-policy.ts');
const log=(logs,message)=>[message,...logs];
const item=uid=>makeTierEquipment(equipmentAtTier(1)[0],uid,'test');
const protectedItems=()=>[
  {...item('enhanced'),enhance:1},
  {...item('socket'),socketGem:{id:'white-crystal',name:'白水晶',baseName:'原名',count:1,totalValue:5}},
  {...item('progress'),luckyValue:1},
  {...item('milestone'),enhanceBonuses:[{id:'paid',stat:'attackPercent',value:5}]},
];

test('bulk smelting and fusion preserve each kind of paid investment without rolling',()=>{
  const game={...freshGame('投資保護'),inventory:protectedItems()},before=structuredClone(game);
  const notices=[];
  const next=smeltLowRarityEquipmentAction(game,()=>assert.fail('no eligible items must not roll'),log,message=>notices.push(message));
  assert.deepEqual(game,before);
  assert.strictEqual(next.inventory,game.inventory);
  assert.strictEqual(next.materials,game.materials);
  assert.match(notices[0],/保留 4 件/);
  const fusionInventory=protectedItems().flatMap(gear=>[gear,{...gear,uid:gear.uid+'2'},{...gear,uid:gear.uid+'3'}]);
  assert.equal(planEquipmentFusion(fusionInventory,'普通').consumedCount,0);
});

test('mixed smelting consumes only eligible items and preserves protected metadata through storage',()=>{
  const game={...freshGame('混合熔煉'),inventory:[...protectedItems(),item('plain'),{...item('rare'),rarity:'稀有'},{...item('epic'),rarity:'史詩'}]},before=structuredClone(game);
  const next=smeltLowRarityEquipmentAction(game,()=>assert.fail('two items cannot grant bonus'),log,()=>{});
  assert.deepEqual(game,before);
  assert.equal(next.materials['遺跡魔晶'],20);
  assert.deepEqual(next.inventory.map(gear=>gear.uid),['enhanced','socket','progress','milestone','epic']);
  assert.match(next.logs[0],/處理 2 件.*保留 4 件/);
  const restored=restoreGame(JSON.parse(serializeGameForStorage(next)));
  for(const gear of protectedItems()){
    const stored=restored.inventory.find(entry=>entry.uid===gear.uid);
    assert.ok(stored);
    for(const key of ['enhance','socketGem','luckyValue','enhanceBonuses'])if(gear[key]!==undefined)assert.deepEqual(stored[key],gear[key]);
  }
});

test('smelting bonus follows existing relic boss and hero level, not unrelated world progress',()=>{
  for(const level of [1,12,72,150,250])for(const clearedRuns of [0,1,2,3,4]){
    const game=freshGame('熔煉來源');game.hero.level=level;game.stage=250;
    game.relicDungeon.clearedRuns=clearedRuns;
    game.inventory=Array.from({length:5},(_,index)=>item('eligible'+index));
    const next=smeltLowRarityEquipmentAction(game,()=>0,log,()=>{});
    assert.equal(next.inventory.length,1);
    const definition=v1Definition(next.inventory[0]);
    assert.ok(definition);
    assert.equal(definition.level,v1RandomEquipmentTier(relicCraftEquipmentLevel(level,clearedRuns)));
    assert.ok(definition.level<=level);
    assert.equal(next.inventory[0].rarity,'稀有');
    assert.equal(next.materials['遺跡魔晶'],25);
    assert.equal(next.relicDungeon.clearedRuns,clearedRuns);
  }
});
