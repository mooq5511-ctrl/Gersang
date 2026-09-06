import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DIVINE_EQUIPMENT,toggleDivineEquipment,HERO_DISPLAY_SLOTS,equipmentDetailLines} from '../app/divine-equipment.ts';
import {heroPersonalPower,heroTotalAttributes,heroWeightLimit,HERO_INITIAL_ATTRIBUTES} from '../app/hero-rules.ts';
import {vitalStats,combatStats,normalizeVitals} from '../app/vitals-engine.ts';
import {emptyEquipmentSlots,migrateSevenSlotSave} from '../app/equipment-slots.ts';
const makeHero=()=>({...HERO_INITIAL_ATTRIBUTES,uid:'hero',templateId:'hero',level:1,equip:emptyEquipmentSlots()});
const gear=key=>({...DIVINE_EQUIPMENT[key],uid:'test-'+key,atk:0,hp:0,enhance:0,magic:[],requiredLevel:1});
test('six display slots and divine definitions match requested equipment',()=>{
  assert.deepEqual(HERO_DISPLAY_SLOTS,['weapon','helm','armor','ring1','ring2','boots']);
  assert.deepEqual(equipmentDetailLines(gear('staff')),['力量 +10','智力 +50','需求等級 1']);
  assert.ok(equipmentDetailLines(gear('armor')).includes('防禦力 +100'));
});
test('staff and armor increase real resources totals weight power and defense',()=>{
  const hero=makeHero(),a=toggleDivineEquipment(hero,[],gear('staff')),b=toggleDivineEquipment(a.unit,a.inventory,gear('armor'));
  assert.equal(heroPersonalPower(a.unit),265);assert.equal(heroWeightLimit(a.unit),350);assert.equal(vitalStats(a.unit).maxMp,240);
  assert.deepEqual(heroTotalAttributes(b.unit),{str:30,agi:15,vit:100,intel:60});
  assert.equal(heroPersonalPower(b.unit),385);assert.equal(vitalStats(b.unit).maxHp,420);
  assert.ok(combatStats(b.unit).defense>=combatStats(hero).defense+100);
  assert.equal(hero.str,20);assert.equal(hero.vit,20);
});
test('repeated toggles never stack bonuses or duplicate inventory',()=>{
  let hero=makeHero(),inventory=[];
  for(let i=0;i<20;i++){
    const result=toggleDivineEquipment(hero,inventory,gear('staff'));hero=result.unit;inventory=result.inventory;
    assert.equal(heroPersonalPower(hero),i%2?145:265);
    assert.equal([...inventory,...Object.values(hero.equip).filter(Boolean)].filter(item=>item.uid==='test-staff').length,1);
  }
  assert.equal(heroTotalAttributes(hero).intel,10);
});
test('replaced gear returns safely and save reload preserves bonuses exactly once',()=>{
  const hero=makeHero();hero.equip.weapon={...gear('staff'),uid:'old-sword',bonus:{str:3}};
  const next=toggleDivineEquipment(hero,[],gear('staff'));
  assert.equal(next.inventory[0].uid,'old-sword');
  const save=migrateSevenSlotSave(JSON.parse(JSON.stringify({hero:next.unit,inventory:next.inventory,mercs:[],logs:[]})));
  assert.equal(heroPersonalPower(save.hero),265);
  const off=toggleDivineEquipment(save.hero,save.inventory,gear('staff'));
  assert.equal(off.inventory.length,2);assert.equal(heroPersonalPower(off.unit),145);
});
test('unequipping clamps remaining health to reduced maximum without reviving',()=>{
  const hero=makeHero(),on=toggleDivineEquipment(hero,[],gear('armor'));
  const off=toggleDivineEquipment({...on.unit,hp:400},on.inventory,gear('armor'));
  assert.equal(normalizeVitals(off.unit).hp,100);
  assert.equal(normalizeVitals({...off.unit,hp:0}).hp,0);
});
test('single HTML toggles independently, restores baseline, and keeps paid attributes',()=>{
  const html=readFileSync(new URL('../public/hero-equipment-panel.html',import.meta.url),'utf8');
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},setAttribute(k,v){this[k]=v;},addEventListener(type,fn){this[type]=fn;}});return nodes.get(id);};
  const buttons=['str','agi','vit','intel'].map(stat=>({dataset:{stat},addEventListener(type,fn){this[type]=fn;}}));
  const context=vm.createContext({document:{getElementById:node,querySelectorAll:()=>buttons},Date,Math,setInterval(){}});
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
  node('equip-staff').click();node('equip-armor').click();
  assert.equal(node('hp-value').textContent,'400 / 400');assert.equal(node('mp-value').textContent,'240 / 240');assert.equal(node('power').textContent,'385');
  assert.match(node('tip-armor').textContent,/體質 \+80/);assert.match(node('tip-armor').textContent,/防禦力 \+100/);
  node('equip-staff').click();node('equip-armor').click();assert.equal(node('power').textContent,'145');assert.equal(node('tip-armor').hidden,true);
  node('fight').click();node('fight').click();buttons[2].click();node('equip-armor').click();node('equip-armor').click();
  assert.equal(node('hp-value').textContent,'84 / 84');
});
