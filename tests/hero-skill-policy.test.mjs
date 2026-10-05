import test from 'node:test';
import assert from 'node:assert/strict';
import {heroSkillPower} from '../app/hero-skill-policy.ts';
import {createRequire} from 'node:module';
import {curveFixture} from '../scripts/measure-equipment-curve.mjs';
const require=createRequire(import.meta.url);
const {dungeonStep,freshDungeon}=require('../app/dungeon-engine.ts');
test('skill has no flat beginner grant, grows with attack and bounds party support',()=>{
  assert.equal(heroSkillPower(40,10),120);
  assert.equal(heroSkillPower(40,1_000_000),130);
  assert.equal(heroSkillPower(400,1_000_000),1300);
  assert.equal(heroSkillPower(0,1_000_000),1);
  for(const invalid of [NaN,Infinity,-1])assert.throws(()=>heroSkillPower(invalid,10),RangeError);
  for(const invalid of [NaN,Infinity,-1])assert.throws(()=>heroSkillPower(10,invalid),RangeError);
});
test('real battle uses personal hero attack, not total party attack, at every promotion boundary',()=>{
  for(const level of [1,11,12,35,36,55,56,71,72,111,112,161,162,211,212,250]){
    const {party}=curveFixture(level,level<12?'spear':'mixed','live',level,'普通',0,null,true);
    const first=party[0],input={...first,str:20,dex:15,mercenaryIntelligence:40,attack:party.reduce((sum,unit)=>sum+unit.attack,0),defense:first.defense,staff:false};
    const result=dungeonStep(freshDungeon(),input,'start',1000,'e_white_tiger_fierce_tiger',.99,0,0,.99,party,0,[1,1,1],true,0);
    const actor=result.state.realtime?.players.find(unit=>unit.id==='hero');
    assert.ok(actor,'large actual boss should keep test snapshot available');
    assert.equal(actor.skillPower,heroSkillPower(first.attack,40));
    assert.ok(actor.skillPower<=actor.atk*3.25);
  }
});
