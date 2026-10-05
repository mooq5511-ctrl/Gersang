import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {getGameView}=require('../app/game-view-selector.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {HANYANG_PROLOGUE_STEPS}=require('../app/hanyang-prologue.ts');
test('locked town always includes the objective NPC without modifying story, resources or unlocks',()=>{
  for(const {step} of HANYANG_PROLOGUE_STEPS){
    const game={...freshGame('town'),hanyangPrologueStep:step},before=structuredClone(game);
    const view=getGameView({game,activeTab:'map',cityService:'weapon',selectedUid:'hero',treasureQuery:''});
    if(view.tutorialMapLocked&&view.mainObjective.npcId)assert.ok(view.tutorialNpcIds.includes(view.mainObjective.npcId),step);
    assert.deepEqual(game,before);
  }
});
test('funds, crisis and delivery show the merchant while arrival, return and departure keep the village chief',()=>{
  for(const [step,npc] of [['journey-fund','wang-deokchang'],['caravan-crisis','wang-deokchang'],['caravan-delivery','wang-deokchang'],['arrival','kim-seongho'],['return','kim-seongho'],['departure','kim-seongho']]){
    const view=getGameView({game:{...freshGame('town'),hanyangPrologueStep:step},activeTab:'map',cityService:'weapon',selectedUid:'hero',treasureQuery:''});
    assert.equal(view.tutorialMapLocked,true);assert.deepEqual(view.tutorialNpcIds,[npc]);
  }
});
