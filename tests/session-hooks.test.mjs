import { harness } from "./hook-harness.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameSaveScheduler} from '../app/game-save-scheduler.ts';
import {parseStoredArray} from '../app/storage-guards.ts';

function sessionFixture({corruptWarehouse=false}={}) {
  let now=1000,game={hero:{level:1,name:'initial'},gold:0,credit:0,lastSeen:1000};
  const profiles=[{slot:0,nation:'korea',name:'A'},{slot:1,nation:'korea',name:'B'},null];
  const data=new Map([['profiles',JSON.stringify(profiles)],['warehouse',corruptWarehouse?'{broken':'[]'],['slot-0',JSON.stringify({...game,gold:10,hero:{level:1,name:'A'}})],['slot-1',JSON.stringify({...game,gold:20,hero:{level:1,name:'B'}})]]);
  const writes=[],notices=[],listeners={pagehide:new Set(),visibilitychange:new Set()};
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const events=type=>({addEventListener:(name,fn)=>listeners[name].add(fn),removeEventListener:(name,fn)=>listeners[name].delete(fn),...type});
  const write=(key,value)=>{writes.push({key,value:JSON.parse(JSON.stringify(value))});storage.setItem(key,JSON.stringify(value));};
  const hook=harness('use-character-session.ts','useCharacterSession',{
    localStorage:storage,window:events({}),document:events({visibilityState:'visible'}),queueMicrotask:fn=>fn(),Date:{now:()=>now},
    PROFILE_INDEX:'profiles',SHARED_WAREHOUSE_SAVE:'warehouse',profileSaveKey:slot=>`slot-${slot}`,
    parseStoredArray,isNationId:n=>n==='korea',normalizeStoredItem:item=>item,itemKind:()=>'',gersangItemArt:()=>'',preserveCorruptStorage:()=>false,
    createGameSaveScheduler,backupBeforeGuildMigration:()=>{},backupBeforeEquipmentMigration:()=>{},backupBeforePromotionMigration:()=>{},
    profileFromGame:(slot,value)=>({slot,nation:'korea',name:value.hero.name}),readCharacterSave:(store,slot)=>store.getItem(`slot-${slot}`),restoreGame:value=>value,freshGame:name=>({...game,hero:{level:1,name}}),createGameTickRolls:()=>({encounterCountRoll:0}),settleCurrentGame:value=>({...value}),
    writeCharacterSave:(store,slot,value)=>write(`slot-${slot}`,value),writeProfileIndex:(store,value)=>write('profiles',value),writeSharedWarehouse:(store,value)=>write('warehouse',value),
    saveCharacterProfile:(store,list,slot,value,profile)=>{write(`slot-${slot}`,value);const next=[...list];next[slot]=profile;write('profiles',next);return next;},
  });
  const props={setGame:value=>{game=typeof value==='function'?value(game):value;},setNotice:value=>notices.push(value),setSelectedUid:()=>{},setCityService:()=>{},setActiveTab:()=>{}};
  return {render:()=>hook.render({...props,game}),unmount:()=>hook.unmount(),data,writes,notices,listeners,setGold:value=>{game={...game,gold:value};},setNow:value=>{now=value;}};
}

test('slot transition flushes each latest character to its own slot and removes exit listeners',()=>{
  const f=sessionFixture();f.render();let session=f.render();
  session.enterCharacter(0);session=f.render();
  f.setNow(1001);f.setGold(99);session=f.render();
  assert.equal(JSON.parse(f.data.get('slot-0')).gold,10,'periodic save is throttled');
  session.enterCharacter(1);session=f.render();
  assert.equal(JSON.parse(f.data.get('slot-0')).gold,99,'slot cleanup retains newest old-character data');
  assert.equal(JSON.parse(f.data.get('slot-1')).hero.name,'B');
  assert.equal(JSON.parse(f.data.get('slot-1')).gold,20);
  assert.equal(f.listeners.pagehide.size,1);
  f.setGold(123);session=f.render();session.returnToCharacterSelect();f.render();
  assert.equal(JSON.parse(f.data.get('slot-1')).gold,123);
  assert.equal(JSON.parse(f.data.get('slot-0')).gold,99);
  assert.equal(f.listeners.pagehide.size,0);
  assert.equal(f.listeners.visibilitychange.size,0);
  f.unmount();
});

test('page hide flushes pending data and corrupt warehouse without backup stays untouched',()=>{
  const f=sessionFixture({corruptWarehouse:true});f.render();let session=f.render();
  session.setSharedWarehouse([{uid:'new-item'}]);session=f.render();
  assert.equal(f.data.get('warehouse'),'{broken');
  assert.ok(f.notices.some(text=>text.includes('已停止寫入')));
  session.enterCharacter(0);f.render();f.setNow(1001);f.setGold(88);f.render();
  for(const listener of f.listeners.pagehide)listener();
  assert.equal(JSON.parse(f.data.get('slot-0')).gold,88);
  const count=f.writes.length;for(const listener of f.listeners.pagehide)listener();
  assert.equal(f.writes.length,count,'already-flushed data is not written twice');
  f.unmount();
});

test('game loop keeps one timer per character, reuses sampled rolls on updater replay, and stops on exit',()=>{
  const timers=new Map();let id=0,samples=0;const replayed=[];
  const rolls={now:1,roll:.5};
  const hook=harness('use-game-loop.ts','useGameLoop',{
    window:{setInterval:(fn,ms)=>{assert.equal(ms,200);timers.set(++id,fn);return id;},clearInterval:key=>timers.delete(key)},
    createGameTickRolls:()=>{samples++;return rolls;},settleCurrentGame:(previous,input)=>{replayed.push(input);return previous;},applyAutoPotionAction:state=>state,addLog:()=>{},grantXp:()=>{},
  });
  const setGame=updater=>{updater({});updater({});};
  hook.render({ready:false,activeSlot:null,setGame});assert.equal(timers.size,0);
  hook.render({ready:true,activeSlot:0,setGame});assert.equal(timers.size,1);
  [...timers.values()][0]();assert.equal(samples,1);assert.equal(replayed.length,2);assert.strictEqual(replayed[0],replayed[1]);
  hook.render({ready:true,activeSlot:0,setGame});assert.equal(timers.size,1);
  hook.render({ready:true,activeSlot:1,setGame});assert.equal(timers.size,1);assert.equal(id,2);
  hook.render({ready:true,activeSlot:null,setGame});assert.equal(timers.size,0);
  hook.unmount();
});

test('central game setter preserves no-op identity and treats another character as an independent ledger',()=>{
  let questSyncs=0,normalizations=0,lifetimeSyncs=0;
  const ledger={claimed:['A']};
  const initial={hero:{level:1},inventory:[],questLedger:ledger};
  const hook=harness('use-game-state.ts','useGameState',{
    freshGame:()=>initial,normalizeQuestLedger:value=>{normalizations++;return value??ledger;},syncQuestProgress:(previous,next)=>{questSyncs++;return next;},syncCityHallLifetime:(previous,next)=>{lifetimeSyncs++;return next;},positionInventory:items=>items,applyGersangVisuals:value=>value,
  });
  const first=hook.render();first.setGame(previous=>previous);const same=hook.render();
  assert.strictEqual(same.game,first.game);assert.strictEqual(same.setGame,first.setGame);assert.equal(lifetimeSyncs,0);
  const other={hero:{level:2},inventory:[],questLedger:{claimed:['B']}};
  same.setGame(other);const switched=hook.render();
  assert.strictEqual(switched.game.questLedger,other.questLedger);assert.equal(questSyncs,1);assert.equal(normalizations,2);assert.equal(lifetimeSyncs,1);
});
