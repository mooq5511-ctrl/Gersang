import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/audit-fresh-prologue.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {freshDungeon}=require('../app/dungeon-engine.ts');
const {createNavigationController}=require('../app/game-navigation-controller.ts');
const {getFirstPromotionObjective}=require('../app/first-promotion-objective.ts');
const noop=()=>{};

function navigate(snapshot, latest=snapshot, mainObjective={title:'黑巾斥候',tab:'battle'}) {
  let state=latest, tab, updates=0, reveals=0;
  const controller=createNavigationController({game:snapshot,mainObjective,
    openNpcDialogue:noop,setActiveNpcId:noop,setCityService:noop,setNotice:noop,setNpcOpeningLine:noop,setSquadDestination:noop,
    revealBattleTarget:()=>{assert.equal(tab,'battle');reveals++;},
    setActiveTab:value=>{tab=value;},setGame:update=>{updates++;state=update(state);}});
  controller.goToObjective();
  return {state,tab,updates,reveals};
}
const fixture=(logs=[])=>({...freshGame('任務前往'),hanyangPrologueStep:'bandit-trial',
  dungeon:{...freshDungeon(),status:'respawning',logs}});

test('respawn or unrelated victories cannot mark the bandit cargo restored',()=>{
  for(const logs of [[],['成功擊敗偷糧狸'],['已撤出黑巾斥候戰鬥']]) {
    const state=fixture(logs), before=structuredClone(state), result=navigate(state);
    assert.equal(result.state,state);
    assert.equal(result.updates,0);
    assert.equal(result.reveals,0);
    assert.equal(result.tab,'battle');
    assert.equal(state.hanyangPrologueFlags.caravanRestored,false);
    assert.deepEqual(state,before);
  }
});

test('first-promotion forward action selects the real entry monster without giving rewards or starting auto hunt',()=>{
  const game={...freshGame('轉職前往'),hanyangPrologueStep:'completed',
    mercs:[{uid:'owned-spear',templateId:'merchant-spear',level:11,promotionStage:1}]};
  const result=navigate(game,game,getFirstPromotionObjective(game));
  assert.equal(result.tab,'battle');
  assert.equal(result.reveals,1);
  assert.equal(result.state.selectedMonster,'斷道刀客');
  assert.equal(result.state.dungeon.key,'e_starter_wako');
  assert.equal(result.state.dungeon.lockedEnemyKey,'e_starter_wako');
  assert.equal(result.state.dungeon.autoHunt,false);
  for(const field of ['gold','materials','inventory','mercs','hero','hanyangPrologueStep'])assert.deepEqual(result.state[field],game[field]);
});

test('confirmed bandit victory goes to cargo delivery without skipping handoff',()=>{
  const state=fixture(['成功擊敗黑巾斥候']), result=navigate(state);
  assert.equal(result.tab,'map');
  assert.equal(result.state.hanyangPrologueStep,'caravan-delivery');
  assert.equal(result.state.hanyangPrologueFlags.caravanRestored,true);
  assert.equal(result.state.hanyangPrologueFlags.caravanCargoDelivered,false);
  assert.equal(result.state.gold,state.gold);
  assert.equal(result.state.dungeon.status,'idle');
});

test('a stale victory snapshot cannot overwrite a newer encounter or completed story',()=>{
  const snapshot=fixture(['成功擊敗黑巾斥候']);
  for(const latest of [fixture(),{...fixture(),hanyangPrologueStep:'completed'},
    {...snapshot,dungeon:{...snapshot.dungeon,status:'fighting'}}]) {
    assert.equal(navigate(snapshot,latest).state,latest);
  }
});
