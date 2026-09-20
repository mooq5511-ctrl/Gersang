/** Data-only full-set effects shared by equipment checks and realtime combat. */
export const AMATERASU_GAZE={
  setPrefix:'T10 天照',
  requiredPieces:5,
  name:'天照大神的凝視',
  procChance:.03,
  attackMultiplier:10,
  fearDurationMs:5_000,
  fearDefenseReduction:.2,
} as const;

export function hasFullAmaterasuSet(equipment:Record<string,{name?:string}|null|undefined>){
  return Object.values(equipment).filter(item=>item?.name?.startsWith(AMATERASU_GAZE.setPrefix)).length>=AMATERASU_GAZE.requiredPieces;
}
