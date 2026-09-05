import test from 'node:test';
import assert from 'node:assert/strict';
import {ECOLOGY_MONSTERS,ECOLOGY_POOLS,pickZoneMonster} from '../app/monster-ecology.ts';
import {DUNGEONS,dungeonStep,freshDungeon,teleportDungeon} from '../app/dungeon-engine.ts';

const hero={hp:99999,mp:999,maxHp:99999,maxMp:999,str:99999,dex:999,int:999,attack:0,defense:999,staff:false};

test('seven world-map stages expose their bound exclusive monsters',()=>{
 assert.ok(Object.keys(ECOLOGY_MONSTERS).length>=19);
 const pools=Object.values(ECOLOGY_POOLS);
 assert.ok(pools.every(pool=>pool.length===1));
 assert.equal(new Set(pools.flat()).size,7);
 assert.deepEqual(Object.values(ECOLOGY_POOLS).flat().map(key=>DUNGEONS[key].name),['小狸貓','兵馬俑','狂牛','幽靈巫女','大眼怪','狂暴山豬','海神']);
});

test('stage selection always resolves its bound monster and unknown maps fall back safely',()=>{
 assert.equal(pickZoneMonster('hanyang',0),'e_raccoon');
 assert.equal(pickZoneMonster('qin-shi-huang-mausoleum',.999),'e_terracotta');
 assert.equal(pickZoneMonster('iwami-silver-mine',5),'e_mad_cow');
 assert.equal(pickZoneMonster('datun-mountain',-.5),'e_big_eye');
 assert.equal(pickZoneMonster('undersea-king-cave',.5),'e_sea_god');
 assert.equal(pickZoneMonster('unknown',-.5),'e_raccoon');
});

test('victory waits exactly half a second then rolls a new local monster',()=>{
 const state=teleportDungeon(freshDungeon(),70,2000,1000,'undersea-king-cave',0);
 const win=dungeonStep(state,hero,'normal',1001,undefined,.99,0,.999);
 assert.equal(win.state.status,'respawning');assert.equal(win.state.spawnAt,1501);
 const early=dungeonStep(win.state,hero,'tick',1500,undefined,.99,0,.999);
 assert.equal(early.state.status,'respawning');assert.equal(early.state.key,'e_sea_god');
 const next=dungeonStep(win.state,hero,'tick',1501,undefined,.99,0,.999);
 assert.equal(next.state.status,'fighting');assert.equal(next.state.key,'e_sea_god');assert.equal(next.state.enemyHp,4400);
});

test('damage events identify attacker, target, amount and spell styling',()=>{
 const state=dungeonStep(freshDungeon(),hero,'start',1000,'e_bandit').state;
 const hit=dungeonStep(state,hero,'skill',1001);
 assert.equal(hit.state.events.length,1);
 assert.deepEqual(hit.state.events[0],{id:1,attacker:'hero',target:'enemy',amount:hit.state.events[0].amount,skill:true});
 assert.ok(hit.state.events[0].amount>0);
});
