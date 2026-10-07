import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../app/game-battle-page.tsx',import.meta.url),'utf8');
const maps=[{id:'starter-outskirts',name:'starter',region:'home',theme:'field',unlockStage:1,description:'start'},
  {id:'lake',name:'lake',region:'water',theme:'lake',unlockStage:20,description:'next'}];
function harness(pageSource=source) {
  const calls=[],preparations=[],enemy={id:'scout',name:'黑巾斥候',mapId:'starter-outskirts',dungeonId:'scout',hp:52,mp:0,attack:5,xp:40,drops:['cloth']};
  const modules={
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    '@/components/ui/tabs':{TabsContent:()=>{}},'lucide-react':{},
    './battle-visual-data':{battleMonsterImage:()=>'/scout.png'},
    './dungeon-engine':{},'./game-battle-actions':{},'./game-display':{formatGameNumber:String},
    './game-progression':{},'./game-progression-view':{FIRST_CARAVAN_TARGET:3},'./game-runtime-actions':{},
    './game-ui-config':{BATTLE_PANEL_LABELS:[],WORLD_MAP_NODE_POSITIONS:{'starter-outskirts':[10,20],lake:[30,40]},mapFeatureIcons:{}},
    './hero-rules':{},'./monster-compendium':{MonsterCompendium:()=>{}},
    './reference-data':{battleMaps:maps},'./tier-equipment':{TIER_EQUIPMENT_DROP_REGIONS:[]},
    './v17-content':{sourceEnemies:[enemy]},
    '../data/monsters/world-progression':{WORLD_MONSTER_PROGRESSION:{'starter-outskirts':{min:1,max:15,focus:'entry focus'},lake:{min:20,max:35,focus:'lake focus'}}},
    '../data/monsters/monster-redesign':{MONSTER_REDESIGN:{scout:{level:5,encounterTier:'菁英'}}},
    './hanyang-boss-access':{hanyangWorldBossBlocked:()=>false,HANYANG_BOSS_LOCK_MESSAGE:'locked'},
    './tutorial-hunt':{tutorialHuntReady:state=>state.ready===true,startTutorialHuntAction:()=>{}},'./tutorial-hunt.css':{},
    './world-hunt-preparation':{worldHuntPreparation:(...args)=>{preparations.push(args);return {title:'preparation title',detail:'preparation detail'};}},
    './world-hunt-preparation.css':{},
  };
  const code=ts.transpileModule(pageSource.replace('import.meta.env.DEV','false'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:99,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const context=vm.createContext({exports:{},require:id=>{assert.ok(id in modules,id);return modules[id];}});
  vm.runInContext(code,context);
  const render=overrides=>context.exports.GameBattlePage({activeUnits:[],
    game:{hero:{},logs:[],battleMap:'starter-outskirts',starterDeliveryKills:0,dungeon:{status:'idle'}},
    battlePanelVisibility:{mapNavigation:true,monsterSelection:true},currentMap:maps[0],currentMapEnemies:[enemy],
    currentMapGate:{unlocked:true,requirement:'ready'},mapGate:map=>({unlocked:map.id==='starter-outskirts',requirement:'need level'}),
    selectBattleMap:id=>calls.push(id),tutorialBattleLocked:false,...overrides});
  return {render,calls,enemy,preparations};
}
function nodes(tree,predicate) {
  const found=[];function visit(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}
    if(predicate(node))found.push(node);visit(node.props?.children);}visit(tree);return found;
}
const text=node=>{if(node===null||node===undefined||typeof node==='boolean')return '';if(typeof node!=='object')return String(node);if(Array.isArray(node))return node.map(text).join('');return text(node.props?.children);};
function checkMapWiring(h) {
  const tree=h.render();
  const buttons=nodes(tree,node=>node.type==='button'&&node.props.className?.startsWith('battle-map-node'));
  assert.equal(buttons.length,2);assert.equal(buttons[0].props.disabled,false);assert.equal(buttons[1].props.disabled,true);
  assert.equal(buttons[0].props.style['--map-x'],'10%');assert.equal(buttons[1].props.style['--map-y'],'40%');
  buttons[0].props.onClick();assert.deepEqual(h.calls,['starter-outskirts']);
  const tutorial=h.render({tutorialBattleLocked:true,mapGate:()=>({unlocked:true,requirement:''})});
  const tutorialButtons=nodes(tutorial,node=>node.type==='button'&&node.props.className?.startsWith('battle-map-node'));
  assert.equal(tutorialButtons[0].props.disabled,false);assert.equal(tutorialButtons[1].props.disabled,true);
  assert.equal(nodes(tutorial,node=>node.props?.className==='world-map-detail-travel')[0].props.disabled,true);
  const hidden=h.render({battlePanelVisibility:{mapNavigation:false}});
  assert.equal(nodes(hidden,node=>node.props?.className==='world-map-voyage-layout').length,0);
}
test('real battle page keeps map gates, tutorial restriction, positions and selection callbacks',()=>checkMapWiring(harness()));
test('map wiring catches removal of tutorial travel restriction',()=>{
  const broken=source.replace('const available = unlocked && !tutorialMapBlocked;','const available = unlocked;');
  assert.notEqual(broken,source);assert.throws(()=>checkMapWiring(harness(broken)),assert.AssertionError);
});
test('map progression text and monster card show their actual distinct data sources',()=>{
  const h=harness(),tree=h.render();
  const stats=nodes(tree,node=>node.props?.className==='world-map-detail-stats')[0];
  assert.ok(text(stats).includes('Lv.1–15'));
  const description=nodes(tree,node=>node.props?.className==='battle-world-map-description')[0];
  assert.ok(text(description).includes('entry focus'));
  const card=nodes(tree,node=>node.type==='button'&&nodes(node,n=>n.props?.className==='monster-choice-art').length>0)[0];
  const label=text(card);assert.ok(label.includes('Lv.5'));assert.ok(label.includes('EXP 40'));assert.ok(label.includes('HP 52'));
  const recovering=h.render({game:{hero:{},logs:[],dungeon:{status:'recovering'}}});
  assert.equal(nodes(recovering,node=>node.type==='button'&&nodes(node,n=>n.props?.className==='monster-choice-art').length>0)[0].props.disabled,true);
});
test('preparation advice uses actual deployed units and is suppressed during scripted tutorial',()=>{
  const h=harness(),hero={uid:'hero'},activeUnits=[{uid:'deployed'}];
  const tree=h.render({game:{hero,logs:[],dungeon:{status:'idle'}},activeUnits});
  assert.equal(h.preparations.length,1);
  assert.equal(h.preparations[0][0],'starter-outskirts');
  assert.equal(h.preparations[0][1],hero);
  assert.equal(h.preparations[0][2],activeUnits);
  assert.equal(h.preparations[0][3].hero,hero);
  const description=nodes(tree,node=>node.props?.className==='battle-world-map-description')[0];
  assert.match(text(description),/preparation title.*preparation detail/);
  const tutorial=h.render({tutorialBattleLocked:true});
  assert.equal(h.preparations.length,1);
  assert.doesNotMatch(text(tutorial),/preparation title/);
});
