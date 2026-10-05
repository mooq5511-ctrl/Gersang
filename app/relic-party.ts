import type {Equipment,GameState,Hero,Unit} from './game-state';
import {vitalStats} from './vitals-engine';
import {unitPower} from './game-progression';
import {guildSkillTradeBonuses} from './guild-skills';
const rarityScore:Record<Equipment['rarity'],number>={普通:1,稀有:2,史詩:4,傳說:7,金色:10};
export const relicEquipmentScore=(unit:Unit|Hero)=>Object.values(unit.equip).reduce((sum,item)=>sum+(item?rarityScore[item.rarity]+(item.enhance||0)*.5+(item.socketGem?2:0):0),0);

export function relicPartyContext(game:GameState,uids:string[],now:number) {
  const excluded=new Set(game.trade.caravan?.escortIds||[]);
  const party=game.restingMercs.filter(unit=>uids.includes(unit.uid)&&!excluded.has(unit.uid));
  const bonus=guildSkillTradeBonuses(game.guildSkills).mercenaryPowerBonus;
  return {now,partyUids:party.map(unit=>unit.uid),partyNames:party.map(unit=>unit.name),
    maxHp:party.reduce((sum,unit)=>sum+vitalStats(unit).maxHp,0),currentHp:party.reduce((sum,unit)=>sum+vitalStats(unit).hp,0),
    partyPower:party.reduce((sum,unit)=>sum+Math.floor(unitPower(unit)*(1+bonus)),0),
    partyEquipmentScore:party.reduce((sum,unit)=>sum+relicEquipmentScore(unit),0),
    partyReady:party.some(unit=>vitalStats(unit).hp>0)};
}

/** The shared expedition HP pool is distributed proportionally, never healed on release. */
export function syncRelicPartyHealth(game:GameState,uids:string[],hp:number,maxHp:number):GameState {
  if(!uids.length||maxHp<=0)return game;
  const ratio=Math.max(0,Math.min(1,hp/maxHp));
  const restingMercs=game.restingMercs.map(unit=>uids.includes(unit.uid)?{...unit,hp:Math.floor(vitalStats(unit).maxHp*ratio)}:unit);
  return {...game,restingMercs};
}
