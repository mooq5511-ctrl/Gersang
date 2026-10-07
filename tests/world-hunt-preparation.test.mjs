import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {worldHuntPreparation}=require('../app/world-hunt-preparation.ts');
const unit=(extra={})=>({points:0,equip:{weapon:{},armor:{}},...extra});

test('early hunting advice reports only deployed equipment and earned points without mutation',()=>{
  const hero=unit({points:3}),active=[unit({templateId:'merchant-spear',promotionStage:1,points:2,equip:{weapon:{}}})];
  const before=structuredClone({hero,active});
  const advice=worldHuntPreparation('starter-outskirts',hero,active);
  assert.match(advice.detail,/目前2人出戰/);
  assert.match(advice.detail,/有5點能力尚未分配/);
  assert.match(advice.detail,/1人尚未同時裝上武器與防具/);
  assert.match(advice.detail,/斷道刀客.*Lv.12.*二階兵符/);
  assert.deepEqual({hero,active},before);
});
test('promoted spear and bow do not receive a duplicate first-promotion instruction',()=>{
  for(const templateId of ['merchant-spear','merchant-promotion-bow']){
    const advice=worldHuntPreparation('starter-outskirts',unit(),[unit({templateId,promotionStage:2})]);
    assert.doesNotMatch(advice.detail,/傭兵至Lv.12/);
    assert.match(advice.detail,/已轉職不代表能穩定掛機/);
    assert.doesNotMatch(advice.detail,/尚未分配|尚未同時裝上/);
  }
});
test('other regions receive no starter-specific advice and absent core equipment is reported safely',()=>{
  assert.equal(worldHuntPreparation('japan-sea',unit(),[]),null);
  const advice=worldHuntPreparation('starter-outskirts',unit({equip:{},points:-2}),[]);
  assert.match(advice.detail,/目前1人出戰/);
  assert.match(advice.detail,/1人尚未同時裝上/);
  assert.doesNotMatch(advice.detail,/有-2點/);
  assert.match(advice.detail,/不必隨等級立刻換怪/);
});
test('supply facts report actual stock and setting without claiming that enabled means stocked',()=>{
  for(const enabled of [true,false]){
    const supplies={medicines:{healing:0},autoPotion:{enabled}},before=structuredClone(supplies);
    const advice=worldHuntPreparation('starter-outskirts',unit(),[],supplies);
    assert.match(advice.detail,/金創藥0枚/);
    assert.ok(advice.detail.includes(enabled?'自動補給已開啟':'自動補給未開啟'));
    assert.deepEqual(supplies,before);
  }
  assert.match(worldHuntPreparation('starter-outskirts',unit(),[],{medicines:{healing:7},autoPotion:{enabled:true}}).detail,/金創藥7枚/);
});
