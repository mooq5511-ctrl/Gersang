import type { GameState, Unit } from './game-state';
import { promotionRank, usesPromotionV1 } from './mercenary-growth-v1';

/** Read-only early-game guidance. Never a travel, battle, or purchase gate. */
export function worldHuntPreparation(mapId: string, hero: GameState['hero'], activeUnits: readonly Unit[], supplies?: Pick<GameState, 'medicines' | 'autoPotion'>) {
  if (mapId !== 'starter-outskirts') return null;
  const party = [hero, ...activeUnits];
  const points = party.reduce((sum, unit) => sum + Math.max(0, Number(unit.points) || 0), 0);
  const missingCore = party.filter(unit => !unit.equip?.weapon || !unit.equip?.armor).length;
  const awaitingPromotion = activeUnits.some(unit => usesPromotionV1(unit) && promotionRank(unit) < 2);
  const facts = [`目前${party.length}人出戰`];
  if (points) facts.push(`有${points}點能力尚未分配`);
  if (missingCore) facts.push(`${missingCore}人尚未同時裝上武器與防具`);
  if (supplies) facts.push(`金創藥${Math.max(0, Number(supplies.medicines?.healing) || 0)}枚，自動補給${supplies.autoPotion?.enabled ? '已開啟' : '未開啟'}`);
  const progression = awaitingPromotion
    ? '可先在斷道刀客培養傭兵至Lv.12並取得二階兵符，再選擇槍／弓轉職。'
    : '進階敵人仍需配裝與補給；已轉職不代表能穩定掛機。';
  return {
    title: '掛機整備・等級不是唯一條件',
    detail: `${facts.join('；')}。${progression}斷帆掠匪等進階敵人補給壓力較高；反覆敗退時可回入門怪累積資金，檢查隊伍、能力與自動補給，不必隨等級立刻換怪。`,
  };
}
