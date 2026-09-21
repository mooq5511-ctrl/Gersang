import test from 'node:test';
import assert from 'node:assert/strict';
import {dungeonStep,freshDungeon,DUNGEONS,WORLD_ZONES,normalEncounterCount} from '../app/dungeon-engine.ts';

const hero={hp:100000,maxHp:100000,mp:40,maxMp:40,str:20,dex:15,mercenaryIntelligence:0,attack:10,defense:100,staff:false};
const start=(key='e_raccoon',count=.999999)=>dungeonStep(freshDungeon(),hero,'start',1000,key,.99,0,0,0,[],0,[1,1,1],false,count);

test('world-map zones resolve to valid data-backed encounter pools',()=>{
 assert.equal(WORLD_ZONES.length,12);
 for(const zone of WORLD_ZONES){assert.ok(DUNGEONS[zone.enemy]);assert.ok(zone.dropTable.length>0)}
 assert.equal(new Set(WORLD_ZONES.map(zone=>zone.enemy)).size,12);
});

test('normal encounters scale from one to twelve enemies and bosses remain solo',()=>{
 assert.deepEqual([0,.5,.999999].map(normalEncounterCount),[1,7,12]);
 assert.equal(start('e_raccoon',.5).state.realtime.enemies.length,7);
 assert.equal(start('e_lake_gale_altur').state.realtime.enemies.length,1);
});

test('battle starts in live auto-combat with stable formation positions',()=>{
 const result=start('e_raccoon',0);
 assert.equal(result.state.status,'fighting');
 assert.equal(result.state.realtime.running,true);
 assert.equal(result.state.realtime.players.length,1);
 assert.deepEqual(result.state.realtime.players[0].position,{row:0,col:3});
 assert.equal(result.state.realtime.enemies.length,1);
});

test('manual normal and skill controls do not bypass realtime cooldowns',()=>{
 const battle=start('e_raccoon',0);
 const normal=dungeonStep(battle.state,hero,'normal',1050);
 const skill=dungeonStep(normal.state,hero,'skill',1100);
 assert.equal(normal.state.realtime.enemies[0].hp,battle.state.realtime.enemies[0].hp);
 assert.equal(skill.state.realtime.enemies[0].hp,battle.state.realtime.enemies[0].hp);
 assert.match(skill.state.logs[0],/即時自動戰鬥/);
});

test('retreat enters recovery and cannot be restarted before healing completes',()=>{
 const battle=start('e_raccoon',0);
 const retreat=dungeonStep(battle.state,hero,'retreat',1100);
 const restarted=dungeonStep(retreat.state,hero,'start',1200,'e_lake_gale_altur');
 assert.equal(retreat.state.status,'recovering');
 assert.equal(restarted.state.status,'recovering');
 assert.equal(restarted.reward,null);
});

test('dungeon transitions leave the saved input state unchanged',()=>{
 const battle=start('e_raccoon',0),before=structuredClone(battle.state),savedHero=structuredClone(hero);
 dungeonStep(battle.state,hero,'tick',2000);
 assert.deepEqual(battle.state,before);
 assert.deepEqual(hero,savedHero);
});
