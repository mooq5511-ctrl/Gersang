import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {THUNDER_FORGE_RECIPES,mythicSetPieceCount}=require('../app/mythic-forge.ts');
const {hasFullAmaterasuSet}=require('../app/equipment-set-effects.ts');
const {equipmentBaseName}=require('../app/equipment-affix-semantics.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {socketGemAction}=require('../app/game-inventory-actions.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {getGameView}=require('../app/game-view-selector.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {freshDungeon}=require('../app/dungeon-engine.ts');
const {grantXp}=require('../app/game-progression.ts');
const {enterGameInnAction,leaveGameInnAction}=require('../app/game-runtime-actions.ts');
const {MercenaryRealtimeBattleSystem}=require('../app/mercenary-realtime-battle.js');
const pieces=THUNDER_FORGE_RECIPES.filter(piece=>piece.set==='amaterasu');
const fullSet=()=>Object.fromEntries(pieces.map(piece=>[piece.slot,{...piece,uid:piece.id,rarity:'普通',enhance:0,image:''}]));

test('all five actual pieces retain set identity after real gem inlay and storage',()=>{
  const game=freshGame('套裝加工測試');
  game.hero.equip={...game.hero.equip,...fullSet()};
  game.gold=6000*5;
  assert.equal(hasFullAmaterasuSet(game.hero.equip),true);
  let current=game;
  for(const piece of pieces)current=socketGemAction(current,'hero',piece.slot,'white-crystal',0,1,(logs,msg)=>[msg,...logs],()=>{});
  assert.equal(Object.values(current.hero.equip).filter(item=>item?.name.startsWith('+1')).length,5);
  assert.equal(hasFullAmaterasuSet(current.hero.equip),true);
  const restored=restoreGame(JSON.parse(serializeGameForStorage(current)));
  assert.equal(hasFullAmaterasuSet(restored.hero.equip),true);
  const view=getGameView({activeTab:'raid',cityService:'weapon',game:restored,selectedUid:'hero',treasureQuery:''});
  assert.equal(view.amaterasuSetPieces,5);
  assert.equal(mythicSetPieceCount(Object.values(restored.hero.equip).filter(Boolean).map(equipmentBaseName),'amaterasu'),5);
  const rolls={now:1000000,roll:.99,choice:.5,spawnRoll:.5,retaliationRoll:.5,encounterCountRoll:.99999,materialRolls:[1,1,1],gearDropRoll:1,gearChoiceRoll:0,fusionCoreRoll:1,sealDropRoll:1,sealChoiceRoll:0};
  const deps={addLog:(logs,msg)=>[msg,...logs],grantXp,enterInn:enterGameInnAction,leaveInn:leaveGameInnAction};
  const battle=runDungeonAction({...restored,hanyangPrologueStep:'completed',dungeon:freshDungeon()},'start',rolls.now,'e_starter_pirate',rolls,deps);
  assert.equal(battle.dungeon.realtime.players.find(unit=>unit.id==='hero').amaterasuGaze,true);
});

test('quality decoration keeps real identity; missing, unknown, duplicated or misplaced pieces do not grant a full set',()=>{
  const equip=fullSet();
  for(const item of Object.values(equip))item.name='金色・'+item.name;
  assert.equal(hasFullAmaterasuSet(equip),true);
  for(const slot of Object.keys(equip))assert.equal(hasFullAmaterasuSet({...equip,[slot]:null}),false);
  assert.equal(hasFullAmaterasuSet(Object.fromEntries(Object.keys(equip).map(slot=>[slot,equip.helm]))),false);
  assert.equal(hasFullAmaterasuSet({...equip,helm:{...equip.helm,name:'T10 天照假頭盔'}}),false);
  assert.equal(hasFullAmaterasuSet({...equip,helm:{...equip.helm,uid:equip.armor.uid}}),false);
  assert.equal(hasFullAmaterasuSet({...equip,helm:{...equip.helm,slot:'weapon'}}),false);
  assert.equal(hasFullAmaterasuSet({...equip,helm:{...equip.helm,name:'+1 未知天照',socketGem:undefined}}),false);
});

test('current generic skill energy is fixed at 100, unlike mercenary equipment MP; audit this limitation explicitly',()=>{
  for(const templateId of ['hero','general-test','merchant-spear'])for(const maxMp of [0,40,480,10000]){
    const raw={id:'test',side:'player',templateId,hp:100,maxHp:100,atk:10,def:0,attackInterval:1,mp:maxMp*.75,maxMp,position:{row:0,col:0}};
    const battle=new MercenaryRealtimeBattleSystem([raw],[],{autoSkill:false});
    const engineMax=templateId==='merchant-spear'?maxMp:100;
    assert.equal(battle.players[0].maxMp,engineMax);
    assert.equal(battle.players[0].mp,Math.min(engineMax,raw.mp));
    const restored=MercenaryRealtimeBattleSystem.fromSnapshot(battle.snapshot());
    assert.equal(restored.players[0].maxMp,engineMax);
    assert.equal(restored.players[0].mp,Math.min(engineMax,raw.mp));
  }
});
