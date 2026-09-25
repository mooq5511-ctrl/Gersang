import { gersangItemArt } from "./gersang-visuals.ts";
import { wearableCatalog } from "./wearable-catalog.ts";
import { magicAffixes } from "./v15-data.ts";
import type { OfficialEquipment } from "./v17-content";
import { SHOP_QUALITY } from "./game-config.ts";
import type { Equipment, MagicAffix } from "./game-state";

export function makeUid(prefix: string) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function rollShopQuality(): Equipment["rarity"] {
  const roll = Math.random() * 100;
  if (roll < SHOP_QUALITY["傳說"].chance) return "傳說";
  if (roll < SHOP_QUALITY["傳說"].chance + SHOP_QUALITY["史詩"].chance) return "史詩";
  if (roll < SHOP_QUALITY["傳說"].chance + SHOP_QUALITY["史詩"].chance + SHOP_QUALITY["稀有"].chance) return "稀有";
  return "普通";
}

function scale(value: number | undefined, multiplier: number) { return Math.floor((value || 0) * multiplier); }
function scaleMagic(magic: MagicAffix[], multiplier: number) { return magic.map((affix) => { const value = scale(affix.value, multiplier); return { ...affix, value, text: affix.text.replace(/\+(\d+)%/, "+" + value + "%") }; }); }

export function applyShopQuality(item: Equipment, rarity = rollShopQuality()): Equipment {
  const multiplier = SHOP_QUALITY[rarity].multiplier, name = item.name.replace(/^(普通|稀有|史詩|傳說|金色)・/, "");
  return { ...item, name: rarity + "・" + name, atk: scale(item.atk, multiplier), def: scale(item.def, multiplier), hp: scale(item.hp, multiplier), rarity, magic: scaleMagic(item.magic, multiplier), bonus: { str: scale(item.bonus?.str, multiplier), agi: scale(item.bonus?.agi, multiplier), intel: scale(item.bonus?.intel, multiplier), vit: scale(item.bonus?.vit, multiplier) }, resist: { physical: scale(item.resist?.physical, multiplier), magic: scale(item.resist?.magic, multiplier) }, source: "四國城市商店・" + rarity + "品質 x" + multiplier };
}

/** Promotes an existing item by the relative quality multiplier without changing its identity. */
export function advanceEquipmentQuality(item: Equipment, rarity: Equipment["rarity"]): Equipment {
  const multiplier = SHOP_QUALITY[rarity].multiplier / SHOP_QUALITY[item.rarity].multiplier;
  return { ...item, name: item.name.replace(/^(普通|稀有|史詩|傳說|金色)・/, ""), atk: scale(item.atk, multiplier), def: scale(item.def, multiplier), hp: scale(item.hp, multiplier), rarity, magic: scaleMagic(item.magic, multiplier), bonus: { str: scale(item.bonus?.str, multiplier), agi: scale(item.bonus?.agi, multiplier), intel: scale(item.bonus?.intel, multiplier), vit: scale(item.bonus?.vit, multiplier) }, resist: { physical: scale(item.resist?.physical, multiplier), magic: scale(item.resist?.magic, multiplier) } };
}

export function rollEquipment(stage: number, guaranteed = false, slot?: Equipment["slot"]): Equipment {
  const catalog = slot ? wearableCatalog.filter((entry) => entry.slot === slot) : wearableCatalog;
  const base = catalog[Math.floor(Math.random() * catalog.length)] || wearableCatalog[0], magicCount = guaranteed ? Math.min(3, 1 + Math.floor(stage / 20)) : Math.min(3, Math.max(1, Math.floor(stage / 15))), magic = [...magicAffixes].sort(() => Math.random() - .5).slice(0, magicCount);
  const rarity: Equipment["rarity"] = magicCount >= 3 ? "傳說" : magicCount === 2 ? "史詩" : stage >= 10 ? "稀有" : "普通";
  return { uid: makeUid(base.id), name: (rarity === "普通" ? "" : rarity + "・") + base.name, slot: base.slot, atk: base.atk + stage * 2, def: base.def + Math.floor(stage * 1.4), hp: base.hp + stage * 6, image: gersangItemArt(base.slot), enhance: 0, luckyValue: 0, enhanceBonuses: [], rarity, magic: magic.map((affix) => ({ ...affix })), bonus: { str: 0, agi: 0, intel: 0, vit: 0 }, resist: { physical: 0, magic: 0 } };
}

export function makeOfficialEquipment(record: OfficialEquipment, rarity = rollShopQuality()): Equipment {
  const multiplier = SHOP_QUALITY[rarity].multiplier;
  const magic = [...magicAffixes].sort(() => Math.random() - .5).slice(0, record.level >= 130 ? 3 : record.level >= 50 ? 2 : 1);
  return { uid: makeUid(record.id), name: rarity + "・" + record.name, slot: record.kind, atk: scale(record.atk, multiplier), def: scale(record.def, multiplier), hp: 0, image: gersangItemArt(record.kind), enhance: 0, rarity, magic: scaleMagic(magic.map((affix) => ({ ...affix })), multiplier), requiredLevel: record.level, source: "四國城市商店・" + rarity + "品質 x" + multiplier, skill: record.skill, bonus: { str: scale(record.str, multiplier), agi: scale(record.agi, multiplier), intel: scale(record.intel, multiplier), vit: scale(record.vit, multiplier) }, resist: { physical: scale(record.physical, multiplier), magic: scale(record.magic, multiplier) } };
}
