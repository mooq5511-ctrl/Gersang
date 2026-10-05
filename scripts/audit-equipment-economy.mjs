// Read-only audit of live definitions; no purchases, rolls, or save mutation.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, filename,
}).outputText, filename);
const { wearableCatalog } = require('../app/wearable-catalog.ts');
const { tierEquipmentCatalog, tierEquipmentPrice, makeTierEquipment, TIER_EQUIPMENT_SHOP_LEVELS } = require('../app/tier-equipment.ts');
const { officialEquipment } = require('../data/items/official-equipment.ts');
const { equipmentSellPrice } = require('../app/equipment-market.ts');
const { SHOP_QUALITY, WEAPON_SHOP_QUALITY } = require('../app/game-config.ts');
const { EQUIPMENT_FUSION_RECIPES, fusionRecipe } = require('../app/equipment-fusion.ts');
const {makeWearableEquipment,applyShopQuality}=require('../app/game-equipment-factory.ts');
const {EQUIPMENT_BALANCE_V1}=require('../app/equipment-v1-policy.ts');
const candidate = require('../app/equipment-economy-draft.ts');

function weights(table) {
  // rollShopQuality actually falls back to ordinary; configured ordinary chance is unused.
  const rare = table.稀有.chance / 100, epic = table.史詩.chance / 100, legend = table.傳說.chance / 100;
  return { 普通: 1 - rare - epic - legend, 稀有: rare, 史詩: epic, 傳說: legend, 金色: 0 };
}
const noBonus = { str: 0, agi: 0, intel: 0, vit: 0 };
function qualityCore(item, rarity) {
  if(item.balanceVersion===EQUIPMENT_BALANCE_V1)return applyShopQuality(item,rarity);
  const factor = SHOP_QUALITY[rarity].multiplier;
  const scale = value => Math.floor((value || 0) * factor);
  return { ...item, rarity, atk: scale(item.atk), def: scale(item.def), hp: scale(item.hp),
    bonus: Object.fromEntries(Object.entries(item.bonus || noBonus).map(([key, value]) => [key, scale(value)])),
    resist: Object.fromEntries(Object.entries(item.resist || {}).map(([key, value]) => [key, scale(value)])) };
}
export function auditEquipmentEconomy() {
  const definitions = [
    ...wearableCatalog.map(item => ({ family: 'guild', item: makeWearableEquipment(item,item.id), price: item.price, table: WEAPON_SHOP_QUALITY })),
    ...tierEquipmentCatalog.map(item => ({ family: 'series', item: makeTierEquipment(item, item.id, 'audit'), price: tierEquipmentPrice(item), table: item.requiredLevel>=120?WEAPON_SHOP_QUALITY:null })),
    ...officialEquipment.map(record => ({ family: 'official', item: { uid: record.id,definitionId:`official-${record.id}`,balanceVersion:EQUIPMENT_BALANCE_V1,name: record.name, atk: record.atk, def: record.def, hp: record.hp, enhance: 0, requiredLevel: record.level, magic: [],
      bonus: { str: record.str, agi: record.agi, intel: record.intel, vit: record.vit }, resist: { physical: record.physical, magic: record.magic } }, price: record.price, table: WEAPON_SHOP_QUALITY })),
  ];
  const rows = definitions.map(({ family, item, price, table }) => {
    const sale = Object.fromEntries(candidate.DRAFT_QUALITIES.map(rarity => [rarity, equipmentSellPrice(qualityCore(item, rarity))]));
    const chances = table ? weights(table) : { 普通: 1 };
    const expectedSale = Object.entries(chances).reduce((sum, [quality, weight]) => sum + sale[quality] * weight, 0);
    const profitableQualities = table ? Object.entries(chances).filter(([quality, weight]) => weight > 0 && sale[quality] > price).map(([quality, chance]) => ({ quality, chance, sale: sale[quality] })) : [];
    return { family, id: item.uid, name: item.name, price, ordinarySale: sale.普通, legendarySale: sale.傳說, expectedCoreOnlySale: expectedSale, profitableQualities,
      expectedProfit: expectedSale - price, ordinaryArbitrage: sale.普通 > price, candidateMaxSale: candidate.draftSellQuote(price, '金色') };
  });
  let inputs = 1;
  const fusionTemplate=definitions.find(entry=>entry.family==='series');
  const fusion = EQUIPMENT_FUSION_RECIPES.map(oldRecipe => {
    const recipe=fusionRecipe(oldRecipe.sourceRarity,fusionTemplate.item);
    inputs *= recipe.ingredientCount / recipe.successRate;
    return { target: recipe.targetRarity, meanOrdinaryInputs: inputs, feePerBatch:recipe.fee, candidate: candidate.draftCraftCost(fusionTemplate.price, recipe.targetRarity) };
  });
  return { assumptions: `Versioned actual shop-quality policy and canonical sale prices; ${tierEquipmentCatalog.length} series + ${officialEquipment.length} official + ${wearableCatalog.length} wearable definitions. Targeted shop levels: ${TIER_EQUIPMENT_SHOP_LEVELS.join('/')}; other series sale variants are drop diagnostics. Random affixes do not affect V1 resale. Fusion uses actual V1 recipe counts/fees. No RNG, purchases, save writes, city discount assumptions or natural-economy claims.`,
    definitions: rows.length, ordinaryArbitrage: rows.filter(row => row.ordinaryArbitrage), expectedPurchaseProfit: rows.filter(row => row.expectedProfit > 0), profitableRolls: rows.filter(row => row.profitableQualities.length), rows, fusion,
    targetedSeriesDrop: candidate.expectedSpecificDropFights(.04, 7), twoTierSeriesDrop: candidate.expectedSpecificDropFights(.04, 14) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(auditEquipmentEconomy(), null, 2));
