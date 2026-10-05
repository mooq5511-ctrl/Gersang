import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
require.extensions['.css']=()=>{};
const {THUNDER_FORGE_RECIPES,makeMythicEquipment}=require('../app/mythic-forge.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {forgeThunderItemAction}=require('../app/game-inventory-actions.ts');
const {createTerritoryController}=require('../app/game-territory-controller.ts');
const {v1Definition,v1PartCore}=require('../app/equipment-v1-policy.ts');
const {effectiveEquipmentStats}=require('../app/equipment-stats.ts');
const {equipmentSpecialStats}=require('../app/vitals-engine.ts');
const {hasFullAmaterasuSet}=require('../app/equipment-set-effects.ts');
const {equipFromInventory}=require('../app/equipment-slots.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const log=(logs,message)=>[message,...logs];

test('all seventeen forged items use canonical cores and retain source contracts and effects',()=>{
  assert.equal(THUNDER_FORGE_RECIPES.length,17);
  for(const recipe of THUNDER_FORGE_RECIPES){
    const game=freshGame('鍛造測試');game.materials={...recipe.needs};
    const before=structuredClone(game);
    const next=forgeThunderItemAction(game,recipe.id,()=>recipe.id,()=>'/fallback',log,()=>{});
    assert.deepEqual(game,before);
    const gear=next.inventory[0],definition=v1Definition(gear);
    assert.ok(definition);
    assert.equal(gear.requiredLevel,recipe.set==='thunder'?150:1);
    assert.deepEqual({atk:gear.atk,def:gear.def,hp:gear.hp},v1PartCore(gear.requiredLevel,definition.part));
    assert.deepEqual(effectiveEquipmentStats(gear),Object.fromEntries(['atk','def','hp'].map(stat=>[stat,gear[stat]*2])));
    assert.deepEqual(gear.magic,recipe.magic);assert.deepEqual(gear.bonus,recipe.bonus);
    assert.equal(gear.skill,recipe.skill);
    for(const name of Object.keys(recipe.needs))assert.equal(next.materials[name],0);
    const missing={...game,materials:{}};
    assert.strictEqual(forgeThunderItemAction(missing,recipe.id,()=>assert.fail('no UID on failure'),()=>'',log,()=>{}),missing);
  }
});

test('actual newcomer redemption and forge deliver equal items except source and UID',()=>{
  for(const set of ['azure','chiyou','amaterasu']){
    let game={...freshGame('套裝兌換'),newbieCoins:1000};
    const before=structuredClone(game);
    const controller=createTerritoryController({setGame:update=>{game=update(game);},setNotice:()=>{}});
    controller.redeemWandererSet(set);
    assert.equal(game.newbieCoins,0);assert.equal(game.inventory.length,5);
    for(const recipe of THUNDER_FORGE_RECIPES.filter(piece=>piece.set===set)){
      const redeemed=game.inventory.find(gear=>gear.definitionId===recipe.definitionId);
      const forged=makeMythicEquipment(recipe.id,'different','fallback','鍛造');
      for(const key of ['name','slot','atk','def','hp','bonus','magic','skill','requiredLevel','rarity','balanceVersion','definitionId'])assert.deepEqual(redeemed[key],forged[key]);
    }
    assert.equal(before.newbieCoins,1000);
    const previous=game;controller.redeemWandererSet(set);assert.strictEqual(game,previous);
  }
});

test('new beast sets retain level-one usability, bounded combat and set identity after storage',()=>{
  for(const set of ['azure','chiyou','amaterasu']){
    const game=freshGame('套裝戰力');
    let hero=game.hero,inventory=THUNDER_FORGE_RECIPES.filter(piece=>piece.set===set).map(piece=>makeMythicEquipment(piece.id,piece.id,'','test'));
    for(const gear of [...inventory]){const result=equipFromInventory(hero,inventory,gear.uid);assert.equal(result.error,undefined);hero=result.unit;inventory=result.inventory;}
    game.hero=hero;
    const resolved=equipmentSpecialStats(hero);
    for(const [key,limit] of [['attack',.35],['defense',.35],['maxHp',.3],['maxMp',.25]])assert.ok(resolved.budget.effective[key]<=resolved.budget.core[key]+Math.floor(resolved.budget.core[key]*limit));
    if(set==='amaterasu')assert.equal(hasFullAmaterasuSet(hero.equip),true);
    const restored=restoreGame(JSON.parse(serializeGameForStorage(game)));
    assert.deepEqual(equipmentSpecialStats(restored.hero),resolved);
    if(set==='amaterasu')assert.equal(hasFullAmaterasuSet(restored.hero.equip),true);
  }
  const game=freshGame('雷神門檻'),bow=makeMythicEquipment('thunderBow','bow','','test');
  assert.equal(equipFromInventory(game.hero,[bow],bow.uid).error,'裝備等級不足。');
  assert.equal(equipFromInventory({...game.hero,level:150},[bow],bow.uid).error,undefined);
});
