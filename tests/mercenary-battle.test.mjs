import { test } from 'node:test';
import assert from 'node:assert/strict';
import { merchantMercenaries, mercenarySpec, ratingAccuracy } from '../app/mercenary-roster.ts';
import { vitalStats, combatStats, normalizeVitals, spellCost } from '../app/vitals-engine.ts';
import { resolveMercenaryBattle } from '../app/mercenary-battle.ts';
const rosterUnit = (id, overrides={}) => {
  const s=mercenarySpec('merchant-'+id);
  const base={ templateId:'merchant-'+id,level:1,str:s.ratings[1],agi:s.ratings[3],vit:s.ratings[0],intel:s.mp?20:10,equip:{} };
  return { ...base,...vitalStats(base),...combatStats(base),uid:id,name:s.name,skill:s.active,cost:s.mp,...overrides };
};
const foe = (overrides={}) => ({ name:'山賊',hp:100000,attack:10,defense:0,physicalResistance:0,magicResistance:0,speed:1,ranged:true,...overrides });
const run=(units, enemies=[foe()],random=()=>0.5,terrain='mountain')=>resolveMercenaryBattle(units,enemies,terrain,random);
const skillEvents=(r,name)=>r.events.filter(e=>e.skill===name);
test('all nineteen designs have stable IDs and level-one stats',()=>{
  assert.equal(merchantMercenaries.length,19);
  assert.equal(new Set(merchantMercenaries.map(s=>s.id)).size,19);
  for(const s of merchantMercenaries){
    assert.ok(s.ratings.every(n=>n>=1&&(s.id==='mazu'?5000:50)));
    const u=rosterUnit(s.id);
    assert.equal(u.maxHp,s.baseHp??s.ratings[0]*20); assert.equal(u.maxMp,s.baseMp??40);
    assert.equal(u.attack,s.ratings[1]*2); assert.equal(u.defense,s.ratings[2]*2);
    assert.equal(u.speed,s.ratings[3]); assert.equal(u.accuracy,ratingAccuracy(s.ratings[4]));
    assert.equal(spellCost(u),s.mp);
    const saved=normalizeVitals(JSON.parse(JSON.stringify({...u,hp:0,mp:0})));
    assert.equal(saved.hp,0); assert.equal(saved.mp,0); assert.ok(mercenarySpec(saved.templateId));
    if(s.id!=='mazu') assert.ok(vitalStats({...u,level:2}).maxHp>u.maxHp);
    assert.ok(combatStats({...u,equip:{weapon:{atk:30,def:20}}}).attack>u.attack);
  }
});
for(const spec of merchantMercenaries) test(spec.name+' active ability executes with cooldown and correct MP',()=>{
  const member=rosterUnit(spec.id,{hp:10000,maxHp:10000,accuracy:1});
  const wounded=rosterUnit('spear',{uid:'patient',name:'傷兵',hp:200,maxHp:1000,attack:0,accuracy:1});
  const result=run([member,wounded],[foe(),foe({name:'後排',back:true})]);
  const activations=skillEvents(result,spec.active).filter(e=>e.actor===spec.name);
  assert.ok(activations.length>0);
  for(let i=1;i<activations.length;i++) assert.ok(activations[i].round-activations[i-1].round>=spec.cooldown);
  if(!spec.mp) assert.equal(result.spentMp,0);
  assert.ok(result.fighters.every(u=>u.hp>=0&&u.mp>=0&&u.hp<=u.maxHp&&u.mp<=u.maxMp));
});
test('no MP means magic falls back to normal attacks, martial skills still fire',()=>{
  const r=run([rosterUnit('shaman',{mp:0}),rosterUnit('spear',{mp:0})]);
  assert.equal(skillEvents(r,'縛魂咒').length,0);
  assert.ok(skillEvents(r,'突槍穿陣').length>0); assert.equal(r.spentMp,0);
});
test('ninja targets weakest rear, gunner highest armor, archer lowest health ratio',()=>{
  const foes=[foe({name:'前排',defense:100}),foe({name:'後排甲',back:true,defense:40}),foe({name:'後排乙',back:true,defense:10})];
  assert.equal(skillEvents(run([rosterUnit('ninja')],foes),'飛鏢襲後')[0].target,'後排乙');
  assert.equal(skillEvents(run([rosterUnit('gunner')],foes),'破甲鉛丸')[0].target,'前排');
});
test('cannon strikes three enemies, blade and elephant hit front only',()=>{
  const foes=[foe({name:'前一'}),foe({name:'前二'}),foe({name:'後排',back:true})];
  for(const id of ['cannon','blade','elephant']){
    const r=run([rosterUnit(id)],foes);
    const round=skillEvents(r,mercenarySpec('merchant-'+id).active)[0].round;
    const hits=r.events.filter(e=>e.round===round&&e.actor===rosterUnit(id).name&&e.skill==='物理傷害');
    assert.equal(hits.length,id==='cannon'?3:2);
  }
});
test('monk stuns normal enemies but bosses keep acting',()=>{
  const normal=run([rosterUnit('monk')],[foe({ranged:false})]);
  const boss=run([rosterUnit('monk')],[foe({ranged:false,boss:true})]);
  assert.ok(skillEvents(normal,'暈眩，跳過行動').length>0);
  assert.equal(skillEvents(boss,'暈眩，跳過行動').length,0);
});
test('root stops out-of-range movement but not ranged attacks; boss immune',()=>{
  const normal=run([rosterUnit('onmyoji')],[foe({ranged:false})]);
  assert.ok(skillEvents(normal,'定身，目標不在射程').length>0);
  const ranged=run([rosterUnit('onmyoji')],[foe()]);
  assert.ok(ranged.events.some(e=>e.round===1&&e.actor==='山賊'&&e.skill==='物理傷害'));
  const boss=run([rosterUnit('onmyoji')],[foe({ranged:false,boss:true})]);
  assert.equal(skillEvents(boss,'定身，目標不在射程').length,0);
});
test('shield guards low-health allies and absorbs one single attack per cast',()=>{
  const r=run([rosterUnit('shield',{speed:50}),rosterUnit('spear',{hp:200,maxHp:1000})]);
  const guards=skillEvents(r,'舉盾護商・代受');
  // Enemy prefers frontmost shield; move patient first to actually exercise interception.
  const direct=run([rosterUnit('spear',{hp:200,maxHp:1000}),rosterUnit('shield',{speed:50})]);
  assert.ok(skillEvents(direct,'舉盾護商・代受').length>0);
  assert.ok(guards.length<=skillEvents(r,'舉盾護商').length);
});
test('healing and postbattle aid never revive dead units or exceed HP caps',()=>{
  const fallen=rosterUnit('spear',{hp:0});
  const r=run([fallen,rosterUnit('healer',{hp:100,maxHp:580})],[foe({hp:1,attack:0})]);
  assert.equal(r.fighters[0].hp,0);
  assert.ok(skillEvents(r,'回春術・治療').length>0);
  assert.ok(skillEvents(r,'藥囊備急').length>0);
  assert.ok(r.fighters[1].hp<=580);
});
test('priest shields absorb damage and restores MP every third action',()=>{
  const r=run([rosterUnit('spear',{hp:300,maxHp:1000}),rosterUnit('priest',{speed:50})]);
  assert.ok(skillEvents(r,'護盾吸收').length>0);
  assert.ok(skillEvents(r,'靜心持咒').length>0);
  assert.ok(r.fighters[1].mp<=40);
});
test('onmyoji survives one lethal blow, never indefinitely',()=>{
  const r=run([rosterUnit('onmyoji')],[foe({attack:100000})]);
  assert.equal(skillEvents(r,'式神護符').length,1);
  assert.equal(r.fighters[0].hp,0);
});
test('monk counterattack is capped once per round and blade stacks stop at five',()=>{
  const r=run([rosterUnit('monk',{hp:100000,maxHp:100000})],[foe(),foe(),foe()],()=>0.1);
  const counters=skillEvents(r,'金鐘護體');
  assert.ok(counters.length>0); assert.equal(new Set(counters.map(e=>e.round)).size,counters.length);
  const blade=run([rosterUnit('blade',{hp:100000,maxHp:100000})]);
  assert.equal(Math.max(...skillEvents(blade,'越戰越勇').map(e=>e.amount)),5);
});
test('accuracy determines misses and callers remain unchanged',()=>{
  const party=[rosterUnit('gunner')];const copy=JSON.stringify(party);
  const hit=run(party,undefined,()=>0.5),miss=run(party,undefined,()=>0.999);
  assert.ok(miss.misses>hit.misses);
  assert.equal(JSON.stringify(party),copy);
  assert.ok(miss.enemyHp>hit.enemyHp);
});
test('fallen units neither act nor grant opening auras',()=>{
  const r=run([rosterUnit('escort',{hp:0}),rosterUnit('shaman',{hp:0}),rosterUnit('spear')]);
  assert.equal(skillEvents(r,'押鏢老練').length,0); assert.equal(skillEvents(r,'山靈庇佑').length,0);
  assert.ok(!r.events.some(e=>e.actor==='東海鏢師'||e.actor==='朝鮮巫女'));
});
test('tactical world-map enemy attacks use the matching party resistance',()=>{
  const member=rosterUnit('spear',{hp:100000,maxHp:100000,attack:0,defense:0,physicalResist:60,magicResist:60});
  const unprotected=run([{...member,physicalResist:0,magicResist:0}],[foe({attack:100,ranged:true})],()=>0.5);
  const physical=run([member],[foe({attack:100,ranged:true})],()=>0.5);
  const magical=run([member],[foe({attack:100,magicAttack:true,ranged:true})],()=>0.5);
  assert.ok(physical.receivedDamage<unprotected.receivedDamage);
  assert.ok(magical.receivedDamage<unprotected.receivedDamage);
});
