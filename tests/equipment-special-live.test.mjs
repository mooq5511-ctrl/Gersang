import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {curveFixture} from '../scripts/measure-equipment-curve.mjs';
const require=createRequire(import.meta.url);
const {combatStats,vitalStats,rawCombatStats,rawVitalStats,equipmentSpecialStats}=require('../app/vitals-engine.ts');
const {coreEquipmentUnit,EQUIPMENT_SPECIAL_LIMITS,EQUIPMENT_SHARED_SPECIAL_POOL}=require('../app/equipment-special-policy.ts');
const {unitPower}=require('../app/game-progression.ts');
const {heroPersonalPower}=require('../app/hero-rules.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {restoreGame}=require('../app/game-profile-storage.ts');
const {serializeGameForStorage}=require('../app/game-state.ts');
function decorate(unit) {
  const next=structuredClone(unit);
  for(const item of Object.values(next.equip))if(item){
    item.bonus={str:6000,agi:6000,vit:6000,intel:6000};
    item.magic=[{id:'str',stat:'str',value:1000},{id:'atk',stat:'atk',value:1000},{id:'hp',stat:'hp',value:1000}];
    item.enhanceBonuses=[{stat:'allStats',value:50},{stat:'attackPercent',value:50},{stat:'defensePercent',value:50}];
    item.resist={physical:100,magic:100};
  }
  return next;
}

test('actual hero, spear and bow share bounded V1 resolved effects at all promotion boundaries',()=>{
  for(const level of [1,11,12,35,36,55,56,71,72,111,112,161,162,211,212,250]){
    const {units}=curveFixture(level,level<12?'spear':'mixed','live',level,'金色',15,null,true);
    for(const original of units){
      const unit=decorate(original),before=JSON.stringify(unit),report=equipmentSpecialStats(unit);
      const combat=combatStats(unit),vital=vitalStats(unit);
      let used=0;
      for(const key of ['attack','defense','maxHp','maxMp']){
        const effective=key==='attack'||key==='defense'?combat[key]:vital[key];
        assert.equal(effective,report.budget.effective[key]);
        assert.ok(effective<=report.budget.core[key]+Math.floor(Math.max(1,report.budget.core[key])*EQUIPMENT_SPECIAL_LIMITS[key]));
        used+=(effective-report.budget.core[key])/Math.max(1,report.budget.core[key]);
      }
      assert.ok(used<=EQUIPMENT_SHARED_SPECIAL_POOL+1e-12);
      assert.ok(report.budget.clipped.length>0);
      assert.ok(vital.intelligence<rawVitalStats(unit).intelligence);
      assert.equal(unitPower(unit),Math.floor(combat.attack*2.2+combat.defense*1.6+vital.maxHp*.22));
      if(unit.uid==='hero')assert.equal(heroPersonalPower(unit),unitPower(unit));
      assert.equal(JSON.stringify(unit),before);
    }
  }
});

test('quality/enhanced core and paid character stats remain in the baseline, not consumed as special budget',()=>{
  const {units}=curveFixture(72,'mixed','live',72,'金色',15,null,true);
  for(const original of units){
    const unit={...original,str:original.str+123,vit:original.vit+100,intel:original.intel+50,flatAttackBonus:71};
    const clean=coreEquipmentUnit(unit);
    assert.deepEqual(combatStats(unit),rawCombatStats(unit));
    assert.deepEqual(vitalStats(unit),rawVitalStats(unit));
    assert.equal(clean.str,unit.str);assert.equal(clean.flatAttackBonus,71);
    for(const slot of Object.keys(unit.equip)){
      assert.equal(clean.equip[slot].enhance,15);assert.equal(clean.equip[slot].rarity,'金色');
      assert.equal(clean.equip[slot].definitionId,unit.equip[slot].definitionId);
    }
  }
});

test('equipment resistance caps do not consume innate resistance or increase penalties',()=>{
  const hero=decorate(curveFixture(72,'mixed','live',72,'普通',0,null,true).units[0]);
  hero.physicalResist=70;hero.magicResist=60;
  const vital=vitalStats(hero);
  assert.equal(vital.physicalResist,90);assert.equal(vital.magicResist,80);
  const base=coreEquipmentUnit(hero);
  base.equip.weapon.resist={physical:-10,magic:-5};
  assert.equal(vitalStats(base).physicalResist,60);assert.equal(vitalStats(base).magicResist,55);
});

test('real battle spawns capped stats and capped equipment intelligence; storage preserves the result',()=>{
  const units=curveFixture(72,'mixed','live',72,'金色',15,null,true).units.map(decorate);
  const game={...freshGame('特殊額度實戰'),hero:units[0],mercs:units.slice(1),active:units.slice(1).map(unit=>unit.uid)};
  const result=runDungeonAction(game,'start',1000,'e_white_tiger_soul_eater',{roll:1,encounterCountRoll:0},{addLog:(logs,message)=>[message,...logs],grantXp:unit=>unit,enterInn:state=>state,leaveInn:state=>state});
  const actors=result.dungeon.realtime.players;
  assert.equal(actors.length,units.length);
  for(const unit of units){
    const actor=actors.find(actor=>actor.id===unit.uid),combat=combatStats(unit),vital=vitalStats(unit);
    assert.equal(actor.atk,combat.attack);assert.equal(actor.def,combat.defense);assert.equal(actor.maxHp,vital.maxHp);
    assert.equal(actor.physicalResist,vital.physicalResist);assert.equal(actor.magicResist,vital.magicResist);
  }
  const hero=actors.find(actor=>actor.id==='hero');
  const intelligence=units.reduce((sum,unit)=>sum+vitalStats(unit).intelligence,0);
  assert.equal(hero.skillPower,Math.floor(hero.atk*2.5+Math.min(hero.atk*.75,intelligence*2)));
  const restored=restoreGame(JSON.parse(serializeGameForStorage(game)));
  assert.deepEqual(combatStats(restored.hero),combatStats(game.hero));
  assert.deepEqual(vitalStats(restored.hero),vitalStats(game.hero));
  assert.equal(unitPower(restored.hero),unitPower(game.hero));
});
