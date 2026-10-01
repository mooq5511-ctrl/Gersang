import { emptyEquipment, heroPortrait } from "./game-hero-factory";
import { itemKind, type EquipmentSlot } from "./equipment-slots";
import { gersangItemArt, gersangUnitArt } from "./gersang-visuals";
import { MYTHIC_ART_BY_NAME, THUNDER_FORGE_ITEMS } from "./mythic-forge";
import type { Equipment, EquipmentSet, GameState, MagicAffix } from "./game-state";

export function sanitizeEquip(value: unknown): EquipmentSet {
  const equip = emptyEquipment(); if (!value || typeof value !== "object") return equip;
  for (const slot of Object.keys(equip) as EquipmentSlot[]) { const candidate = (value as Record<string, unknown>)[slot]; if (candidate && typeof candidate === "object" && "name" in candidate) { const item = candidate as Partial<Equipment>; const enhanceBonuses = Array.isArray(item.enhanceBonuses) ? Array.from(new Map((item.enhanceBonuses as NonNullable<Equipment["enhanceBonuses"]>).map((bonus) => [bonus.id, bonus])).values()) : []; equip[slot] = { uid: item.uid || `migrated-${Date.now()}`, name: item.name || "傳承裝備", slot: itemKind(item.slot || slot), atk: Number(item.atk) || 0, def: Number(item.def) || 0, hp: Number(item.hp) || 0, image: gersangItemArt(itemKind(item.slot || slot)), enhance: Number(item.enhance) || 0, luckyValue: Math.max(0, Math.min(100, Number(item.luckyValue) || 0)), enhanceBonuses, rarity: item.rarity || "普通", magic: Array.isArray(item.magic) ? item.magic as MagicAffix[] : [], requiredLevel: Number(item.requiredLevel) || 0, source: item.source, skill: item.skill, bonus: item.bonus || { str: 0, agi: 0, intel: 0, vit: 0 }, resist: item.resist || { physical: 0, magic: 0 } }; } }
  return equip;
}

export function applyGersangVisuals(state: GameState): GameState {
  const map = (item: Equipment): Equipment => { const corrected = item.name === "T10 天照神杖" ? THUNDER_FORGE_ITEMS.amaterasuHelm : null; const source = corrected ? { ...item, ...corrected, magic: corrected.magic.map((affix) => ({ ...affix })), requiredLevel: 1 } : item; const image = MYTHIC_ART_BY_NAME[source.name] || gersangItemArt(itemKind(source.slot)); return source === item && image === item.image ? item : { ...source, image }; };
  const mapSet = (equip: EquipmentSet): EquipmentSet => { const mapped = emptyEquipment(); for (const slot of Object.keys(equip) as EquipmentSlot[]) { if (!equip[slot]) continue; const item = map(equip[slot]!); const target = (itemKind(item.slot) === "ring" ? slot : itemKind(item.slot)) as EquipmentSlot; mapped[target] = mapped[target] || item; } return (Object.keys(mapped) as EquipmentSlot[]).every(slot => mapped[slot] === equip[slot]) ? equip : mapped; };
  const unitVisual = (unit: GameState['mercs'][number], index: number) => { const image = unit.templateId.startsWith('general-') ? unit.image : gersangUnitArt(unit.templateId, unit.name, index); const equip = mapSet(unit.equip); return image === unit.image && equip === unit.equip ? unit : { ...unit, image, equip }; };
  const share = <T,>(before: T[], after: T[]) => before.every((entry, index) => entry === after[index]) ? before : after;
  const image = heroPortrait(state.hero.nation, state.hero.gender);
  const equip = mapSet(state.hero.equip);
  const hero = image === state.hero.image && equip === state.hero.equip ? state.hero : { ...state.hero, image, equip };
  const mercs = share(state.mercs, state.mercs.map(unitVisual));
  const restingMercs = share(state.restingMercs, state.restingMercs.map(unitVisual));
  const inventory = share(state.inventory, state.inventory.map(map));
  return hero === state.hero && mercs === state.mercs && restingMercs === state.restingMercs && inventory === state.inventory ? state : { ...state, hero, mercs, restingMercs, inventory };
}
