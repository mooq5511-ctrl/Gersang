import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {makeTierEquipment,equipmentAtTier}=require('../app/tier-equipment.ts');
const {fuseAllInventoryEquipmentAction,purchaseTierEquipmentAction}=require('../app/game-inventory-actions.ts');
const {planEquipmentFusion}=require('../app/equipment-fusion.ts');
const {effectiveEquipmentStats}=require('../app/equipment-stats.ts');
const {advanceEquipmentQuality,makeOfficialEquipment,makeWearableEquipment}=require('../app/game-equipment-factory.ts');
const {officialEquipment}=require('../data/items/official-equipment.ts');
const {wearableCatalog}=require('../app/wearable-catalog.ts');
const {equipmentSellPrice}=require('../app/equipment-market.ts');
const {enhanceEquipment,enhancementCost}=require('../app/guild-territory.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {v1Definition,v1WholeSetBudget}=require('../app/equipment-v1-policy.ts');
const {sanitizeEquip}=require('../app/game-save-normalizers.ts');
const {draftWholeSetBudget,curveDraftFullEquipment}=require('../app/equipment-curve-draft.ts');
const log=(logs,message)=>[message,...logs];
const gear=(uid,level=120)=>makeTierEquipment(equipmentAtTier(level)[0],uid,'test');
const state=items=>({...freshGame('新版交易測試'),gold:1_000_000,hero:{...freshGame('新版交易測試').hero,level:120},inventory:items});

test('canonical budgets match all 250 trial levels and every actual eight-slot series loadout',()=>{
  for(let level=1;level<=250;level++)assert.deepEqual(v1WholeSetBudget(level),draftWholeSetBudget(level));
  for(const level of [1,20,40,50,70,90,120,150,180,200]) {
    const expected=curveDraftFullEquipment(level,'金色',15);
    for(const spec of equipmentAtTier(level)) {
      const item={...makeTierEquipment(spec,'x','test'),rarity:'金色',enhance:15};
      const candidate=expected.find(row=>row.part===spec.part);
      assert.deepEqual(effectiveEquipmentStats(item),{atk:candidate.atk,def:candidate.def,hp:candidate.hp});
    }
  }
});

test('new fusion guarantees success, charges exactly once and never changes raw base or input',()=>{
  const original=state(['a','b','c'].map(uid=>gear(uid))),before=structuredClone(original);
  const plan=planEquipmentFusion(original.inventory,'普通');
  assert.equal(plan.batches,1);assert.equal(plan.consumedCount,3);
  assert.equal(plan.fee,Math.ceil(v1Definition(original.inventory[0]).price*.25));
  const next=fuseAllInventoryEquipmentAction(original,'普通',()=>assert.fail('guaranteed recipes do not roll'),log,()=>{});
  assert.equal(next.gold,original.gold-plan.fee);assert.equal(next.inventory.length,1);
  assert.equal(next.inventory[0].rarity,'稀有');assert.equal(next.inventory[0].atk,original.inventory[0].atk);
  assert.equal(effectiveEquipmentStats(next.inventory[0]).atk,Math.floor(original.inventory[0].atk*1.2));
  assert.match(next.logs[0],/支付.*成功 1 組/);assert.deepEqual(original,before);
});

test('insufficient funds, protected equipment and mixed versions never lose items',()=>{
  const items=['a','b','c'].map(uid=>gear(uid));
  const poor={...state(items),gold:0};
  assert.strictEqual(fuseAllInventoryEquipmentAction(poor,'普通',()=>0,log,()=>{}),poor);
  const legacy={...gear('legacy'),definitionId:undefined,balanceVersion:undefined};
  const mixed=state([items[0],items[1],legacy,{...gear('protected'),enhance:1},{...gear('gem'),socketGem:{id:'x'}}]);
  assert.equal(planEquipmentFusion(mixed.inventory,'普通').batches,0);
  assert.strictEqual(fuseAllInventoryEquipmentAction(mixed,'普通',()=>0,log,()=>{}),mixed);
});

test('mixed complete groups preserve old recipe and failed legacy material loss separately',()=>{
  const modern=['a','b','c'].map(uid=>({...gear(uid),rarity:'稀有'}));
  const legacy=Array.from({length:5},(_,i)=>({...gear(`old-${i}`),rarity:'稀有',definitionId:undefined,balanceVersion:undefined}));
  const original=state([...modern,...legacy]);
  const plan=planEquipmentFusion(original.inventory,'稀有');
  assert.equal(plan.batches,2);assert.equal(plan.consumedCount,8);
  let rolls=0;
  const next=fuseAllInventoryEquipmentAction(original,'稀有',()=>{rolls++;return 1;},log,()=>{});
  assert.equal(rolls,1);assert.equal(next.inventory.length,1);assert.equal(next.inventory[0].rarity,'史詩');
  assert.equal(next.gold,original.gold-plan.fee);assert.match(next.logs[0],/成功 1 組、失敗 1 組/);
});

test('quality, +15 enhancement, sale and serialized metadata apply canonical factors once',()=>{
  const ordinary=gear('w');
  let item=advanceEquipmentQuality(ordinary,'金色');
  let game=state([item]);game.territory.buildings.smithy=1;
  let spent=0;
  for(let i=0;i<15;i++) {
    spent+=enhancementCost(game.inventory[0]);
    const result=enhanceEquipment(game,'w',1,()=>0);
    assert.equal(result.error,undefined);game=result.game;
  }
  assert.equal(game.gold,1_000_000-spent);
  item=game.inventory[0];assert.equal(item.enhance,15);
  assert.equal(effectiveEquipmentStats(item).atk,Math.floor(ordinary.atk*4));
  const price=equipmentSellPrice(item);
  assert.equal(price,Math.floor(v1Definition(item).price*.2*2.5));
  assert.equal(equipmentSellPrice({...item,atk:999999,enhance:0}),price);
  const restored=restoreGame(JSON.parse(serializeGameForStorage(game)));
  assert.equal(restored.inventory[0].balanceVersion,item.balanceVersion);
  assert.deepEqual(effectiveEquipmentStats(restored.inventory[0]),effectiveEquipmentStats(item));
  assert.equal(v1Definition({...item,balanceVersion:'future'}),null);
  const old={...ordinary,balanceVersion:undefined,definitionId:undefined,enhance:2};
  assert.equal(effectiveEquipmentStats(old).atk,Math.floor(old.atk*1.15**2));
});

test('actual shop purchases keep canonical raw base and resolve rolled quality without double scaling',()=>{
  const spec=equipmentAtTier(120)[0];
  const original=Math.random;
  try {
    Math.random=()=>.003;
    const next=purchaseTierEquipmentAction(state([]),spec.id,1,'漢陽','shop',log,()=>{},3);
    assert.equal(next.inventory.length,3);
    assert.equal(next.gold,1_000_000-v1Definition(next.inventory[0]).price*3);
    for(const item of next.inventory) {
      assert.equal(item.rarity,'傳說');assert.equal(item.atk,spec.atk);
      assert.equal(effectiveEquipmentStats(item).atk,Math.floor(spec.atk*2));
    }
  } finally {Math.random=original;}
});

test('worn weapon and second ring preserve explicit versions; unknown versions stay legacy',()=>{
  const weapon=gear('w');
  const ring=makeTierEquipment(equipmentAtTier(120).find(item=>item.part==='accessory'),'ring','test');
  const equip={weapon,ring2:{...ring,enhance:15,rarity:'金色'}};
  const restored=sanitizeEquip(JSON.parse(JSON.stringify(equip)));
  for(const slot of ['weapon','ring2']) {
    assert.equal(restored[slot].definitionId,equip[slot].definitionId);
    assert.equal(restored[slot].balanceVersion,equip[slot].balanceVersion);
    assert.deepEqual(effectiveEquipmentStats(restored[slot]),effectiveEquipmentStats(equip[slot]));
  }
  const future={...weapon,balanceVersion:'future-unrecognized',atk:77,enhance:2};
  const preserved=sanitizeEquip({weapon:future}).weapon;
  assert.equal(preserved.balanceVersion,future.balanceVersion);
  assert.equal(effectiveEquipmentStats(preserved).atk,Math.floor(77*1.15**2));
});

test('all 17 official and 8 wearable products use canonical displayed cores and one quality factor',()=>{
  assert.equal(officialEquipment.length,17);assert.equal(wearableCatalog.length,8);
  for(const record of officialEquipment) {
    const item=makeOfficialEquipment(record,'傳說'),definition=v1Definition(item);
    assert.ok(definition);
    for(const stat of ['atk','def','hp']) {
      assert.equal(item[stat],definition[stat]);
      assert.equal(record[stat],definition[stat]);
      assert.equal(effectiveEquipmentStats(item)[stat],Math.floor(definition[stat]*2));
    }
    assert.equal(item.skill,record.skill);
    assert.equal(definition.price,record.price);
  }
  for(const record of wearableCatalog) {
    const item=makeWearableEquipment(record,'wearable-test'),definition=v1Definition(item);
    assert.ok(definition);assert.equal(item.requiredLevel,1);
    for(const stat of ['atk','def','hp'])assert.equal(record[stat],effectiveEquipmentStats(item)[stat]);
    assert.equal(definition.price,record.price);
    assert.equal(advanceEquipmentQuality(item,'金色').atk,item.atk);
  }
  assert.throws(()=>makeOfficialEquipment({...officialEquipment[0],id:'missing'},'普通'));
  assert.throws(()=>makeWearableEquipment({...wearableCatalog[0],id:'missing'}));
});
