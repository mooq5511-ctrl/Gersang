import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {rollEquipment,rollRelicEquipment,makeUid}=require('../app/game-equipment-factory.ts');
const {v1Definition,v1MagicEquipmentPrice,v1RandomEquipmentTier}=require('../app/equipment-v1-policy.ts');
const {effectiveEquipmentStats}=require('../app/equipment-stats.ts');
const {equipmentSellPrice}=require('../app/equipment-market.ts');
const {purchaseMagicEquipmentAction}=require('../app/game-inventory-actions.ts');
const {relicDropEquipmentLevel,relicCraftEquipmentLevel}=require('../app/relic-equipment-rewards.ts');
const {RELIC_DUNGEON_MONSTERS,RELIC_BOSS_IDS}=require('../data/monsters/relic-dungeon-monsters.ts');
const {magicAffixes}=require('../app/v15-data.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const log=(logs,message)=>[message,...logs];

test('random gear uses known series identity, appropriate real tier, requested slot and unscaled core',()=>{
  const original=Math.random;
  try {
    Math.random=()=>assert.fail('injected loot randomness must not call global random');
    for(const level of [1,12,20,35,36,56,72,112,162,212,250]) for(const slot of ['weapon','helm','armor','gloves','amulet','boots','ring']) {
      const item=rollEquipment(level,true,slot,()=>.4),definition=v1Definition(item);
      assert.ok(definition);assert.equal(item.slot,slot);
      assert.equal(item.requiredLevel,v1RandomEquipmentTier(level));assert.ok(item.requiredLevel<=level);
      assert.deepEqual({atk:item.atk,def:item.def,hp:item.hp},{atk:definition.atk,def:definition.def,hp:definition.hp});
      assert.equal(new Set(item.magic.map(affix=>affix.id)).size,item.magic.length);
      for(const affix of item.magic)assert.equal(affix.value,magicAffixes.find(source=>source.id===affix.id).value);
    }
  } finally {Math.random=original;}
  assert.throws(()=>rollEquipment(20,false,'invalid',()=>0));
});

test('relic weighted qualities and guarantee share V1 factors without layer or quality rebaking',()=>{
  for(const [roll,rarity,count,multiplier] of [[0,'普通',0,1],[.61,'稀有',1,1.2],[.86,'史詩',2,1.5],[.96,'傳說',3,2],[.996,'金色',4,2.5]]) {
    const item=rollRelicEquipment(162,()=>roll),definition=v1Definition(item);
    assert.equal(item.rarity,rarity);assert.equal(item.magic.length,count);assert.equal(item.requiredLevel,150);
    for(const stat of ['atk','def','hp'])assert.equal(effectiveEquipmentStats(item)[stat],Math.floor(definition[stat]*multiplier));
    for(const affix of item.magic)assert.equal(affix.value,magicAffixes.find(source=>source.id===affix.id).value);
  }
  assert.equal(rollRelicEquipment(72,()=>0,true).rarity,'稀有');
});

test('actual magic offer transaction quotes and charges one atomic tier price and rejects low funds before rolls',()=>{
  const game=freshGame('附魔交易測試');
  const original={...game,hero:{...game.hero,level:200},stage:200,gold:1_000_000,inventory:[]};
  const poor={...original,gold:0};
  assert.strictEqual(purchaseMagicEquipmentAction(poor,()=>assert.fail('no generation without funds'),log,()=>{}),poor);
  const next=purchaseMagicEquipmentAction(original,()=>0,log,()=>{});
  assert.equal(next.gold,original.gold-v1MagicEquipmentPrice(200));assert.equal(next.inventory.length,1);
  assert.equal(next.inventory[0].rarity,'傳說');assert.ok(v1Definition(next.inventory[0]));
  assert.ok(equipmentSellPrice(next.inventory[0])<v1MagicEquipmentPrice(200));
  const restored=restoreGame(JSON.parse(serializeGameForStorage(next)));
  assert.deepEqual(effectiveEquipmentStats(restored.inventory[0]),effectiveEquipmentStats(next.inventory[0]));
});

test('every possible magic offer resale is below its quoted price across all 250 input levels',()=>{
  for(let level=1;level<=250;level++)for(const slot of ['weapon','helm','armor','gloves','amulet','boots','ring']) {
    const item=rollEquipment(level,true,slot,()=>0);
    for(const rarity of ['普通','稀有','史詩','傳說','金色'])assert.ok(equipmentSellPrice({...item,rarity})<v1MagicEquipmentPrice(level));
  }
});

test('relic reward levels follow real encounter identities and forge follows a real boss capped by hero level',()=>{
  for(const id of RELIC_BOSS_IDS) {
    const level=relicDropEquipmentLevel(id);
    assert.equal(level,RELIC_DUNGEON_MONSTERS[id].level);
    assert.equal(rollRelicEquipment(level,()=>0,true).requiredLevel,v1RandomEquipmentTier(level));
  }
  assert.equal(relicDropEquipmentLevel('missing'),1);
  assert.equal(relicCraftEquipmentLevel(250,Infinity),relicCraftEquipmentLevel(250,0));
  assert.equal(relicCraftEquipmentLevel(250,NaN),relicCraftEquipmentLevel(250,0));
  for(const heroLevel of [1,20,70,120,250])for(let run=0;run<4;run++)assert.ok(relicCraftEquipmentLevel(heroLevel,run)<=heroLevel);
  const ids=Array.from({length:100},()=>makeUid('same'));
  assert.equal(new Set(ids).size,ids.length);
});
