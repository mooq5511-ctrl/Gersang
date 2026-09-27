import type { GameState } from "./game-state";

export const GUILD_RANK_CAP = 50;
export const GUILD_RANK_TIERS = ["黑鐵", "青銅", "白銀", "黃金", "紫金"] as const;
export type GuildRankTier = typeof GUILD_RANK_TIERS[number];

const STEP_NAMES = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"] as const;

export type GuildRankInfo = { rank: number; tierIndex: number; tier: GuildRankTier; step: number; stepName: string; label: string };

export function safeGuildRank(rank: number | undefined) {
  return Math.max(1, Math.min(GUILD_RANK_CAP, Math.floor(Number(rank) || 1)));
}

export function guildRankInfo(rank: number | undefined): GuildRankInfo {
  const safe = safeGuildRank(rank);
  const tierIndex = Math.floor((safe - 1) / 10);
  const step = ((safe - 1) % 10) + 1;
  const tier = GUILD_RANK_TIERS[tierIndex];
  return { rank: safe, tierIndex, tier, step, stepName: STEP_NAMES[step - 1], label: `${tier}${STEP_NAMES[step - 1]}階` };
}

/** 玩家手動升階的信用值曲線；升滿 49 次約需 2,830 萬信用值。 */
export function guildRankCost(currentRank: number | undefined) {
  const rank = safeGuildRank(currentRank);
  if (rank >= GUILD_RANK_CAP) return 0;
  return Math.max(1_000, Math.round((1_000 * Math.pow(rank, 1.9)) / 100) * 100);
}

/** 依既有階位補發舊存檔應得的技能點；新角色從 0 點開始。 */
export function guildSkillPointsForRank(rank: number | undefined) {
  const safe = safeGuildRank(rank);
  return Math.max(0, safe - 1) + Math.floor((safe - 1) / 10) * 5;
}

export function promoteGuildRankAction(state: GameState, addLog: (logs: string[], message: string) => string[]): GameState {
  const current = safeGuildRank(state.guildRank);
  if (current >= GUILD_RANK_CAP) return { ...state, logs: addLog(state.logs, "商團已達最高階位：紫金十階。") };
  const cost = guildRankCost(current);
  const next = guildRankInfo(current + 1);
  if (state.credit < cost) return { ...state, logs: addLog(state.logs, `信用值不足，升至「${next.label}」需要 ${cost.toLocaleString("zh-TW")} 信用值。`) };
  const tierBonus = next.tierIndex > guildRankInfo(current).tierIndex ? 5 : 0;
  const skillPoints = Math.max(0, Math.floor(Number(state.guildSkillPoints) || 0)) + 1 + tierBonus;
  const rewardText = tierBonus ? `，獲得 ${1 + tierBonus} 點技能點（跨品階額外 +5）` : "，獲得 1 點技能點";
  return { ...state, credit: state.credit - cost, guildRank: current + 1, guildSkillPoints: skillPoints, logs: addLog(state.logs, `商團升階成功：${guildRankInfo(current).label} → ${next.label}，消耗 ${cost.toLocaleString("zh-TW")} 信用值${rewardText}。`) };
}
