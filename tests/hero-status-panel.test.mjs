import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {heroPersonalPower,heroWeightLimit,HERO_INITIAL_ATTRIBUTES} from '../app/hero-rules.ts';
import {vitalStats} from '../app/vitals-engine.ts';
test('specified initial hero power weight HP and MP',()=>{
  const hero={...HERO_INITIAL_ATTRIBUTES,templateId:'hero',level:1,equip:{}};
  assert.equal(heroPersonalPower(hero),145);assert.equal(heroWeightLimit(hero),300);
  assert.equal(vitalStats(hero).maxHp,100);assert.equal(vitalStats(hero).maxMp,40);
  assert.equal(heroPersonalPower({...hero,vit:21}),146.5);
  assert.equal(vitalStats({...hero,vit:21}).maxHp,104);
  assert.equal(vitalStats({...hero,intel:11}).maxMp,44);
  assert.equal(heroWeightLimit({...hero,str:21}),305);
});
test('hero power includes direct equipment combat values',()=>{
  const hero={...HERO_INITIAL_ATTRIBUTES,templateId:'hero',level:1,equip:{}};
  const geared={...hero,equip:{weapon:{atk:100,def:50,hp:200,enhance:2,magic:[{value:10}],resist:{physical:4,magic:6},bonus:{str:0,agi:0,vit:0,intel:0}}}};
  assert.ok(heroPersonalPower(geared)>heroPersonalPower(hero));
  assert.equal(heroPersonalPower(geared),641);
});
test('existing hero health clamps to new max and equipment still contributes',()=>{
  const hero={...HERO_INITIAL_ATTRIBUTES,templateId:'hero',level:1,hp:1000,mp:1000,equip:{armor:{hp:30,bonus:{vit:2,intel:3}}}};
  const v=vitalStats(hero);assert.equal(v.hp,138);assert.equal(v.mp,52);
  assert.equal(vitalStats({...hero,hp:0,mp:0}).hp,0);
});
function standalone(){
  const html=readFileSync(new URL('../public/hero-status-panel.html',import.meta.url),'utf8');
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{addEventListener(type,fn){this[type]=fn;}});return nodes.get(id);};
  const buttons=['str','agi','vit','intel'].map(stat=>({dataset:{stat},addEventListener(type,fn){this[type]=fn;}}));
  let clock=1000,interval;
  const context=vm.createContext({document:{getElementById:node,querySelectorAll:()=>buttons},Date:{now:()=>clock},setInterval:fn=>{interval=fn;},Math});
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
  return {node,buttons,run:code=>vm.runInContext(code,context),tick:ms=>{clock+=ms;interval();}};
}
test('standalone defaults and blocked allocation are exact',()=>{
  const s=standalone();assert.equal(s.run('hero.gold'),0);assert.equal(s.run('hero.points'),0);
  s.buttons[0].click();assert.equal(s.run('hero.str'),20);
  assert.equal(s.node('hp-value').textContent,'80 / 80');
});
test('standalone experience levels grant points and update derived values',()=>{
  const s=standalone();s.node('fight').click();s.node('fight').click();
  assert.equal(s.run('hero.level'),2);assert.equal(s.run('hero.points'),5);
  s.buttons[2].click();assert.equal(s.run('hero.points'),4);assert.equal(s.node('hp-value').textContent,'84 / 84');
  s.buttons[3].click();assert.equal(s.node('mp-value').textContent,'44 / 44');
  s.run('gainExperience(1000)');assert.ok(s.run('hero.level')>3);
});
test('standalone auto income manual trade credit rollover and no duplicate tick',()=>{
  const s=standalone();s.tick(1000);assert.equal(s.run('hero.gold'),10);assert.equal(s.run('hero.credit'),5);
  s.tick(0);assert.equal(s.run('hero.gold'),10);
  for(let i=0;i<4;i++)s.node('trade').click();
  assert.equal(s.run('hero.gold'),410);assert.equal(s.run('hero.credit'),105);
  assert.equal(s.node('credit-level').textContent,'信用 Lv. 2');assert.equal(s.node('credit-bar').value,5);
});
