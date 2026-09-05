import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {WORLD_ZONES,DUNGEONS,zoneUnlocked,teleportDungeon,freshDungeon,dungeonStep} from '../app/dungeon-engine.ts';
import {gersangWorldMap,gersangStages} from '../app/gersang-world-map.ts';
test('gersangWorldMap has four regions, eight cities and five playable stages',()=>{
 assert.deepEqual(Object.values(gersangWorldMap).map(region=>[region.name,region.cities.map(city=>city.name)]),[
  ['朝鮮',['漢陽','平壤']],['日本',['江戶','京都']],['台灣',['台北','台南']],['中國',['南京','北京']]
 ]);
 assert.equal(gersangStages.length,5);
 assert.deepEqual(WORLD_ZONES.map(z=>[z.name,DUNGEONS[z.enemy].name,DUNGEONS[z.enemy].hp]),[
  ['漢陽近郊','狸',100],['秦始皇陵','兵馬俑',2200],['石見銀山','狂牛',520],['大屯山','大眼怪',1200],['海底王窟','海神',4400]
 ]);
 assert.ok(gersangStages.every(stage=>stage.monster.drops.length>0));
});
test('level AND power boundaries, including both just below threshold',()=>{
 for(const z of WORLD_ZONES){assert.equal(zoneUnlocked(z,z.level,z.power),true);assert.equal(zoneUnlocked(z,z.level-1,99999),false);if(z.power)assert.equal(zoneUnlocked(z,999,z.power-1),false)}
});
test('locked, invalid, recovering transfers are identity noops',()=>{
 const s=freshDungeon();assert.equal(teleportDungeon(s,1,9999,1000,'iwami-silver-mine'),s);assert.equal(teleportDungeon(s,99,9999,1000,'invalid'),s);
 const r={...s,status:'recovering'};assert.equal(teleportDungeon(r,99,9999,1000,'hanyang'),r);
});
test('switch cancels previous fight and pending spawn, retains cooldown and pause timestamp',()=>{
 const old={...freshDungeon(),status:'respawning',spawnAt:5000,normalAt:2300,skillAt:4000,pauseAt:1000,serial:2};
 const s=teleportDungeon(old,45,700,2000,'undersea-king-cave',0);
 assert.equal(s.zone,'undersea-king-cave');assert.equal(s.key,'e_sea_god');assert.equal(s.enemyHp,4400);assert.equal(s.status,'fighting');assert.equal(s.spawnAt,0);assert.equal(s.skillAt,4000);assert.equal(s.normalAt,2300);assert.equal(s.pauseAt,1000);assert.equal(s.serial,2);assert.equal(s.logs[0],'已傳送至 海底王窟！');
});
test('high-zone defeat returns to hanyang with no reward and blocks re-entry during healing',()=>{
 const h={hp:1,mp:40,maxHp:80,maxMp:40,str:20,dex:1,int:10,attack:0,defense:0,staff:false};
 const s=teleportDungeon(freshDungeon(),45,700,1000,'undersea-king-cave');const r=dungeonStep(s,h,'tick',2000);
 assert.equal(r.state.zone,'hanyang');assert.equal(r.state.key,'e_raccoon');assert.equal(r.state.enemyHp,100);assert.equal(r.hp,0);assert.equal(r.reward,null);assert.equal(r.state.logs[0],'戰鬥失敗，已自動返回漢陽客棧療傷。');assert.equal(teleportDungeon(r.state,99,99999,2100,'datun-mountain'),r.state);
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
