/** Offline support policy for equipment-scale HP; not connected to the live inn. */
export function draftRecoveryQuote(maxHp: number, currentHp: number, healIntervalMs: number, healingMedicinePrice: number) {
  if (!Number.isSafeInteger(maxHp) || maxHp < 1 || !Number.isSafeInteger(currentHp) || currentHp < 0 || currentHp > maxHp ||
      !Number.isSafeInteger(healIntervalMs) || healIntervalMs < 1 || !Number.isSafeInteger(healingMedicinePrice) || healingMedicinePrice < 1) throw new RangeError('Invalid recovery inputs');
  // Retain ten-point early healing; cap full-health waiting at fifty ticks thereafter.
  const perTick = Math.max(10, Math.ceil(maxHp * .02));
  const missingHp = maxHp - currentHp, ticks = Math.ceil(missingHp / perTick);
  return { perTick, ticks, durationMs: ticks * healIntervalMs,
    // Two existing 50% medicines are the full-heal price anchor; inn travel remains required.
    instantFee: Math.min(missingHp * 2, Math.ceil(missingHp / maxHp * healingMedicinePrice * 2)) };
}

/** Explicit selected party only. A healthy hero must not hide injured/dead companions. */
export function draftPartyRecoveryQuote(members: Array<{ maxHp: number; hp: number }>, healIntervalMs: number, healingMedicinePrice: number) {
  if (!Array.isArray(members) || members.length < 1 || members.length > 12) throw new RangeError('Invalid recovery party');
  const quotes = members.map(member => draftRecoveryQuote(member.maxHp, member.hp, healIntervalMs, healingMedicinePrice));
  const missingHp = members.reduce((sum, member) => sum + member.maxHp - member.hp, 0);
  const missingFraction = Math.max(...members.map(member => (member.maxHp - member.hp) / member.maxHp));
  return { perMember: quotes, durationMs: Math.max(...quotes.map(quote => quote.durationMs)),
    instantFee: Math.min(missingHp * 2, Math.ceil(missingFraction * healingMedicinePrice * 2)) };
}
