import { freshDungeon } from "./dungeon-engine";
import { goToInn, leaveInn, payInn } from "./inn-engine";
import { worldCities } from "./v15-data";
import { recoverVitals, vitalStats } from "./vitals-engine";
import type { GameState } from "./game-state";
import { territoryHealInterval } from "./guild-territory";

export function appendGameLog(logs: string[], message: string) {
  return [message, ...logs].slice(0, 40);
}

export function enemyMaxForStage(stage: number, mapMultiplier = 1) {
  const safeStage = Number.isFinite(stage) ? Math.max(1, Math.floor(stage)) : 1;
  const hp = 250 * Math.pow(1.1, safeStage - 1) * (safeStage % 10 === 0 ? 1.5 : 1) * mapMultiplier;
  return Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(hp)));
}

export function enterGameInnAction(previous: GameState, now: number, message: string, dungeon = previous.dungeon): GameState {
  const vital = vitalStats(previous.hero), session = goToInn({ hp: vital.hp, maxHp: vital.maxHp, status: previous.hero.status }, now, territoryHealInterval(previous.territory));
  const battle = { ...(dungeon || freshDungeon()), status: "recovering" as const, zone: "hanyang" as const, stamp: now, spawnAt: 0, innHealAt: session.nextHealAt, pauseAt: dungeon?.pauseAt || now };
  return { ...previous, city: worldCities.find((city) => city.name === "漢陽")?.id || previous.city, hero: { ...previous.hero, hp: session.player.hp, status: session.player.status }, dungeon: battle, idleStamp: now, logs: appendGameLog(previous.logs, message) };
}

export function leaveGameInnAction(previous: GameState): GameState {
  const vital = vitalStats(previous.hero), player = leaveInn({ hp: vital.hp, maxHp: vital.maxHp, status: previous.hero.status });
  return { ...previous, hero: { ...previous.hero, hp: player.hp, status: player.status }, mercs: previous.mercs.map((unit) => recoverVitals(unit, 1, 1)), dungeon: previous.dungeon ? { ...previous.dungeon, status: "idle", phase: "接敵", distance: 100, innHealAt: 0, spawnAt: 0 } : freshDungeon(), logs: appendGameLog(previous.logs, "生命值已全滿，商隊全員離開漢陽客棧。") };
}

export function payGameInnAction(previous: GameState): GameState {
  const atInn = previous.hero.status === "客棧中" || previous.dungeon?.status === "recovering";
  if (!atInn) return previous;
  const vital = vitalStats(previous.hero), result = payInn({ hp: vital.hp, maxHp: vital.maxHp, status: "客棧中" }, previous.gold);
  if (result.error) return { ...previous, logs: appendGameLog(previous.logs, result.error), dungeon: previous.dungeon ? { ...previous.dungeon, logs: [result.error, ...previous.dungeon.logs].slice(0, 40) } : previous.dungeon };
  return leaveGameInnAction({ ...previous, gold: result.gold, hero: { ...previous.hero, hp: result.player.hp, status: result.player.status }, logs: appendGameLog(previous.logs, "支付 " + result.cost.toLocaleString("zh-TW") + " 兩，客棧已完成快速治療。") });
}
