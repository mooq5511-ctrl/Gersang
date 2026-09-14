import { DUNGEONS, dungeonStep, freshDungeon, type DungeonKey } from "./dungeon-engine";
import { DIVINE_EQUIPMENT } from "./divine-equipment";
import { ACTIVE_MERCENARY_LIMIT } from "./guild-migration";
import { heroTotalAttributes } from "./hero-rules";
import { addInventoryItem } from "./inventory-layout";
import { battleMaps } from "./reference-data";
import { sourceEnemyForDungeonKey } from "./v17-content";
import { combatStats, vitalStats } from "./vitals-engine";
import type { Equipment, GameState, Hero, Unit } from "./game-state";
import { awardFusionCores } from "./fusion-core-rewards";
import { territoryBonus, territoryHealInterval } from "./guild-territory";
import { grantTerritoryXp } from "./game-progression";
import { makeTierEquipmentDrop, pickTierEquipmentDrop } from "./tier-equipment";

type BattleActionDependencies = {
  notify: (message: string) => void;
  enemyMax: (stage: number, multiplier?: number) => number;
  addLog: (logs: string[], message: string) => string[];
};

/** Applies map gates and resets only the battle state needed for a new region. */
export function selectBattleMapAction(state: GameState, mapId: string, deps: BattleActionDependencies): GameState {
  const map = battleMaps.find((entry) => entry.id === mapId);
  if (!map) return state;
  if (map.id === "millennium-lake" && !state.newbieBossDefeated) { deps.notify("請先在新手村郊外擊敗海賊王，才能進入千年湖。"); return state; }
  if (map.id === "japan-sea" && !state.lakeBossDefeated) { deps.notify("請先在千年湖擊敗狂風阿魯塔，才能進入日本海底洞。"); return state; }
  if (map.id === "miasma-forest" && !state.goldenStarfishDefeated) { deps.notify("請先在日本海底洞擊敗黃金海星，才能進入白虎林。"); return state; }
  if (state.stage < map.unlockStage) { deps.notify("請依世界地圖完成前置區域，才能進入「" + map.name + "」。"); return state; }
  const key = map.id === "starter-outskirts" ? "e_starter_raccoon" : map.id === "millennium-lake" ? "e_lake_red_thief" : map.id === "japan-sea" ? "e_japan_sea_kappa" : map.id === "miasma-forest" ? "e_white_tiger_soul_eater" : map.id === "sumeru" ? "e_sumeru_training_thunder_beast" : null;
  return {
    ...state,
    battleMap: map.id,
    selectedMonster: undefined,
    dungeon: key ? { ...freshDungeon(), key, enemyHp: DUNGEONS[key].hp } : { ...(state.dungeon || freshDungeon()), lockedEnemyKey: undefined },
    enemyHp: deps.enemyMax(state.stage, map.hpMultiplier),
    logs: deps.addLog(state.logs, "商團遠征轉移至「" + map.name + "」。"),
  };
}

type DungeonActionDependencies = {
  addLog: (logs: string[], message: string) => string[];
  grantXp: <T extends Unit | Hero>(unit: T, amount: number) => T;
  enterInn: (state: GameState, now: number, message: string, dungeon: NonNullable<GameState["dungeon"]>) => GameState;
  leaveInn: (state: GameState) => GameState;
};

export type DungeonAction = "tick" | "start" | "normal" | "skill" | "retreat";

/** Runs a single deterministic dungeon transition, including victory rewards. */
export function runDungeonAction(
  previous: GameState,
  action: DungeonAction,
  now: number,
  key: DungeonKey | undefined,
  rolls: { roll?: number; choice?: number; spawnRoll?: number; encounterCountRoll?: number; retaliationRoll?: number; materialRolls?: number[]; fusionCoreRoll?: number; gearDropRoll?: number; gearChoiceRoll?: number },
  deps: DungeonActionDependencies,
): GameState {
  const roll = rolls.roll ?? .99, choice = rolls.choice ?? 0, spawnRoll = rolls.spawnRoll ?? 0, retaliationRoll = rolls.retaliationRoll ?? 0, materialRolls = rolls.materialRolls ?? [1, 1, 1];
  const total = heroTotalAttributes(previous.hero), vital = vitalStats(previous.hero);
  const activeIds = new Set(previous.active.slice(0, ACTIVE_MERCENARY_LIMIT));
  const deployedMercs = previous.mercs.filter((unit) => activeIds.has(unit.uid));
  const fighters = [previous.hero, ...deployedMercs], living = fighters.filter((unit) => vitalStats(unit).hp > 0);
  const mercenaryIntelligence = fighters.reduce((sum, unit) => sum + heroTotalAttributes(unit).intel, 0);
  const attack = living.reduce((sum, unit) => sum + combatStats(unit).attack * (unit.position === "前排" ? 1.2 : 1), 0);
  const party = fighters.map((unit) => { const stats = vitalStats(unit), combat = combatStats(unit); return { uid: unit.uid, templateId: unit.templateId, name: unit.name, hp: stats.hp, maxHp: stats.maxHp, mp: stats.mp, maxMp: stats.maxMp, position: unit.position, defense: combat.defense, attack: combat.attack, accuracy: combat.accuracy, attackInterval: Math.max(.6, 2.2 - combat.speed / 100) }; });
  const passiveDamage = deployedMercs.reduce((sum, unit) => sum + Math.max(0, Math.floor(combatStats(unit).attack * .18)), 0);
  const amaterasuSet = Object.values(previous.hero.equip).filter((item) => item?.name.startsWith("T10 天照")).length >= 5;
  const result = dungeonStep(previous.dungeon || freshDungeon(), { ...vital, str: total.str, dex: total.agi, mercenaryIntelligence, attack, defense: combatStats(previous.hero).defense, staff: previous.hero.equip.weapon?.name === DIVINE_EQUIPMENT.staff.name, amaterasuGaze: amaterasuSet }, action, now, key, roll, choice, spawnRoll, retaliationRoll, party, passiveDamage, materialRolls, previous.autoSkill, rolls.encounterCountRoll, territoryHealInterval(previous.territory));
  const remaining = new globalThis.Map(result.party.map((unit) => [unit.uid, unit]));
  let next: GameState = { ...previous, dungeon: result.state, hero: { ...previous.hero, hp: remaining.get("hero")?.hp ?? result.hp, mp: remaining.get("hero")?.mp ?? result.mp }, mercs: previous.mercs.map((unit) => { const fighter = remaining.get(unit.uid); return fighter ? { ...unit, hp: fighter.hp, mp: fighter.mp ?? unit.mp } : unit; }) };
  const battleMembers = 1 + deployedMercs.length;
  const shareXp = Math.floor(result.xpEarned / battleMembers);
  if (result.killsEarned) next = { ...next, hero: grantTerritoryXp(next, next.hero, shareXp), mercs: next.mercs.map((unit) => activeIds.has(unit.uid) ? grantTerritoryXp(next, unit, shareXp) : unit), kills: next.kills + result.killsEarned, logs: deps.addLog(next.logs, `擊敗 ${result.killsEarned} 隻怪物，獲得 ${result.xpEarned} 經驗；${battleMembers} 名出戰角色均分，每人 ${Math.floor(shareXp * (1 + territoryBonus(next.territory, "xp")))} 經驗（含領地加成）。`) };
  if (result.state.status === "recovering" && previous.hero.status !== "客棧中") next = deps.enterInn(next, now, result.state.logs[0], result.state);
  else if (result.state.status === "idle" && previous.hero.status === "客棧中") next = deps.leaveInn(next);
  if (!result.reward) return next;

  const reward = result.reward;
  const sourceEnemy = sourceEnemyForDungeonKey(result.state.key);
  const sourceDrop = sourceEnemy?.drops || [], specialCoinDrop = sourceDrop.includes("[新手]兌換銅錢"), materialDrops = sourceDrop.filter((item) => item !== "[新手]兌換銅錢" && item !== "古錢箱");
  const selectedDrop = materialDrops.length ? materialDrops[Math.min(materialDrops.length - 1, Math.floor(Math.max(0, Math.min(.999999, choice)) * materialDrops.length))] : null;
  const ancientCoinBox = sourceEnemy?.mapId === "starter-outskirts" ? ["古錢箱"] : [];
  const droppedMaterials = [...reward.materials, ...(selectedDrop ? [selectedDrop] : []), ...ancientCoinBox];
  const defeatedNewbieBoss = result.state.key === "e_starter_pirate_king", defeatedLakeBoss = result.state.key === "e_lake_gale_altur", defeatedGoldenStarfish = result.state.key === "e_japan_sea_golden_starfish";
  next = { ...next, gold: next.gold + reward.gold, newbieBossDefeated: next.newbieBossDefeated || defeatedNewbieBoss, lakeBossDefeated: next.lakeBossDefeated || defeatedLakeBoss, goldenStarfishDefeated: next.goldenStarfishDefeated || defeatedGoldenStarfish, newbieCoins: next.newbieCoins + (specialCoinDrop ? 1 : 0), logs: deps.addLog(next.logs, `成功擊敗副本怪物，本場共擊敗 ${result.state.creditedKills || 1} 隻，累計獲得 ${reward.xp} 經驗。`) };
  const fusionCoreDrop = (rolls.fusionCoreRoll ?? roll) < 0.05 ? 1 : 0;
  if (fusionCoreDrop) {
    next = awardFusionCores(next, fusionCoreDrop);
    next = { ...next, logs: deps.addLog(next.logs, "戰利品：獲得融合核心 ×1。") };
  }
  if (specialCoinDrop) next = { ...next, logs: deps.addLog(next.logs, "獲得特殊貨幣【新手兌換銅錢】×1。") };
  if (defeatedNewbieBoss) next = { ...next, logs: deps.addLog(next.logs, "海賊王已被擊敗，千年湖地圖現已開放。") };
  if (defeatedLakeBoss) next = { ...next, logs: deps.addLog(next.logs, "狂風阿魯塔已被擊敗，日本海底洞現已開放。") };
  if (defeatedGoldenStarfish) next = { ...next, logs: deps.addLog(next.logs, "黃金海星已被擊敗，白虎林現已開放。") };
  if (droppedMaterials.length) {
    const materials = { ...next.materials };
    for (const material of droppedMaterials) materials[material] = (materials[material] || 0) + 1;
    next = { ...next, materials, logs: deps.addLog(next.logs, `噴寶：獲得【${droppedMaterials.join("】、【")}】！`) };
  }
  const tierSpec = pickTierEquipmentDrop(sourceEnemy?.mapId, next.hero.level, !!sourceEnemy?.boss, rolls.gearDropRoll ?? 1, rolls.gearChoiceRoll ?? 0);
  if (tierSpec) {
    const tierDrop = makeTierEquipmentDrop(tierSpec, `tier-${tierSpec.id}-${now}-${result.state.serial}`, sourceEnemy?.name || "未知怪物");
    const pickup = addInventoryItem(next.inventory, tierDrop);
    const message = pickup.error ? `背包已滿，無法拾取「${tierDrop.name}」。` : `怪物掉落：獲得「${tierDrop.name}」（Lv.${tierSpec.requiredLevel}）。`;
    next = { ...next, inventory: pickup.inventory, logs: deps.addLog(next.logs, message), dungeon: { ...next.dungeon!, logs: [message, ...next.dungeon!.logs].slice(0, 40) } };
  }
  const spec = reward.loot ? DIVINE_EQUIPMENT[reward.loot as keyof typeof DIVINE_EQUIPMENT] : null;
  if (!spec) return next;
  const drop: Equipment = { uid: `dungeon-${now}-${result.state.serial}`, name: spec.name, slot: spec.slot, bonus: { ...spec.bonus }, def: spec.def, atk: 0, hp: 0, image: "", enhance: 0, rarity: "傳說", magic: [], requiredLevel: 1, source: "幽冥副本掉落" };
  const pickup = addInventoryItem(next.inventory, drop), message = pickup.error ? "背包已滿，本次掉落無法拾取。" : `獲得「${drop.name}」！`;
  return { ...next, inventory: pickup.inventory, logs: deps.addLog(next.logs, message), dungeon: { ...next.dungeon!, logs: [message, ...next.dungeon!.logs].slice(0, 40) } };
}
