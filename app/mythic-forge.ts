import type { EquipmentKind } from './equipment-slots';

export type ThunderForgeId = 'thunderBoots' | 'thunderBow' | 'azureArmor' | 'azureHelm' | 'azureGloves' | 'azureBoots' | 'azureBelt' | 'chiyouArmor' | 'chiyouHelm' | 'chiyouGloves' | 'chiyouBoots' | 'chiyouBelt' | 'amaterasuHelm' | 'amaterasuGloves' | 'amaterasuArmor' | 'amaterasuBelt' | 'amaterasuBoots';
export type MythicSet = 'thunder' | 'azure' | 'chiyou' | 'amaterasu';
import {EQUIPMENT_BALANCE_V1,V1_EQUIPMENT_DEFINITIONS} from './equipment-v1-policy.ts';
import type {Equipment} from './game-state';
type Affix = { id:string; name:string; text:string; color:string; stat:string; value:number };
export type MythicForgeItem = { id:ThunderForgeId; set:MythicSet; name:string; slot:EquipmentKind; atk:number; def:number; hp:number; image?:string; skill?:string; bonus:{str:number;agi:number;intel:number;vit:number}; magic:Affix[]; needs:Record<string,number>;definitionId:string;balanceVersion:string;requiredLevel:number };

const noBonus={str:0,agi:0,intel:0,vit:0};
const forge = (item:Omit<MythicForgeItem,'definitionId'|'balanceVersion'|'requiredLevel'|'atk'|'def'|'hp'>):MythicForgeItem => {
  const definition=V1_EQUIPMENT_DEFINITIONS[`mythic-${item.id}`];
  if(!definition||definition.slot!==item.slot)throw new RangeError('Unknown mythic equipment definition');
  return {...item,atk:definition.atk,def:definition.def,hp:definition.hp,definitionId:definition.id,balanceVersion:EQUIPMENT_BALANCE_V1,requiredLevel:definition.level};
};
export const THUNDER_FORGE_ITEMS:Record<ThunderForgeId,MythicForgeItem>={
 thunderBoots:forge({id:'thunderBoots',set:'thunder',name:'T10 雷神迅影靴',slot:'boots',bonus:{...noBonus,agi:25},magic:[{id:'thunder-agi',name:'雷神迅影',text:'敏捷 +15%',color:'#71cfff',stat:'agi',value:15}],needs:{'喵兒的尾巴':20,'小型雷之屬性石':80}}),
 thunderBow:forge({id:'thunderBow',set:'thunder',name:'T10 雷神穿雲弓',slot:'weapon',bonus:noBonus,magic:[{id:'thunder-atk',name:'雷霆穿雲',text:'攻擊 +20%',color:'#71cfff',stat:'atk',value:20}],needs:{'雷電的箭矢':20,'深淵的精髓':5}}),
 azureArmor:forge({id:'azureArmor',set:'azure',name:'T10 青龍盔甲',slot:'armor',image:'/assets/equipment/azure-dragon/azure-dragon-armor.gif',bonus:{...noBonus,vit:80},magic:[{id:'azure-armor',name:'青龍庇護',text:'生命 +15%',color:'#90d4ad',stat:'hp',value:15}],needs:{'鹿亞之角':10,'小型雷之屬性石':80,'精氣之珠碎片':12}}),
 azureHelm:forge({id:'azureHelm',set:'azure',name:'T10 青龍頭盔',slot:'helm',image:'/assets/equipment/azure-dragon/azure-dragon-helm.jpg',bonus:{...noBonus,vit:40},magic:[{id:'azure-helm',name:'龍甲格擋',text:'防禦 +20%',color:'#90d4ad',stat:'def',value:20}],needs:{'青龍頭盔':1,'深淵的精髓':5,'小型雷之屬性石':40}}),
 azureGloves:forge({id:'azureGloves',set:'azure',name:'T10 青龍護手',slot:'gloves',image:'/assets/equipment/azure-dragon/azure-dragon-gloves.gif',bonus:{...noBonus,str:45},magic:[{id:'azure-gloves',name:'蒼龍爪勁',text:'攻擊 +12%',color:'#90d4ad',stat:'atk',value:12}],needs:{'雷電的箭矢':12,'深淵的精髓':5,'小型雷之屬性石':50}}),
 azureBoots:forge({id:'azureBoots',set:'azure',name:'T10 青龍護腿',slot:'boots',image:'/assets/equipment/azure-dragon/azure-dragon-boots.gif',bonus:{...noBonus,agi:60},magic:[{id:'azure-boots',name:'青雲步',text:'敏捷 +15%',color:'#90d4ad',stat:'agi',value:15}],needs:{'喵兒的尾巴':12,'精氣之珠碎片':10,'小型雷之屬性石':50}}),
 azureBelt:forge({id:'azureBelt',set:'azure',name:'T10 青龍腰帶',slot:'amulet',image:'/assets/equipment/azure-dragon/azure-dragon-belt.gif',bonus:{...noBonus,intel:50},magic:[{id:'azure-belt',name:'龍脈回響',text:'生命 +10%',color:'#90d4ad',stat:'hp',value:10}],needs:{'鹿亞之角':6,'[玉衡]咒術秘訣':1,'小型雷之屬性石':60}}),
 chiyouArmor:forge({id:'chiyouArmor',set:'chiyou',name:'T10 蚩尤戰甲',slot:'armor',image:'/assets/equipment/chiyou/chiyou-armor.png',bonus:{...noBonus,vit:70},magic:[{id:'chiyou-armor',name:'戰神鐵壁',text:'防禦 +18%',color:'#e99a69',stat:'def',value:18}],needs:{'深淵的精髓':10,'古代神獸之精髓':2,'小型憤怒精髓':8}}),
 chiyouHelm:forge({id:'chiyouHelm',set:'chiyou',name:'T10 蚩尤戰盔',slot:'helm',image:'/assets/equipment/chiyou/chiyou-helm.png',bonus:{...noBonus,str:35},magic:[{id:'chiyou-helm',name:'不屈戰意',text:'攻擊 +10%',color:'#e99a69',stat:'atk',value:10}],needs:{'古代神獸之精髓':1,'小型憤怒精髓':6,'被封印的力量碎片':1}}),
 chiyouGloves:forge({id:'chiyouGloves',set:'chiyou',name:'T10 蚩尤護手',slot:'gloves',image:'/assets/equipment/chiyou/chiyou-gloves.png',bonus:{...noBonus,str:65},magic:[{id:'chiyou-gloves',name:'破軍',text:'攻擊 +18%',color:'#e99a69',stat:'atk',value:18}],needs:{'赤賊頭目的矛':1,'深淵的精髓':6,'小型憤怒精髓':5}}),
 chiyouBoots:forge({id:'chiyouBoots',set:'chiyou',name:'T10 蚩尤護腿',slot:'boots',image:'/assets/equipment/chiyou/chiyou-boots.png',bonus:{...noBonus,agi:55},magic:[{id:'chiyou-boots',name:'戰場奔襲',text:'敏捷 +12%',color:'#e99a69',stat:'agi',value:12}],needs:{'狂虎之爪':3,'生命的精髓':5,'小型憤怒精髓':5}}),
 chiyouBelt:forge({id:'chiyouBelt',set:'chiyou',name:'T10 蚩尤腰帶',slot:'amulet',image:'/assets/equipment/chiyou/chiyou-belt.png',bonus:{...noBonus,intel:45},magic:[{id:'chiyou-belt',name:'戰魂回流',text:'生命 +10%',color:'#e99a69',stat:'hp',value:10}],needs:{'神獸之根源(白虎)':1,'深淵的精髓':5,'小型憤怒精髓':6}}),
 amaterasuHelm:forge({id:'amaterasuHelm',set:'amaterasu',name:'T10 天照頭盔',slot:'helm',image:'/assets/equipment/amaterasu/amaterasu-helm.gif',skill:'天照大神的凝視：天照五件套集齊後，攻擊有 3% 機率造成主角攻擊力 ×10 暴擊，並使敵人恐懼 5 秒（防禦 -20%）。',bonus:{...noBonus,intel:120},magic:[{id:'amaterasu-helm',name:'日輪法印',text:'防禦 +20%',color:'#82d9ff',stat:'def',value:20}],needs:{'天照的手套':1,'深淵的精髓':8,'小型雷之屬性石':80}}),
 amaterasuGloves:forge({id:'amaterasuGloves',set:'amaterasu',name:'T10 天照護手',slot:'gloves',image:'/assets/equipment/amaterasu/amaterasu-gloves.gif',bonus:{...noBonus,intel:75},magic:[{id:'amaterasu-gloves',name:'靈光導引',text:'生命 +8%',color:'#82d9ff',stat:'hp',value:8}],needs:{'精氣之珠碎片':20,'深淵的精髓':5,'小型雷之屬性石':50}}),
 amaterasuArmor:forge({id:'amaterasuArmor',set:'amaterasu',name:'T10 天照神甲',slot:'armor',image:'/assets/equipment/amaterasu/amaterasu-armor.gif',bonus:{...noBonus,intel:90,vit:30},magic:[{id:'amaterasu-armor',name:'天照結界',text:'防禦 +15%',color:'#82d9ff',stat:'def',value:15}],needs:{'古代神獸之精髓':1,'深淵的精髓':10,'小型雷之屬性石':70}}),
 amaterasuBelt:forge({id:'amaterasuBelt',set:'amaterasu',name:'T10 天照神環',slot:'amulet',image:'/assets/equipment/amaterasu/amaterasu-belt.gif',bonus:{...noBonus,intel:100},magic:[{id:'amaterasu-belt',name:'神託',text:'生命 +12%',color:'#82d9ff',stat:'hp',value:12}],needs:{'[玉衡]咒術秘訣':1,'被封印的力量碎片':1,'精氣之珠碎片':18}}),
 amaterasuBoots:forge({id:'amaterasuBoots',set:'amaterasu',name:'T10 天照神靴',slot:'boots',image:'/assets/equipment/amaterasu/amaterasu-boots.gif',bonus:{...noBonus,intel:65,agi:35},magic:[{id:'amaterasu-boots',name:'日行千里',text:'敏捷 +10%',color:'#82d9ff',stat:'agi',value:10}],needs:{'狂風花':10,'小型風之屬性石':20,'小型雷之屬性石':40}}),
};
export const THUNDER_FORGE_RECIPES=Object.values(THUNDER_FORGE_ITEMS);
/** Both material forge and newcomer redemption construct exactly the same versioned item. */
export function makeMythicEquipment(id:ThunderForgeId,uid:string,fallbackImage:string,source:string):Equipment {
  const recipe=THUNDER_FORGE_ITEMS[id];
  if(!recipe)throw new RangeError('Unknown mythic recipe');
  return {uid,definitionId:recipe.definitionId,balanceVersion:recipe.balanceVersion,name:recipe.name,slot:recipe.slot,atk:recipe.atk,def:recipe.def,hp:recipe.hp,image:recipe.image||fallbackImage,enhance:0,rarity:'傳說',magic:recipe.magic.map(affix=>({...affix})),bonus:{...recipe.bonus},skill:recipe.skill,requiredLevel:recipe.requiredLevel,source};
}
export const MYTHIC_ART_BY_NAME=Object.fromEntries(THUNDER_FORGE_RECIPES.filter(item=>item.image).map(item=>[item.name,item.image!])) as Record<string,string>;
export const mythicSetPieceCount=(names:Iterable<string>,set:MythicSet)=>{const setNames=new Set(THUNDER_FORGE_RECIPES.filter(item=>item.set===set).map(item=>item.name));return new Set([...names].filter(name=>setNames.has(name))).size};
