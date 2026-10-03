import {nextPromotion,promotionRank,promotionBranch,BOW_TEMPLATE,BOW_STAGE_NAMES,usesPromotionV1,type PromotionBranch} from './mercenary-growth-v1.ts';
import {sealCount,sealForStage} from './war-seals.ts';
import {BattleLogManager} from './battle-log-manager.ts';
import type {GameState} from './game-state';
import {mercenarySpec} from './mercenary-roster.ts';
import {normalizeVitals} from './vitals-engine.ts';
import {gersangUnitArt} from './gersang-visuals.ts';
export function promoteMercenaryV1(state:GameState,uid:string,targetStage?:number,selectedBranch?:PromotionBranch):GameState{
 for(const location of ['mercs','restingMercs'] as const){
  const unit=state[location].find(member=>member.uid===uid);if(!unit||!usesPromotionV1(unit))continue;
  const branch=selectedBranch??promotionBranch(unit),next=nextPromotion(unit),seal=next&&sealForStage(next.stage,branch);
  const blocked=state.dungeon?.status==='fighting'||state.relicDungeon?.status==='boss'||state.trade.caravan?.escortIds?.includes(uid)||state.relicDungeon?.dispatchPartyUids?.includes(uid)&&['dispatching','ready'].includes(state.relicDungeon.status);
  if(!next||!seal||!['spear','bow'].includes(branch)||promotionRank(unit)>1&&branch!==promotionBranch(unit)||targetStage!==undefined&&targetStage!==promotionRank(unit)+1||!Number.isFinite(unit.level)||unit.level<next.minLevel||sealCount(state.materials[seal.name])<1||blocked)return {...state,logs:[...state.logs,'轉職未完成：請確認下一階、等級、對應兵符與原路線，且未在戰鬥或派遣中。'].slice(-80)};
  const name=branch==='bow'?BOW_STAGE_NAMES[next.stage-1]:next.name,templateId=branch==='bow'?BOW_TEMPLATE:'merchant-spear',spec=mercenarySpec(templateId)!;
  const promoted=normalizeVitals({...unit,templateId,promotionStage:next.stage,jobClass:name,name,role:spec.role,skill:spec.active,...(next.stage===2?{position:branch==='bow'?'後排' as const:'前排' as const,image:gersangUnitArt(branch==='bow'?'merchant-archer':'merchant-spear',name)}:{})});
  const message=`傭兵轉職：${unit.name} → ${name}（${next.stage} 階・${branch==='bow'?'弓兵':'槍兵'}路線）；消耗 ${seal.name} ×1，等級與經驗保留，統御 ${next.leadership}。`;
  return {...state,[location]:state[location].map(member=>member.uid===uid?promoted:member),materials:{...state.materials,[seal.name]:sealCount(state.materials[seal.name])-1},logs:[...state.logs,message].slice(-80),battleLogs:BattleLogManager.addLog(state.battleLogs,message,'reward')};
 }
 return state;
}
export function normalizePromotionV1<T extends {templateId?:string;tier?:number;promotionStage?:number;level:number}>(unit:T):T{
 if(!usesPromotionV1(unit))return unit;
 // Legacy promotion reset levels. Retain its tier and all possessions without creating a paid V1 promotion.
 const level=Math.min(250,Math.max(1,Math.floor(Number(unit.level)||1)));
 return {...unit,promotionStage:unit.promotionStage===undefined?1:promotionRank(unit),level};
}
/** Keep a recoverable original before the first V1 migration; never replace an existing backup. */
export function backupBeforePromotionMigration(storage:Pick<Storage,'getItem'|'setItem'>,key:string,raw:string|null){
 if(!raw)return;
 const parsed=JSON.parse(raw) as Partial<GameState>;
 if(![...(parsed.mercs||[]),...(parsed.restingMercs||[])].some(unit=>usesPromotionV1(unit)&&unit.promotionStage===undefined))return;
 const backup=key+':before-mercenary-promotion-v1';
 if(storage.getItem(backup)===null)storage.setItem(backup,raw);
}
