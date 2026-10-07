import test from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './hook-harness.mjs';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {syncHanyangReturnProgress}=require('../app/hanyang-story-transitions.ts');
const {freshGame}=require('../app/game-hero-factory.ts');

test('preferences load after mount, persist only after loading, and cancel on unmount',async()=>{
  const microtasks=[],writes=[],listeners=new Map(),settings={musicVolume:64,sceneMode:'auto'};
  const dependencies={
    DEFAULT_GAME_UI_SETTINGS:{musicVolume:42,sceneMode:'auto'},GAME_UI_SETTINGS_KEY:'settings',readGameUiSettings:()=>settings,
    queueMicrotask:fn=>microtasks.push(fn),localStorage:{setItem:(key,value)=>writes.push(JSON.parse(value))},
    document:{fullscreenElement:null,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)},
  };
  const hook=harness('use-game-preferences.ts','useGamePreferences',dependencies),setNotice=()=>{};
  assert.equal(hook.render({setNotice}).uiSettings.musicVolume,42);assert.equal(writes.length,0);
  microtasks.shift()();let view=hook.render({setNotice});assert.equal(view.uiSettings.musicVolume,64);assert.equal(writes.length,1);
  await view.setSceneMode('pc-169');view=hook.render({setNotice});assert.equal(view.uiSettings.sceneMode,'pc-169');assert.equal(writes.at(-1).sceneMode,'pc-169');
  hook.unmount();assert.equal(listeners.size,0);
  const cancelled=harness('use-game-preferences.ts','useGamePreferences',dependencies);
  cancelled.render({setNotice});cancelled.unmount();microtasks.shift()();assert.equal(cancelled.render({setNotice}).uiSettings.musicVolume,42);
});

test('tutorial pause reads current state but triggers only on step changes',()=>{
  const notices=[];let pauses=0,state={...freshGame('hook-trial'),hanyangPrologueStep:'outskirts',dungeon:{status:'idle',autoHunt:true,logs:[]}};
  const pause=s=>{pauses++;return s.dungeon.autoHunt?{...s,dungeon:{...s.dungeon,autoHunt:false}}:s;};
  const hook=harness('use-hanyang-navigation.ts','useHanyangReturnEffects',{pauseHanyangTutorialBattle:pause,syncHanyangReturnProgress});
  const setGame=updater=>{state=updater(state);},setNotice=notice=>notices.push(notice);
  hook.render({game:state,setGame,setNotice});assert.equal(pauses,2);assert.equal(state.dungeon.autoHunt,false);assert.equal(notices.length,1);
  state={...state,gold:20};hook.render({game:state,setGame,setNotice});assert.equal(pauses,2);assert.equal(notices.length,1);
  state={...state,hanyangPrologueStep:'bandit-trial',dungeon:{status:'respawning',autoHunt:true,logs:['成功擊敗 黑巾山賊']}};
  hook.render({game:state,setGame,setNotice});assert.equal(state.hanyangPrologueStep,'caravan-delivery');assert.equal(state.hanyangPrologueFlags.caravanRestored,true);assert.equal(state.dungeon.autoHunt,false);
});

test('maintenance clears only idle relic reservations without overwriting live dispatches',()=>{
  let state={guildSkills:{},guildRank:1,guildSkillPoints:0,relicDungeon:{status:'idle',dispatchPartyNames:['A'],dispatchPartyUids:['a']}};
  const setGame=updater=>{state=updater(state);};
  const hook=harness('use-game-maintenance.ts','useGameMaintenance',{normalizeGuildSkills:s=>s,guildSkillPointsForRank:()=>0});
  hook.render({game:state,ready:true,activeSlot:0,setGame});assert.equal(state.relicDungeon.dispatchPartyUids.length,0);
  state={...state,relicDungeon:{status:'dispatching',dispatchPartyNames:['A'],dispatchPartyUids:['a']}};
  hook.render({game:state,ready:true,activeSlot:0,setGame});assert.equal(state.relicDungeon.dispatchPartyUids[0],'a');
});
