export type VitalUnit = {
  level: number; vit: number; intel: number; tier?: number; hp?: number; mp?: number;
  equip: Record<string, { hp?: number; def?: number; bonus?: { vit?: number; intel?: number }; magic?: { stat: string; value: number }[] } | null>;
};
export function vitalStats(unit: VitalUnit) {
  let vitality = unit.vit;
  let intelligence = unit.intel;
  let equipmentHp = 0;
  let hpPercent = 0;
  let defense = 0;
  for (const item of Object.values(unit.equip)) {
    if (!item) continue;
    vitality += item.bonus?.vit || 0;
    intelligence += item.bonus?.intel || 0;
    equipmentHp += item.hp || 0;
    defense += item.def || 0;
    for (const affix of item.magic || []) if (affix.stat === "hp") hpPercent += affix.value;
  }
  const maxHp = Math.max(1, Math.floor((100 + vitality * 8 + unit.level * 12 + equipmentHp) * (1 + hpPercent / 100)));
  const maxMp = Math.max(1, Math.floor(40 + intelligence * 3 + unit.level * 4));
  const clamp = (value: number | undefined, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : max;
  return { maxHp, maxMp, hp: clamp(unit.hp, maxHp), mp: clamp(unit.mp, maxMp), defense, intelligence };
}
export function normalizeVitals<T extends VitalUnit>(unit: T): T & { hp: number; mp: number } {
  const { hp, mp } = vitalStats(unit);
  return { ...unit, hp, mp };
}
export function recoverVitals<T extends VitalUnit>(unit: T, hpFraction = 1, mpFraction = 1): T & { hp: number; mp: number } {
  const stats = vitalStats(unit);
  return { ...unit, hp: Math.min(stats.maxHp, stats.hp + Math.floor(stats.maxHp * Math.max(0, hpFraction))), mp: Math.min(stats.maxMp, stats.mp + Math.floor(stats.maxMp * Math.max(0, mpFraction))) };
}
export const spellCost = (unit: VitalUnit) => 12 + Math.floor(unit.level / 10) * 2 + (unit.tier || 0) * 4;
export type Fighter = { uid: string; name: string; skill: string; hp: number; mp: number; power: number; intelligence: number; defense: number; cost: number };

/** Each living fighter acts once per round. A spell is charged before its damage is applied. */
export function resolveVitalBattle(party: Fighter[], enemy: { hp: number; attack: number; physical: number; magic: number }) {
  const fighters = party.map((fighter) => ({ ...fighter }));
  let enemyHp = enemy.hp;
  let rounds = 0;
  let casts = 0;
  let spentMp = 0;
  let attacks = 0;
  let receivedDamage = 0;
  const spells: string[] = [];
  while (rounds < 30 && enemyHp > 0 && fighters.some((unit) => unit.hp > 0)) {
    rounds++;
    for (const unit of fighters) {
      if (unit.hp <= 0 || enemyHp <= 0) continue;
      const cast = !!unit.skill && unit.cost > 0 && unit.mp >= unit.cost;
      const resistance = Math.min(85, Math.max(0, cast ? enemy.magic : enemy.physical));
      let damage = unit.power * 0.065;
      if (cast) {
        unit.mp -= unit.cost;
        spentMp += unit.cost;
        casts++;
        damage = damage * 1.8 + unit.intelligence * 0.12;
        if (spells.length < 4) spells.push(unit.name + "・" + unit.skill + "（MP −" + unit.cost + "）");
      } else attacks++;
      enemyHp = Math.max(0, enemyHp - Math.max(1, Math.floor(damage * (1 - resistance / 100))));
    }
    if (enemyHp <= 0) break;
    const living = fighters.filter((unit) => unit.hp > 0);
    const target = living[(rounds - 1) % living.length];
    const damage = Math.max(1, Math.floor(enemy.attack * (1 - Math.min(0.75, target.defense / (target.defense + 200)))));
    receivedDamage += Math.min(target.hp, damage);
    target.hp = Math.max(0, target.hp - damage);
  }
  return { fighters, won: enemyHp <= 0, enemyHp, rounds, casts, spentMp, attacks, receivedDamage, spells };
}
