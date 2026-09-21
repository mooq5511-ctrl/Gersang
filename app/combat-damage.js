/** Shared armor mitigation for realtime attacks and boss damage. */
export function resistanceMultiplier(resistance = 0) {
  return 1 - Math.min(85, Math.max(0, Number(resistance) || 0)) / 100;
}

export function mitigatedDamage(attack, defense, variance = 1) {
  const power = Math.max(0, Number(attack) || 0);
  const armor = Math.max(0, Number(defense) || 0);
  return Math.max(1, Math.round(power * (100 / (100 + armor)) * variance));
}
