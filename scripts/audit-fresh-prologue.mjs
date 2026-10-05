// Formal actions and shared UI story transitions, not a browser or natural human-play test.
import './measure-equipment-early.mjs';
import {createRequire,Module} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
require.extensions['.css']=()=>{};
const {freshGame}=require('../app/game-hero-factory.ts');
const {worldCities}=require('../app/v15-data.ts');
const {npcById,npcQuestState,npcQuestProgress}=require('../app/npc-dialogue.ts');
const {hanyangNpcOptions}=require('../app/hanyang-npc-dialogue.ts');
const {createNpcController}=require('../app/game-npc-controller.ts');
// Resolve the existing project's @ alias while loading the real recruitment UI dependency.
let createSquadController;
const resolveOriginal=Module._resolveFilename;
try{
  Module._resolveFilename=function(request,...args){
    return resolveOriginal.call(this,request.startsWith('@/')?fileURLToPath(new URL('../'+request.slice(2),import.meta.url)):request,...args);
  };
  ({createSquadController}=require('../app/game-squad-controller.ts'));
}finally{Module._resolveFilename=resolveOriginal;}
const {createNavigationController}=require('../app/game-navigation-controller.ts');
const {getProgressionView,FIRST_CARAVAN_TARGET}=require('../app/game-progression-view.ts');
const {mercenarySpec}=require('../app/mercenary-roster.ts');
const {syncHanyangPrologue,pauseHanyangTutorialBattle}=require('../app/hanyang-prologue.ts');
const {syncHanyangDeliveryKills,syncHanyangReturnProgress}=require('../app/hanyang-story-transitions.ts');
const {settleCurrentGame,createGameTickRolls}=require('../app/game-loop.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {grantXp}=require('../app/game-progression.ts');
const {appendGameLog,enterGameInnAction,leaveGameInnAction}=require('../app/game-runtime-actions.ts');
const {equipInventoryItemAction,sellMaterialAction,buyMedicineAction,applyAutoPotionAction}=require('../app/game-inventory-actions.ts');
const {vitalStats}=require('../app/vitals-engine.ts');
const noop=()=>{};
const deps={addLog:appendGameLog,grantXp,enterInn:enterGameInnAction,leaveInn:leaveGameInnAction};

export function auditFreshPrologue({seed=1,seconds=1800,actionSeconds=2,captureState=false}={}){
  if(!Number.isInteger(seed)||!Number.isInteger(seconds)||seconds<1||seconds>1800||!Number.isInteger(actionSeconds)||actionSeconds<1||actionSeconds>10)throw new RangeError('Invalid prologue audit input');
  let now=Date.UTC(2026,9,5)+seed*1000000,rng=seed>>>0,game,notice='';
  const start=now,randomOriginal=Math.random,dateOriginal=Date.now;
  const milestones=[],actions=[];
  let nextActionAt=start,recoveries=0,lastStep,oldStatus;
  Math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  Date.now=()=>now;
  const setGame=update=>{game=typeof update==='function'?update(game):update;};
  const setNotice=value=>{notice=value;};
  const currentCity=()=>worldCities.find(city=>city.id===game.city);
  const npcAction=(id,selector)=>{
    const npc=npcById(id),option=typeof selector==='function'?npc.options.find(selector):selector;
    if(!option)throw new Error(`Missing actual NPC option ${id}`);
    createNpcController({game,currentCity:currentCity(),setGame,setNotice,setActiveNpcId:noop,setActiveTab:noop,setCityService:noop,setNpcOpeningLine:noop}).handleNpcAction({npc,option});
    actions.push({seconds:(now-start)/1000,npc:id,label:option.label});
  };
  const goToObjective=()=>createNavigationController({game,mainObjective:getProgressionView(game).mainObjective,openNpcDialogue:noop,setActiveNpcId:noop,setActiveTab:noop,setCityService:noop,setGame,setNotice,setNpcOpeningLine:noop,setSquadDestination:noop}).goToObjective();
  try{
    game=freshGame('自然流程腳本');
    for(let tick=0;tick<=seconds*5;tick++){
      if(tick){now+=200;const rolls=createGameTickRolls();game=applyAutoPotionAction(settleCurrentGame(game,rolls),now,appendGameLog,grantXp);}
      game=syncHanyangDeliveryKills(game,FIRST_CARAVAN_TARGET);
      game=syncHanyangReturnProgress(game);
      game=pauseHanyangTutorialBattle(game);
      if(game.dungeon?.status==='recovering'&&oldStatus!=='recovering')recoveries++;
      oldStatus=game.dungeon?.status;
      if(game.hanyangPrologueStep!==lastStep){
        lastStep=game.hanyangPrologueStep;
        milestones.push({step:lastStep,seconds:(now-start)/1000,gold:game.gold,heroLevel:game.hero.level,kills:game.kills});
      }
      if(lastStep==='completed')break;
      if(now<nextActionAt||game.dungeon?.status==='recovering')continue;
      nextActionAt=now+actionSeconds*1000;
      if(lastStep==='arrival')npcAction('kim-seongho',option=>option.quest==='start');
      else if(lastStep==='outskirts'||lastStep==='first-battle'||lastStep==='bandit-trial'){
        if(!['fighting','respawning'].includes(game.dungeon?.status)){
          goToObjective();
          game=runDungeonAction(game,'start-auto-hunt',now,game.dungeon?.key,createGameTickRolls(),deps);
        }
      }else if(lastStep==='first-sale'){
        const npc=npcById('kim-seongho');
        if(npcQuestState(game,npc)==='active'&&npcQuestProgress(game,npc.quest)>=npc.quest.target)npcAction(npc.id,{label:'回報任務',reply:'做得好，這是約定的謝禮。',quest:'complete'});
        else if(!game.hanyangPrologueFlags.equipmentEquipped){
          const sword=game.inventory.find(item=>item.name==='商路短劍');
          if(sword)game=equipInventoryItemAction(game,sword.uid,'weapon','hero',appendGameLog);
        }else if(!game.hanyangPrologueFlags.lootSold){
          // The displayed objective teaches selling one meat, not all stock/seals.
          game=sellMaterialAction(game,'肉類',appendGameLog,String);
        }
      }else if(lastStep==='journey-fund')npcAction('wang-deokchang',option=>option.service==='exchange');
      else if(lastStep==='medicine')game=buyMedicineAction(game,'healing',1,currentCity().priceFactor,currentCity().name,appendGameLog,setNotice);
      else if(lastStep==='guild')createSquadController({game,currentCity:currentCity(),setGame,setNotice,selectedUid:'hero'}).recruitMerchant(mercenarySpec('merchant-spear'),0);
      else if(lastStep==='formation')game=syncHanyangPrologue(game,6000); // Same squad-view confirmation hook.
      else if(lastStep==='caravan-crisis')npcAction('wang-deokchang',hanyangNpcOptions(game,'wang-deokchang')[0]);
      // These are the exact contextual choices shown by NpcDialoguePanel.
      else if(lastStep==='caravan-delivery')npcAction('wang-deokchang',hanyangNpcOptions(game,'wang-deokchang')[0]);
      else if(lastStep==='return'||lastStep==='departure')npcAction('kim-seongho',hanyangNpcOptions(game,'kim-seongho')[0]);
    }
    const members=[game.hero,...game.mercs];
    return {seed,completed:game.hanyangPrologueStep==='completed',elapsedSeconds:(now-start)/1000,actionSeconds,
      step:game.hanyangPrologueStep,gold:game.gold,kills:game.kills,deliveryKills:game.starterDeliveryKills,recoveries,
      worldMapUnlocked:game.hanyangPrologueFlags.worldMapUnlocked,completedQuests:game.npcProgress.completedQuests,
      medicine:game.medicines,materials:game.materials,notice,milestones,actions,
      members:members.map(unit=>({name:unit.name,level:unit.level,xp:unit.xp,points:unit.points,intel:unit.intel,position:unit.position,hp:unit.hp,maxHp:vitalStats(unit).maxHp,weapon:unit.equip.weapon?.name||null})),
      ...(captureState?{state:game}:{}),
      caveat:'Scripted formal NPC/navigation/recruitment/inventory/battle actions with shared story transitions. No supplied funds, XP, equipment, seals or completion flags. Two seconds per scripted choice by default, not measured human reading/travel/browser time. No manual potion use or allocated attributes; default Auto Skill/Auto Potion retained. Stops at completed prologue or timeout; NOT full chapter/Boss/30-minute browser verification.'};
  }finally{Math.random=randomOriginal;Date.now=dateOriginal;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(auditFreshPrologue(),null,2));
