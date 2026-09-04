import test from 'node:test';
import assert from 'node:assert/strict';
import {ECOLOGY_MONSTERS,ECOLOGY_POOLS,pickZoneMonster} from '../app/monster-ecology.ts';
import {DUNGEONS,dungeonStep,freshDungeon,teleportDungeon} from '../app/dungeon-engine.ts';

const hero={hp:99999,mp:999,maxHp:99999,maxMp:999,str:99999,dex:999,int:999,attack:0,defense:999,staff:false};

test('four zones each expose three unique monsters, twelve total',()=>{
 assert.equal(Object.keys(ECOLOGY_MONSTERS).length,12);
 const pools=Object.values(ECOLOGY_POOLS);
 assert.ok(pools.every(pool=>pool.length===3));
 assert.equal(new Set(pools.flat()).size,12);
 assert.deepEqual(ECOLOGY_POOLS.hanyang.map(key=>DUNGEONS[key].name),['狸貓','大螳螂','山賊打手']);
 assert.deepEqual(ECOLOGY_POOLS.abyss.map(key=>DUNGEONS[key].name),['冥界餓鬼','冥界大蛇','終極 BOSS 閻王']);
});

test('random sample covers all three monsters with clamped boundaries',()=>{
 assert.equal(pickZoneMonster('snow',0),'e_yeti');
 assert.equal(pickZoneMonster('snow',.34),'e_crystal');
 assert.equal(pickZoneMonster('snow',.999),'e_snow');
 assert.equal(pickZoneMonster('snow',5),'e_snow');
 assert.equal(pickZoneMonster('unknown',-.5),'e_cat');
});

test('victory waits exactly half a second then rolls a new local monster',()=>{
 const state=teleportDungeon(freshDungeon(),70,2000,1000,'abyss',0);
 const win=dungeonStep(state,hero,'normal',1001,undefined,.99,0,.999);
 assert.equal(win.state.status,'respawning');assert.equal(win.state.spawnAt,1501);
 const early=dungeonStep(win.state,hero,'tick',1500,undefined,.99,0,.999);
 assert.equal(early.state.status,'respawning');assert.equal(early.state.key,'e_ghost');
 const next=dungeonStep(win.state,hero,'tick',1501,undefined,.99,0,.999);
 assert.equal(next.state.status,'fighting');assert.equal(next.state.key,'e_king');assert.equal(next.state.enemyHp,25000);
});

test('damage events identify attacker, target, amount and spell styling',()=>{
 const state=dungeonStep(freshDungeon(),hero,'start',1000,'e_bandit').state;
 const hit=dungeonStep(state,hero,'skill',1001);
 assert.equal(hit.state.events.length,1);
 assert.deepEqual(hit.state.events[0],{id:1,attacker:'hero',target:'enemy',amount:hit.state.events[0].amount,skill:true});
 assert.ok(hit.state.events[0].amount>0);
});
