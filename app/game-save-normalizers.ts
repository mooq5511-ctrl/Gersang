import { emptyEquipment, heroPortrait } from "./game-hero-factory";
import { itemKind, type EquipmentSlot } from "./equipment-slots";
import { gersangItemArt, gersangUnitArt, cuteEquipmentArt } from "./gersang-visuals";
import { MYTHIC_ART_BY_NAME, THUNDER_FORGE_ITEMS } from "./mythic-forge";
import type { Equipment, EquipmentSet, GameState, MagicAffix } from "./game-state";

export function sanitizeEquip(value: unknown): EquipmentSet {
  const equip = emptyEquipment(); if (!value || typeof value !== "object") return equip;
  for (const slot of Object.keys(equip) as EquipmentSlot[]) { const candidate = (value as Record<string, unknown>)[slot]; if (candidate && typeof candidate === "object" && "name" in candidate) { const item = candidate as Partial<Equipment>; equip[slot] = { uid: item.uid || `migrated-${Date.now()}`, name: item.name || "傳承裝備", slot: itemKind(item.slot || slot), atk: Number(item.atk) || 0, def: Number(item.def) || 0, hp: Number(item.hp) || 0, image: gersangItemArt(itemKind(item.slot || slot)), enhance: Number(item.enhance) || 0, rarity: item.rarity || "普通", magic: Array.isArray(item.magic) ? item.magic as MagicAffix[] : [], requiredLevel: Number(item.requiredLevel) || 0, source: item.source, skill: item.skill, bonus: item.bonus || { str: 0, agi: 0, intel: 0, vit: 0 }, resist: item.resist || { physical: 0, magic: 0 } }; } }
  return equip;
}

export function applyGersangVisuals(state: GameState): GameState {
  const map = (item: Equipment): Equipment => { const corrected = item.name === "T10 天照神杖" ? THUNDER_FORGE_ITEMS.amaterasuHelm : null; const source = corrected ? { ...item, ...corrected, magic: corrected.magic.map((affix) => ({ ...affix })), requiredLevel: 1 } : item; return { ...source, image: MYTHIC_ART_BY_NAME[source.name] || cuteEquipmentArt(source.name, gersangItemArt(itemKind(source.slot))) }; };
  const mapSet = (equip: EquipmentSet): EquipmentSet => { const mapped = emptyEquipment(); for (const slot of Object.keys(equip) as EquipmentSlot[]) { if (!equip[slot]) continue; const item = map(equip[slot]!); const target = (itemKind(item.slot) === "ring" ? slot : itemKind(item.slot)) as EquipmentSlot; mapped[target] = mapped[target] || item; } return mapped; };
  const unitVisual = (unit: GameState['mercs'][number], index: number) => ({ ...unit, image: unit.templateId.startsWith('general-') ? unit.image : gersangUnitArt(unit.templateId, unit.name, index), equip: mapSet(unit.equip) });
  return { ...state, hero: { ...state.hero, image: heroPortrait(state.hero.nation, state.hero.gender), equip: mapSet(state.hero.equip) }, mercs: state.mercs.map(unitVisual), restingMercs: state.restingMercs.map(unitVisual), inventory: state.inventory.map(map) };
}
