import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {WORLD_ZONES,DUNGEONS,zoneUnlocked,teleportDungeon,freshDungeon,dungeonStep} from '../app/dungeon-engine.ts';
test('all four zones match requested HP attack XP and exclusive loot',()=>{
 assert.deepEqual(WORLD_ZONES.map(z=>[z.name,DUNGEONS[z.enemy].hp,DUNGEONS[z.enemy].atk,DUNGEONS[z.enemy].xp]),[['漢陽近郊',150,8,20],['巨濟海底洞窟',800,35,150],['大雪山冰窟',4000,120,800],['冥界深淵',25000,350,5000]]);
 assert.deepEqual(DUNGEONS.pirate.loot,['boots']);assert.deepEqual(DUNGEONS.snowWoman.loot,['helmet','staff']);assert.deepEqual(DUNGEONS.abyssKing.loot,['armor']);
});
test('level AND power boundaries, including both just below threshold',()=>{
 for(const z of WORLD_ZONES){assert.equal(zoneUnlocked(z,z.level,z.power),true);assert.equal(zoneUnlocked(z,z.level-1,99999),false);if(z.power)assert.equal(zoneUnlocked(z,999,z.power-1),false)}
});
test('locked, invalid, recovering transfers are identity noops',()=>{
 const s=freshDungeon();assert.equal(teleportDungeon(s,1,9999,1000,'geoje'),s);assert.equal(teleportDungeon(s,99,9999,1000,'invalid'),s);
 const r={...s,status:'recovering'};assert.equal(teleportDungeon(r,99,9999,1000,'hanyang'),r);
});
test('switch cancels previous fight and pending spawn, retains cooldown and pause timestamp',()=>{
 const old={...freshDungeon(),status:'respawning',spawnAt:5000,normalAt:2300,skillAt:4000,pauseAt:1000,serial:2};
 const s=teleportDungeon(old,70,2000,2000,'abyss',0);
 assert.equal(s.zone,'abyss');assert.equal(s.key,'e_ghost');assert.equal(s.enemyHp,11000);assert.equal(s.status,'fighting');assert.equal(s.spawnAt,0);assert.equal(s.skillAt,4000);assert.equal(s.normalAt,2300);assert.equal(s.pauseAt,1000);assert.equal(s.serial,2);assert.equal(s.logs[0],'已傳送至 冥界深淵！');
});
test('high-zone defeat returns to hanyang with no reward and blocks re-entry during healing',()=>{
 const h={hp:1,mp:40,maxHp:80,maxMp:40,str:20,dex:1,int:10,attack:0,defense:0,staff:false};
 const s=teleportDungeon(freshDungeon(),70,2000,1000,'abyss');const r=dungeonStep(s,h,'tick',2000);
 assert.equal(r.state.zone,'hanyang');assert.equal(r.state.key,'e_cat');assert.equal(r.state.enemyHp,100);assert.equal(r.hp,0);assert.equal(r.reward,null);assert.equal(r.state.logs[0],'商隊不幸全滅，已被熱心商旅送回漢陽療傷...');assert.equal(teleportDungeon(r.state,99,99999,2100,'snow'),r.state);
});
function demo(){
 const nodes=new Map();
 const node=()=>({textContent:'',disabled:false,hidden:false,style:{},children:[],attributes:{},classList:{toggle(){}},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items},setAttribute(k,v){this.attributes[k]=v},addEventListener(){}});
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,addEventListener(){}};
 const timers=[];const ctx=vm.createContext({document,window:{addEventListener(){}},setInterval(fn){timers.push(fn);return 1},clearInterval(){},Date,Math});
 const html=readFileSync(new URL('../public/world-map-game.html',import.meta.url),'utf8');
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 return {nodes,ctx,timers,run:code=>vm.runInContext(code,ctx)};
}
test('single HTML runs without external resources and derives disabled immediately',()=>{
 const d=demo();assert.equal(d.timers.length,1);assert.equal(d.run('mapButtons[1].disabled'),true);
 d.run('state.hero.level=15;render()');assert.equal(d.run('mapButtons[1].disabled'),false);
 d.run('state.hero.level=40;state.hero.str=0;state.hero.dex=0;state.hero.vit=20;state.hero.int=34;render()');assert.equal(d.run('stats().power'),498);assert.equal(d.run('mapButtons[2].disabled'),true);
 d.run("state.hero.points=1;attributeRows.str.plus.onclick()");assert.equal(d.run('stats().power'),500);assert.equal(d.run('mapButtons[2].disabled'),false);
 d.run("state.hero.level=70;state.hero.str=550;render()");assert.equal(d.run('mapButtons[3].disabled'),true);
 d.run("pickup('staff');equip(0)");assert.equal(d.run('mapButtons[3].disabled'),false);
 d.run("unequip('weapon')");assert.equal(d.run('mapButtons[3].disabled'),true);
});
test('single HTML teleport preserves resources and full bag swap is lossless',()=>{
 const d=demo();d.run("state.hero.level=15;state.hero.hp=21;state.hero.mp=7;travel('geoje')");
 assert.equal(d.run('state.battle.key'),'pirate');assert.equal(d.run('state.hero.hp'),21);assert.equal(d.run('state.hero.mp'),7);
 d.run("state.bag.fill('staff');state.equipment.weapon='staff';equip(0)");assert.equal(d.run('state.bag.filter(Boolean).length'),20);d.run("unequip('weapon')");assert.equal(d.run('state.equipment.weapon'),'staff');assert.match(d.nodes.get('message').textContent,/背包已滿/);
});
test('single HTML recovery pauses revenue and blocks maps until healed',()=>{
 const d=demo();d.run("state.battle.status='recovering';state.hero.hp=0;render()");assert.equal(d.run('mapButtons.every(b=>b.disabled)'),true);d.timers[0]();assert.equal(d.run('state.gold'),0);assert.equal(d.run('state.credit'),0);assert.ok(d.run('state.hero.hp')>0);
});
