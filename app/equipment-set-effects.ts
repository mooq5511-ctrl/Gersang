/** Data-only full-set effects shared by equipment checks and realtime combat. */
import { THUNDER_FORGE_RECIPES } from './mythic-forge.ts';
import { equipmentBaseName } from './equipment-affix-semantics.ts';
import { itemKind } from './equipment-slots.ts';
export const AMATERASU_GAZE={
  setPrefix:'T10 天照',
  requiredPieces:5,
  name:'天照大神的凝視',
  procChance:.03,
  attackMultiplier:10,
  fearDurationMs:5_000,
  fearDefenseReduction:.2,
} as const;

export function hasFullAmaterasuSet(equipment:Record<string,{uid?:string;name?:string;slot?:string;socketGem?:{baseName?:string}}|null|undefined>){
  const names = new Set<string>(), uids = new Set<string>();
  for (const [slot,item] of Object.entries(equipment)) {
    if (!item) continue;
    const name = equipmentBaseName(item);
    const definition = THUNDER_FORGE_RECIPES.find(piece=>piece.set==='amaterasu' && piece.name===name);
    if (!definition || itemKind(slot)!==definition.slot || (item.slot && itemKind(item.slot)!==definition.slot) || (item.uid && uids.has(item.uid))) continue;
    names.add(name);
    if(item.uid)uids.add(item.uid);
  }
  return names.size>=AMATERASU_GAZE.requiredPieces;
}
