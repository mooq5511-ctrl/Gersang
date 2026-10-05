// Backend income isolation, NOT natural play: no NPC quests, recruitment, gear or combat.
import './measure-equipment-early.mjs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {chapterSourceAudit} from './audit-first-chapter-sources.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {settleCurrentGame}=require('../app/game-loop.ts');
const {dispatchTradeAction}=require('../app/game-trade-actions.ts');
const {appendGameLog}=require('../app/game-runtime-actions.ts');

export function auditFreshEconomy({mode='idle',seed=1,seconds=1800,start=Date.UTC(2026,9,5)}={}){
  if(!['idle','trade'].includes(mode)||!Number.isInteger(seconds)||seconds<1||seconds>1800||!Number.isInteger(seed)||!Number.isSafeInteger(start)||start<=0)throw new RangeError('Invalid economy audit input');
  let game={...freshGame('收入隔離測量'),idleStamp:start,lastSeen:start};
  const initialGold=game.gold;
  let rng=seed>>>0,firstDispatchSeconds=null,dispatches=0;
  const originalRandom=Math.random;
  Math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  try{
    for(let tick=1;tick<=seconds*5;tick++){
      const now=start+tick*200;
      game=settleCurrentGame(game,{now,roll:.5,choice:.5,spawnRoll:.5,encounterCountRoll:.5,retaliationRoll:.5,materialRolls:[1,1,1]});
      if(mode==='trade'&&!game.trade.caravan){
        const next=dispatchTradeAction(game,'hanji',now,appendGameLog,[]);
        if(next.trade.caravan){firstDispatchSeconds??=tick*.2;dispatches++;}
        game=next;
      }
    }
  }finally{Math.random=originalRandom;}
  const source=chapterSourceAudit();
  return {mode,seed,seconds,start,initialGold,firstDispatchSeconds,dispatches,
    gold:game.gold,heroLevel:game.hero.level,heroXp:game.hero.xp,kills:game.kills,
    trips:game.trade.trips,tradeProfit:game.trade.totalProfit,
    pendingCargoCost:game.trade.caravan?.cost||0,prologueStep:game.hanyangPrologueStep,
    mercenaries:game.mercs.length,items:game.inventory.length,
    equipmentAndRecruitmentGrossTarget:source.level20EightSlotDirectPrice*2+source.recruitmentPerMercenary*3,
    caveat:'Fresh zero-gold backend income isolation only. Trade dispatch is invoked directly every idle tick: UI visibility, tutorial completion and player actions are NOT verified. No supplied XP/items/money, no quests/combat/recruitment/healing expenses; no proof of natural first-30-minute completion. Gold is liquid balance after pending cargo purchase; seed/date affect trade events/market.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  console.log(JSON.stringify({idle:auditFreshEconomy(),trade:Array.from({length:10},(_,i)=>auditFreshEconomy({mode:'trade',seed:i+1}))},null,2));
}
