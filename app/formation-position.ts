export const BATTLE_POSITIONS = ['前排', '中排', '後排'] as const;
export type BattlePosition = typeof BATTLE_POSITIONS[number];

export type PositionedVital = {
  uid: string;
  name: string;
  hp: number;
  position?: BattlePosition;
};

export const normalizeBattlePosition = (value: unknown, name = '', role = '', hero = false): BattlePosition => {
  if (BATTLE_POSITIONS.includes(value as BattlePosition)) return value as BattlePosition;
  if (hero) return '前排';
  return /弓手|砲手|術士|巫女|郎中|梵僧|遠程|法術|治療|輔助/.test(name + role) ? '後排' : '中排';
};

export const nextBattlePosition = (position: BattlePosition): BattlePosition =>
  BATTLE_POSITIONS[(BATTLE_POSITIONS.indexOf(position) + 1) % BATTLE_POSITIONS.length];

export const positionRank = (position?: BattlePosition) => {
  const index = BATTLE_POSITIONS.indexOf(position || '中排');
  return index < 0 ? 1 : index;
};

/** 敵人只會在目前最前方仍有生還者的排數中輪流選擇目標。 */
export function formationTarget<T extends PositionedVital>(members: T[], cursor = 0): T | undefined {
  const living = members.filter(member => member.hp > 0);
  if (!living.length) return undefined;
  const frontRank = Math.min(...living.map(member => positionRank(member.position)));
  const row = living.filter(member => positionRank(member.position) === frontRank);
  return row[Math.abs(cursor) % row.length];
}

export const formationDamageMultiplier = (position?: BattlePosition) => position === '前排' ? 1.2 : 1;
export const rearDodge = (position: BattlePosition | undefined, roll: number) => position === '後排' && roll < 0.5;
