import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import '../scripts/audit-fresh-prologue.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {tutorialHuntReady,startTutorialHuntAction}=require('../app/tutorial-hunt.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {freshDungeon,DUNGEONS}=require('../app/dungeon-engine.ts');
const {grantXp}=require('../app/game-progression.ts');
const {appendGameLog,enterGameInnAction,leaveGameInnAction}=require('../app/game-runtime-actions.ts');
const fixture=()=>({...freshGame('shortcut'),hanyangPrologueStep:'outskirts',battleMap:'starter-outskirts'});
test('tutorial shortcut starts the real raccoon auto encounter without free vitals or rewards',()=>{
  const state=fixture(),before=structuredClone(state);
  const rolls={encounterCountRoll:0},next=startTutorialHuntAction(state,1000,rolls);
  const key='e_starter_raccoon';
  const expected=runDungeonAction({...state,selectedMonster:'偷糧狸',enemyHp:DUNGEONS[key].hp,
    dungeon:{...freshDungeon(),autoHunt:true,key,lockedEnemyKey:key,enemyHp:DUNGEONS[key].hp},
    logs:appendGameLog(state.logs,'指定遭遇怪物：偷糧狸，開始戰鬥。')},'start',1000,key,rolls,
    {addLog:appendGameLog,grantXp,enterInn:enterGameInnAction,leaveInn:leaveGameInnAction});
  assert.equal(next.selectedMonster,'偷糧狸');assert.equal(next.dungeon.key,'e_starter_raccoon');
  assert.equal(next.dungeon.autoHunt,true);assert.ok(['fighting','respawning'].includes(next.dungeon.status));
  // Existing start runs the first engine step and may already credit a real kill.
  assert.deepEqual(next,expected);
  assert.equal(next.hero.maxHp,state.hero.maxHp);assert.ok(next.hero.hp<=state.hero.hp);
  assert.deepEqual(state,before);
});
test('stale click cannot restart active fights, recovery, completed task or another region',()=>{
  const base=fixture();
  for(const state of [{...base,hanyangPrologueStep:'arrival'},{...base,hanyangPrologueStep:'completed'},
    {...base,battleMap:'millennium-lake'},{...base,starterDeliveryKills:3},
    ...['fighting','respawning','recovering'].map(status=>({...base,dungeon:{...base.dungeon,status}}))]){
    assert.equal(tutorialHuntReady(state),false);
    assert.strictEqual(startTutorialHuntAction(state,1000,{}),state);
  }
});
test('the visible tutorial action precedes panels and atlas rather than being below the map',()=>{
  const source=readFileSync(new URL('../app/game-battle-page.tsx',import.meta.url),'utf8');
  assert.ok(source.indexOf('目前教學戰鬥目標')<source.indexOf('battle-panel-visibility'));
  assert.match(source,/setGame\(previous=>startTutorialHuntAction\(previous,now,rolls\)\)/);
  assert.match(source,/disabled=\{!tutorialHuntReady\(game\)\}/);
});
