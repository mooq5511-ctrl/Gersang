import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {chapterParty} from '../scripts/audit-first-chapter-parties.mjs';
import {measureEquipmentFixture} from '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {equipmentAtTier,tierEquipmentPrice}=require('../app/tier-equipment.ts');
const {purchaseTierEquipmentAction,purchaseEquipmentBatchAction,equipInventoryItemAction}=require('../app/game-inventory-actions.ts');
const {makeWearableEquipment}=require('../app/game-equipment-factory.ts');
const {wearableCatalog}=require('../app/wearable-catalog.ts');
const {combatStats,vitalStats}=require('../app/vitals-engine.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const log=(logs,message)=>[...logs,message];
const notice=()=>{};

export function buyChapterLoadout(branch,lowGear='full'){
  const initial=chapterParty({branch,promotions:1,allocation:'balanced',gear:'none'});
  let state={...freshGame('定向配裝'),hero:initial.units[0],mercs:initial.units.slice(1),active:initial.units.slice(1).map(unit=>unit.uid),gold:100000,creditLevel:2};
  let serial=0;const originalRandom=Math.random;
  try{
    Math.random=()=>.99; // Worst offered core quality, not a lucky purchase.
    for(const unit of [state.hero,...state.mercs]){
      const parts=unit.level===20?equipmentAtTier(20):wearableCatalog.filter(item=>item.id!=='guild-jade-ring'&&(lowGear==='full'||lowGear==='core'&&['weapon','helm','armor'].includes(item.slot)));
      for(const spec of parts){
        const ring=spec.slot==='ring',quantity=ring?2:1,id=`paid-${serial++}`;
        const previousCount=state.inventory.length;
        state=unit.level===20
          ?purchaseTierEquipmentAction(state,spec.id,.92,'漢陽',id,log,notice,quantity)
          :purchaseEquipmentBatchAction(state,quantity,Math.floor(spec.price*.92),spec.name,index=>makeWearableEquipment(spec,`${id}-${index}`),log,notice);
        assert.equal(state.inventory.length,previousCount+quantity);
        const added=state.inventory.filter(item=>item.uid===id||item.uid.startsWith(`${id}-`));
        assert.equal(added.length,quantity);
        for(const [index,item] of added.entries())state=equipInventoryItemAction(state,item.uid,ring?(index===0?'ring1':'ring2'):item.slot,unit.uid,log);
      }
    }
  }finally{Math.random=originalRandom;}
  const units=[state.hero,...state.mercs];
  const party=units.map(unit=>{
    const vital=vitalStats(unit),combat=combatStats(unit);
    return {uid:unit.uid,templateId:unit.templateId,name:unit.name,skill:unit.skill,position:unit.position,
      hp:vital.maxHp,maxHp:vital.maxHp,mp:vital.maxMp,maxMp:vital.maxMp,attack:combat.attack,defense:combat.defense,
      physicalResist:vital.physicalResist,magicResist:vital.magicResist,accuracy:combat.accuracy,attackInterval:Math.max(.6,2.2-combat.speed/100)};
  });
  return {state,fixture:{units,party},spent:100000-state.gold};
}

test('targeted chapter gear has a real paid source and level/funds restrictions, with no boss bypass',()=>{
  const game=freshGame('門檻'),spec=equipmentAtTier(20)[0];
  for(const state of [{...game,gold:100000,hero:{...game.hero,level:19}},{...game,gold:0,hero:{...game.hero,level:20}}]){
    assert.equal(purchaseTierEquipmentAction(state,spec.id,.92,'漢陽','blocked',log,notice),state);
  }
  const {state,spent}=buyChapterLoadout('spear');
  const perHigh=equipmentAtTier(20).reduce((sum,item)=>sum+Math.floor(tierEquipmentPrice(item)*.92)*(item.slot==='ring'?2:1),0);
  const perLow=wearableCatalog.filter(item=>item.id!=='guild-jade-ring').reduce((sum,item)=>sum+Math.floor(item.price*.92)*(item.slot==='ring'?2:1),0);
  assert.equal(spent,2*perHigh+2*perLow);
  assert.equal(state.inventory.length,0);assert.equal(state.newbieBossDefeated,false);assert.equal(state.stage,1);
  assert.ok([state.hero,...state.mercs].every(unit=>Object.values(unit.equip).filter(Boolean).length===8));
  const restored=restoreGame(JSON.parse(serializeGameForStorage(state)));
  assert.equal(restored.hero.equip.weapon.definitionId,state.hero.equip.weapon.definitionId);
  assert.equal(restored.gold,state.gold);
});

test('real ordinary purchases and equip actions reproduce both one-seal chapter boss wins',()=>{
  for(const branch of ['spear','bow']){
    for(const lowGear of ['none','full']){
    const {fixture}=buyChapterLoadout(branch,lowGear);
    assert.ok(fixture.units.every(unit=>Object.values(unit.equip).every(item=>item.rarity==='普通'&&item.enhance===0&&item.requiredLevel<=unit.level)));
    const samples=Array.from({length:30},(_,i)=>measureEquipmentFixture(fixture,'e_starter_pirate_king',.99,i+1,1));
    assert.ok(samples.every(row=>row.victories===1));
    }
  }
  // XP, seal, recruits, starting money and full combat vitals are supplied; not a natural playthrough.
});
