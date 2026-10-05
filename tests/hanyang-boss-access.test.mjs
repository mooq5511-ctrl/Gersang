import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/audit-fresh-prologue.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {freshDungeon}=require('../app/dungeon-engine.ts');
const {hanyangWorldBossBlocked,HANYANG_BOSS_LOCK_MESSAGE}=require('../app/hanyang-boss-access.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {grantXp}=require('../app/game-progression.ts');
const {appendGameLog,enterGameInnAction,leaveGameInnAction}=require('../app/game-runtime-actions.ts');
const deps={addLog:appendGameLog,grantXp,enterInn:enterGameInnAction,leaveInn:leaveGameInnAction};
const boss='e_starter_pirate_king';

test('every unfinished prologue stage blocks actual world bosses but not story trial or raccoon',()=>{
  for(const step of ['arrival','outskirts','first-battle','first-sale','journey-fund','medicine','guild','formation','caravan-crisis','bandit-trial','caravan-delivery','return','departure']){
    const state={hanyangPrologueStep:step};
    assert.equal(hanyangWorldBossBlocked(state,boss),true);
    assert.equal(hanyangWorldBossBlocked(state,'e_starter_black_bandit'),false);
    assert.equal(hanyangWorldBossBlocked(state,'e_starter_raccoon'),false);
  }
  for(const step of ['completed',undefined])assert.equal(hanyangWorldBossBlocked({hanyangPrologueStep:step},boss),false);
});

test('direct boss start and auto hunt cannot hurt, charge or reward a tutorial party',()=>{
  for(const action of ['start','start-auto-hunt','toggle-auto-hunt']){
    const state={...freshGame('boss-lock'),hanyangPrologueStep:'outskirts'};
    const next=runDungeonAction(state,action,1000,boss,{},deps);
    assert.strictEqual(next.hero,state.hero);assert.strictEqual(next.mercs,state.mercs);
    assert.strictEqual(next.inventory,state.inventory);assert.strictEqual(next.materials,state.materials);
    assert.equal(next.gold,state.gold);assert.equal(next.kills,state.kills);
    assert.ok(next.logs.includes(HANYANG_BOSS_LOCK_MESSAGE));
    assert.notEqual(next.dungeon?.status,'fighting');
  }
  const completed={...freshGame('unlocked'),hanyangPrologueStep:'completed'};
  const attempted=runDungeonAction(completed,'start',1000,boss,{},deps);
  // Existing defeat handling resets the dungeon key when the unprepared Lv.1 actor loses.
  assert.equal(attempted.dungeon.status,'recovering');
  assert.equal(attempted.hero.hp,0);
  assert.ok(!attempted.logs.includes(HANYANG_BOSS_LOCK_MESSAGE));
});

test('stale tutorial boss auto encounters stop without fake healing and recovery remains available',()=>{
  const dungeon={...freshDungeon(),key:boss,lockedEnemyKey:boss,status:'respawning',autoHunt:true,spawnAt:1000};
  const state={...freshGame('stale'),hanyangPrologueStep:'outskirts',dungeon,hero:{...freshGame('template').hero,hp:40}};
  const next=runDungeonAction(state,'tick',2000,undefined,{},deps);
  assert.equal(next.dungeon.status,'idle');assert.equal(next.dungeon.autoHunt,false);
  assert.equal(next.dungeon.resumeAutoHuntAfterRecovery,false);assert.equal(next.hero.hp,40);
  assert.equal(next.gold,state.gold);
  const recovering={...state,dungeon:{...dungeon,status:'recovering',autoHunt:false,innHealAt:1000}};
  const recovered=runDungeonAction(recovering,'tick',2000,undefined,{},deps);
  assert.ok(recovered.hero.hp>40);
  assert.ok(!recovered.logs.includes(HANYANG_BOSS_LOCK_MESSAGE));
});
