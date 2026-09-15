import { ACTIVE_MERCENARY_LIMIT } from "./guild-migration";
import { nextBattlePosition } from "./formation-position";
import type { MercenarySpec } from "./mercenary-roster";
import type { GameState, Unit } from "./game-state";
import { calculateLevelBasedBonus, canPromoteMercenary, MERCENARY_PROMOTION_TREES, type JobTier, type PromotionItemId } from "./mercenary-promotions";
import { normalizeVitals } from "./vitals-engine";

type Log = (logs: string[], message: string) => string[];
type Attribute = "str" | "agi" | "intel" | "vit";

const promotionItemKeys: readonly PromotionItemId[] = ["fusionCores", "soulStones", "awakeningStones"];
const defaultLog: Log = (logs, message) => [...logs, message];

/** Purely applies one promotion. The normal GameV15 save effect persists its returned state to localStorage. */
export function promoteMercenary(
  state: GameState,
  mercenaryId: string,
  targetTier?: JobTier,
  addLog: Log = defaultLog,
): GameState {
  const locations: Array<"mercs" | "restingMercs"> = ["mercs", "restingMercs"];
  for (const location of locations) {
    const index = state[location].findIndex((unit) => unit.uid === mercenaryId);
    if (index < 0) continue;
    const unit = state[location][index];
    const nextTier = targetTier ?? (unit.tier + 1 as JobTier);
    if (nextTier < 2 || nextTier > 3) return { ...state, logs: addLog(state.logs, `「${unit.name}」沒有可進行的轉職。`) };
    const tree = MERCENARY_PROMOTION_TREES[unit.templateId as keyof typeof MERCENARY_PROMOTION_TREES];
    if (!tree) return { ...state, logs: addLog(state.logs, `「${unit.name}」尚未設定轉職資料。`) };
    const target = nextTier === 2 ? tree.tier2 : tree.tier3;
    const items = Object.fromEntries(promotionItemKeys.map((item) => [item, state[item]])) as Record<PromotionItemId, number>;
    if (!canPromoteMercenary({ templateId: unit.templateId, jobTier: unit.tier as JobTier, level: unit.level, items }, nextTier)) {
      return { ...state, logs: addLog(state.logs, `「${unit.name}」尚未符合${target.name}的轉職條件。`) };
    }
    const costs = Object.fromEntries(promotionItemKeys.map((item) => [item, state[item]])) as Record<PromotionItemId, number>;
    for (const cost of target.requiredItems) costs[cost.itemId] -= cost.quantity;
    const attributePointBonus = calculateLevelBasedBonus(unit.level);
    const promoted: Unit = normalizeVitals({
      ...unit,
      tier: nextTier,
      jobClass: target.name,
      name: target.name,
      level: 1,
      xp: 0,
      points: unit.points + attributePointBonus,
      growthMultipliers: target.growthMultipliers,
    });
    const members = [...state[location]];
    members[index] = promoted;
    return {
      ...state,
      [location]: members,
      fusionCores: costs.fusionCores,
      soulStones: costs.soulStones,
      awakeningStones: costs.awakeningStones,
      logs: addLog(state.logs, `「${unit.name}」已轉職為「${target.name}」，等級重置為 Lv.1、經驗歸零，獲得屬性點 ${attributePointBonus.toLocaleString()} 點。`),
    };
  }
  return { ...state, logs: addLog(state.logs, "找不到指定的傭兵。") };
}

export function recruitMerchantAction(
  state: GameState,
  spec: MercenarySpec,
  index: number,
  cost: number,
  createUnit: (spec: MercenarySpec, index: number) => Unit,
  addLog: Log,
): GameState {
  if (state.gold < cost || state.mercs.length >= ACTIVE_MERCENARY_LIMIT) {
    return { ...state, logs: addLog(state.logs, state.mercs.length >= ACTIVE_MERCENARY_LIMIT ? "商隊傭兵名冊已滿：最多可僱用 11 名傭兵，連同主角共 12 名。" : "僱用資金不足。") };
  }
  const unit = createUnit(spec, index);
  return { ...state, gold: state.gold - cost, mercs: [...state.mercs, unit], active: [...state.active, unit.uid].slice(0, ACTIVE_MERCENARY_LIMIT), logs: addLog(state.logs, `招募 ${spec.name}，已加入護商隊。`) };
}

export function allocateAttributeAction(state: GameState, selectedUid: string, stat: Attribute, amount = 1): GameState {
  if (selectedUid === "hero") {
    if (state.hero.points <= 0) return state;
    const spend = Math.min(state.hero.points, amount);
    return { ...state, hero: { ...state.hero, [stat]: state.hero[stat] + spend, points: state.hero.points - spend } };
  }
  return {
    ...state,
    mercs: state.mercs.map((unit) => unit.uid === selectedUid && unit.points > 0
      ? { ...unit, [stat]: unit[stat] + Math.min(unit.points, amount), points: Math.max(0, unit.points - amount) }
      : unit),
  };
}

export function toggleActiveAction(state: GameState, unitUid: string, notify: (message: string) => void): GameState {
  if (state.active.includes(unitUid)) return { ...state, active: state.active.filter((id) => id !== unitUid) };
  if (state.active.length >= ACTIVE_MERCENARY_LIMIT) { notify("出戰傭兵最多 " + ACTIVE_MERCENARY_LIMIT + " 人，主角不佔欄位。"); return state; }
  return { ...state, active: [...state.active, unitUid] };
}

export function storeMercenaryAction(state: GameState, unitUid: string, addLog: Log): GameState {
  const unit = state.mercs.find((entry) => entry.uid === unitUid);
  if (!unit || state.active.includes(unitUid)) return { ...state, logs: addLog(state.logs, "請先將上陣傭兵撤下，才能安排至休息處。") };
  if (state.restingMercs.length >= 10) return { ...state, logs: addLog(state.logs, "傭兵休息處已滿（10／10）。") };
  return { ...state, mercs: state.mercs.filter((entry) => entry.uid !== unitUid), restingMercs: [...state.restingMercs, unit], logs: addLog(state.logs, `「${unit.name}」已前往傭兵休息處。`) };
}

export function withdrawMercenaryAction(state: GameState, unitUid: string, addLog: Log): GameState {
  const unit = state.restingMercs.find((entry) => entry.uid === unitUid);
  if (!unit) return state;
  if (state.mercs.length >= ACTIVE_MERCENARY_LIMIT) return { ...state, logs: addLog(state.logs, "隊伍名冊已滿（11／11），請先安排一名傭兵至休息處。") };
  return { ...state, restingMercs: state.restingMercs.filter((entry) => entry.uid !== unitUid), mercs: [...state.mercs, unit], logs: addLog(state.logs, `「${unit.name}」已從傭兵休息處歸隊。`) };
}

export function cyclePositionAction(state: GameState, unitUid: string, addLog: Log): GameState {
  if (unitUid === "hero") { const position = nextBattlePosition(state.hero.position); return { ...state, hero: { ...state.hero, position }, logs: addLog(state.logs, "🔄 主角調整至" + position + "。") }; }
  return { ...state, mercs: state.mercs.map((unit) => unit.uid === unitUid ? { ...unit, position: nextBattlePosition(unit.position) } : unit), logs: addLog(state.logs, "🔄 商隊成員完成戰術換位。") };
}
