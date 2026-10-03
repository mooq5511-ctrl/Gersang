export type PromotionRank = 1|2|3|4|5|6|7|8;
export type PromotionBranch = 'spear'|'bow';
export const BOW_TEMPLATE = 'merchant-promotion-bow';
export const promotionBranch = (unit:{templateId?:string}):PromotionBranch => unit.templateId===BOW_TEMPLATE?'bow':'spear';
export const BOW_STAGE_NAMES = ['新手槍兵','長弓兵','強弓兵','精銳弓兵','修羅弓兵','御皇弓兵','天魔弓兵','軒轅神弓兵'] as const;
type Stats = {atk:number;def:number;hp:number};
export const MERCENARY_STAGES = [
 {stage:1,name:'新手槍兵',minLevel:1,maxLevel:11,leadership:5,multiplier:1,growth:{atk:2,def:1,hp:20}},
 {stage:2,name:'長槍兵',minLevel:12,maxLevel:35,leadership:10,multiplier:1.5,growth:{atk:5,def:2,hp:40}},
 {stage:3,name:'鐵騎兵',minLevel:36,maxLevel:55,leadership:20,multiplier:1.8,growth:{atk:12,def:5,hp:110}},
 {stage:4,name:'精銳兵',minLevel:56,maxLevel:71,leadership:30,multiplier:2.2,growth:{atk:32,def:14,hp:300}},
 {stage:5,name:'修羅兵',minLevel:72,maxLevel:111,leadership:45,multiplier:1.6,growth:{atk:70,def:30,hp:650}},
 {stage:6,name:'御皇兵',minLevel:112,maxLevel:161,leadership:60,multiplier:1.8,growth:{atk:200,def:84,hp:1900}},
 {stage:7,name:'天魔兵',minLevel:162,maxLevel:211,leadership:80,multiplier:2,growth:{atk:800,def:330,hp:7500}},
 {stage:8,name:'軒轅將神兵',minLevel:212,maxLevel:250,leadership:100,multiplier:2.2,growth:{atk:0,def:0,hp:0}},
] as const;
export const usesPromotionV1 = (unit:{templateId?:string}) => unit.templateId === 'merchant-spear'||unit.templateId===BOW_TEMPLATE;
export function promotionRank(unit:{promotionStage?:number;tier?:number}): PromotionRank {
 const value=unit.promotionStage ?? unit.tier ?? 1;
 return (Number.isInteger(value)&&value>=1&&value<=8?value:1) as PromotionRank;
}
const table:Array<Stats & {stage:PromotionRank}>=[{atk:10,def:5,hp:100,stage:1}];
for(let level=2;level<=250;level++){
 const stage=MERCENARY_STAGES.find(item=>level>=item.minLevel&&level<=item.maxLevel)!;
 const old=table[level-2];
 const multiplier=level===stage.minLevel?stage.multiplier:stage.stage===8?1.025:1;
 const add=level!==stage.minLevel&&stage.stage!==8?stage.growth:{atk:0,def:0,hp:0};
 table.push({atk:old.atk*multiplier+add.atk,def:old.def*multiplier+add.def,hp:old.hp*multiplier+add.hp,stage:stage.stage});
}
/** No intermediate rounding: every stage starts from the previous stage's exact final value. */
export function getMercenaryStats(level:number, unlockedRank:PromotionRank=8,branch:PromotionBranch='spear'){
 const safe=Math.max(1,Math.min(250,Math.floor(Number(level)||1)));
 const effective=Math.min(safe,MERCENARY_STAGES[unlockedRank-1].maxLevel);
 const stats=table[effective-1];
 const bow=branch==='bow'&&stats.stage>=2;
 return {level:safe,stage:stats.stage,stage_name:branch==='bow'?BOW_STAGE_NAMES[stats.stage-1]:MERCENARY_STAGES[stats.stage-1].name,atk:Math.floor(stats.atk*(bow?1.15:1)),def:Math.floor(stats.def*(bow?.7:1)),hp:Math.floor(stats.hp*(bow?.75:1)),required_leadership:MERCENARY_STAGES[stats.stage-1].leadership};
}
export function nextPromotion(unit:{promotionStage?:number;tier?:number;templateId?:string}){const rank=promotionRank(unit);if(rank===8)return undefined;const next=MERCENARY_STAGES[rank];return {...next,name:promotionBranch(unit)==='bow'?BOW_STAGE_NAMES[rank]:next.name};}
