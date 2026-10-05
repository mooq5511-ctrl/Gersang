import type {GameState} from './game-state';
import {freshRelicDungeon,relicDungeonAction,type RelicDungeonState} from './relic-dungeon';
import {RELIC_BOSS_IDS} from '../data/monsters/relic-dungeon-monsters';
import {medicineCatalog} from './game-config';
import {recoverVitals,vitalStats} from './vitals-engine';
import {relicPartyContext} from './relic-party';
import {settleRelicRewards} from './relic-reward-settlement';
import {appendGameLog} from './game-runtime-actions';
type Settings=NonNullable<RelicDungeonState['autoExplore']>;
const defaultSettings=():Settings=>({enabled:false,partyUids:[],nextActionAt:0,durationMs:30*60*1000,randomState:0});
export function normalizeRelicAutoExplore(value:RelicDungeonState['autoExplore']):Settings {
  if(!value)return defaultSettings();
  const valid=value.enabled===true&&Array.isArray(value.partyUids)&&value.partyUids.length>0&&value.partyUids.length<=10&&value.partyUids.every(uid=>typeof uid==='string'&&uid.length>0)&&new Set(value.partyUids).size===value.partyUids.length&&Number.isSafeInteger(value.nextActionAt)&&value.nextActionAt>0&&Number.isSafeInteger(value.durationMs)&&value.durationMs>=30_000&&value.durationMs<=30*60*1000&&Number.isInteger(value.randomState)&&value.randomState>=0&&value.randomState<=0xffffffff;
  return valid?{...value,partyUids:[...value.partyUids]}:{...defaultSettings(),stopReason:typeof value.stopReason==='string'?value.stopReason:undefined};
}
export function stopRelicAutoExplore(game:GameState,reason:string):GameState {
  const state=game.relicDungeon;
  if(!state)return game;
  return {...game,relicDungeon:{...state,autoBattle:false,nextBossAttackAt:0,autoExplore:{...(state.autoExplore||defaultSettings()),enabled:false,nextActionAt:0,stopReason:reason}},logs:appendGameLog(game.logs,`自動探索停止：${reason}`)};
}
export function toggleRelicAutoExplore(game:GameState,selectedUids:string[],now:number,seed:number,durationMs=30*60*1000):GameState {
  const state=game.relicDungeon||freshRelicDungeon(vitalStats(game.hero).maxHp);
  if(state.autoExplore?.enabled)return stopRelicAutoExplore(game,'玩家手動停止；已出發的派遣仍可正常回報。');
  if(!Number.isSafeInteger(now)||now<=0)return game;
  const busy=['dispatching','ready','boss'].includes(state.status);
  const uids=[...new Set(busy?state.dispatchPartyUids:selectedUids)];
  const party=relicPartyContext(game,uids,now);
  if(!party.partyReady||!uids.length||party.partyUids.length!==uids.length)return {...game,logs:appendGameLog(game.logs,'無法開啟自動探索：請選擇仍在休息名單、未參與商隊且可出戰的傭兵。')};
  const config:Settings={enabled:true,partyUids:uids,nextActionAt:now,durationMs:Math.min(30*60*1000,Math.max(30_000,Math.floor(durationMs))),randomState:Math.floor(seed*0x100000000)>>>0};
  return {...game,relicDungeon:{...state,autoExplore:config},logs:appendGameLog(game.logs,'自動探索已開啟：使用所選遠征隊；續進需消耗背包金創藥，缺藥或戰敗停止。')};
}

/** Heal only the reserved resting squad, at the existing potion's real inventory cost. */
function supplyParty(game:GameState,uids:string[],now:number):GameState {
  const medicine=medicineCatalog.find(item=>item.id==='healing')!;
  let next=game;
  for(let use=0;use<2;use++) {
    const context=relicPartyContext(next,uids,now);
    if(context.currentHp>=context.maxHp)return next;
    if(!Number.isFinite(next.medicines.healing)||next.medicines.healing<1)return stopRelicAutoExplore(next,'金創藥不足；遠征隊傷勢與已取得戰利品保留。');
    next={...next,medicines:{...next.medicines,healing:next.medicines.healing-1},restingMercs:next.restingMercs.map(unit=>uids.includes(unit.uid)?recoverVitals(unit,medicine.hpRestore,0):unit),logs:appendGameLog(next.logs,'遺跡遠征補給：金創藥 ×1，所選遠征隊恢復50%最大HP。')};
  }
  return next;
}

/** One chronological event scheduler for dispatch, discovery, boss strikes and next-layer supply. */
export function settleRelicAutoExplore(game:GameState,now:number,eventBudget=300):GameState {
  if(!Number.isFinite(now)||game.relicDungeon?.autoExplore?.enabled!==true)return game;
  let next=game;
  const budget=Number.isFinite(eventBudget)?Math.min(300,Math.max(1,Math.floor(eventBudget))):300;
  for(let event=0;event<budget;event++) {
    const state=next.relicDungeon!;
    if(!state.autoExplore?.enabled)return next;
    const config=normalizeRelicAutoExplore(state.autoExplore);
    if(!config.enabled)return stopRelicAutoExplore(next,'自動探索設定或排程無效，請重新選擇遠征隊。');
    if(state.status==='defeated')return stopRelicAutoExplore(next,'遠征隊已戰敗，請手動整備後再開啟。');
    const due=state.status==='dispatching'?state.dispatchEndsAt:state.status==='boss'?(state.autoBattle?state.nextBossAttackAt:config.nextActionAt):config.nextActionAt;
    if(!Number.isSafeInteger(due)||Number(due)<=0)return stopRelicAutoExplore(next,'遠征排程無效。');
    if(now<Number(due))return next;
    const party=relicPartyContext(next,config.partyUids,Number(due));
    if(party.partyUids.length!==config.partyUids.length)return stopRelicAutoExplore(next,'遠征隊成員已離隊或參與其他派遣。');
    if(state.clearedRuns>=RELIC_BOSS_IDS.length)return stopRelicAutoExplore(next,'現有四層首領已完成；後續關卡尚未開放。');
    let action:'dispatch'|'claim'|'challenge-boss'|'attack-boss';
    let before=state;
    if(state.status==='dispatching')action='claim';
    else if(state.status==='ready')action='challenge-boss';
    else if(state.status==='boss')action='attack-boss';
    else if(state.status==='idle'||state.status==='cleared') {
      next=supplyParty(next,config.partyUids,Number(due));
      if(!next.relicDungeon!.autoExplore?.enabled)return next;
      before=next.relicDungeon!;
      action='dispatch';
    } else return stopRelicAutoExplore(next,'目前是舊版迷宮探索，請先撤出再選擇派遣。');
    const context={...relicPartyContext(next,config.partyUids,Number(due)),dispatchDurationMs:config.durationMs};
    let input=before;
    if(action==='attack-boss'&&before.autoBattle!==true)input={...before,autoBattle:true,nextBossAttackAt:Number(due)};
    if(action==='dispatch'&&before.status==='cleared')input={...before,progress:0,bossUnlocked:false};
    let after=relicDungeonAction(input,action,context.partyPower,context);
    if(action==='dispatch')after={...after,hp:context.currentHp};
    if(action==='challenge-boss')after={...after,autoBattle:true,nextBossAttackAt:Number(due)+1000};
    let randomState=config.randomState;
    const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/0x100000000;};
    next=settleRelicRewards(next,before,after,action,random);
    const settled=next.relicDungeon!;
    next={...next,relicDungeon:{...settled,autoExplore:{...config,randomState,nextActionAt:settled.status==='dispatching'?settled.dispatchEndsAt:Number(due)+1000}}};
  }
  return next;
}
