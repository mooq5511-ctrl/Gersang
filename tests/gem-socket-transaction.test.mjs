import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {socketGemAction}=require('../app/game-inventory-actions.ts');
const {gemSocketQuote}=require('../app/gem-socket-quote.ts');
const {officialGems}=require('../data/items/official-gems.ts');
const gem=officialGems[0],log=(logs,message)=>[message,...logs];
const fixture=()=>{const state=freshGame('quote');return {...state,gold:1000000,hero:{...state.hero,equip:{weapon:{uid:'socket',name:'武器',slot:'weapon',atk:10,def:0,hp:0,enhance:0,rarity:'普通',image:'',bonus:{str:0,agi:0,vit:0,intel:0}}}}};};
test('invalid grades, quantities, funds and metadata never change resources or equipment',()=>{
  for(const [grade,amount] of [...[-1,3,.5,NaN,Infinity].map(grade=>[grade,1]),...[0,-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1].map(amount=>[0,amount])]){
    const state=fixture(),before=structuredClone(state);
    assert.strictEqual(socketGemAction(state,'hero','weapon',gem.id,grade,amount,log,()=>{}),state);assert.deepEqual(state,before);
  }
  for(const gold of [NaN,Infinity,-1,5999]){const state={...fixture(),gold};assert.strictEqual(socketGemAction(state,'hero','weapon',gem.id,0,1,log,()=>{}),state);}
  for(const socketGem of [{id:gem.id,count:NaN,totalValue:0},{id:gem.id,count:-1,totalValue:0},{id:gem.id,count:1,totalValue:Infinity}]){
    const state=fixture();state.hero.equip.weapon.socketGem=socketGem;
    assert.strictEqual(socketGemAction(state,'hero','weapon',gem.id,0,1,log,()=>{}),state);
  }
});
test('quoted remaining capacity matches atomic charge and added value across all recipes',()=>{
  for(const gem of officialGems)for(let grade=0;grade<3;grade++){
    let state=fixture();state.gold=gem.costs[grade]*100;
    state=socketGemAction(state,'hero','weapon',gem.id,grade,98,log,()=>{});
    const quote=gemSocketQuote(state.hero.equip.weapon,gem,grade,10);
    assert.equal(quote.ok,true);assert.equal(quote.amount,2);
    const next=socketGemAction(state,'hero','weapon',gem.id,grade,10,log,()=>{});
    assert.equal(state.gold-next.gold,quote.cost);assert.equal(next.gold,0);
    assert.equal(next.hero.equip.weapon.socketGem.count,100);
    assert.equal(next.hero.equip.weapon.socketGem.totalValue,gem.values[grade]*100);
    assert.match(next.logs[0],new RegExp(`品級 ${grade+1}・2 顆，支付 ${quote.cost.toLocaleString('en-US')} 兩`));
    assert.strictEqual(socketGemAction(next,'hero','weapon',gem.id,grade,1,log,()=>{}),next);
  }
});
test('unknown targets, empty slots and a different gem do not consume money',()=>{
  const state=fixture();
  assert.strictEqual(socketGemAction(state,'missing','weapon',gem.id,0,1,log,()=>{}),state);
  assert.strictEqual(socketGemAction(state,'hero','armor',gem.id,0,1,log,()=>{}),state);
  const added=socketGemAction(state,'hero','weapon',gem.id,0,1,log,()=>{});
  assert.strictEqual(socketGemAction(added,'hero','weapon',officialGems[1].id,0,1,log,()=>{}),added);
});
