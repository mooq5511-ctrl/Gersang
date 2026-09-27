import type { GameState } from "./game-state";

export const GUILD_SKILL_MAX = 10;
export const GUILD_SKILL_IDS = ["tradeProsperity", "battleSpoils", "expeditionWisdom", "mercenaryTraining", "heroLegacy", "specialContracts"] as const;
export type GuildSkillId = typeof GUILD_SKILL_IDS[number];
export type GuildSkills = Record<GuildSkillId, number>;

export type GuildSkillDefinition = {
  id: GuildSkillId;
  name: string;
  icon: string;
  image: string;
  description: string;
  effect: (level: number) => string;
  unlockRank: number;
  requires?: { id: GuildSkillId; level: number };
  costs: readonly number[];
};

const COSTS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] as const;

export const GUILD_SKILLS: readonly GuildSkillDefinition[] = [
  { id: "tradeProsperity", name: "貿易繁榮", icon: "◈", image: "/assets/skills/guild-trade-prosperity.png", description: "拓展商路與議價網絡，提升每趟貿易完成時的銀兩收益。", effect: level => `貿易收益 +${level * 3}%`, unlockRank: 1, costs: COSTS },
  { id: "battleSpoils", name: "戰利豐收", icon: "✦", image: "/assets/skills/guild-battle-spoils.png", description: "改善戰後清點與運輸，增加怪物與副本戰利品的獲取率。", effect: level => `戰利品加成 +${level * 3}%`, unlockRank: 1, requires: { id: "tradeProsperity", level: 1 }, costs: COSTS },
  { id: "expeditionWisdom", name: "遠征學識", icon: "✧", image: "/assets/skills/guild-expedition-wisdom.png", description: "整理戰報與傳承經驗，讓主角與傭兵更快累積戰鬥經驗。", effect: level => `經驗收益 +${level * 3}%`, unlockRank: 10, costs: COSTS },
  { id: "mercenaryTraining", name: "傭兵訓練", icon: "♜", image: "/assets/skills/guild-mercenary-training.png", description: "建立商團訓練制度，提升所有傭兵的基礎能力。", effect: level => `傭兵全能力 +${level * 2}%`, unlockRank: 10, requires: { id: "expeditionWisdom", level: 1 }, costs: COSTS },
  { id: "heroLegacy", name: "主角傳承", icon: "♛", image: "/assets/skills/guild-hero-legacy.png", description: "以商團資源培養領袖，提升主角的基礎能力。", effect: level => `主角全能力 +${level * 2}%`, unlockRank: 20, costs: COSTS },
  { id: "specialContracts", name: "特殊傭兵契約", icon: "❖", image: "/assets/skills/guild-special-contracts.png", description: "與特殊傭兵勢力建立長期契約，逐步解鎖未來可招募的稀有傭兵。", effect: level => `解鎖特殊傭兵名額 ${level} 格`, unlockRank: 30, requires: { id: "mercenaryTraining", level: 5 }, costs: COSTS },
] as const;

export const freshGuildSkills = (): GuildSkills => ({ tradeProsperity: 0, battleSpoils: 0, expeditionWisdom: 0, mercenaryTraining: 0, heroLegacy: 0, specialContracts: 0 });

export function normalizeGuildSkills(raw: unknown): GuildSkills {
  const source = raw && typeof raw === "object" ? raw as Partial<Record<GuildSkillId, unknown>> : {};
  return Object.fromEntries(GUILD_SKILL_IDS.map(id => [id, Math.max(0, Math.min(GUILD_SKILL_MAX, Math.floor(Number(source[id]) || 0))) ])) as GuildSkills;
}

export function guildSkillDefinition(id: GuildSkillId) {
  return GUILD_SKILLS.find(skill => skill.id === id) || GUILD_SKILLS[0];
}

export function guildSkillPrerequisiteMet(id: GuildSkillId, skills: GuildSkills | undefined) {
  const requirement = guildSkillDefinition(id).requires;
  if (!requirement) return true;
  return normalizeGuildSkills(skills)[requirement.id] >= requirement.level;
}

export function guildSkillCost(id: GuildSkillId, level: number) {
  const safeLevel = Math.max(0, Math.min(GUILD_SKILL_MAX, Math.floor(Number(level) || 0)));
  return safeLevel >= GUILD_SKILL_MAX ? 0 : guildSkillDefinition(id).costs[safeLevel];
}

export function guildSkillTradeBonuses(skills: GuildSkills | undefined) {
  const normalized = normalizeGuildSkills(skills);
  return {
    revenueBonus: normalized.tradeProsperity * 0.03,
    lootBonus: normalized.battleSpoils * 0.03,
    xpBonus: normalized.expeditionWisdom * 0.03,
    mercenaryPowerBonus: normalized.mercenaryTraining * 0.02,
    heroPowerBonus: normalized.heroLegacy * 0.02,
    specialMercenarySlots: normalized.specialContracts,
  };
}

export function upgradeGuildSkillAction(state: GameState, id: GuildSkillId, addLog: (logs: string[], message: string) => string[]): GameState {
  const skills = normalizeGuildSkills(state.guildSkills);
  const definition = guildSkillDefinition(id);
  const level = skills[id];
  if (level >= GUILD_SKILL_MAX) return { ...state, logs: addLog(state.logs, `「${definition.name}」已達最高 10 級。`) };
  const rank = Math.max(1, Math.floor(Number(state.guildRank) || 1));
  if (rank < definition.unlockRank) return { ...state, logs: addLog(state.logs, `商團階位不足，「${definition.name}」需要商團第 ${definition.unlockRank} 階。`) };
  if (!guildSkillPrerequisiteMet(id, skills)) {
    const requirement = definition.requires!;
    return { ...state, logs: addLog(state.logs, `前置技能不足，「${definition.name}」需要「${guildSkillDefinition(requirement.id).name}」達到 Lv.${requirement.level}。`) };
  }
  const points = Math.max(0, Math.floor(Number(state.guildSkillPoints) || 0));
  if (points < 1) return { ...state, logs: addLog(state.logs, `技能點不足，提升「${definition.name}」需要 1 點技能點。`) };
  const nextSkills = { ...skills, [id]: level + 1 };
  return { ...state, guildSkillPoints: points - 1, guildSkills: nextSkills, logs: addLog(state.logs, `商團技能「${definition.name}」提升至 Lv.${level + 1}，消耗 1 點技能點。`) };
}
