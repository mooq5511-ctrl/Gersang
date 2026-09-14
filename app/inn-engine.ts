/** 客棧恢復是純函式：共用遊戲主計時器，不另開會重複結算的背景計時器。 */
export type PlayerStatus='正常'|'客棧中';
export type InnPlayer={hp:number;maxHp:number;status:PlayerStatus};
export type InnSession={player:InnPlayer;nextHealAt:number};
export const INN_HEAL_AMOUNT=10;
export const INN_HEAL_INTERVAL=2000;

export function goToInn(player:InnPlayer,now:number,healInterval=INN_HEAL_INTERVAL):InnSession{
 return {player:{...player,hp:Math.max(0,Math.min(player.maxHp,player.hp)),status:'客棧中'},nextHealAt:now+healInterval};
}

export function leaveInn(player:InnPlayer):InnPlayer{
 return player.hp>=player.maxHp?{...player,hp:player.maxHp,status:'正常'}:player;
}

export function recoverAtInn(player:InnPlayer,nextHealAt:number,now:number,healInterval=INN_HEAL_INTERVAL):InnSession{
 if(player.status!=='客棧中'||now<nextHealAt)return {player,nextHealAt};
 const healed=leaveInn({...player,hp:Math.min(player.maxHp,player.hp+INN_HEAL_AMOUNT)});
 return {player:healed,nextHealAt:healed.status==='正常'?0:now+healInterval};
}

export function payInn(player:InnPlayer,gold:number){
 const cost=Math.max(0,player.maxHp-player.hp)*2;
 if(player.status!=='客棧中')return {player,gold,cost:0,error:null};
 if(gold<cost)return {player,gold,cost,error:'持有金不足，需要 '+cost.toLocaleString('zh-TW')+' 兩。'};
 return {player:leaveInn({...player,hp:player.maxHp}),gold:gold-cost,cost,error:null};
}
