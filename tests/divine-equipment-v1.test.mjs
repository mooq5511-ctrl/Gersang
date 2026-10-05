import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {DIVINE_EQUIPMENT,makeDivineEquipment}=require('../app/divine-equipment.ts');
const {v1Definition,v1PartCore}=require('../app/equipment-v1-policy.ts');
const {effectiveEquipmentStats}=require('../app/equipment-stats.ts');
const {equipmentSellPrice}=require('../app/equipment-market.ts');
const {monsterCatalogEntries}=require('../app/monster-compendium-data.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {DUNGEONS,freshDungeon}=require('../app/dungeon-engine.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {grantXp}=require('../app/game-progression.ts');
const {equipmentSpecialStats}=require('../app/vitals-engine.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const deps={addLog:(logs,text)=>[text,...logs],grantXp,enterInn:state=>state,leaveInn:state=>state};
const rolls={choice:0,spawnRoll:0,encounterCountRoll:0,retaliationRoll:.99,materialRolls:[1,1,1],gearDropRoll:1,fusionCoreRoll:1};

test('all four named drops retain level-one identity but use canonical core and resale policy',()=>{
  for(const [key,spec] of Object.entries(DIVINE_EQUIPMENT)){
    const gear=makeDivineEquipment(key,'test'),definition=v1Definition(gear);
    assert.ok(definition);
    assert.equal(gear.name,spec.name);assert.equal(gear.requiredLevel,1);
    assert.deepEqual(gear.bonus,spec.bonus);
    assert.deepEqual({atk:gear.atk,def:gear.def,hp:gear.hp},v1PartCore(1,definition.part));
    assert.deepEqual(effectiveEquipmentStats(gear),Object.fromEntries(['atk','def','hp'].map(stat=>[stat,gear[stat]*2])));
    assert.equal(equipmentSellPrice(gear),Math.floor(definition.price*.4));
    assert.deepEqual(effectiveEquipmentStats({...gear,atk:999999,def:999999,hp:999999}),effectiveEquipmentStats(gear));
    for(const entry of monsterCatalogEntries)for(const drop of entry.equipmentDrops.filter(drop=>drop.item===gear.name))assert.equal(drop.price,equipmentSellPrice(gear));
  }
});

test('real victory settlement drops each versioned identity once and retains Auto Hunt on reload',()=>{
  for(const key of Object.keys(DIVINE_EQUIPMENT)){
    const [enemyKey,enemy]=Object.entries(DUNGEONS).find(([,enemy])=>enemy.loot.includes(key));
    const index=[...new Set(enemy.loot)].indexOf(key),selectedRoll=(index+.5)*.0001;
    let game=freshGame('神裝掉落');game.hanyangPrologueStep='completed';game.hero={...game.hero,hp:1_000_000,maxHp:1_000_000,vit:250_000};game.dungeon={...freshDungeon(),autoHunt:true,lockedEnemyKey:enemyKey};
    // Settlement fixture is past the prologue; it must not bypass the real tutorial boss gate.
    game=runDungeonAction(game,'start',1000,enemyKey,{...rolls,roll:selectedRoll},deps);
    // This test validates settlement. Large test-only vitals prevent an immediate defeat.
    if(game.dungeon.status==='fighting'){
      game={...game,dungeon:{...game.dungeon,realtime:{...game.dungeon.realtime,winner:'player'}}};
      game=runDungeonAction(game,'tick',1050,enemyKey,{...rolls,roll:selectedRoll},deps);
    }else assert.equal(game.dungeon.status,'respawning');
    const gear=game.inventory.find(item=>item.definitionId===`divine-${key}`);
    assert.ok(gear,key);assert.equal(game.inventory.length,1);assert.equal(game.dungeon.autoHunt,true);
    assert.ok(game.battleLogs.some(entry=>(entry.message||entry.text||'').includes(gear.name)));
    const restored=restoreGame(JSON.parse(serializeGameForStorage(game)));
    const retried=runDungeonAction(restored,'tick',1051,enemyKey,{...rolls,roll:selectedRoll},deps);
    assert.equal(retried.inventory.length,1);assert.equal(retried.inventory[0].definitionId,gear.definitionId);
    assert.equal(retried.gold,game.gold);assert.equal(retried.kills,game.kills);
  }
});

test('actual four-drop loadout shares special limits and preserves resolved stats through storage',()=>{
  const game=freshGame('神裝結算');
  for(const key of Object.keys(DIVINE_EQUIPMENT)){
    const gear=makeDivineEquipment(key,key);game.hero.equip[gear.slot]=gear;
  }
  const resolved=equipmentSpecialStats(game.hero);
  for(const [key,limit] of [['attack',.35],['defense',.35],['maxHp',.3],['maxMp',.25]])assert.ok(resolved.budget.effective[key]<=resolved.budget.core[key]+Math.floor(resolved.budget.core[key]*limit));
  assert.ok(resolved.budget.clipped.length>0);
  const restored=restoreGame(JSON.parse(serializeGameForStorage(game)));
  assert.deepEqual(equipmentSpecialStats(restored.hero),resolved);
});
