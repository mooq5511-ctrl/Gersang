import { gersangItemArt } from "./gersang-visuals.ts";
import { magicAffixes } from "./v15-data.ts";
import type { OfficialEquipment } from "./v17-content";
import { SHOP_QUALITY, WEAPON_SHOP_QUALITY, ARMOR_SHOP_QUALITY } from "./game-config.ts";
import type { Equipment, MagicAffix } from "./game-state";
import {v1Definition,V1_EQUIPMENT_DEFINITIONS,EQUIPMENT_BALANCE_V1,v1RandomEquipmentTier} from './equipment-v1-policy.ts';
import type {WearableBase} from './wearable-catalog.ts';
import {equipmentAtTier,makeTierEquipment} from './tier-equipment.ts';

let uidSequence=0;
export function makeUid(prefix: string) {
  return prefix + '-' + (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${(++uidSequence).toString(36)}`);
}

/** Newly awarded tutorial equipment shares the level-one budget, never rewrites saved items. */
export function makeFirstCaravanSword(uid=makeUid('first-caravan-sword')):Equipment {
  const definition=V1_EQUIPMENT_DEFINITIONS['quest-first-caravan-sword'];
  return {uid,definitionId:definition.id,balanceVersion:EQUIPMENT_BALANCE_V1,name:'商路短劍',slot:'weapon',atk:definition.atk,def:definition.def,hp:definition.hp,image:gersangItemArt('weapon'),enhance:0,rarity:'普通',magic:[],requiredLevel:definition.level,source:'第一份商隊委託',bonus:{str:0,agi:0,intel:0,vit:0},resist:{physical:0,magic:0}};
}

export function rollShopQuality(quality = SHOP_QUALITY, random:()=>number=Math.random): Equipment["rarity"] {
  const roll = sample(random) * 100;
  if (roll < quality["傳說"].chance) return "傳說";
  if (roll < quality["傳說"].chance + quality["史詩"].chance) return "史詩";
  if (roll < quality["傳說"].chance + quality["史詩"].chance + quality["稀有"].chance) return "稀有";
  return "普通";
}

function scale(value: number | undefined, multiplier: number) { return Math.floor((value || 0) * multiplier); }
function scaleMagic(magic: MagicAffix[], multiplier: number) { return magic.map((affix) => { const value = scale(affix.value, multiplier); return { ...affix, value, text: affix.text.replace(/\+(\d+)%/, "+" + value + "%") }; }); }

export function applyShopQuality(item: Equipment, rarity = rollShopQuality()): Equipment {
  if(v1Definition(item))return {...item,rarity};
  const multiplier = SHOP_QUALITY[rarity].multiplier, name = item.name.replace(/^(普通|稀有|史詩|傳說|金色)・/, "");
  return { ...item, name: rarity + "・" + name, atk: scale(item.atk, multiplier), def: scale(item.def, multiplier), hp: scale(item.hp, multiplier), rarity, magic: scaleMagic(item.magic, multiplier), bonus: { str: scale(item.bonus?.str, multiplier), agi: scale(item.bonus?.agi, multiplier), intel: scale(item.bonus?.intel, multiplier), vit: scale(item.bonus?.vit, multiplier) }, resist: { physical: scale(item.resist?.physical, multiplier), magic: scale(item.resist?.magic, multiplier) }, source: "四國城市商店・" + rarity + "品質 x" + multiplier };
}

/** Promotes an existing item by the relative quality multiplier without changing its identity. */
export function advanceEquipmentQuality(item: Equipment, rarity: Equipment["rarity"]): Equipment {
  if(v1Definition(item))return {...item,rarity};
  const multiplier = SHOP_QUALITY[rarity].multiplier / SHOP_QUALITY[item.rarity].multiplier;
  return { ...item, name: item.name.replace(/^(普通|稀有|史詩|傳說|金色)・/, ""), atk: scale(item.atk, multiplier), def: scale(item.def, multiplier), hp: scale(item.hp, multiplier), rarity, magic: scaleMagic(item.magic, multiplier), bonus: { str: scale(item.bonus?.str, multiplier), agi: scale(item.bonus?.agi, multiplier), intel: scale(item.bonus?.intel, multiplier), vit: scale(item.bonus?.vit, multiplier) }, resist: { physical: scale(item.resist?.physical, multiplier), magic: scale(item.resist?.magic, multiplier) } };
}

function sample(random:()=>number){const value=Number(random());return Number.isFinite(value)?Math.min(1-Number.EPSILON,Math.max(0,value)):0;}
function rollAffixes(count:number,random:()=>number):MagicAffix[] {
  const pool=magicAffixes.map(affix=>({...affix}));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(sample(random)*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,count);
}
export function rollEquipment(stage: number, guaranteed = false, slot?: Equipment["slot"], random:()=>number=Math.random): Equipment {
  const safeLevel=Math.min(250,Math.max(1,Math.floor(Number(stage)||1)));
  const catalog=equipmentAtTier(v1RandomEquipmentTier(safeLevel)).filter(entry=>!slot||entry.slot===slot);
  if(!catalog.length)throw new RangeError('Unsupported random equipment slot');
  const spec=catalog[Math.floor(sample(random)*catalog.length)];
  const base=makeTierEquipment(spec,makeUid(spec.id),'戰利品・附魔裝備');
  const magicCount = guaranteed ? Math.min(3, 1 + Math.floor(safeLevel / 20)) : Math.min(3, Math.max(1, Math.floor(safeLevel / 15)));
  const rarity: Equipment["rarity"] = magicCount >= 3 ? "傳說" : magicCount === 2 ? "史詩" : safeLevel >= 10 ? "稀有" : "普通";
  return {...base,rarity,magic:rollAffixes(magicCount,random),luckyValue:0,enhanceBonuses:[]};
}

const RELIC_LOOT_RARITIES: Array<{ rarity: Equipment["rarity"]; weight: number; affixes: number }> = [
  { rarity: "普通", weight: 60, affixes: 0 },
  { rarity: "稀有", weight: 25, affixes: 1 },
  { rarity: "史詩", weight: 10, affixes: 2 },
  { rarity: "傳說", weight: 4.5, affixes: 3 },
  { rarity: "金色", weight: 0.5, affixes: 4 },
];

function relicRarity(random: () => number, guaranteed: boolean) {
  const total = RELIC_LOOT_RARITIES.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = sample(random) * total;
  let selected = RELIC_LOOT_RARITIES[0];
  for (const entry of RELIC_LOOT_RARITIES) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      selected = entry;
      break;
    }
  }
  if (guaranteed && selected.rarity === "普通") selected = RELIC_LOOT_RARITIES[1];
  return selected;
}

/** 遺跡專用掉落：沿用現有裝備資料，但使用地下城的稀有度權重與詞條數。 */
export function rollRelicEquipment(level: number, random: () => number = Math.random, guaranteed = false): Equipment {
  const quality = relicRarity(random, guaranteed);
  const base = rollEquipment(level, false, undefined, random);
  return {
    ...base,
    rarity: quality.rarity,
    magic:rollAffixes(quality.affixes,random),
    source: "沉沒王朝遺跡・遠征掉落",
  };
}

export function makeOfficialEquipment(record: OfficialEquipment, rarity = rollShopQuality(record.kind === "weapon" ? WEAPON_SHOP_QUALITY : ARMOR_SHOP_QUALITY)): Equipment {
  const definition = V1_EQUIPMENT_DEFINITIONS[`official-${record.id}`];
  if (!definition || definition.slot !== record.kind || definition.level !== record.level) throw new RangeError('Unknown official equipment definition');
  const magic = [...magicAffixes].sort(() => Math.random() - .5).slice(0, record.level >= 130 ? 3 : record.level >= 50 ? 2 : 1);
  return { uid: makeUid(record.id), definitionId:definition.id,balanceVersion:EQUIPMENT_BALANCE_V1,name:record.name,slot:record.kind,atk:definition.atk,def:definition.def,hp:definition.hp,image:gersangItemArt(record.kind),enhance:0,rarity,magic:magic.map(affix=>({...affix})),requiredLevel:record.level,source:'四國城市商店・新版品質 '+rarity,skill:record.skill,bonus:{str:record.str||0,agi:record.agi||0,intel:record.intel||0,vit:record.vit||0},resist:{physical:record.physical||0,magic:record.magic||0}};
}

export function makeWearableEquipment(base:WearableBase, uid=makeUid(base.id)):Equipment {
  const definition=V1_EQUIPMENT_DEFINITIONS[`wearable-${base.id}`];
  if(!definition||definition.slot!==base.slot)throw new RangeError('Unknown wearable equipment definition');
  return {uid,definitionId:definition.id,balanceVersion:EQUIPMENT_BALANCE_V1,name:base.name,slot:definition.slot,atk:definition.atk,def:definition.def,hp:definition.hp,image:base.image||gersangItemArt(base.slot),enhance:0,rarity:'普通',magic:[],requiredLevel:definition.level,source:'城市商店・普通穿戴商品',bonus:{str:0,agi:0,intel:0,vit:0},resist:{physical:0,magic:0}};
}
