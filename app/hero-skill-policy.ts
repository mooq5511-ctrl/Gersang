/** Generic hero skill grows with the hero, not a flat beginner damage grant.
 * Party intelligence supports up to 75% of hero attack; it cannot replace personal growth.
 */
export function heroSkillPower(attack:number,partyIntelligence:number) {
  if(!Number.isFinite(attack)||!Number.isFinite(partyIntelligence)||attack<0||partyIntelligence<0)throw new RangeError('Invalid hero skill inputs');
  return Math.max(1,Math.floor(attack*2.5+Math.min(attack*.75,partyIntelligence*2)));
}
