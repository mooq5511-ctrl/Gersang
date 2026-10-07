import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {curveFixture} from '../scripts/measure-equipment-curve.mjs';
const require=createRequire(import.meta.url);
const {confirmGemInvestment}=require('../app/gem-investment-confirmation.ts');
const {gemInvestmentPreview}=require('../app/gem-investment-preview.ts');
const {gemSocketResult}=require('../app/gem-socket-quote.ts');
const {officialGems}=require('../data/items/official-gems.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {socketGemAction}=require('../app/game-inventory-actions.ts');
const log=(logs,message)=>[message,...logs];

test('cancel a real no-gain spear agility recipe without deducting funds or changing equipment',()=>{
  const unit=structuredClone(curveFixture(12,'spear','live',12,'普通',0,null,true).units[1]);
  const state={...freshGame(),gold:10000000,mercs:[unit]}, before=structuredClone(state);
  const gem=officialGems.find(gem=>gem.id==='placer');
  const quote=gemSocketResult(unit.equip.weapon,gem,0,1);
  assert.equal(quote.ok,true);
  const preview=gemInvestmentPreview(unit,'weapon',quote.item);
  assert.equal(preview.unchanged,true);
  let prompts=0,next=state;
  if(confirmGemInvestment(preview,quote,gem.name,message=>{
    prompts++;
    assert.ok(message.includes(`${quote.amount} 顆`));
    assert.ok(message.includes(quote.cost.toLocaleString('zh-TW')));
    return false;
  }))next=socketGemAction(state,unit.uid,'weapon',gem.id,0,1,log,()=>{});
  assert.equal(prompts,1);
  assert.strictEqual(next,state);
  assert.deepEqual(state,before);
  assert.equal(confirmGemInvestment(preview,quote,gem.name,()=>true),true);
  const accepted=socketGemAction(state,unit.uid,'weapon',gem.id,0,1,log,()=>{});
  assert.equal(state.gold-accepted.gold,quote.cost);
  assert.deepEqual(accepted.mercs[0].equip.weapon,quote.item);
});

test('any real capability increase skips the no-gain confirmation, including support stats',()=>{
  for(const key of ['attack','defense','maxHp','maxMp','intelligence','speed','accuracy']){
    const delta=Object.fromEntries(['attack','defense','maxHp','maxMp','intelligence','speed','accuracy'].map(stat=>[stat,stat===key?1:0]));
    assert.equal(confirmGemInvestment({delta,unchanged:false},{amount:2,cost:12000},'寶石',()=>assert.fail('unexpected prompt')),true);
  }
});

test('confirmation uses charged quantity and price, not requested overflow amount',()=>{
  let message='';
  assert.equal(confirmGemInvestment({unchanged:true,delta:{}},{amount:2,cost:12000},'寶石',text=>{message=text;return false;}),false);
  assert.match(message,/2 顆寶石/);
  assert.match(message,/12,000/);
});
