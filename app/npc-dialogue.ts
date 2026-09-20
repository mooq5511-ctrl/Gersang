import { HANYANG_NPCS, HANYANG_NPC_PORTRAIT_POSITIONS, HANYANG_NPC_PORTRAIT_SHEET } from "../data/npcs/hanyang.ts";
import { contractProgress } from "./game-contract-actions";
import type { GameState } from "./game-state";

export type NpcId = "kim-seongho" | "choi-daesan" | "han-sowol" | "heo-muncheol" | "hong-museong" | "wang-deokchang" | "lee-taesan" | "baegun-elder" | "jang-miryung" | "jo-manbok";
export type NpcProgress = { met: string[]; affinity: Record<string, number>; activeQuests: string[]; completedQuests: string[]; history: Array<{ npcId: string; text: string; at: number }>; };
export type NpcQuest = { id: string; name: string; metric: "stage" | "kills" | "mercs" | "materials" | "equipment"; target: number; reward: { gold: number; affinity: number }; };
export type NpcService = "mercenary" | "weapon" | "armor" | "inn" | "pharmacy" | "exchange";
export type NpcOption = { label: string; reply: string; pages?: string[]; affinity?: number; service?: NpcService; openContracts?: boolean; quest?: "start" | "complete"; hidden?: boolean };
export type VillageNpc = { id: NpcId; name: string; role: string; portrait?: string; portraitPosition?: string; map: { x: number; y: number }; first: string; beforeQuest: string; inProgress: string; afterQuest: string; hidden?: { requirement: (state: GameState) => boolean; label: string; reply: string }; quest?: NpcQuest; options: NpcOption[]; };

export const DEFAULT_NPC_PORTRAIT = "/game-assets/merchant-0.png";
export { HANYANG_NPC_PORTRAIT_SHEET };
export const VILLAGE_NPCS = HANYANG_NPCS;
export function npcPortraitSprite(npc: VillageNpc) { return { src: HANYANG_NPC_PORTRAIT_SHEET, position: npc.portraitPosition || HANYANG_NPC_PORTRAIT_POSITIONS[npc.id] }; }
export function freshNpcProgress(): NpcProgress { return { met: [], affinity: {}, activeQuests: [], completedQuests: [], history: [] }; }
export function normalizeNpcProgress(value: unknown): NpcProgress {
 const empty=freshNpcProgress();if(!value||typeof value!=="object")return empty;const source=value as Partial<NpcProgress>;
 return { met:Array.isArray(source.met)?source.met.filter((id):id is string=>typeof id==="string"):[], affinity:source.affinity&&typeof source.affinity==="object"?Object.fromEntries(Object.entries(source.affinity).filter(([,score])=>Number.isFinite(score)).map(([id,score])=>[id,Math.max(0,Math.min(100,Math.floor(Number(score))))])):{}, activeQuests:Array.isArray(source.activeQuests)?source.activeQuests.filter((id):id is string=>typeof id==="string"):[], completedQuests:Array.isArray(source.completedQuests)?source.completedQuests.filter((id):id is string=>typeof id==="string"):[], history:Array.isArray(source.history)?source.history.filter((entry):entry is {npcId:string;text:string;at:number}=>!!entry&&typeof entry==="object"&&typeof (entry as {npcId?:unknown}).npcId==="string"&&typeof (entry as {text?:unknown}).text==="string").slice(0,80):[] };
}
export function npcById(id:string){return VILLAGE_NPCS.find(npc=>npc.id===id)}
export function npcQuestState(state:GameState,npc:VillageNpc){const quest=npc.quest;if(!quest)return "none" as const;if(state.npcProgress.completedQuests.includes(quest.id))return "complete" as const;if(state.npcProgress.activeQuests.includes(quest.id))return "active" as const;return "before" as const}
export function npcQuestProgress(state:GameState,quest:NpcQuest){return contractProgress(state,quest.metric)}
export function npcGreeting(state:GameState,npc:VillageNpc){if(!state.npcProgress.met.includes(npc.id))return npc.first;const phase=npcQuestState(state,npc);return phase==="complete"?npc.afterQuest:phase==="active"?npc.inProgress:npc.beforeQuest}
export function recordNpcLine(state:GameState,npcId:string,text:string){const npcProgress=normalizeNpcProgress(state.npcProgress);return {...state,npcProgress:{...npcProgress,met:npcProgress.met.includes(npcId)?npcProgress.met:[...npcProgress.met,npcId],history:[{npcId,text,at:Date.now()},...npcProgress.history].slice(0,80)}}}
export function startNpcQuest(state:GameState,npc:VillageNpc){const quest=npc.quest;if(!quest||state.npcProgress.activeQuests.includes(quest.id)||state.npcProgress.completedQuests.includes(quest.id))return state;return {...state,npcProgress:{...state.npcProgress,activeQuests:[...state.npcProgress.activeQuests,quest.id]}}}
export function completeNpcQuest(state:GameState,npc:VillageNpc){const quest=npc.quest;if(!quest||!state.npcProgress.activeQuests.includes(quest.id)||npcQuestProgress(state,quest)<quest.target)return state;return {...state,gold:state.gold+quest.reward.gold,npcProgress:{...state.npcProgress,activeQuests:state.npcProgress.activeQuests.filter(id=>id!==quest.id),completedQuests:[...state.npcProgress.completedQuests,quest.id],affinity:{...state.npcProgress.affinity,[npc.id]:Math.min(100,(state.npcProgress.affinity[npc.id]||0)+quest.reward.affinity)}}}}
