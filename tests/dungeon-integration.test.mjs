import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {dungeonBusy,freshDungeon} from '../app/dungeon-engine.ts';

const source=readFileSync(new URL('../app/game-v15.tsx',import.meta.url),'utf8');
const loopSource=readFileSync(new URL('../app/game-loop.ts',import.meta.url),'utf8');
const actionsSource=readFileSync(new URL('../app/game-battle-actions.ts',import.meta.url),'utf8');
const compile=(code,context)=>vm.runInContext(ts.transpileModule(code.replace(/^export /,'').replace(/^export /gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
const recoveryContext=vm.createContext({dungeonBusy,runDungeon:(state,action,now)=>({...state,dungeon:{...state.dungeon,status:'idle',stamp:now}})});
compile(loopSource.slice(loopSource.indexOf('export function settleGameLoop('),loopSource.indexOf('/** Public game-loop entry point')),recoveryContext);
const rollContext=vm.createContext({});
compile(loopSource.slice(loopSource.indexOf('export function createGameTickRolls()'),loopSource.indexOf('type LoopDependencies')),rollContext);

test('battle action wiring uses the deployed roster cap and distributes realtime kills',()=>{
 assert.match(actionsSource,/previous\.active\.slice\(0, ACTIVE_MERCENARY_LIMIT\)/);
 assert.match(actionsSource,/previous\.mercs\.filter\(\(unit\) => activeIds\.has\(unit\.uid\)\)/);
 assert.match(actionsSource,/result\.killsEarned/);
 assert.match(actionsSource,/result\.reward/);
 assert.match(actionsSource,/defeatedLakeBoss/);
});

test('recovery ticks suppress idle income until the party leaves the inn',()=>{
 const previous={dungeon:{...freshDungeon(),status:'recovering',stamp:1000,pauseAt:1000,innHealAt:3000},trade:{caravan:null},idleStamp:1000,gold:0,credit:0};
 const rolls={now:3000,roll:.9,choice:0,spawnRoll:0,encounterCountRoll:0,retaliationRoll:0,materialRolls:[1,1,1]};
 const settled=recoveryContext.settleGameLoop(previous,rolls,{runDungeon:recoveryContext.runDungeon});
 assert.equal(dungeonBusy(settled.dungeon),false);
 assert.equal(settled.gold,0);
 assert.equal(settled.credit,0);
 assert.equal(settled.idleStamp,3000);
});

test('game tick samples deterministic inputs and clears its realtime interval',()=>{
 const rolls=rollContext.createGameTickRolls();
 assert.ok(Number.isFinite(rolls.now));
 for(const key of ['roll','choice','spawnRoll','encounterCountRoll','retaliationRoll','gearDropRoll','gearChoiceRoll'])assert.ok(Number.isFinite(rolls[key]));
 assert.equal(rolls.materialRolls.length,3);
 assert.match(source,/const timer = window\.setInterval\(\(\) => \{/);
 assert.match(source,/const rolls = createGameTickRolls\(\);/);
 assert.match(source,/settleCurrentGame\(previous,rolls\)/);
 assert.match(source,/clearInterval\(timer\)/);
});
