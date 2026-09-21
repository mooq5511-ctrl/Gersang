type StarterWeaponState = {
  hero: {
    level: number;
    equip: { weapon?: unknown | null };
  };
  inventory: Array<{
    name: string;
    source?: string;
    slot?: string;
    requiredLevel?: number;
  }>;
};

export function getStarterWeaponObjective(game: StarterWeaponState) {
  const starterSword = game.inventory.find(
    (item) =>
      item.name === "商路短劍" &&
      item.source === "第一份商隊委託" &&
      item.slot === "weapon" &&
      (item.requiredLevel || 1) <= game.hero.level,
  );

  if (game.hero.equip.weapon || !starterSword) return null;

  return {
    title: "裝備商路短劍",
    detail: "打開主角背包，穿上村長贈送的白裝短劍，提升攻擊力後再繼續狩獵。",
    tab: "squad" as const,
    window: "inventory" as const,
  };
}
