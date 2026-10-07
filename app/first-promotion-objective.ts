import type {GameState} from './game-state';
import {promotionRank, usesPromotionV1} from './mercenary-growth-v1';
import {sealCount, sealForStage} from './war-seals';

/** Guidance only: no quest completion, rewards, promotion or roster changes. */
export function getFirstPromotionObjective(game: Pick<GameState, 'mercs' | 'restingMercs' | 'materials'>) {
  const units = [...game.mercs, ...game.restingMercs].filter(usesPromotionV1);
  if (!units.length || units.some(unit => promotionRank(unit) >= 2)) return null;
  const level = Math.max(...units.map(unit => unit.level));
  if (level < 12) return {
    title: '首次轉職整備・傭兵達到 Lv.12',
    detail: `目前最高傭兵 Lv.${level} / 12。先讓要培養的傭兵上陣，穿戴可用裝備，在新手村郊外挑戰斷道刀客、累積二階兵符；檢查生命與自動補給，不必因等級提高就急著換打高血量怪。遺跡探索可累積材料，不必現在討伐首領。`,
    tab: 'battle' as const,
    mapId: 'starter-outskirts',
    monsterName: '斷道刀客',
  };
  const spear = sealForStage(2, 'spear')!, bow = sealForStage(2, 'bow')!;
  const spearCount = sealCount(game.materials[spear.name]), bowCount = sealCount(game.materials[bow.name]);
  if (!spearCount && !bowCount) return {
    title: '首次轉職整備・取得二階兵符',
    detail: `傭兵已達 Lv.12。${spear.name} ${spearCount} 枚、${bow.name} ${bowCount} 枚；新手村郊外普通怪勝利有機會掉落完整兵符。槍／弓各為1.5%，不是保證掉落；黑巾斥候掉的是精銳兵符，不能用於二階轉職。`,
    tab: 'battle' as const,
    mapId: 'starter-outskirts',
    monsterName: '斷道刀客',
  };
  return {
    title: '選擇第一次轉職・槍兵或弓兵',
    detail: `${spear.name} ${spearCount} 枚、${bow.name} ${bowCount} 枚。前往隊伍選擇 Lv.12 傭兵，查看兩條路線並使用對應完整兵符轉職；每次成功消耗1枚。戰鬥或派遣中的傭兵須先結束任務。`,
    tab: 'squad' as const,
    window: undefined,
  };
}
