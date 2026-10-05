import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/audit-fresh-prologue.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {worldCities}=require('../app/v15-data.ts');
const {createNpcController}=require('../app/game-npc-controller.ts');
const {npcById,awardNpcAffinity,hasNpcAffinityReward}=require('../app/npc-dialogue.ts');
const {hanyangNpcOptions,hanyangNpcGreeting}=require('../app/hanyang-npc-dialogue.ts');
const noop=()=>{};

function action(state,npc,option){
  let result=state;
  createNpcController({game:state,currentCity:worldCities.find(city=>city.id===state.city),setGame:update=>{result=update(result);},setNotice:noop,setActiveNpcId:noop,setActiveTab:noop,setCityService:noop,setNpcOpeningLine:noop}).handleNpcAction({npc,option});
  return result;
}

test('previously claimed merchant affinity cannot disable the separate crisis choice',()=>{
  const npc=npcById('wang-deokchang'),talk=npc.options.find(option=>option.label==='談談商道');
  const state=awardNpcAffinity({...freshGame('主線對話'),hanyangPrologueStep:'caravan-crisis'},npc,talk);
  const before=structuredClone(state),options=hanyangNpcOptions(state,npc.id);
  assert.equal(hasNpcAffinityReward(state.npcProgress,npc,talk),true);
  assert.equal(options.length,1);
  assert.equal(options[0].prologueStep,'caravan-crisis');
  assert.equal(hasNpcAffinityReward(state.npcProgress,npc,options[0]),false);
  assert.match(hanyangNpcGreeting(state,npc.id),/黑巾斥候/);
  const next=action(state,npc,options[0]);
  assert.equal(next.hanyangPrologueStep,'bandit-trial');
  assert.deepEqual(next.npcProgress.affinity,state.npcProgress.affinity);
  assert.deepEqual(next.npcProgress.affinityChoices,state.npcProgress.affinityChoices);
  assert.equal(next.gold,state.gold);
  assert.equal(next.logs.filter(line=>line.includes('王德昌：黑巾斥候堵住')).length,1);
  const replay=action(next,npc,options[0]);
  assert.equal(replay.hanyangPrologueStep,'bandit-trial');
  assert.equal(replay.logs.filter(line=>line.includes('王德昌：黑巾斥候堵住')).length,1);
  assert.deepEqual(state,before);
});

test('unrelated NPC, market services and old dialogue never advance the crisis',()=>{
  const state={...freshGame('不跳任務'),hanyangPrologueStep:'caravan-crisis'},merchant=npcById('wang-deokchang');
  for(const option of merchant.options)assert.equal(action(state,merchant,option).hanyangPrologueStep,'caravan-crisis',option.label);
  const chief=npcById('kim-seongho');
  assert.equal(action(state,chief,hanyangNpcOptions(state,merchant.id)[0]).hanyangPrologueStep,'caravan-crisis');
  for(const step of ['arrival','medicine','formation','bandit-trial','completed']){
    const other={...state,hanyangPrologueStep:step};
    assert.equal(action(other,merchant,hanyangNpcOptions(state,merchant.id)[0]).hanyangPrologueStep,step);
  }
});

test('story options are only offered for their actual NPC and current handoff step',()=>{
  for(const [step,id] of [['caravan-crisis','wang-deokchang'],['caravan-delivery','wang-deokchang'],['return','kim-seongho'],['departure','kim-seongho']]){
    const state={hanyangPrologueStep:step};
    assert.equal(hanyangNpcOptions(state,id)[0].prologueStep,step);
    assert.ok(hanyangNpcGreeting(state,id));
    assert.deepEqual(hanyangNpcOptions(state,'heo-muncheol'),[]);
  }
  assert.deepEqual(hanyangNpcOptions({hanyangPrologueStep:'completed'},'wang-deokchang'),[]);
  assert.equal(hanyangNpcGreeting({hanyangPrologueStep:'completed'},'wang-deokchang'),null);
});
