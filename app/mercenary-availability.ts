/** Temporary playable recruitment catalog. Full specs and art remain archived in-place. */
export const AVAILABLE_MERCENARY_IDS = ['spear'] as const;
export const MERCENARY_CATALOG_NOTICE = '傭兵系統調整中，目前僅開放朝鮮槍兵招募。';
export function isMercenaryAvailable(id: string): boolean {
  return AVAILABLE_MERCENARY_IDS.some(available => available === id);
}
