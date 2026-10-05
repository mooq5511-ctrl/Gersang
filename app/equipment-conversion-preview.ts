/** Offline, non-destructive review only. No storage, inventory, or battle caller imports this. */
import { curveDraftEquipment } from './equipment-curve-draft.ts';
import { effectiveEquipmentStats } from './equipment-stats.ts';
import { DRAFT_QUALITIES, type DraftQuality } from './equipment-economy-draft.ts';
export type LegacyPreviewItem = {
  uid: string; name?: string; slot?: string; atk?: number; def?: number; hp?: number; enhance?: number; rarity?: string;
  magic?: unknown[]; enhanceBonuses?: unknown[]; socketGem?: unknown; skill?: string;
  bonus?: Record<string, number>; resist?: Record<string, number>; [key: string]: unknown;
};
export type EquipmentOccurrence = { location: string; item: LegacyPreviewItem };
export type ConfirmedCoreBinding = { uid: string; definitionId: string; level: number; part: ReturnType<typeof curveDraftEquipment>[number]['part'] };
type ReviewOwner = { uid: string; equip: Record<string, LegacyPreviewItem | null> };
/** Shared warehouse is separate storage and must be supplied explicitly by the caller. */
export function collectEquipmentOccurrences(snapshot: { inventory: LegacyPreviewItem[]; hero: ReviewOwner; mercs: ReviewOwner[]; restingMercs: ReviewOwner[] }, sharedWarehouse: LegacyPreviewItem[] = []) {
  const entries: EquipmentOccurrence[] = snapshot.inventory.map((item, index) => ({ location: `inventory[${index}]`, item }));
  for (const [group, owners] of [['hero', [snapshot.hero]], ['mercs', snapshot.mercs], ['restingMercs', snapshot.restingMercs]] as const) {
    for (const owner of owners) for (const [slot, item] of Object.entries(owner.equip)) if (item) entries.push({ location: `${group}.${owner.uid}.${slot}`, item });
  }
  sharedWarehouse.forEach((item, index) => entries.push({ location: `sharedWarehouse[${index}]`, item }));
  return entries;
}
/** Bindings must be explicitly confirmed; never match by names or reverse-divide legacy quality. */
export function previewEquipmentConversion(occurrences: EquipmentOccurrence[], bindings: ConfirmedCoreBinding[]) {
  const counts = new Map<string, number>();
  for (const entry of occurrences) counts.set(entry.item.uid, (counts.get(entry.item.uid) || 0) + 1);
  return occurrences.map(({ location, item }) => {
    const original = structuredClone(item), matches = bindings.filter(binding => binding.uid === item.uid);
    const retained = (reason: string) => ({ location, uid: item.uid, original, status: 'retained' as const, reason, proposedCore: null });
    if (!item.uid || counts.get(item.uid) !== 1) return retained('Missing or duplicate UID; resolve identity before conversion');
    if (matches.length !== 1) return retained('No unique confirmed definition binding; do not guess from name or UID prefix');
    const binding = matches[0];
    if (typeof binding.definitionId !== 'string' || !binding.definitionId.trim() || !DRAFT_QUALITIES.includes(item.rarity as DraftQuality) || !Number.isInteger(item.enhance) || item.enhance! < 0 || item.enhance! > 15) return retained('Invalid definition, quality, or enhancement');
    if (['atk', 'def', 'hp'].some(stat => !Number.isFinite(item[stat]) || Number(item[stat]) < 0)) return retained('Invalid legacy core values');
    let target;
    try { target = curveDraftEquipment(binding.level, item.rarity as DraftQuality, item.enhance).find(entry => entry.part === binding.part); }
    catch { return retained('Unsupported target level'); }
    if (!target || target.slot !== item.slot) return retained('Target part and original slot mismatch');
    const oldCore = effectiveEquipmentStats(item), proposedCore = { atk: target.atk, def: target.def, hp: target.hp };
    const hasSpecials = !!(item.magic?.length || item.enhanceBonuses?.length || item.socketGem || item.skill ||
      Object.values(item.bonus || {}).some(value => value !== 0) || Object.values(item.resist || {}).some(value => value !== 0));
    return { location, uid: item.uid, original, definitionId: binding.definitionId, targetLevel: binding.level,
      status: hasSpecials ? 'core-preview-only' as const : 'ready-for-core-review' as const,
      reason: hasSpecials ? 'Special effects remain untouched; budgets and compensation require separate review' : 'Core comparison only; explicit acceptance, backup and runtime adapter still required',
      oldCore, proposedCore, delta: { atk: proposedCore.atk - oldCore.atk, def: proposedCore.def - oldCore.def, hp: proposedCore.hp - oldCore.hp },
      retainedEnhance: item.enhance, retainedQuality: item.rarity };
  });
}
