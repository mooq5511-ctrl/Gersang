import type { GameState, Hero } from "./game-state";
import { xpForNextLevel } from "./level-progression.ts";
import { newcomerUnlocks } from "./newcomer-unlocks.ts";

export type QuestMetric = "level" | "kills" | "trips" | "relic" | "equipment" | "trained" | "materials" | "newEquipment" | "cargo" | "waystation" | "training" | "banditBoss" | "lakeBoss" | "starfishBoss";
export type QuestCondition = { metric: QuestMetric; target: number; label: string; trainingLevel?: number };
export type AdventureQuest = { id: string; title: string; category: "等級成長" | "戰鬥任務" | "經營任務" | "階段任務" | "每日任務"; chapter: string; minLevel: number; maxLevel: number; description: string; conditions: QuestCondition[]; prerequisites: string[]; destination: "battle" | "squad" | "trade" | "relic"; reward: { gold: number; xp: number; cores: number }; feature?: "trade" | "relic"; daily?: boolean };
export type QuestLedger = { version: 1; claimed: string[]; daily: { day: string; level: number; claimed: string[]; counts: Record<"kills" | "trips" | "relic" | "materials" | "newEquipment", number> } };
export const QUEST_CHAPTER_NAMES = ["漢陽啟程", "商隊立足", "沉沒遺跡", "驛路守望", "第一枚商印", "東海巡商", "隊伍磨合", "古代回聲", "遠行補給", "百級商團", "商路拓展", "護衛精進", "遺跡追獵", "跨海經營", "百五十級試煉", "全隊整備", "危境遠征", "商團中堅", "古王的寶庫", "兩百級大考", "精銳巡商", "深層探索", "四海聲望", "傳承準備", "商團宗師"] as const;
const count = (value: unknown) => Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(value) || 0)));
const emptyCounts = () => ({ kills: 0, trips: 0, relic: 0, materials: 0, newEquipment: 0 });
export const questDay = (now: number) => new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const condition = (metric: QuestMetric, target: number, label: string, trainingLevel?: number): QuestCondition => ({ metric, target, label, trainingLevel });

export const ADVENTURE_QUESTS: readonly AdventureQuest[] = QUEST_CHAPTER_NAMES.flatMap((chapter, index) => {
  const n = index + 1, end = n * 10, start = index * 10 + 1;
  const baseGold = 600 + end * 80, baseXp = Math.max(30, Math.floor(xpForNextLevel(end) * .04));
  const id = (suffix: string) => `journey-${end}-${suffix}`;
  const make = (suffix: string, title: string, category: AdventureQuest["category"], description: string, conditions: QuestCondition[], destination: AdventureQuest["destination"], feature?: "trade" | "relic"): AdventureQuest => ({ id: id(suffix), title, category, chapter, minLevel: start, maxLevel: end, description, conditions, prerequisites: [], destination, feature, reward: { gold: baseGold, xp: baseXp, cores: 0 } });
  const level = make("growth", `${chapter}・抵達 Lv.${end}`, "等級成長", `將主角培養至 ${end} 等，完成本章的角色成長。`, [condition("level", end, "主角等級")], "battle");
  const preparation = make("team", `${chapter}・隊伍整備`, "等級成長", `培養 ${Math.min(8, Math.ceil(n / 3))} 名至少 ${Math.max(1, end - 20)} 等的傭兵，並穿戴全隊裝備。休息中的傭兵也計入。`, [condition("trained", Math.min(8, Math.ceil(n / 3)), "合格傭兵", Math.max(1, end - 20)), condition("equipment", Math.min(21, n + 1), "全隊已穿戴裝備")], "squad");
  const battle = make("hunt", `${chapter}・商路討伐`, "戰鬥任務", "累計討伐怪物，戰鬥成果不因切換地圖或離線而清空。所有實際擊殺均計入。", [condition("kills", 20 * n * n, "累計擊敗怪物")], "battle");
  const trade = make("trade", `${chapter}・巡商成果`, "經營任務", "完成商隊運輸；以實際結算的貿易趟數計算，不要求指定高風險貨物。", [condition("trips", n * 4, "累計完成貿易")], "trade", "trade");
  if (n >= 6) {
    trade.conditions.push(condition("cargo", Math.min(20, n - 4), "商隊貨艙等級"));
    trade.description += "同時擴建貨艙，讓商團經營規模隨等級成長。";
  }
  if (n >= 3) {
    preparation.conditions.push(condition(n % 2 === 0 ? "training" : "waystation", Math.ceil(n / 5), n % 2 === 0 ? "領地訓練場等級" : "領地驛站等級"));
    preparation.description += n % 2 === 0 ? "本章同時整備領地訓練場。" : "本章同時整備領地驛站。";
  }
  const relic = n <= 2
    ? make("relic", `${chapter}・遠征準備`, "戰鬥任務", "先整備出征隊伍，不強迫新手提前挑戰遺跡 Boss。", [condition("equipment", n * 2, "全隊已穿戴裝備")], "squad")
    : make("relic", `${chapter}・遺跡討伐`, "戰鬥任務", "成功擊敗遺跡 Boss，累積討伐成果；失敗與僅領取探索材料不算通關。", [condition("relic", (n - 2) * 2, "累計遺跡通關")], "relic", "relic");
  const milestone = make("chapter", `${chapter}・章末驗收`, "階段任務", `完成本章五項任務並領取其獎勵，取得 Lv.${end} 商團里程碑。這是成長驗收，不會額外封鎖既有地圖。`, [condition("level", end, "主角等級")], "battle");
  milestone.prerequisites = [level.id, preparation.id, battle.id, trade.id, relic.id];
  if (end === 20) milestone.conditions.push(condition("banditBoss", 1, "擊敗山賊首領"));
  if (end === 50) milestone.conditions.push(condition("lakeBoss", 1, "擊敗狂風阿魯塔"));
  if (end === 100) milestone.conditions.push(condition("starfishBoss", 1, "擊敗黃金海星"));
  milestone.reward = { gold: baseGold * 3, xp: baseXp * 3, cores: end % 50 === 0 ? end / 50 : 0 };
  return [level, preparation, battle, trade, relic, milestone];
});
const permanentIds = new Set(ADVENTURE_QUESTS.map(quest => quest.id));
const dailyIds = new Set(["daily-hunt", "daily-trade", "daily-relic", "daily-materials", "daily-equipment"]);
export function dailyQuests(level: number): AdventureQuest[] {
  const band = Math.min(25, Math.max(1, Math.ceil(level / 10))), end = band * 10;
  const definitions = [
    { id: "daily-hunt", title: "今日・驛路清剿", metric: "kills" as const, target: 10 + band * 2, label: "今日擊敗怪物", destination: "battle" as const },
    { id: "daily-trade", title: "今日・商隊運輸", metric: "trips" as const, target: 2, label: "今日完成貿易", destination: "trade" as const, feature: "trade" as const },
    { id: "daily-relic", title: "今日・遺跡討伐", metric: "relic" as const, target: 1, label: "今日遺跡通關", destination: "relic" as const, feature: "relic" as const },
    { id: "daily-materials", title: "今日・補給收集", metric: "materials" as const, target: 5 + band, label: "今日新增材料", destination: "battle" as const },
    { id: "daily-equipment", title: "今日・裝備入庫", metric: "newEquipment" as const, target: 1, label: "今日新取得裝備", destination: "battle" as const },
  ];
  return definitions.map(item => ({ ...item, category: "每日任務", chapter: "每日巡商", minLevel: 10, maxLevel: 250, daily: true, description: item.id === "daily-materials" ? "計入背包材料的新增數量，包含戰利品與購買；消耗不扣回已記錄的當日進度。" : item.id === "daily-equipment" ? "取得一件裝備。單純在背包與角色間換裝不計入；倉庫領回的裝備視為今日入庫。" : "今日完成指定活動。每日 00:00（台灣時間）刷新；未領獎勵不保留，不阻擋主線。", conditions: [condition(item.metric, item.target, item.label)], prerequisites: [], reward: { gold: 500 + end * 30, xp: Math.max(20, Math.floor(xpForNextLevel(end) * .01)), cores: 0 } }));
}
export function normalizeQuestLedger(value: unknown, now: number, level = 1): QuestLedger {
  const source = value && typeof value === "object" ? value as Partial<QuestLedger> : {};
  const daily = source.daily;
  const today = questDay(now);
  // Keep the latest observed day: moving the local clock backward cannot reset claims.
  const sameDay = !!daily && /^\d{4}-\d{2}-\d{2}$/.test(daily.day) && daily.day >= today;
  const validIds = (values: unknown, allowed: Set<string>) => Array.isArray(values) ? [...new Set(values.filter((id): id is string => typeof id === "string" && allowed.has(id)))] : [];
  return { version: 1, claimed: validIds(source.claimed, permanentIds), daily: { day: sameDay ? daily!.day : today, level: Math.max(1, Math.min(250, count(sameDay ? daily!.level : level) || 1)), claimed: sameDay ? validIds(daily!.claimed, dailyIds) : [], counts: sameDay ? Object.fromEntries(Object.keys(emptyCounts()).map(key => [key, count(daily!.counts?.[key as keyof QuestLedger["daily"]["counts"]])])) as QuestLedger["daily"]["counts"] : emptyCounts() } };
}
export function questValue(game: GameState, condition: QuestCondition, ledger: QuestLedger, daily = false): number {
  if (daily) return ledger.daily.counts[condition.metric as keyof QuestLedger["daily"]["counts"]] || 0;
  if (condition.metric === "level") return count(game.hero.level);
  if (condition.metric === "kills") return count(game.kills);
  if (condition.metric === "trips") return count(game.trade.trips);
  if (condition.metric === "relic") return count(game.relicDungeon?.clearedRuns);
  if (condition.metric === "cargo") return count(game.trade.cargoLevel);
  if (condition.metric === "waystation" || condition.metric === "training") return count(game.territory.buildings[condition.metric]);
  if (condition.metric === "banditBoss") return game.newbieBossDefeated ? 1 : 0;
  if (condition.metric === "lakeBoss") return game.lakeBossDefeated ? 1 : 0;
  if (condition.metric === "starfishBoss") return game.goldenStarfishDefeated ? 1 : 0;
  if (condition.metric === "trained") return [...game.mercs, ...game.restingMercs].filter(unit => unit.level >= (condition.trainingLevel || 1)).length;
  if (condition.metric === "equipment") return [game.hero, ...game.mercs, ...game.restingMercs].reduce((sum, unit) => sum + Object.values(unit.equip).filter(Boolean).length, 0);
  return 0;
}
export function questAvailability(game: GameState, quest: AdventureQuest, ledger: QuestLedger) {
  const claimed = (quest.daily ? ledger.daily.claimed : ledger.claimed).includes(quest.id);
  const feature = !quest.feature || newcomerUnlocks(game)[quest.feature];
  const unlocked = game.hanyangPrologueStep === "completed" && game.hero.level >= quest.minLevel && feature && quest.prerequisites.every(id => ledger.claimed.includes(id));
  const ready = unlocked && quest.conditions.every(item => questValue(game, item, ledger, quest.daily) >= item.target);
  return { claimed, unlocked, ready };
}
const equipmentIds = (game: GameState) => new Set([...game.inventory, ...[game.hero, ...game.mercs, ...game.restingMercs].flatMap(unit => Object.values(unit.equip).filter(Boolean))].map(item => item!.uid));
export function syncQuestProgress(previous: GameState, next: GameState, now: number): GameState {
  const currentLedger = previous.questLedger;
  // Realtime combat ticks every 50 ms; unchanged quest inputs need no catalog work.
  const unchangedRoster = (before: GameState["mercs"], after: GameState["mercs"]) => before === after || (before.length === after.length && before.every((unit, index) => unit.uid === after[index].uid && unit.equip === after[index].equip));
  if (currentLedger && next.questLedger === currentLedger && currentLedger.daily.day >= questDay(now) && previous.kills === next.kills && previous.trade.trips === next.trade.trips && previous.relicDungeon?.clearedRuns === next.relicDungeon?.clearedRuns && previous.materials === next.materials && previous.inventory === next.inventory && previous.hero.equip === next.hero.equip && unchangedRoster(previous.mercs, next.mercs) && unchangedRoster(previous.restingMercs, next.restingMercs)) return next;
  const ledger = normalizeQuestLedger(next.questLedger ?? previous.questLedger, now, next.hero.level);
  const old = normalizeQuestLedger(previous.questLedger, now, previous.hero.level);
  const crossingDay = previous.questLedger?.daily.day !== ledger.daily.day;
  const counts = { ...ledger.daily.counts };
  // Conservative across midnight/offline intervals: no un-timestamped past rewards count today.
  if (previous.questLedger && !crossingDay) {
    counts.kills += Math.max(0, count(next.kills) - count(previous.kills));
    counts.trips += Math.max(0, count(next.trade.trips) - count(previous.trade.trips));
    counts.relic += Math.max(0, count(next.relicDungeon?.clearedRuns) - count(previous.relicDungeon?.clearedRuns));
    counts.materials += Object.entries(next.materials).reduce((sum, [key, amount]) => sum + Math.max(0, count(amount) - count(previous.materials[key])), 0);
    const owned = equipmentIds(previous);
    counts.newEquipment += [...equipmentIds(next)].filter(id => !owned.has(id)).length;
  }
  const caps = Object.fromEntries(dailyQuests(ledger.daily.level).map(quest => [quest.conditions[0].metric, quest.conditions[0].target]));
  for (const key of Object.keys(counts) as Array<keyof typeof counts>) counts[key] = Math.min(count(counts[key]), caps[key]);
  const updated = { ...ledger, daily: { ...ledger.daily, counts } };
  if (next === previous && previous.questLedger && !crossingDay && JSON.stringify(updated) === JSON.stringify(old)) return previous;
  return { ...next, questLedger: updated };
}
export function claimAdventureQuest(game: GameState, id: string, now: number, grantXp: (hero: Hero, amount: number) => Hero): GameState {
  const ledger = normalizeQuestLedger(game.questLedger, now, game.hero.level);
  const quest = [...ADVENTURE_QUESTS, ...dailyQuests(ledger.daily.level)].find(item => item.id === id);
  if (!quest || !questAvailability(game, quest, ledger).ready || questAvailability(game, quest, ledger).claimed) return game;
  const nextLedger = quest.daily ? { ...ledger, daily: { ...ledger.daily, claimed: [...ledger.daily.claimed, quest.id] } } : { ...ledger, claimed: [...ledger.claimed, quest.id] };
  return { ...game, gold: game.gold + quest.reward.gold, hero: grantXp(game.hero, quest.reward.xp), fusionCores: game.fusionCores + quest.reward.cores, questLedger: nextLedger, logs: [`任務完成「${quest.title}」：${quest.reward.gold} 兩・${quest.reward.xp} 經驗${quest.reward.cores ? `・合成核心 ×${quest.reward.cores}` : ""}。`, ...game.logs].slice(0, 80) };
}
