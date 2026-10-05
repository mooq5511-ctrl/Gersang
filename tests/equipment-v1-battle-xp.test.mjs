import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {equipmentAtTier,makeTierEquipment}=require('../app/tier-equipment.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {freshDungeon}=require('../app/dungeon-engine.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {grantXp}=require('../app/game-progression.ts');
const deps={addLog:(logs,text)=>[text,...logs],grantXp,enterInn:state=>state,leaveInn:state=>state};
const rolls={roll:.99,choice:0,spawnRoll:0,encounterCountRoll:0,retaliationRoll:.99,materialRolls:[1,1,1],gearDropRoll:1,fusionCoreRoll:1};

function fight(value) {
  let game=freshGame('新版契印實戰');
  const weapon={...makeTierEquipment(equipmentAtTier(120)[0],'xp-weapon','test'),enhanceBonuses:value?[{id:'xp',stat:'xpPercent',name:'求知契印',value}]:[]};
  game={...game,hero:{...game.hero,level:120,xp:0,equip:{...game.hero.equip,weapon}},hanyangPrologueStep:'completed',dungeon:{...freshDungeon(),autoHunt:true,lockedEnemyKey:'e_starter_raccoon'}};
  let now=1000;
  game=runDungeonAction(game,'start',now,'e_starter_raccoon',rolls,deps);
  while(game.dungeon.status==='fighting'&&now<11000) {
    now+=50;game=runDungeonAction(game,'tick',now,'e_starter_raccoon',rolls,deps);
  }
  return {game,now};
}

test('real kill settlement pays capped V1 XP, logs it, queues Auto Hunt and never pays twice on reload',()=>{
  const control=fight(0),enhanced=fight(80);
  assert.ok(control.game.kills>0);assert.equal(enhanced.game.kills,control.game.kills);
  assert.equal(enhanced.game.hero.xp,control.game.hero.xp*1.25);
  assert.ok(enhanced.game.logs.some(line=>/求知契印 \+25%/.test(line)));
  assert.ok(enhanced.game.battleLogs.some(entry=>entry.text?.startsWith('EXP +')||entry.message?.startsWith('EXP +')));
  assert.equal(enhanced.game.dungeon.autoHunt,true);
  assert.equal(enhanced.game.dungeon.status,'respawning');
  const restored=restoreGame(JSON.parse(serializeGameForStorage(enhanced.game)));
  assert.equal(restored.hero.equip.weapon.balanceVersion,enhanced.game.hero.equip.weapon.balanceVersion);
  const retried=runDungeonAction(restored,'tick',enhanced.now+1,'e_starter_raccoon',rolls,deps);
  assert.equal(retried.hero.xp,enhanced.game.hero.xp);
  assert.equal(retried.kills,enhanced.game.kills);
});
