import test from 'node:test';
import assert from 'node:assert/strict';
import {dungeonStep,freshDungeon,DUNGEONS,WORLD_ZONES,normalEncounterCount} from '../app/dungeon-engine.ts';

const hero={hp:100000,maxHp:100000,mp:40,maxMp:40,str:20,dex:15,mercenaryIntelligence:0,attack:10,defense:100,staff:false};
const party=size=>Array.from({length:size},(_,index)=>({uid:index===0?'hero':`merc-${index}`,name:'測試隊員',hp:hero.hp,maxHp:hero.maxHp,mp:hero.mp,maxMp:hero.maxMp,position:'前排',attack:hero.attack,defense:hero.defense,attackInterval:1}));
const start=(key='e_raccoon',count=.999999,members=[])=>dungeonStep(freshDungeon(),hero,'start',1000,key,.99,0,0,0,members,0,[1,1,1],false,count);
const toggleAutoHunt=(state=freshDungeon(),now=900)=>dungeonStep(state,hero,'toggle-auto-hunt',now);

test('world-map zones resolve to valid data-backed encounter pools',()=>{
 assert.equal(WORLD_ZONES.length,12);
 for(const zone of WORLD_ZONES){assert.ok(DUNGEONS[zone.enemy]);assert.ok(zone.dropTable.length>0)}
 assert.equal(new Set(WORLD_ZONES.map(zone=>zone.enemy)).size,12);
});

test('normal encounters scale from one to twelve enemies and bosses remain solo',()=>{
 assert.deepEqual([0,.5,.999999].map(roll=>normalEncounterCount(roll)),[1,7,12]);
 assert.equal(start('e_raccoon',.5,party(12)).state.realtime.enemies.length,7);
 assert.equal(start('e_raccoon',.999999,party(1)).state.realtime.enemies.length,1);
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

test('stop hunting preserves party vitals and target, prevents respawn, and can be resumed',()=>{
 const battle=start('e_raccoon',0,party(1)),beforeHp=battle.party[0].hp;
 const stopped=dungeonStep(battle.state,hero,'stop',1100,undefined,.99,0,0,0,battle.party);
 const idleTick=dungeonStep(stopped.state,hero,'tick',5000,undefined,.99,0,0,0,stopped.party);
 const resumed=dungeonStep(stopped.state,hero,'start',5100,'e_raccoon',.99,0,0,0,stopped.party);
 assert.equal(stopped.state.status,'idle');
 assert.equal(stopped.state.key,'e_raccoon');
 assert.equal(stopped.state.enemyCount,0);
 assert.equal(stopped.state.realtime,undefined);
 assert.equal(stopped.party[0].hp,beforeHp);
 assert.equal(stopped.hp,beforeHp);
 assert.equal(idleTick.state.status,'idle');
 assert.equal(idleTick.state.realtime,undefined);
 assert.equal(idleTick.state.enemyCount,0);
 assert.equal(idleTick.xpEarned,0);
 assert.equal(resumed.state.status,'fighting');
});

test('stop settles an already-won battle once and does not spawn another enemy',()=>{
 const battle=start('e_raccoon',0,party(1));
 const finished={...battle.state,realtime:{...battle.state.realtime,winner:'player'}};
 const stopped=dungeonStep(finished,hero,'stop',1100,undefined,.99,0,0,0,battle.party);
 assert.equal(stopped.state.status,'idle');
 assert.equal(stopped.reward.xp,DUNGEONS.e_raccoon.xp);
 assert.equal(stopped.state.spawnAt,0);
 assert.equal(stopped.state.realtime,undefined);
});

test('auto hunt OFF settles this battle and keeps rewards without spawning another wave',()=>{
 const battle=start('e_raccoon',0,party(1));
 const finished={...battle.state,realtime:{...battle.state.realtime,winner:'player'}};
 const settled=dungeonStep(finished,hero,'tick',1100,undefined,.99,0,0,0,battle.party);
 assert.equal(settled.state.autoHunt,false);
 assert.equal(settled.state.status,'idle');
 assert.equal(settled.state.spawnAt,0);
 assert.equal(settled.reward.xp,DUNGEONS.e_raccoon.xp);
 assert.match(settled.state.logs[0],/本場戰鬥結束/);
});

test('auto hunt ON waits for the existing wave to finish before starting the next one',()=>{
 const enabled=toggleAutoHunt();
 const battle=dungeonStep(enabled.state,hero,'start',1000,'e_raccoon',.99,0,0,0,party(1),0,[1,1,1],false,0);
 const finished={...battle.state,realtime:{...battle.state.realtime,winner:'player'}};
 const won=dungeonStep(finished,hero,'tick',1100,undefined,.99,0,0,0,battle.party,0,[1,1,1],false,0);
 const next=dungeonStep(won.state,hero,'tick',1600,undefined,.99,0,0,0,won.party,0,[1,1,1],false,0);
 assert.equal(enabled.state.autoHunt,true);
 assert.equal(won.state.status,'respawning');
 assert.equal(won.state.spawnAt,1600);
 assert.ok(won.reward);
 assert.equal(next.state.status,'fighting');
 assert.equal(next.state.autoHunt,true);
 assert.ok(next.state.realtime);
});

test('a party defeat immediately turns auto hunt OFF',()=>{
 const enabled=toggleAutoHunt();
 const battle=dungeonStep(enabled.state,hero,'start',1000,'e_raccoon',.99,0,0,0,party(1),0,[1,1,1],false,0);
 const finished={...battle.state,realtime:{...battle.state.realtime,winner:'enemy'}};
 const defeated=dungeonStep(finished,hero,'tick',1100,undefined,.99,0,0,0,battle.party);
 assert.equal(defeated.state.status,'recovering');
 assert.equal(defeated.state.autoHunt,false);
 assert.equal(defeated.state.spawnAt,0);
});

test('dungeon transitions leave the saved input state unchanged',()=>{
 const battle=start('e_raccoon',0),before=structuredClone(battle.state),savedHero=structuredClone(hero);
 dungeonStep(battle.state,hero,'tick',2000);
 assert.deepEqual(battle.state,before);
 assert.deepEqual(hero,savedHero);
});
