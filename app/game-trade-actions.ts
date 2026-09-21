import { dungeonBusy } from "./dungeon-engine";
import { dispatchTrade, MAX_CARGO_LEVEL, TRADE_ROUTES, upgradeCost } from "./trade-engine";
import type { GameState } from "./game-state";
import { bandit, isBanditEncounter } from "./bandit";
import { formations } from "./game-data";
import { mercenarySpec } from "./mercenary-roster";
import { resolveMercenaryBattle, type TacticalEnemy } from "./mercenary-battle";
import { battleMaps } from "./reference-data";
import { enemyForStage } from "./v15-data";
import { sourceEnemyForMap } from "./v17-content";
import { formationDamageMultiplier } from "./formation-position";
import { addInventoryItem } from "./inventory-layout";
import { combatStats, enemyCombatStats, resolveVitalBattle, spellCost, vitalStats } from "./vitals-engine";
import type { Hero, Unit } from "./game-state";

export function dispatchTradeAction(state: GameState, routeId: string, now: number, addLog: (logs: string[], message: string) => string[]) {
  if (dungeonBusy(state.dungeon)) return { ...state, logs: addLog(state.logs, "請先結束副本並完成療傷。") };
  const result = dispatchTrade(state.trade, state.gold, routeId, Math.max(state.stage, state.hero.level), state.active.length, now);
  if (result.error) return { ...state, logs: addLog(state.logs, result.error) };
  const route = TRADE_ROUTES.find((item) => item.id === routeId)!;
  return { ...state, gold: result.gold, trade: result.trade, logs: addLog(state.logs, route.from + " → " + route.to + "：商隊裝載「" + route.good + "」啟航。") };
}

export function upgradeCaravanAction(state: GameState, addLog: (logs: string[], message: string) => string[]) {
  const cost = upgradeCost(state.trade.cargoLevel);
  if (state.trade.caravan || state.trade.cargoLevel >= MAX_CARGO_LEVEL || state.gold < cost) return state;
  return { ...state, gold: state.gold - cost, trade: { ...state.trade, cargoLevel: state.trade.cargoLevel + 1 }, logs: addLog(state.logs, "貨艙升級成功，增加 5 箱載貨量。") };
}

type RoadEncounterDependencies = {
  addLog: (logs: string[], message: string) => string[];
  enterInn: (state: GameState, now: number, message: string) => GameState;
  grantXp: <T extends Unit | Hero>(unit: T, amount: number) => T;
  rollEquipment: (stage: number, guaranteed?: boolean) => GameState["inventory"][number];
  enemyMax: (stage: number, mapMultiplier?: number) => number;
  format: (value: number) => string;
};

/** Resolves a completed caravan leg, including the encounter, rewards and party damage. */
export function resolveRoadEncounterAction(previous: GameState, deps: RoadEncounterDependencies): GameState {
  const active = previous.active.map((unitUid) => previous.mercs.find((unit) => unit.uid === unitUid)).filter(Boolean) as Unit[];
  const form = formations.find((item) => item.id === previous.formation) || formations[0];
  const banditEncounter = isBanditEncounter(previous.battleMap, previous.stage);
  const sourceTarget = banditEncounter ? bandit : sourceEnemyForMap(previous.battleMap, previous.stage, previous.stage % 10 === 0, previous.selectedMonster);
  const map = battleMaps.find((entry) => entry.id === previous.battleMap) || battleMaps[0];
  const health = banditEncounter ? bandit.hp : sourceTarget?.hp || deps.enemyMax(previous.stage, map.hpMultiplier);
  const party = [previous.hero, ...active].map((unit) => ({ uid: unit.uid, templateId: unit.templateId, name: unit.name, skill: unit.skill, position: unit.position, ...vitalStats(unit), ...combatStats(unit), attack: Math.floor(combatStats(unit).attack * form.atk * formationDamageMultiplier(unit.position)), cost: spellCost(unit) }));
  const targetName = sourceTarget?.name || enemyForStage(previous.stage, map.enemyRegion).name;
  const tactical = active.some((unit) => !!mercenarySpec(unit.templateId));
  const enemy: TacticalEnemy = { name: targetName, hp: health, ...(banditEncounter ? { attack: bandit.attack, defense: bandit.defense, speed: tactical ? bandit.speed * 5 : bandit.speed } : { ...enemyCombatStats(previous.stage, health, previous.stage % 10 === 0), ...(sourceTarget?.attack ? { attack: sourceTarget.attack } : {}) }), physicalResistance: sourceTarget?.physicalResistance || 0, magicResistance: sourceTarget?.magicResistance || 0, bandit: banditEncounter, boss: previous.stage % 10 === 0, kind: /騎/.test(targetName) ? "cavalry" : /虎|狼|熊|鹿|獸|龜|蛇|狐|馬/.test(targetName) ? "beast" : "human", ranged: /弓|砲|術|巫|法/.test(targetName), magicAttack: /術|巫|法/.test(targetName), poison: /蛇|蠍/.test(targetName) };
  const squad = enemy.boss ? [enemy] : Array.from({ length: 3 }, (_, index) => ({ ...enemy, name: targetName + "・" + (index + 1), hp: Math.floor(health / 3) + (index < health % 3 ? 1 : 0), attack: Math.max(1, Math.floor(enemy.attack * .55)), back: index === 2, ranged: index === 2 || enemy.ranged }));
  const combat = tactical ? resolveMercenaryBattle(party, squad, banditEncounter ? "mountain" : map.theme) : resolveVitalBattle(party.map((unit) => ({ ...unit, speed: 5 })), { ...enemy, terrain: banditEncounter ? "mountain" : map.theme });
  const remaining = new globalThis.Map(combat.fighters.map((unit) => [unit.uid, unit]));
  const applyRemaining = <T extends Unit | Hero,>(unit: T): T => { const fighter = remaining.get(unit.uid); return fighter ? { ...unit, hp: fighter.hp, mp: fighter.mp } : unit; };
  previous = { ...previous, hero: applyRemaining(previous.hero), mercs: previous.mercs.map(applyRemaining) };
  const resourceReport = " 主動技能 " + combat.casts + " 次，消耗 MP " + combat.spentMp + "；普攻 " + combat.attacks + " 次，承受傷害 " + combat.receivedDamage + "。" + (tactical ? " 敵軍 " + squad.length + " 名；落空 " + combat.misses + " 次。" + combat.spells.slice(0, 10).join("；") : "") + (combat.enemySkills.length ? " " + combat.enemySkills.join(" ") : "");
  if (!combat.won) {
    const report = "途中遭遇世界地圖敵軍「" + (sourceTarget?.name || "敵軍") + "」，" + combat.rounds + " 回合後撤離。" + resourceReport + " 請到客棧或藥店恢復 HP / MP。";
    return deps.enterInn({ ...previous, enemyHp: health, lastEncounter: report, logs: deps.addLog(previous.logs, report) }, Date.now(), "戰鬥失敗，商隊已自動返回漢陽客棧。");
  }
  const isBoss = previous.stage % 10 === 0, selectedMap = battleMaps.find((entry) => entry.id === previous.battleMap) || battleMaps[0];
  const reward = Math.floor((260 + previous.stage * 60) * (isBoss ? 9 : 1) * selectedMap.goldMultiplier), nextStage = previous.stage + 1, nextKills = previous.kills + 1;
  const report = "途中遭遇「" + (sourceTarget ? selectedMap.name : enemyForStage(previous.stage, selectedMap.enemyRegion).region) + "・" + (sourceTarget?.name || enemyForStage(previous.stage, selectedMap.enemyRegion).name) + "」，" + combat.rounds + " 回合獲勝，獲得 " + deps.format(reward) + " 兩。" + resourceReport;
  let inventory = previous.inventory, logs = deps.addLog(previous.logs, report);
  let xpReward = isBoss ? 180 : 42;
  const materials = { ...previous.materials };
  if (combat.spells.length) logs = deps.addLog(logs, combat.spells.join("；"));
  if (sourceTarget) {
    const drops = sourceTarget.drops.filter((item) => item !== "古錢箱");
    let dropMessage = sourceTarget.name + "沒有一般材料掉落；";
    if (drops.length) {
      const material = drops[Math.floor(Math.random() * drops.length)];
      materials[material] = (materials[material] || 0) + 1;
      dropMessage = (banditEncounter ? "山賊掉落「" : "52怪物掉落「") + material + "」；";
    }
    if ('mapId' in sourceTarget && sourceTarget.mapId === "starter-outskirts") materials["古錢箱"] = (materials["古錢箱"] || 0) + 1;
    xpReward = sourceTarget.xp;
    logs = deps.addLog(logs, dropMessage + "經驗資料 " + deps.format(sourceTarget.xp) + "。");
  }
  if (nextKills % 4 === 0 || isBoss) { const drop = deps.rollEquipment(previous.stage, isBoss), pickup = addInventoryItem(inventory, drop); inventory = pickup.inventory; logs = deps.addLog(logs, pickup.error ? "背包已滿，本次戰利品無法拾取。" : "獲得 " + drop.rarity + "裝備「" + drop.name + "」，附帶 " + drop.magic.length + " 條魔法屬性。"); }
  const members = 1 + active.length, shareXp = Math.floor(xpReward / Math.max(1, members));
  logs = deps.addLog(logs, "怪物經驗 " + deps.format(xpReward) + " 由 " + members + " 名出戰角色均分，每人獲得 " + deps.format(shareXp) + " 經驗。");
  return { ...previous, gold: previous.gold + reward, stage: nextStage, kills: nextKills, lastEncounter: report, enemyHp: deps.enemyMax(nextStage, selectedMap.hpMultiplier), inventory, materials, hero: deps.grantXp(previous.hero, shareXp), mercs: previous.mercs.map((unit) => active.some((member) => member.uid === unit.uid) ? deps.grantXp(unit, shareXp) : unit), logs };
}
