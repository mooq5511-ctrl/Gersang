import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {auditFreshPrologue} from '../scripts/audit-fresh-prologue.mjs';
const require=createRequire(import.meta.url);
const {v1EquipmentPrice}=require('../app/equipment-price-policy.ts');
const {wearableCatalog}=require('../app/wearable-catalog.ts');
const {legacyWearableCatalog}=require('../app/wearable-catalog-legacy.ts');
const {equipmentAtTier,EQUIPMENT_TIER_LEVELS,tierEquipmentPrice}=require('../app/tier-equipment.ts');
const {v1Definition}=require('../app/equipment-v1-policy.ts');
const {makeWearableEquipment,makeOfficialEquipment,applyShopQuality}=require('../app/game-equipment-factory.ts');
const {equipmentSellPrice}=require('../app/equipment-market.ts');
const {purchaseEquipmentBatchAction,equipInventoryItemAction}=require('../app/game-inventory-actions.ts');
const {worldCities}=require('../app/v15-data.ts');
const {officialEquipment}=require('../data/items/official-equipment.ts');
const {legacyOfficialEquipment}=require('../data/items/official-equipment-legacy.ts');

test('starter price policy is monotonic and preserves every existing level20-and-up series quote',()=>{
  const parts=['weapon','helm','armor','gloves','waist','boots','accessory'];
  const factor=part=>part==='weapon'?1.3:part==='armor'?1.15:1;
  for(const part of parts){
    let previous=0;
    for(let level=1;level<=250;level++){
      const quote=v1EquipmentPrice(level,part);
      assert.ok(Number.isSafeInteger(quote)&&quote>previous);
      previous=quote;
      if(level>=20)assert.equal(quote,Math.round((1000+level**2*2)*factor(part)));
    }
  }
  for(const level of EQUIPMENT_TIER_LEVELS)for(const item of equipmentAtTier(level))assert.equal(tierEquipmentPrice(item),v1EquipmentPrice(level,item.part));
  for(const level of [0,-1,251,1.5,NaN,Infinity])assert.throws(()=>v1EquipmentPrice(level,'armor'),RangeError);
  assert.throws(()=>v1EquipmentPrice(1,'invalid'),RangeError);
  assert.throws(()=>v1EquipmentPrice(1,'constructor'),RangeError);
});

test('new wearable prices match canonical resale and cannot be recycled for profit at any actual city',()=>{
  assert.equal(legacyWearableCatalog.find(item=>item.id==='guild-sword').price,2000);
  assert.equal(legacyWearableCatalog.find(item=>item.id==='guild-armor').price,3000);
  for(const base of wearableCatalog){
    const item=makeWearableEquipment(base,'price-test');
    assert.equal(base.price,v1Definition(item).price);
    for(const quality of ['普通','稀有','史詩','傳說','金色'])for(const city of worldCities){
      assert.ok(equipmentSellPrice(applyShopQuality(item,quality))<Math.floor(base.price*city.priceFactor));
    }
  }
});

test('earned prologue money buys core defense for hero and first mercenary while retaining a supply reserve',()=>{
  const report=auditFreshPrologue({seed:1,captureState:true});
  let game=report.state;
  const initialGold=game.gold,city=worldCities.find(entry=>entry.id===game.city);
  const purchases=[['hero','guild-armor'],['hero','guild-helm'],[game.mercs[0].uid,'guild-sword'],[game.mercs[0].uid,'guild-armor'],[game.mercs[0].uid,'guild-helm']];
  let total=0;
  for(const [index,[uid,id]] of purchases.entries()){
    const base=wearableCatalog.find(item=>item.id===id),price=Math.floor(base.price*city.priceFactor),itemUid=`earned-core-${index}`;
    game=purchaseEquipmentBatchAction(game,1,price,base.name,()=>makeWearableEquipment(base,itemUid),(logs,message)=>[message,...logs],()=>{});
    assert.ok(game.inventory.some(item=>item.uid===itemUid));
    game=equipInventoryItemAction(game,itemUid,base.slot,uid,(logs,message)=>[message,...logs]);
    total+=price;
  }
  assert.equal(total,1029);
  assert.equal(game.gold,initialGold-total);
  assert.ok(game.gold>=1000);
  assert.equal(game.hero.equip.weapon.name,'商路短劍');
  assert.ok(game.hero.equip.armor&&game.hero.equip.helm);
  assert.ok(game.mercs[0].equip.weapon&&game.mercs[0].equip.armor&&game.mercs[0].equip.helm);
});

test('three early official offers share the starter price curve without altering high-level or archived prices',()=>{
  const early=officialEquipment.filter(record=>record.level<20);
  assert.deepEqual(early.map(record=>record.id),['wood-blade','leather','tiger-hide']);
  for(const record of officialEquipment){
    const legacy=legacyOfficialEquipment.find(entry=>entry.id===record.id);
    assert.equal(record.price,record.level<20?v1EquipmentPrice(record.level,record.kind):legacy.price);
    assert.equal(record.price,v1Definition({definitionId:`official-${record.id}`,balanceVersion:'equipment-v1-20261004'}).price);
  }
  assert.equal(legacyOfficialEquipment.find(record=>record.id==='wood-blade').price,1800);
  assert.equal(legacyOfficialEquipment.find(record=>record.id==='leather').price,1200);
  assert.equal(legacyOfficialEquipment.find(record=>record.id==='tiger-hide').price,3200);
  for(const record of early)for(const quality of ['普通','稀有','史詩','傳說','金色']){
    const item=makeOfficialEquipment(record,quality);
    for(const city of worldCities)assert.ok(equipmentSellPrice(item)<Math.floor(record.price*city.priceFactor));
  }
  const hanyang=worldCities.find(city=>city.name==='漢陽');
  assert.deepEqual(early.map(record=>Math.floor(record.price*hanyang.priceFactor)),[943,390,1013]);
});
