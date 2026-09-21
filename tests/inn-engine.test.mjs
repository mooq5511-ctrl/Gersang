import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {goToInn,leaveInn,recoverAtInn,payInn} from '../app/inn-engine.ts';
import {vitalStats} from '../app/vitals-engine.ts';

const progressionSource=readFileSync(new URL('../app/game-progression.ts',import.meta.url),'utf8');
const grantCode=progressionSource.slice(progressionSource.indexOf('export function grantXp'),progressionSource.indexOf('export function grantTerritoryXp')).replace(/^export /gm,'');
const progression=vm.createContext({vitalStats,xpNeed:()=>100,LEVEL_CAP:300});
vm.runInContext(ts.transpileModule(grantCode,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,progression);
const runtimeSource=readFileSync(new URL('../app/game-runtime-actions.ts',import.meta.url),'utf8');
const runtimeCode=runtimeSource.slice(runtimeSource.indexOf('export function appendGameLog'),runtimeSource.indexOf('export function enemyMaxForStage'))+runtimeSource.slice(runtimeSource.indexOf('export function leaveGameInnAction'));
const runtime=vm.createContext({vitalStats,leaveInn,payInn,recoverVitals:unit=>unit,freshDungeon:()=>({status:'idle'})});
vm.runInContext(ts.transpileModule(runtimeCode.replace(/^export /gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,runtime);

test('goToInn sets status and schedules the first ten HP heal in two seconds',()=>{
 const entered=goToInn({hp:0,maxHp:100,status:'正常'},1000);
 assert.deepEqual(entered,{player:{hp:0,maxHp:100,status:'客棧中'},nextHealAt:3000});
 assert.equal(recoverAtInn(entered.player,entered.nextHealAt,2999).player.hp,0);
 const healed=recoverAtInn(entered.player,entered.nextHealAt,3000);
 assert.equal(healed.player.hp,10);assert.equal(healed.nextHealAt,5000);
});

test('leaveInn only exits at full HP and automatic healing clamps',()=>{
 assert.equal(leaveInn({hp:99,maxHp:100,status:'客棧中'}).status,'客棧中');
 const done=recoverAtInn({hp:95,maxHp:100,status:'客棧中'},2000,2000);
 assert.deepEqual(done,{player:{hp:100,maxHp:100,status:'正常'},nextHealAt:0});
});

test('payInn charges exactly two gold per missing HP and reports shortage',()=>{
 const paid=payInn({hp:35,maxHp:100,status:'客棧中'},130);
 assert.equal(paid.cost,130);assert.equal(paid.gold,0);assert.equal(paid.player.hp,100);assert.equal(paid.player.status,'正常');
 const short=payInn({hp:35,maxHp:100,status:'客棧中'},129);
 assert.equal(short.gold,129);assert.equal(short.player.hp,35);assert.match(short.error,/不足/);
});

test('hero level-up adds twenty base max HP and immediately fills it',()=>{
 const hero={uid:'hero',templateId:'hero',level:1,xp:0,points:0,vit:20,intel:10,maxHp:100,hp:1,mp:1,equip:{}};
 const leveled=progression.grantXp(hero,100);
 assert.equal(leveled.level,2);assert.equal(leveled.maxHp,120);assert.equal(leveled.hp,120);assert.equal(leveled.points,5);
});

test('published interface contains the requested HP and inn controls',()=>{
 const source=readFileSync(new URL('../app/game-v15.tsx',import.meta.url),'utf8');
 assert.match(source,/id="p-hp"/);assert.match(source,/id="inn-zone"/);assert.match(source,/付費快速治療/);assert.match(source,/setGame\(payGameInn\)/);
});

test('manual inn healing accepts recovering battle state and is not blocked as busy',()=>{
 const hero={uid:'hero',templateId:'hero',level:1,vit:20,intel:10,maxHp:100,hp:40,mp:20,status:'正常',equip:{}};
 const entered={hero,gold:1000,mercs:[],dungeon:{status:'recovering',logs:[]},logs:[]};
 const healed=runtime.payGameInnAction(entered);
 assert.equal(healed.hero.status,'正常');
 assert.equal(vitalStats(healed.hero).hp,vitalStats(healed.hero).maxHp);
 assert.equal(healed.gold,1000-(vitalStats(entered.hero).maxHp-vitalStats(entered.hero).hp)*2);
 assert.equal(healed.dungeon.status,'idle');
 assert.equal(runtime.payGameInnAction(healed),healed);
});
