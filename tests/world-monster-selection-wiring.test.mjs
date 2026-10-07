import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../app/game-battle-page.tsx',import.meta.url),'utf8');
const parsed=ts.createSourceFile('game-battle-page.tsx',source,99,true,ts.ScriptKind.TSX);
let handler;
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='handleMonsterHunt')handler=node;ts.forEachChild(node,visit);}
visit(parsed);
assert.ok(handler,'monster selection must use the reviewed handler');
const code=ts.transpileModule(handler.getText(parsed),{compilerOptions:{target:99}}).outputText;
const enemy={name:'target',hp:52,dungeonId:'test-key',boss:false};
function fixture(game={dungeon:{status:'idle'}}){
  let randoms=0,clocks=0,windows=0;
  const updates=[],calls=[];
  const context=vm.createContext({game,Date:{now:()=>{clocks++;return 1000;}},Math:{random:()=>{randoms++;return randoms/100;}},
    hanyangWorldBossBlocked:state=>state.blocked===true,
    setBattleWindowRequest:update=>{windows=update(windows);},setGame:update=>updates.push(update),
    freshDungeon:()=>({status:'idle'}),DUNGEONS:{'test-key':{hp:52}},
    addLog:(logs,message)=>[...logs,message],grantXp:()=>{},enterGameInn:()=>{},leaveGameInn:()=>{},
    runDungeonAction:(...args)=>{calls.push(args);return args[0];}});
  vm.runInContext(code,context);
  return {click:value=>context.handleMonsterHunt(value,{game,
    setGame:context.setGame,setBattleWindowRequest:context.setBattleWindowRequest}),
    updates,calls,counts:()=>({randoms,clocks,windows})};
}

test('monster card delegates to the handler and samples time/random only once per click',()=>{
  assert.match(source,/onClick=\{\(\) => startMonsterHunt\(enemy\)\}/);
  assert.match(source,/const startMonsterHunt=\(enemy: SourceEnemy\)=>handleMonsterHunt\(enemy,\{game,setGame,setBattleWindowRequest\}\)/);
  const h=fixture();h.click(enemy);
  const sampled=h.counts(),latest={marker:'latest',gold:10,logs:[],dungeon:{status:'idle'}};
  assert.equal(sampled.windows,1);assert.equal(sampled.clocks,1);assert.ok(sampled.randoms>0);
  const a=h.updates[0](latest),b=h.updates[0](latest);
  assert.deepEqual(h.counts(),sampled);
  assert.deepEqual(a,b);
  assert.equal(a.marker,'latest');assert.equal(a.gold,10);
  assert.equal(a.selectedMonster,enemy.name);
  assert.equal(a.dungeon.autoHunt,true);
  assert.equal(a.dungeon.lockedEnemyKey,enemy.dungeonId);
  assert.equal(h.calls[0][1],'start');assert.equal(h.calls[0][2],1000);
  assert.equal(h.calls[0][4],h.calls[1][4]);
  assert.equal(h.calls[0][4].materialRolls.length,3);
  assert.equal(typeof h.calls[0][4].fusionCoreRoll,'number');
  assert.deepEqual(latest,{marker:'latest',gold:10,logs:[],dungeon:{status:'idle'}});
});

test('blocked boss or recovering render cannot open a window, sample inputs or start combat',()=>{
  for(const game of [{blocked:true},{dungeon:{status:'recovering'}}]){
    const h=fixture(game);h.click(enemy);
    assert.deepEqual(h.counts(),{randoms:0,clocks:0,windows:0});
    assert.equal(h.updates.length,0);assert.equal(h.calls.length,0);
  }
});

test('latest boss gate and recovery state override a stale clickable render without healing or charging',()=>{
  for(const latest of [{blocked:true},{dungeon:{status:'recovering'},gold:10,hp:0}]){
    const h=fixture();h.click(enemy);
    assert.equal(h.updates[0](latest),latest);
    assert.equal(h.calls.length,0);
  }
});
