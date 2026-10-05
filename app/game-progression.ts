import { EQUIPMENT_SLOTS } from "./equipment-slots";
import { heroPersonalPower } from "./hero-rules";
import { equipmentCorePower } from './equipment-stats';
import { isSocketGemDisplayAffix } from './equipment-affix-semantics';
import {hasV1Equipment} from './equipment-special-policy';
import { LEVEL_CAP, xpForNextLevel } from "./level-progression";
import { vitalStats } from "./vitals-engine";
import {combatStats} from './vitals-engine';
import {nextPromotion,usesPromotionV1} from './mercenary-growth-v1';
import type { Equipment, GameState, Hero, Unit } from "./game-state";
import { territoryBonus } from "./guild-territory";

export const xpNeed = (level: number) => xpForNextLevel(level);

export function grantXp<T extends Unit | Hero>(unit: T, amount: number): T {
  let xp = unit.xp + amount, level = unit.level, points = unit.points;
  const cap=usesPromotionV1(unit)?(nextPromotion(unit)?.minLevel||250):LEVEL_CAP;
  while (level < cap && xp >= xpNeed(level)) { xp -= xpNeed(level); level += 1; points += unit.uid === "hero" ? 5 : 3; }
  const levelGain = level - unit.level;
  if (unit.uid === "hero" && levelGain > 0) {
    const baseMax = Number(unit.maxHp) || 100 + (unit.level - 1) * 20;
    const upgraded = { ...unit, xp, level, points, maxHp: baseMax + levelGain * 20 };
    return { ...upgraded, hp: vitalStats(upgraded).maxHp } as T;
  }
  return { ...unit, xp, level, points };
}

export function grantTerritoryXp<T extends Unit | Hero>(game: GameState, unit: T, amount: number): T {
  return grantXp(unit, amount * (1 + territoryBonus(game.territory, "xp")));
}

export function grantCreditXp(game: GameState, amount: number): GameState {
  let creditXp = game.creditXp + Math.max(0, Math.floor(amount)), creditLevel = game.creditLevel;
  while (creditLevel < LEVEL_CAP && creditXp >= xpNeed(creditLevel)) { creditXp -= xpNeed(creditLevel); creditLevel += 1; }
  return { ...game, creditXp, creditLevel };
}

function equipmentPower(item: Equipment | null) {
  if (!item) return 0;
  const magic = item.magic.filter(affix => !isSocketGemDisplayAffix(item, affix)).reduce((sum, affix) => sum + affix.value * 3.2, 0);
  const bonus = item.bonus ? item.bonus.str * 2.2 + item.bonus.agi * 1.8 + item.bonus.intel * 2 + item.bonus.vit * 2.1 : 0;
  const resist = item.resist ? (item.resist.physical + item.resist.magic) * 2.4 : 0;
  return equipmentCorePower(item) + magic + bonus + resist;
}

export function unitPower(unit: Unit | Hero) {
  if (unit.uid === "hero") return heroPersonalPower(unit);
  if(usesPromotionV1(unit)||hasV1Equipment(unit)){const combat=combatStats(unit),vital=vitalStats(unit);return Math.floor(combat.attack*2.2+combat.defense*1.6+vital.maxHp*.22);}
  const flat = EQUIPMENT_SLOTS.reduce((sum, slot) => { const bonus = unit.equip[slot]?.bonus; return { str: sum.str + (bonus?.str || 0), agi: sum.agi + (bonus?.agi || 0), intel: sum.intel + (bonus?.intel || 0), vit: sum.vit + (bonus?.vit || 0) }; }, { str: 0, agi: 0, intel: 0, vit: 0 });
  const affix = (stat: string) => EQUIPMENT_SLOTS.reduce((sum, slot) => { const item = unit.equip[slot]; return sum + (item?.magic.filter(entry => entry.stat === stat && !isSocketGemDisplayAffix(item, entry)).reduce((value, entry) => value + entry.value, 0) || 0); }, 0);
  const base = (unit.str + flat.str) * (1 + affix("str") / 100) * 2.2 + (unit.agi + flat.agi) * (1 + affix("agi") / 100) * 1.8 + (unit.intel + flat.intel) * (1 + affix("intel") / 100) * 2 + (unit.vit + flat.vit) * (1 + affix("vit") / 100) * 2.1;
  const equipment = EQUIPMENT_SLOTS.reduce((sum, slot) => sum + equipmentPower(unit.equip[slot]), 0);
  return Math.floor((base + equipment) * (1 + (unit.level - 1) * .075) * (1 + unit.tier * .25) * (unit.special ? 1.3 : 1) * (unit.awakened ? 1.38 : 1));
}
