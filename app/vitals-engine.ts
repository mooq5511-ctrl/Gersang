export type VitalUnit = {
  level: number; vit: number; intel: number; str?: number; agi?: number; tier?: number; hp?: number; mp?: number;
  equip: Record<string, { hp?: number; atk?: number; def?: number; enhance?: number; bonus?: { str?: number; agi?: number; vit?: number; intel?: number }; magic?: { stat: string; value: number }[] } | null>;
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
export function combatStats(unit: VitalUnit) {
  const flat = { str: unit.str || 0, agi: unit.agi || 0, vit: unit.vit };
  const percent = { str: 0, agi: 0, vit: 0, atk: 0, def: 0 };
  let equipmentAttack = 0;
  let equipmentDefense = 0;
  for (const item of Object.values(unit.equip)) {
    if (!item) continue;
    flat.str += item.bonus?.str || 0;
    flat.agi += item.bonus?.agi || 0;
    flat.vit += item.bonus?.vit || 0;
    const enhancement = 1 + Math.max(0, item.enhance || 0) * 0.12;
    equipmentAttack += (item.atk || 0) * enhancement;
    equipmentDefense += (item.def || 0) * enhancement;
    for (const affix of item.magic || []) if (Object.hasOwn(percent, affix.stat)) percent[affix.stat as keyof typeof percent] += affix.value;
  }
  const tier = 1 + (unit.tier || 0) * 0.35;
  const attack = Math.max(1, Math.floor((12 + flat.str * (1 + percent.str / 100) * 0.5 + flat.agi * (1 + percent.agi / 100) * 0.2 + unit.level * 2 + equipmentAttack) * tier * (1 + percent.atk / 100)));
  const defense = Math.max(0, Math.floor((8 + flat.vit * (1 + percent.vit / 100) * 0.6 + unit.level * 2 + equipmentDefense) * tier * (1 + percent.def / 100)));
  return { attack, defense };
}
export function enemyCombatStats(stage: number, health: number, boss = false) {
  return { attack: Math.max(1, Math.floor((20 + stage * 5 + Math.sqrt(health) * 1.8) * (boss ? 1.2 : 1))), defense: Math.max(0, Math.floor((6 + stage * 2 + Math.sqrt(health) * 0.1) * (boss ? 1.4 : 1))) };
}
export function damageAfterDefense(attack: number, defense: number, resistance = 0) {
  const armor = Math.max(0, defense);
  return Math.max(1, Math.floor(Math.max(0, attack) * (1 - Math.min(0.75, armor / (armor + 200))) * (1 - Math.min(85, Math.max(0, resistance)) / 100)));
}
export type Fighter = { uid: string; name: string; skill: string; hp: number; mp: number; attack: number; intelligence: number; defense: number; cost: number };

/** Each living fighter acts once per round. A spell is charged before its damage is applied. */
export function resolveVitalBattle(party: Fighter[], enemy: { hp: number; attack: number; defense: number; physical: number; magic: number }) {
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
      let damage = unit.attack;
      if (cast) {
        unit.mp -= unit.cost;
        spentMp += unit.cost;
        casts++;
        damage = damage * 1.8 + unit.intelligence * 0.12;
        if (spells.length < 4) spells.push(unit.name + "・" + unit.skill + "（MP −" + unit.cost + "）");
      } else attacks++;
      enemyHp = Math.max(0, enemyHp - damageAfterDefense(damage, enemy.defense, resistance));
    }
    if (enemyHp <= 0) break;
    const living = fighters.filter((unit) => unit.hp > 0);
    const target = living[(rounds - 1) % living.length];
    const damage = damageAfterDefense(enemy.attack, target.defense);
    receivedDamage += Math.min(target.hp, damage);
    target.hp = Math.max(0, target.hp - damage);
  }
  return { fighters, won: enemyHp <= 0, enemyHp, rounds, casts, spentMp, attacks, receivedDamage, spells };
}
