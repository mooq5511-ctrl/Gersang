export const AUTO_POTION_THRESHOLDS = [30, 40, 50, 60, 70, 80, 90] as const;
export type AutoPotionThreshold = typeof AUTO_POTION_THRESHOLDS[number];
export type AutoPotionSettings = { enabled: boolean; medicineId: string | null; threshold: AutoPotionThreshold };
export type HealingPotion = { id: string; name: string; effect: string; hpRestore: number; quantity: number };
export type HealingPotionSource = { id: string; name: string; effect: string; hpRestore?: number };

const defaultSettings = (): AutoPotionSettings => ({ enabled: false, medicineId: null, threshold: 30 });
const isThreshold = (value: number): value is AutoPotionThreshold => AUTO_POTION_THRESHOLDS.includes(value as AutoPotionThreshold);

function normalize(settings?: Partial<AutoPotionSettings>): AutoPotionSettings {
  const threshold = Math.floor(Number(settings?.threshold));
  return {
    enabled: settings?.enabled === true,
    medicineId: typeof settings?.medicineId === "string" && settings.medicineId.trim() ? settings.medicineId : null,
    threshold: isThreshold(threshold) ? threshold : 30,
  };
}

function available(medicines: Record<string, number>, catalog: readonly HealingPotionSource[]): HealingPotion[] {
  return catalog.flatMap((medicine) => {
    const hpRestore = medicine.hpRestore || 0;
    const quantity = Math.max(0, Math.floor(medicines[medicine.id] || 0));
    return hpRestore > 0 && quantity > 0 ? [{ id: medicine.id, name: medicine.name, effect: medicine.effect, hpRestore, quantity }] : [];
  });
}

export const AutoPotionManager = Object.freeze({
  defaults: defaultSettings,
  normalize,

  available(medicines: Record<string, number>, catalog: readonly HealingPotionSource[]): HealingPotion[] {
    return available(medicines, catalog);
  },

  configure(settings: Partial<AutoPotionSettings> | undefined, patch: Partial<AutoPotionSettings>, medicines: Record<string, number>, catalog: readonly HealingPotionSource[]) {
    const next = normalize({ ...normalize(settings), ...patch });
    const potions = available(medicines, catalog);
    if (patch.enabled === true && !next.medicineId && potions[0]) next.medicineId = potions[0].id;
    const selected = potions.find((potion) => potion.id === next.medicineId);
    if (patch.enabled === true && !selected) return { settings: { ...next, enabled: false }, shortage: true };
    return { settings: next, shortage: false };
  },

  nextAction(settings: Partial<AutoPotionSettings> | undefined, medicines: Record<string, number>, hp: number, maxHp: number, catalog: readonly HealingPotionSource[]) {
    const normalized = normalize(settings);
    if (!normalized.enabled || hp > Math.max(1, maxHp) * normalized.threshold / 100) return { type: "none" as const };
    const potion = available(medicines, catalog).find((entry) => entry.id === normalized.medicineId);
    return potion ? { type: "use" as const, medicineId: potion.id } : { type: "shortage" as const, settings: { ...normalized, enabled: false } };
  },
});
