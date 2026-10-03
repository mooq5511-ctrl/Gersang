import {BattleLogManager} from './battle-log-manager.ts';
import type {GameState} from './game-state';
import {sourceEnemyDefinitions} from '../data/monsters/world-map-enemies.ts';
import {RELIC_BOSS_IDS,relicBossForRun} from '../data/monsters/relic-dungeon-monsters.ts';
import {ECOLOGY_MONSTERS,ECOLOGY_POOLS} from '../data/monsters/dungeon-monsters.ts';
export const WAR_SEALS = [
 {stage:2,name:'長槍兵符',level:12,rate:.03,available:true,source:'新手村郊外，以及世界地圖 Lv.1–35 普通怪物；二階兵符合計 3%，槍／弓等機率（此符實際 1.5%）'},
 {stage:3,name:'鐵騎兵符',level:36,rate:.02,available:true,source:'千年湖／日本海底洞，以及世界地圖 Lv.36–55 普通怪物；三階兵符合計 2%，槍／弓等機率（此符實際 1%）'},
 {stage:4,name:'精銳兵符',level:56,rate:.01,available:true,source:'白虎林／須彌山普通怪物，或黑巾山賊 Elite；每次勝利 1%'},
 {stage:5,name:'修羅兵符',level:72,rate:.03,available:true,source:'狂風阿魯塔／黃金海星／狂虎／多聞天王／廣目天王，或現有四隻遺跡 Boss；每次勝利 3%'},
 {stage:6,name:'御皇兵符',level:112,rate:.02,available:true,source:'現有四隻遺跡地下城 Boss；每次勝利 2%'},
 {stage:7,name:'天魔兵符',level:162,rate:.01,available:false,source:'來源尚未開放：待高難度遺跡 Boss 實裝；預定每次勝利 1%（目前不掉落）'},
 {stage:8,name:'軒轅將神兵符',level:212,rate:.005,available:false,source:'來源尚未開放：待最終遺跡 Boss 實裝；預定每次勝利 0.5%（目前不掉落）'},
] as const;
export const BOW_WAR_SEALS = [
 {...WAR_SEALS[0],name:'長弓兵符'},
 {...WAR_SEALS[1],name:'強弓兵符'},
] as const;
export const ALL_WAR_SEALS = [...WAR_SEALS,...BOW_WAR_SEALS];
export const warSeal = (name:string) => ALL_WAR_SEALS.find(item=>item.name===name);
export const sealForStage = (stage:number,branch:'spear'|'bow'='spear') => branch==='bow'&&stage<=3?BOW_WAR_SEALS.find(item=>item.stage===stage):WAR_SEALS.find(item=>item.stage===stage);
export const sealCount = (value:unknown) => Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
// Explicit Boss allowlist: early Bosses and new/unknown sources do not inherit a high-rank pool.
const worldSealBosses=new Set(['e_lake_gale_altur','e_japan_sea_golden_starfish','e_white_tiger_fierce_tiger','e_sumeru_vaisravana','e_sumeru_virupaksa']);
const normalMapRanks=new Map<string,number>([['starter-outskirts',2],['korea-field',2],['millennium-lake',3],['japan-sea',3],['miasma-forest',4],['sumeru',4]]);
const worldSealPools=new Map<string,readonly number[]>();
for(const enemy of sourceEnemyDefinitions){
 if(!Object.hasOwn(ECOLOGY_MONSTERS,enemy.id))continue;
 if(worldSealBosses.has(enemy.id)){worldSealPools.set(enemy.id,[5]);continue;}
 if(enemy.id==='e_starter_black_bandit'){worldSealPools.set(enemy.id,[4]);continue;}
 if(enemy.boss||enemy.elite)continue;
 const rank=normalMapRanks.get(enemy.mapId);
 if(rank)worldSealPools.set(enemy.id,[rank]);
}
// The world-map Auto Hunt uses separate existing IDs, including e_raccoon after respawning.
// Include only real zone pools; unused legacy definitions are not invented playable sources.
for(const pool of Object.values(ECOLOGY_POOLS))for(const id of pool){
 const level=ECOLOGY_MONSTERS[id].level;
 if(level<=55)worldSealPools.set(id,[level<36?2:3]);
}
const relicSealBosses=new Set<string>(RELIC_BOSS_IDS);
/** Direct probabilities per authoritative victory. Disjoint intervals guarantee at most one seal. */
export function rollWarSeal(enemyId:string,roll:number,channel:'world'|'relic'='world',choice=0){
 if(!Number.isFinite(roll)||roll<0||roll>=1||!Number.isFinite(choice)||choice<0||choice>=1)return undefined;
 const pool=channel==='relic'?(relicSealBosses.has(enemyId)?[5,6]:[]):worldSealPools.get(enemyId)||[];
 let threshold=0;
 for(const rank of pool){const seal=sealForStage(rank);if(!seal?.available)continue;threshold+=seal.rate;if(roll<threshold)return sealForStage(rank,rank<=3&&choice>=.5?'bow':'spear');}
 return undefined;
}
/** Materials are unbounded in the current inventory. Finite-cap adapters retain overflow, never lose seals. */
export function awardWarSeal<T extends Pick<GameState,'materials'|'logs'> & Partial<Pick<GameState,'battleLogs'|'pendingWarSeals'>>>(state:T,name:string,capacity=Infinity):T{
 if(!warSeal(name))return state;
 const full=!sealCount(state.materials[name])&&Object.values(state.materials).filter(count=>sealCount(count)>0).length>=capacity;
 const message=full?`稀有掉落：${name} ×1；背包已滿，保留於待領兵符。`:`稀有掉落：${name} ×1，已收入背包。`;
 return {...state,...(full?{pendingWarSeals:{...state.pendingWarSeals,[name]:sealCount(state.pendingWarSeals?.[name])+1}}:{materials:{...state.materials,[name]:sealCount(state.materials[name])+1}}),logs:[...state.logs,message].slice(-80),battleLogs:BattleLogManager.addLog(state.battleLogs,message,'reward')} as T;
}
export function claimPendingWarSeals<T extends Pick<GameState,'materials'> & Partial<Pick<GameState,'pendingWarSeals'>>>(state:T,capacity=Infinity):T{
 const materials={...state.materials},pending={...state.pendingWarSeals};let changed=false;
 for(const seal of ALL_WAR_SEALS){const amount=sealCount(pending[seal.name]);if(!amount)continue;if(!sealCount(materials[seal.name])&&Object.values(materials).filter(count=>sealCount(count)>0).length>=capacity)continue;materials[seal.name]=sealCount(materials[seal.name])+amount;delete pending[seal.name];changed=true;}
 return changed?{...state,materials,pendingWarSeals:pending}:state;
}
/** Only the authoritative cleared-run increment awards a seal; idle/replayed settlements do not. */
export function settleRelicWarSeal<T extends Pick<GameState,'materials'|'logs'> & Partial<Pick<GameState,'battleLogs'|'pendingWarSeals'>>>(state:T,before:{clearedRuns:number;bossMonsterId?:string},after:{clearedRuns:number},roll:number,choice:number):T{
 if(!Number.isFinite(choice)||!Number.isInteger(before.clearedRuns)||before.clearedRuns<0||!Number.isInteger(after.clearedRuns))return state;
 // Old saves may lack the identifier: use the real Boss rotation, never a fictitious final Boss.
 const bossId=before.bossMonsterId??relicBossForRun(before.clearedRuns).id;
 const seal=after.clearedRuns>before.clearedRuns?rollWarSeal(bossId,roll,'relic'):undefined;
 return seal?awardWarSeal(state,seal.name):state;
}
