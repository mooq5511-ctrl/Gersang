import {DIVINE_EQUIPMENT,type DivineKey} from './divine-equipment.ts';
/** 第一次抽樣判定 50% 掉落；第二次從四件裝備等機率抽取。可注入亂數供測試。 */
export function rollInventoryLoot(random:()=>number=Math.random):DivineKey|null{
  if(random()>=0.5)return null;
  const keys=Object.keys(DIVINE_EQUIPMENT) as DivineKey[];
  return keys[Math.min(keys.length-1,Math.max(0,Math.floor(random()*keys.length)))];
}
