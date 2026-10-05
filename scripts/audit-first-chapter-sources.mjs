// Read-only catalog/cost audit. Catalog prices are not proof of affordability.
import './measure-equipment-early.mjs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const {worldCities}=require('../app/v15-data.ts');
const {officialEquipment}=require('../data/items/official-equipment.ts');
const {wearableCatalog}=require('../app/wearable-catalog.ts');
const {tierEquipmentShopCatalog,tierEquipmentPrice,TIER_EQUIPMENT_DROP_REGIONS,EQUIPMENT_TIER_LEVELS}=require('../app/tier-equipment.ts');
const {progressForLevel}=require('../app/level-progression.ts');
const {medicineCatalog}=require('../app/game-config.ts');
const {freshGame}=require('../app/game-hero-factory.ts');
const {purchaseMagicEquipmentAction}=require('../app/game-inventory-actions.ts');
const {v1MagicEquipmentPrice}=require('../app/equipment-v1-policy.ts');
const slots=['weapon','helm','armor','gloves','amulet','boots','ring','ring'];

export function chapterSourceAudit(){
  const city=worldCities.find(city=>city.name==='漢陽');
  if(!city)throw new Error('Starter city missing');
  // Same independent weapon/armor inventory filtering as game-view-selector.
  const official=['weapon','armor'].flatMap(kind=>officialEquipment.filter(item=>item.kind===kind).filter((_,index)=>index%5===city.stockIndex).slice(0,8)).filter(item=>item.level<=12);
  const options=[...wearableCatalog.map(item=>({id:item.id,name:item.name,slot:item.slot,level:1,price:Math.floor(item.price*city.priceFactor)})),
    ...official.map(item=>({id:item.id,name:item.name,slot:item.kind,level:item.level,price:Math.floor(item.price*city.priceFactor)}))];
  const cheapest=slots.map(slot=>{
    const item=options.filter(item=>item.slot===slot).sort((a,b)=>a.price-b.price)[0];
    if(!item)throw new Error(`No starter city source for ${slot}`);
    return item;
  });
  const equipmentPerPerson=cheapest.reduce((sum,item)=>sum+item.price,0);
  const recruitmentPerMercenary=Math.floor(6000*city.priceFactor);
  return {city:city.name,priceFactor:city.priceFactor,seriesLevels:EQUIPMENT_TIER_LEVELS,
    level20SeriesDirectShopAvailable:tierEquipmentShopCatalog.some(item=>item.requiredLevel===20),
    level20EightSlotDirectPrice:tierEquipmentShopCatalog.filter(item=>item.requiredLevel===20).reduce((sum,item)=>sum+Math.floor(tierEquipmentPrice(item)*city.priceFactor)*(item.slot==='ring'?2:1),0),
    level20SeriesDropRegions:TIER_EQUIPMENT_DROP_REGIONS.filter(region=>region.tiers.includes(20)).map(region=>region.mapId),
    cheapestEightSlotShopLoadout:cheapest,equipmentPerPerson,recruitmentPerMercenary,
    grossThreeMercenaryFourLoadoutCost:equipmentPerPerson*4+recruitmentPerMercenary*3,
    healingPotionPrice:Math.floor(medicineCatalog.find(item=>item.id==='healing').price*city.priceFactor),
    xpTo12:progressForLevel(12).totalXp,xpTo20:progressForLevel(20).totalXp,
    caveat:'Gross shop-only alternative, not the winning series20 fixture. It excludes tutorial grant, loot, trade earnings, travel, potions and healing; does not imply all four members require complete purchases. Magic counter now follows hero level; acquisition funding and relic/crafting alternatives still require actual-flow verification.'};
}

/** Actual paid offer transactions in an isolated funded state; not natural income or combat. */
export function magicOfferCollectionCost(seed,level=20){
  let randomState=seed>>>0;
  const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  const game=freshGame('隨機供應成本');
  let state={...game,hero:{...game.hero,level},gold:10000000,stage:1};
  const needed={weapon:2,helm:2,armor:2,gloves:2,amulet:2,boots:2,ring:4},counts={};
  let purchases=0;
  while(Object.entries(needed).some(([slot,count])=>(counts[slot]||0)<count)&&purchases<500){
    const previous=state;
    state=purchaseMagicEquipmentAction(state,random,(logs,message)=>[message,...logs].slice(0,80),()=>{});
    if(state===previous)throw new Error('Supplied audit funds were insufficient');
    const item=state.inventory[0];counts[item.slot]=(counts[item.slot]||0)+1;purchases++;
  }
  const complete=Object.entries(needed).every(([slot,count])=>(counts[slot]||0)>=count);
  return {seed,level,purchases,spent:10000000-state.gold,unitPrice:v1MagicEquipmentPrice(level),complete,counts,
    caveat:'Two complete eight-slot offers collected at arbitrary identified quality/affixes. Funds supplied; no resale, equip, fight, XP or measured minutes. Does not prove all sixteen pieces are required or affordable.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(chapterSourceAudit(),null,2));
