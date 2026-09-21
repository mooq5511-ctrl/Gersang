export type GameplayContract = {
  id: string;
  name: string;
  category: string;
  description: string;
  metric: "stage" | "kills" | "mercs" | "tier1" | "tier2" | "materials" | "equipment" | "awakened";
  target: number;
  reward: { gold: number; cores?: number; soul?: number; awakening?: number };
};

export const gameplayContracts: GameplayContract[] = [
  { id: "field-10", name: "朝鮮地面巡查", category: "怪物地圖", description: "推進至第 10 關，完成第一輪地面怪物討伐。", metric: "stage", target: 10, reward: { gold: 18000, cores: 1 } },
  { id: "hunt-20", name: "千年湖討伐令", category: "任務", description: "累計擊敗 20 隻怪物。", metric: "kills", target: 20, reward: { gold: 30000, soul: 5 } },
  { id: "roster-8", name: "八人商團", category: "傭兵", description: "商團名冊擁有 8 名傭兵。", metric: "mercs", target: 8, reward: { gold: 24000, cores: 2 } },
  { id: "tier1-2", name: "將帥初成", category: "轉職", description: "培養 2 名一階以上將帥。", metric: "tier1", target: 2, reward: { gold: 36000, soul: 5 } },
  { id: "tier2-2", name: "二階雙將", category: "轉職", description: "培養 2 名二階以上將帥。", metric: "tier2", target: 2, reward: { gold: 60000, cores: 3, soul: 10 } },
  { id: "loot-12", name: "材料收集令", category: "物品", description: "從怪物身上取得 12 件掉落材料。", metric: "materials", target: 12, reward: { gold: 28000, cores: 2 } },
  { id: "gear-6", name: "全副武裝", category: "裝備", description: "背包與全隊合計持有 6 件裝備。", metric: "equipment", target: 6, reward: { gold: 42000, soul: 5 } },
  { id: "awaken-1", name: "覺醒之路", category: "覺醒", description: "完成 1 名二階將帥覺醒。", metric: "awakened", target: 1, reward: { gold: 120000, cores: 5, awakening: 1 } },
];
