import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentExperienceBreakdown,equipmentExperienceMultiplier} from '../app/dungeon-kill-xp.ts';
import {EQUIPMENT_BALANCE_V1} from '../app/equipment-v1-policy.ts';
import {ItemTooltipManager} from '../app/item-tooltip-manager.ts';
const modern=value=>({definitionId:'series-120-weapon',balanceVersion:EQUIPMENT_BALANCE_V1,enhanceBonuses:[{stat:'xpPercent',value}]});
const member=item=>({equip:{weapon:item}});

test('new-series XP averages deployed investment and stays at most 25%, independent of party size',()=>{
  for(const count of [1,4,12]) {
    const party=Array.from({length:count},()=>member(modern(80)));
    assert.equal(equipmentExperienceMultiplier(party),1.25);
    assert.deepEqual(equipmentExperienceBreakdown(party),{legacyPercent:0,versionedPercent:25,multiplier:1.25});
  }
  assert.equal(equipmentExperienceMultiplier([member(modern(20)),member(null),member(null),member(null)]),1.05);
  assert.equal(equipmentExperienceMultiplier([]),1);
});

test('all worn new-series slots share one personal XP cap; invalid bonuses cannot poison rewards',()=>{
  const unit={equip:Object.fromEntries(['weapon','helm','armor','gloves','amulet','boots','ring1','ring2'].map(slot=>[slot,modern(4)]))};
  assert.equal(equipmentExperienceMultiplier([unit]),1.25);
  assert.equal(equipmentExperienceMultiplier([member(modern(NaN)),member(modern(Infinity)),member(modern(-100))]),1);
});

test('mixed and unknown versions preserve old XP while only the V1 portion is averaged',()=>{
  const legacy={enhanceBonuses:[{stat:'xpPercent',value:50}]};
  const mixed=[{equip:{weapon:modern(25),helm:legacy}},member(legacy)];
  assert.deepEqual(equipmentExperienceBreakdown(mixed),{legacyPercent:100,versionedPercent:12.5,multiplier:2.125});
  assert.equal(equipmentExperienceMultiplier(Array.from({length:4},()=>member(legacy))),3);
  assert.equal(equipmentExperienceMultiplier([member({...modern(50),balanceVersion:'future'})]),1.5);
});

test('new-series tooltip states the actual versioned multipliers and mixed XP limitation',()=>{
  const data=ItemTooltipManager.equipment({...modern(4),name:'新版武器',rarity:'金色',enhance:15},{kind:'武器',description:'',sellPrice:0,owned:1});
  const rules=data.sections.find(section=>section.title==='新版系列規則');
  assert.ok(rules);
  assert.match(rules.fields.find(field=>field.label==='品質倍率').value,/×2.5/);
  assert.match(rules.fields.find(field=>field.label==='強化倍率').value,/×1.6/);
  assert.match(rules.fields.find(field=>field.label==='求知契印').value,/隊伍平均.*舊裝加成另計/);
  const legacy=ItemTooltipManager.equipment({name:'舊裝'},{kind:'武器',description:'',sellPrice:0,owned:1});
  assert.ok(!legacy.sections.some(section=>section.title==='新版系列規則'));
});
