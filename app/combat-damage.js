/** Shared armor mitigation for realtime attacks and boss damage. */
export function mitigatedDamage(attack, defense, variance = 1) {
  const power = Math.max(0, Number(attack) || 0);
  const armor = Math.max(0, Number(defense) || 0);
  return Math.max(1, Math.round(power * (100 / (100 + armor)) * variance));
}
