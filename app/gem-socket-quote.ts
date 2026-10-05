import type {Equipment} from './game-state';
export const GEM_SOCKET_LIMIT=100;
type Gem={id:string;values:readonly number[];costs:readonly number[]};
type SocketGem=Gem&{name:string;label:string;stat:'all'|'str'|'agi'|'vit'|'intel'};
export function gemSocketQuote(item:Equipment|undefined|null,gem:Gem,grade:number,requestedAmount:number){
  if(!item)return {ok:false as const,error:'請先穿戴要鑲嵌的裝備。'};
  if(!Number.isInteger(grade)||grade<0||grade>=gem.values.length||grade>=gem.costs.length
    ||!Number.isSafeInteger(requestedAmount)||requestedAmount<1)
    return {ok:false as const,error:'請選擇有效的寶石品級與整數數量。'};
  const count=item.socketGem?.count??0,totalValue=item.socketGem?.totalValue??0;
  if(!Number.isSafeInteger(count)||count<0||count>GEM_SOCKET_LIMIT||!Number.isSafeInteger(totalValue)||totalValue<0)
    return {ok:false as const,error:'此裝備的鑲嵌資料異常，無法繼續加工。'};
  if(item.socketGem&&item.socketGem.id!==gem.id)return {ok:false as const,error:'每個裝備部位只能鑲嵌一種寶石。'};
  const amount=Math.min(requestedAmount,GEM_SOCKET_LIMIT-count);
  if(amount<1)return {ok:false as const,error:`此裝備部位最多鑲嵌 ${GEM_SOCKET_LIMIT} 顆寶石。`};
  const cost=gem.costs[grade]*amount,value=gem.values[grade]*amount;
  if(!Number.isSafeInteger(cost)||cost<=0||!Number.isSafeInteger(value)||value<=0||!Number.isSafeInteger(totalValue+value))
    return {ok:false as const,error:'寶石加工報價無效。'};
  return {ok:true as const,amount,cost,value,count:count+amount,totalValue:totalValue+value};
}

/** Shared immutable result for both transaction and capability preview. */
export function gemSocketResult(item:Equipment|undefined|null,gem:SocketGem,grade:number,amount:number){
  const quote=gemSocketQuote(item,gem,grade,amount);
  if(!quote.ok||!item)return quote.ok?{ok:false as const,error:'請先穿戴裝備。'}:quote;
  const bonus={...(item.bonus||{str:0,agi:0,intel:0,vit:0})};
  if(Object.values(bonus).some(value=>!Number.isFinite(value)))return {ok:false as const,error:'此裝備的能力資料異常，無法繼續加工。'};
  if(gem.stat==='all'){bonus.str+=quote.value;bonus.agi+=quote.value;bonus.vit+=quote.value;bonus.intel+=quote.value;}
  else bonus[gem.stat]+=quote.value;
  if(Object.values(bonus).some(value=>!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER))return {ok:false as const,error:'寶石加工超出有效能力範圍。'};
  const baseName=item.socketGem?.baseName||item.name;
  const next:Equipment={...item,name:`+${quote.count} ${gem.name.replace(/石$/,'')}的 ${baseName}`,bonus,
    socketGem:{id:gem.id,name:gem.name,count:quote.count,totalValue:quote.totalValue,baseName},
    magic:[...(item.magic||[]).filter(affix=>affix.id!==`socket-${gem.id}`),{id:`socket-${gem.id}`,name:gem.name,text:`${gem.label} +${quote.totalValue}（${quote.count} 顆）`,color:'#8ee7ff',stat:gem.stat,value:quote.totalValue}]};
  return {...quote,item:next};
}
