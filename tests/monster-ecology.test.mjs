import test from 'node:test';
import assert from 'node:assert/strict';
import {ECOLOGY_MONSTERS,ECOLOGY_POOLS,pickZoneMonster} from '../app/monster-ecology.ts';
import {DUNGEONS,dungeonStep,freshDungeon,teleportDungeon} from '../app/dungeon-engine.ts';

const hero={hp:99999,mp:999,maxHp:99999,maxMp:999,str:99999,dex:999,int:999,attack:0,defense:999,staff:false};

test('twelve world-map stages expose their bound exclusive monsters',()=>{
 assert.ok(Object.keys(ECOLOGY_MONSTERS).length>=27);
 const pools=Object.values(ECOLOGY_POOLS);
 assert.ok(pools.every(pool=>pool.length===1));
 assert.equal(new Set(pools.flat()).size,12);
 assert.deepEqual(Object.values(ECOLOGY_POOLS).flat().map(key=>DUNGEONS[key].name),['狸貓','狂牛','黃龍','大眼怪','山豬','盜墓者','鬼貓','河童','天草時貞','毒蛾','匈奴騎兵','海底王']);
});

test('stage selection always resolves its bound monster and unknown maps fall back safely',()=>{
 assert.equal(pickZoneMonster('hanyang',0),'e_raccoon');
 assert.equal(pickZoneMonster('daegwallyeong',.999),'e_mad_cow');
 assert.equal(pickZoneMonster('iwami-silver-mine',5),'e_kappa');
 assert.equal(pickZoneMonster('datun-mountain',-.5),'e_big_eye');
 assert.equal(pickZoneMonster('yellow-emperor-mausoleum',.5),'e_undersea_king');
 assert.equal(pickZoneMonster('unknown',-.5),'e_raccoon');
});

test('a realtime victory waits half a second before the next local wave',()=>{
 const state=teleportDungeon({...freshDungeon(),autoHunt:true},70,2000,1000,'yellow-emperor-mausoleum',0);
 const party=[{uid:'hero',name:'測試主角',hp:hero.hp,maxHp:hero.maxHp,mp:hero.mp,maxMp:hero.maxMp,position:'前排',attack:1000000,defense:hero.defense,attackInterval:.6}];
 const win=dungeonStep(state,hero,'tick',1050,undefined,.99,0,.999,0,party,0,[0,0,0],false,0);
 assert.equal(win.state.status,'respawning');assert.equal(win.state.spawnAt,1550);assert.ok(win.reward);
 const early=dungeonStep(win.state,hero,'tick',1549,undefined,.99,0,.999,0,party,0,[0,0,0],false,0);
 assert.equal(early.state.status,'respawning');assert.equal(early.state.key,'e_undersea_king');
 const weakParty=[{...party[0],attack:1}];
 const next=dungeonStep(win.state,hero,'tick',1550,undefined,.99,0,.999,0,weakParty,0,[0,0,0],false,0);
 assert.equal(next.state.status,'fighting');assert.equal(next.state.key,'e_undersea_king');assert.ok(next.state.enemyHp>0&&next.state.enemyHp<=1200);
});

test('realtime damage events identify attacker, target, amount and attack type',()=>{
 const party=[{uid:'hero',name:'測試主角',hp:hero.hp,maxHp:hero.maxHp,mp:hero.mp,maxMp:hero.maxMp,position:'前排',attack:1000000,defense:hero.defense,attackInterval:.6}];
 const hit=dungeonStep(freshDungeon(),hero,'start',1000,'e_bandit',.99,0,0,0,party,0,[0,0,0],false,0);
 const event=hit.state.events.find(entry=>entry.attacker==='hero');
 assert.ok(event);
 assert.deepEqual({id:event.id,attacker:event.attacker,target:event.target,skill:event.skill},{id:1,attacker:'hero',target:'enemy',skill:false});
 assert.ok(event.amount>0);
});
