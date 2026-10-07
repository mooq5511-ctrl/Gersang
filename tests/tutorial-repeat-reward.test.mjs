import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {MONSTER_REDESIGN}=require('../data/monsters/monster-redesign.ts');
const {DUNGEONS,dungeonStep,freshDungeon}=require('../app/dungeon-engine.ts');
const {sourceEnemies}=require('../app/v17-content.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {syncHanyangReturnProgress}=require('../app/hanyang-story-transitions.ts');
const id='e_starter_black_bandit';
test('scripted scout retains requested combat values while engine and displayed repeat XP agree',()=>{
  const design=MONSTER_REDESIGN[id],enemy=sourceEnemies.find(e=>e.dungeonId===id);
  assert.equal(design.hp,52);assert.equal(design.atk,5);
  assert.equal(design.physicalDefense,0);assert.equal(design.magicDefense,0);
  assert.equal(design.xp,40);assert.equal(DUNGEONS[id].xp,40);assert.equal(enemy.xp,40);
  assert.equal(enemy.hp,52);assert.equal(enemy.attack,5);
  assert.equal(MONSTER_REDESIGN.e_starter_pirate.xp,290);
});
test('real encounter pays the calibrated repeat reward without requiring a new tutorial gate',()=>{
  const hero={hp:1000,maxHp:1000,mp:0,maxMp:0,str:80,dex:15,attack:100,defense:52,mercenaryIntelligence:0};
  const party=[{...hero,uid:'hero',templateId:'hero',name:'hero',position:'前排',accuracy:100,attackInterval:2}];
  let result=dungeonStep(freshDungeon(),hero,'start',1000,id,.99,0,0,.99,party,0,[1,1],false,0);
  for(let now=1050;result.state.status==='fighting'&&now<31000;now+=50)
    result=dungeonStep(result.state,{...hero,hp:result.hp},'tick',now,id,.99,0,0,.99,result.party,0,[1,1],false,0);
  assert.ok(result.reward,'scout remains beatable');
  assert.equal(result.reward.xp,40);
  assert.ok(result.hp>0);
});
test('first trial retains a one-time training reward but re-entry cannot duplicate it',()=>{
  const original=freshGame('trial-receipt');
  const state={...original,hanyangPrologueStep:'bandit-trial',
    dungeon:{...freshDungeon(),status:'respawning',logs:['成功擊敗黑巾斥候']}};
  const next=syncHanyangReturnProgress(state);
  assert.ok(next.hero.xp>state.hero.xp||next.hero.level>state.hero.level);
  assert.equal(next.hanyangPrologueFlags.caravanRestored,true);
  assert.equal(next.hanyangPrologueStep,'caravan-delivery');
  assert.equal(next.gold,state.gold);assert.equal(next.inventory,state.inventory);
  assert.equal(syncHanyangReturnProgress(next),next);
  const stale={...next,hanyangPrologueStep:'bandit-trial',dungeon:state.dungeon};
  assert.equal(syncHanyangReturnProgress(stale).hero,stale.hero);
  assert.equal(state.hanyangPrologueFlags.caravanRestored,original.hanyangPrologueFlags.caravanRestored);
});
test('training reward reaches deployed members only and its receipt survives serialization',()=>{
  const original=freshGame('deployed-trial');
  const deployed={...original.hero,uid:'trial-deployed',templateId:'merchant-spear',xp:0};
  const resting={...deployed,uid:'trial-resting'};
  const state={...original,mercs:[deployed,resting],active:[deployed.uid],hanyangPrologueStep:'bandit-trial',
    dungeon:{...freshDungeon(),status:'respawning',logs:['成功擊敗黑巾斥候']}};
  const next=syncHanyangReturnProgress(state);
  assert.ok(next.mercs[0].xp>0||next.mercs[0].level>deployed.level);
  assert.equal(next.mercs[1],resting);
  const restored=JSON.parse(JSON.stringify(next));
  restored.hanyangPrologueStep='bandit-trial';restored.dungeon=state.dungeon;
  const replay=syncHanyangReturnProgress(restored);
  assert.equal(replay.hero,restored.hero);
  assert.equal(replay.mercs,restored.mercs);
  assert.equal(replay.logs,restored.logs);
});
