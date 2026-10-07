import test from 'node:test';
import assert from 'node:assert/strict';
import { auditAutoPotion } from '../scripts/audit-equipment-auto-potion.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {configureAutoPotionAction,applyAutoPotionAction,buyMedicineAction}=require('../app/game-inventory-actions.ts');
const addLog=(logs,message)=>[message,...logs];
test('real flow audit purchases and consumes actual stock, records combat and keeps deterministic outcomes', () => {
  const result = auditAutoPotion(72,'e_white_tiger_soul_eater','candidate',70,1,30,20);
  assert.equal(result.potionPurchaseCost,12000);
  assert.equal(result.potionsUsed + result.potionsLeft,20);
  assert.ok(result.kills > 0);
  assert.ok(result.battleLogCategories.includes('reward'));
  assert.deepEqual(result.observedTargets,['e_white_tiger_soul_eater']);
  assert.deepEqual(result,auditAutoPotion(72,'e_white_tiger_soul_eater','candidate',70,1,30,20));
});
test('real shortage disables Auto Potion instead of inventing free healing or resupply', () => {
  const result = auditAutoPotion(72,'e_white_tiger_soul_eater','candidate',70,1,10,0);
  assert.equal(result.autoPotion,false);
  assert.equal(result.potionsUsed,0);
  assert.equal(result.potionPurchaseCost,0);
  assert.ok(result.battleLogCategories.includes('warning'));
});

test('shortage explains manual re-enabling and purchased stock does not silently change the policy',()=>{
  let game={...freshGame('補給提示'),gold:10000,medicines:{healing:0},autoPotion:{enabled:true,medicineId:'healing',threshold:50}};
  for(const path of ['configure','battle']) {
    const before=structuredClone(game);
    const state=path==='battle'?{...game,hero:{...game.hero,hp:1},dungeon:{...game.dungeon,status:'fighting'}}:game;
    const result=path==='battle'?applyAutoPotionAction(state,10000,addLog,s=>s):configureAutoPotionAction(state,{enabled:true},addLog);
    assert.equal(result.autoPotion.enabled,false);
    assert.equal(result.gold,10000);
    assert.equal(result.medicines.healing,0);
    assert.match(result.logs[0],/購藥後.*重新勾選 Auto Potion/);
    assert.match(result.battleLogs[0].message,/重新勾選/);
    assert.deepEqual(game,before);
  }
  game=configureAutoPotionAction(game,{enabled:true},addLog);
  game=buyMedicineAction(game,'healing',1,1,'漢陽',addLog,()=>{});
  assert.equal(game.medicines.healing,1);
  assert.equal(game.autoPotion.enabled,false);
  assert.equal(configureAutoPotionAction(game,{enabled:true},addLog).autoPotion.enabled,true);
});
