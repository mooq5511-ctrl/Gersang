import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Render only the wiring with inert UI/dependency doubles. Actual combat and
// story transitions remain covered by world-battle-action.test.mjs.
const source=readFileSync(new URL('../app/game-world-battle-panel.tsx',import.meta.url),'utf8');
function harness(panelSource=source) {
  const updates=[],actions=[],configuration=[],medicineUses=[];
  const DungeonPanel=()=>{},WorldBattleWindow=()=>{};
  const result={engineResult:true};
  let randomCalls=0,clockCalls=0;
  const freshDungeon=()=>({status:'idle'});
  const addLog=(logs,message)=>[...logs,message];
  const grantXp=()=>{},enterInn=()=>{},leaveInn=()=>{};
  const modules={
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    './world-battle-window':{WorldBattleWindow},
    './dungeon-panel':{DungeonPanel},
    './dungeon-engine':{freshDungeon},
    './vitals-engine':{vitalStats:unit=>({mp:unit.mp}),combatStats:unit=>({attack:unit.attack})},
    './game-config':{medicineCatalog:[{id:'healing'},{id:'mana'}]},
    './auto-potion-manager':{AutoPotionManager:{available:stock=>stock.healing||0}},
    './game-inventory-actions':{configureAutoPotionAction:(...args)=>{configuration.push(args);return args[0];}},
    './battle-log-manager':{BattleLogManager:{getLogs:logs=>logs,clear:()=>[]}},
    'lucide-react':{Pill:()=>{}},
    './world-battle-action':{runWorldBattleAction:(...args)=>{actions.push(args);return result;}},
    './game-progression':{grantXp},
    './game-runtime-actions':{appendGameLog:addLog,enterGameInnAction:enterInn,leaveGameInnAction:leaveInn},
  };
  const code=ts.transpileModule(panelSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,
    target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},fileName:'game-world-battle-panel.tsx'}).outputText;
  const context=vm.createContext({exports:{},require:id=>{
    if(id.endsWith('.css'))return {};
    assert.ok(id in modules,`unreviewed dependency: ${id}`);
    return modules[id];
  },Date:{now:()=>{clockCalls++;return 123456;}},Math:{...Math,
    max:Math.max,floor:Math.floor,random:()=>{randomCalls++;return randomCalls/100;}}});
  vm.runInContext(code,context);
  const game={hero:{uid:'hero',mp:7,attack:12},mercs:[
    {uid:'active',attack:100},{uid:'resting',attack:1000}],active:['active'],
    dungeon:{status:'fighting',marker:'live'},medicines:{healing:4,mana:2},
    autoPotion:{enabled:true},autoSkill:true,battleLogs:[{id:'log'}]};
  const render=(overrides={})=>context.exports.GameWorldBattlePanel({game,ready:true,activeSlot:0,
    battleWindowRequest:3,currentMap:{name:'map',region:'region'},
    consumeMedicine:id=>medicineUses.push(id),setGame:update=>updates.push(update),...overrides});
  return {game,render,updates,actions,configuration,medicineUses,result,DungeonPanel,WorldBattleWindow,
    grantXp,enterInn,leaveInn,addLog,counts:()=>({randomCalls,clockCalls})};
}

test('global window uses live state, explicit session readiness and continuous battle controls',()=>{
  const h=harness(),window=h.render(),panel=window.props.children;
  assert.equal(window.type,h.WorldBattleWindow);
  assert.equal(panel.type,h.DungeonPanel);
  assert.equal(window.props.state,h.game.dungeon);
  assert.equal(window.props.request,3);
  assert.equal(window.props.enabled,true); // slot zero is a valid character
  assert.equal(h.render({ready:false}).props.enabled,false);
  assert.equal(h.render({activeSlot:null}).props.enabled,false);
  assert.equal(panel.props.continuousHunt,true);
  assert.equal(panel.props.state,h.game.dungeon);
  assert.deepEqual(Array.from(panel.props.party,unit=>unit.uid),['hero','active']);
  assert.equal(panel.props.dps,18); // resting mercenary cannot contribute
  assert.equal(panel.props.autoPotion,h.game.autoPotion);
  assert.equal(panel.props.battleLogs,h.game.battleLogs);
});

function assertStableAction(h) {
  const panel=h.render().props.children;
  assert.deepEqual(h.counts(),{randomCalls:0,clockCalls:0});
  panel.props.act('start','selected-monster');
  assert.equal(h.updates.length,1);
  const sampled=h.counts();
  assert.ok(sampled.randomCalls>0);
  assert.equal(sampled.clockCalls,1);
  const previous={marker:'latest-not-render-snapshot'};
  assert.equal(h.updates[0](previous),h.result);
  assert.equal(h.updates[0](previous),h.result);
  assert.deepEqual(h.counts(),sampled); // updater itself must not reroll or reread clock
  assert.equal(h.actions[0][0],previous);
}

test('manual actions use latest state and reuse sampled rolls across repeated React updaters',()=>{
  const h=harness();
  assertStableAction(h);
  const [a,b]=h.actions;
  assert.equal(a[1],'start');
  assert.equal(a[2],123456);
  assert.equal(a[3],'selected-monster');
  assert.equal(a[4],b[4]);
  for(const key of ['roll','choice','retaliationRoll','gearDropRoll','gearChoiceRoll',
    'sealDropRoll','sealChoiceRoll','encounterCountRoll'])assert.equal(typeof a[4][key],'number',key);
  assert.equal(a[4].spawnRoll,0);
  assert.equal(a[4].materialRolls.length,3);
  assert.equal(a[5].addLog,h.addLog);
  assert.equal(a[5].grantXp,h.grantXp);
  assert.equal(a[5].enterInn,h.enterInn);
  assert.equal(a[5].leaveInn,h.leaveInn);
});

test('wiring guard rejects stale render state and resampling inside the updater',()=>{
  for(const [before,after] of [
    ['runWorldBattleAction(previous,','runWorldBattleAction(game,'],
    ['previous,action,now,key,rolls,','previous,action,Date.now(),key,{...rolls,roll:Math.random()},'],
  ]) {
    assert.ok(source.includes(before),'mutation must reach the real call site');
    assert.throws(()=>assertStableAction(harness(source.replace(before,after))),assert.AssertionError);
  }
});

test('auto potion settings delegate to the existing action with latest state',()=>{
  const h=harness(),panel=h.render().props.children,change={enabled:false};
  panel.props.onAutoPotionChange(change);
  const previous={marker:'latest'};
  assert.equal(h.updates[0](previous),previous);
  assert.equal(h.configuration[0][0],previous);
  assert.equal(h.configuration[0][1],change);
  assert.equal(h.configuration[0][2],h.addLog);
  assert.equal(h.actions.length,0);
});

test('the global panel remains mounted outside tab lifecycle and root owns no battle state',()=>{
  const root=readFileSync(new URL('../app/game-v15.tsx',import.meta.url),'utf8');
  assert.ok(root.indexOf('<GameWorldBattlePanel')>=0);
  assert.ok(root.indexOf('<GameWorldBattlePanel')<root.search(/<Tabs\s/));
  assert.doesNotMatch(root,/useState|useEffect|localStorage/);
});
