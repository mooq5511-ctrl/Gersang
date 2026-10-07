import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
import {auditFreshPrologue} from '../scripts/audit-fresh-prologue.mjs';
const require=createRequire(import.meta.url);
const {getFirstPromotionObjective}=require('../app/first-promotion-objective.ts');
const {getProgressionView}=require('../app/game-progression-view.ts');
const {freshRelicDungeon}=require('../app/relic-dungeon.tsx');
const fixture=(level=1,rank=1,materials={})=>({mercs:[{templateId:'merchant-spear',level,promotionStage:rank}],restingMercs:[],materials});

test('growth guidance uses real promotion level, not hero level or the Boss label',()=>{
  const game=fixture(11), before=structuredClone(game);
  const objective=getFirstPromotionObjective(game);
  assert.equal(objective.tab,'battle');
  assert.equal(objective.mapId,'starter-outskirts');
  assert.equal(objective.monsterName,'斷道刀客');
  assert.match(objective.detail,/11 \/ 12/);
  assert.deepEqual(game,before);
});
test('wrong-rank seals do not satisfy first promotion and the guide explains actual sources',()=>{
  const objective=getFirstPromotionObjective(fixture(12,1,{'精銳兵符':10}));
  assert.equal(objective.tab,'battle');
  assert.match(objective.detail,/1.5%/);
  assert.match(objective.detail,/黑巾斥候/);
  assert.equal(objective.monsterName,'斷道刀客');
});
test('either complete branch seal points to a choice without choosing for the player',()=>{
  for(const name of ['長槍兵符','長弓兵符']){
    const game=fixture(12,1,{[name]:1}), before=structuredClone(game);
    assert.equal(getFirstPromotionObjective(game).tab,'squad');
    assert.deepEqual(game,before);
  }
});
test('resting mercs count, promoted branches finish the guide and unrelated units do not block progress',()=>{
  const game=fixture(12);
  game.restingMercs=game.mercs;game.mercs=[];
  assert.ok(getFirstPromotionObjective(game));
  game.restingMercs[0].templateId='merchant-promotion-bow';game.restingMercs[0].promotionStage=2;
  assert.equal(getFirstPromotionObjective(game),null);
  assert.equal(getFirstPromotionObjective({mercs:[{templateId:'other',level:12}],restingMercs:[],materials:{}}),null);
});

test('actual main objective preserves first exploration and live expedition, then guides promotion',()=>{
  const game=auditFreshPrologue({captureState:true}).state;
  game.trade={...game.trade,trips:1};
  game.relicDungeon=freshRelicDungeon();
  assert.equal(getProgressionView(game).mainObjective.title,'派遣傭兵探索沉沒遺跡');
  game.relicDungeon.status='dispatching';
  const firstDispatch=structuredClone(game), waiting=getProgressionView(game).mainObjective;
  assert.equal(waiting.tab,'relic');
  assert.match(waiting.detail,/30分鐘/);
  assert.match(waiting.detail,/未派遣.*斷道刀客/);
  assert.match(waiting.detail,/自動補給/);
  assert.deepEqual(game,firstDispatch);
  game.relicDungeon.status='idle';
  game.relicDungeon={...game.relicDungeon,materialsFound:3,progress:18};
  const before=structuredClone(game);
  assert.equal(getProgressionView(game).mainObjective.title,'首次轉職整備・傭兵達到 Lv.12');
  assert.deepEqual(game,before);
  game.relicDungeon.status='dispatching';
  assert.equal(getProgressionView(game).mainObjective.title,'等待第一層遺跡回報');
  assert.match(getProgressionView(game).mainObjective.detail,/不必停留在遺跡頁/);
  game.relicDungeon.status='boss';
  assert.equal(getProgressionView(game).mainObjective.title,'討伐遺跡第一層 Boss');
});

test('after first promotion, manual relic preparation never requires exploration 100%',()=>{
  const game=auditFreshPrologue({captureState:true}).state;
  game.trade={...game.trade,trips:1};
  game.mercs[0]={...game.mercs[0],templateId:'merchant-promotion-spear',promotionStage:2,level:12};
  game.relicDungeon={...freshRelicDungeon(),materialsFound:3};
  for(const progress of [0,18,72,100]){
    game.relicDungeon.progress=progress;
    const before=structuredClone(game), objective=getProgressionView(game).mainObjective;
    assert.match(objective.title,/討伐前整備/);
    assert.match(objective.detail,/手動討伐不需探索100%/);
    assert.doesNotMatch(objective.title,/累積.*探索/);
    assert.deepEqual(game,before);
  }
});

test('second relic layer distinguishes optional exploration from direct Boss challenge',()=>{
  const game=auditFreshPrologue({captureState:true}).state;
  game.trade={...game.trade,trips:1};
  game.relicDungeon={...freshRelicDungeon(),materialsFound:3,clearedRuns:1,progress:0};
  const before=structuredClone(game),objective=getProgressionView(game).mainObjective;
  assert.equal(objective.title,'組織第二層 Boss 討伐');
  assert.match(objective.detail,/不需再次探索100%/);
  assert.deepEqual(game,before);
  game.relicDungeon.status='dispatching';
  assert.equal(getProgressionView(game).mainObjective.title,'等待遺跡第二層回報');
  game.relicDungeon.status='boss';
  assert.equal(getProgressionView(game).mainObjective.title,'討伐遺跡第二層 Boss');
});
