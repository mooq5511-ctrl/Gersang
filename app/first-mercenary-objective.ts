export function getFirstMercenaryObjective({
  level,
  mercenaryCount,
  gold,
  recruitmentCost,
}: {
  level: number;
  mercenaryCount: number;
  gold: number;
  recruitmentCost: number;
}) {
  if (level >= 20 || mercenaryCount > 0 || gold < recruitmentCost) return null;

  return {
    title: "招募第一位傭兵",
    detail: `資金 ${Math.floor(gold).toLocaleString("zh-TW")} / ${recruitmentCost.toLocaleString("zh-TW")} 兩；前往中央傭兵公會，為商隊增加前線火力與承傷。`,
    tab: "city" as const,
    service: "mercenary" as const,
  };
}
