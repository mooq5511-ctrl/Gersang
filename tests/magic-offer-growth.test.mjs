import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../scripts/measure-equipment-early.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {purchaseMagicEquipmentAction}=require('../app/game-inventory-actions.ts');
const {v1MagicEquipmentPrice,v1RandomEquipmentTier}=require('../app/equipment-v1-policy.ts');
const log=(logs,message)=>[...logs,message];

test('magic offer follows actual character growth rather than disconnected road progress',()=>{
  for(const [level,stage] of [[1,200],[19,200],[20,1],[35,1],[250,1]]){
    const game=freshGame('商店成長測試'),state={...game,hero:{...game.hero,level},stage,gold:1000000};
    const before=JSON.stringify(state),next=purchaseMagicEquipmentAction(state,()=>.7,log,()=>{});
    assert.equal(next.inventory[0].requiredLevel,v1RandomEquipmentTier(level));
    assert.ok(next.inventory[0].requiredLevel<=level);
    assert.equal(next.gold,state.gold-v1MagicEquipmentPrice(level));
    assert.equal(next.stage,stage);assert.equal(next.newbieBossDefeated,false);
    assert.equal(JSON.stringify(state),before);
  }
});

test('new tier quote rejects outdated low funds before any generation and is used by UI',()=>{
  const game=freshGame('資金核對'),state={...game,hero:{...game.hero,level:20},stage:1,gold:v1MagicEquipmentPrice(1)};
  assert.ok(state.gold<v1MagicEquipmentPrice(20));let message='';
  assert.equal(purchaseMagicEquipmentAction(state,()=>assert.fail('must not roll'),log,text=>{message=text;}),state);
  assert.ok(message.includes(v1MagicEquipmentPrice(20).toLocaleString('zh-TW')));
  const ui=readFileSync(new URL('../app/game-city-page.tsx',import.meta.url),'utf8');
  const counter=ui.split('\n').find(line=>line.includes('enchant-counter'));
  assert.ok(counter.includes('v1MagicEquipmentPrice(game.hero.level)'));
  assert.ok(counter.includes('v1RandomEquipmentTier(game.hero.level)'));
  assert.ok(!counter.includes('game.stage'));
});
