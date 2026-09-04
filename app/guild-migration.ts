import { mercenarySpec } from './mercenary-roster.ts';
type Item = { uid: string };
type Member<E extends Item> = { uid: string; templateId: string; equip: Record<string, E | null> };
/** Keep recognized guild templates, returning retired members' gear exactly once. */
export function retainGuildRoster<E extends Item, M extends Member<E>, S extends { mercs: M[]; active: string[]; inventory: E[]; hero: { equip: Record<string, E | null> }; logs: string[] }>(state: S): S {
  const retained = state.mercs.filter(unit => !!mercenarySpec(unit.templateId));
  const retired = state.mercs.filter(unit => !mercenarySpec(unit.templateId));
  const validIds = new Set(retained.map(unit => unit.uid));
  const active = [...new Set(state.active)].filter(id => validIds.has(id)).slice(0,9);
  const inventory = [...state.inventory];
  const occupied = new Set([...inventory, ...Object.values(state.hero.equip), ...retained.flatMap(unit => Object.values(unit.equip))].filter((item): item is E => !!item).map(item => item.uid));
  let returned = 0;
  for (const unit of retired) for (const item of Object.values(unit.equip)) {
    if (!item || occupied.has(item.uid)) continue;
    inventory.push(item); occupied.add(item.uid); returned++;
  }
  return { ...state, mercs: retained, active, inventory, logs: retired.length ? ['中央傭兵公會整編：移除 '+retired.length+' 名舊傭兵，退回 '+returned+' 件裝備至背包。', ...state.logs].slice(0,40) : state.logs };
}
/** Preserve the first pre-removal slot, and abort entry if storage cannot back it up. */
export function backupBeforeGuildMigration(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, raw: string) {
  const saved = JSON.parse(raw);
  const removesMembers = Array.isArray(saved.mercs) && saved.mercs.some((unit: { templateId?: string }) => !mercenarySpec(unit.templateId));
  if (removesMembers && storage.getItem(key+':before-guild-only') === null) storage.setItem(key+':before-guild-only',raw);
}
