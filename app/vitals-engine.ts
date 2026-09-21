import { mercenarySpec, ratingAccuracy } from './mercenary-roster.ts';
import {formationTarget,rearDodge,type BattlePosition} from './formation-position.ts';
import { resistanceMultiplier } from './combat-damage.js';
export type VitalUnit = {
  templateId?: string; physicalResist?: number; magicResist?: number;
  level: number; vit: number; intel: number; str?: number; agi?: number; tier?: number; hp?: number; mp?: number; maxHp?:number; flatAttackBonus?:number;
  equip: Record<string, { hp?: number; atk?: number; def?: number; enhance?: number; bonus?: { str?: number; agi?: number; vit?: number; intel?: number }; resist?: { physical?: number; magic?: number }; magic?: { stat: string; value: number }[] } | null>;
};
export function vitalStats(unit: VitalUnit) {
  const spec = mercenarySpec(unit.templateId);
  let vitality = unit.vit;
  let intelligence = unit.intel;
  let equipmentHp = 0;
  let hpPercent = 0;
  let defense = 0;
  let physicalResist = Number(unit.physicalResist) || 0;
  let magicResist = Number(unit.magicResist) || 0;
  for (const item of Object.values(unit.equip)) {
    if (!item) continue;
    vitality += item.bonus?.vit || 0;
    intelligence += item.bonus?.intel || 0;
    equipmentHp += item.hp || 0;
    defense += item.def || 0;
    physicalResist += item.resist?.physical || 0;
    magicResist += item.resist?.magic || 0;
    for (const affix of item.magic || []) if (affix.stat === "hp") hpPercent += affix.value;
  }
  // 主角基礎上限存於 maxHp：初始 100、每次升級 +20；體質與裝備再動態加成。
  const heroHp=(unit.maxHp??100)+Math.max(0,vitality-20)*4+equipmentHp;
  const mercenaryHp = spec ? (spec.baseHp ?? spec.ratings[0] * 20 + (unit.level - 1) * 12) + Math.max(0, vitality - spec.ratings[0]) * 8 + equipmentHp : 100 + vitality * 8 + unit.level * 12 + equipmentHp;
  const mercenaryIntelligence = spec?.intel ?? (spec?.mp ? 20 : 10);
  const mercenaryMp = spec ? (spec.baseMp ?? 40 + (unit.level - 1) * 4) + Math.max(0, intelligence - mercenaryIntelligence) * 3 : 40 + intelligence * 3 + unit.level * 4;
  const maxHp = Math.max(1, Math.floor((unit.templateId==='hero' ? heroHp : mercenaryHp) * (1 + hpPercent / 100)));
  const maxMp = Math.max(1, Math.floor(unit.templateId==='hero' ? intelligence*4 : mercenaryMp));
  const clamp = (value: number | undefined, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : max;
  return { maxHp, maxMp, hp: clamp(unit.hp, maxHp), mp: clamp(unit.mp, maxMp), defense, intelligence, physicalResist, magicResist };
}
export function normalizeVitals<T extends VitalUnit>(unit: T): T & { hp: number; mp: number } {
  const { hp, mp } = vitalStats(unit);
  return { ...unit, hp, mp };
}
export function recoverVitals<T extends VitalUnit>(unit: T, hpFraction = 1, mpFraction = 1): T & { hp: number; mp: number } {
  const stats = vitalStats(unit);
  return { ...unit, hp: Math.min(stats.maxHp, stats.hp + Math.floor(stats.maxHp * Math.max(0, hpFraction))), mp: Math.min(stats.maxMp, stats.mp + Math.floor(stats.maxMp * Math.max(0, mpFraction))) };
}
export const spellCost = (unit: VitalUnit) => mercenarySpec(unit.templateId)?.mp ?? (12 + Math.floor(unit.level / 10) * 2 + (unit.tier || 0) * 4);
export function combatStats(unit: VitalUnit) {
  const spec = mercenarySpec(unit.templateId);
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
  const permanentAttack = Math.max(0, unit.flatAttackBonus || 0);
  const attack = Math.max(1, Math.floor((12 + flat.str * (1 + percent.str / 100) * 0.5 + flat.agi * (1 + percent.agi / 100) * 0.2 + unit.level * 2 + equipmentAttack + permanentAttack) * tier * (1 + percent.atk / 100)));
  const defense = Math.max(0, Math.floor((8 + flat.vit * (1 + percent.vit / 100) * 0.6 + unit.level * 2 + equipmentDefense) * tier * (1 + percent.def / 100)));
  return spec ? {
    attack: Math.max(1, Math.floor((spec.ratings[1] * 2 + (unit.level - 1) * 2 + Math.max(0, flat.str * (1 + percent.str / 100) - spec.ratings[1]) * 0.5 + equipmentAttack + permanentAttack) * tier * (1 + percent.atk / 100))),
    defense: Math.max(0, Math.floor((spec.ratings[2] * 2 + (unit.level - 1) * 2 + Math.max(0, flat.vit * (1 + percent.vit / 100) - spec.ratings[0]) * 0.6 + equipmentDefense) * tier * (1 + percent.def / 100))),
    speed: spec.ratings[3], accuracy: ratingAccuracy(spec.ratings[4]),
  } : { attack, defense, speed: 25, accuracy: 1 };
}
export function enemyCombatStats(stage: number, health: number, boss = false) {
  return { attack: Math.max(1, Math.floor((20 + stage * 5 + Math.sqrt(health) * 1.8) * (boss ? 1.2 : 1))), defense: Math.max(0, Math.floor((6 + stage * 2 + Math.sqrt(health) * 0.1) * (boss ? 1.4 : 1))) };
}
export function damageAfterDefense(attack: number, defense: number, resistance = 0) {
  const armor = Math.max(0, defense);
  return Math.max(1, Math.floor(Math.max(0, attack) * (1 - Math.min(0.75, armor / (armor + 200))) * resistanceMultiplier(resistance)));
}
export type Fighter = { uid: string; name: string; skill: string; hp: number; mp: number; attack: number; intelligence: number; defense: number; cost: number; speed?: number; position?:BattlePosition; physicalResist?: number; magicResist?: number };

/** Each living fighter acts once per round. A spell is charged before its damage is applied. */
export function resolveVitalBattle(party: Fighter[], enemy: { hp: number; attack: number; defense: number; physical: number; magic: number; speed?: number; bandit?: boolean; terrain?: string; magicAttack?: boolean }, random = Math.random) {
  const fighters = party.map((fighter) => ({ ...fighter }));
  let enemyHp = enemy.hp;
  let rounds = 0;
  let casts = 0;
  let spentMp = 0;
  let attacks = 0;
  let receivedDamage = 0;
  const spells: string[] = [];
  const enemySkills: string[] = [];
  const blinded = new Set<string>();
  const slowedUntil = new Map<string, number>();
  let sandUsed = false;
  let nextSlashRound = 2;
  let misses = 0;
  const homeGround = enemy.bandit && ["forest", "mountain", "stockade"].includes(enemy.terrain || "");
  if (homeGround) enemySkills.push("山寨地利：前 2 回合承受傷害 −15%。");
  while (rounds < 30 && enemyHp > 0 && fighters.some((unit) => unit.hp > 0)) {
    rounds++;
    const turns = [...fighters.map((unit) => ({ unit, speed: Math.max(1, (unit.speed ?? 5) - ((slowedUntil.get(unit.uid) || 0) >= rounds ? 1 : 0)) })), { unit: null, speed: enemy.speed ?? 5 }].sort((a, b) => b.speed - a.speed);
    for (const turn of turns) {
      if (enemyHp <= 0 || !fighters.some((unit) => unit.hp > 0)) break;
      const unit = turn.unit;
      if (!unit) {
        const target = formationTarget(fighters,rounds-1)!;
        if(rearDodge(target.position,random())){
          enemySkills.push('第 '+rounds+' 回合・🏹 [後排] '+target.name+' 閃避敵軍攻擊。');
          continue;
        }
        let multiplier = 1;
        if (enemy.bandit && !sandUsed && enemyHp < enemy.hp * 0.5) {
          sandUsed = true;
          blinded.add(target.uid);
          multiplier = 0.6;
          enemySkills.push("第 " + rounds + " 回合・揚沙偷襲：" + target.name + " 下次攻擊命中率 −20%，受到 60% 攻擊傷害。");
        } else if (enemy.bandit && rounds >= nextSlashRound) {
          nextSlashRound = rounds + 3;
          multiplier = 1.3;
          slowedUntil.set(target.uid, rounds + 1);
          enemySkills.push("第 " + rounds + " 回合・攔路劈砍：" + target.name + " 受到 130% 攻擊傷害，移速 −1 至下回合結束（最低 1）。");
        }
        const resistance = enemy.magicAttack ? target.magicResist : target.physicalResist;
        const damage = damageAfterDefense(enemy.attack * multiplier, target.defense, resistance);
        receivedDamage += Math.min(target.hp, damage);
        target.hp = Math.max(0, target.hp - damage);
        continue;
      }
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
      if (blinded.delete(unit.uid) && random() >= 0.8) {
        misses++;
        enemySkills.push("第 " + rounds + " 回合・" + unit.name + " 受揚沙影響，攻擊落空。");
        continue;
      }
      const dealt = damageAfterDefense(damage, enemy.defense, resistance);
      enemyHp = Math.max(0, enemyHp - Math.max(1, Math.floor(dealt * (homeGround && rounds <= 2 ? 0.85 : 1))));
    }
  }
  return { fighters, won: enemyHp <= 0, enemyHp, rounds, casts, spentMp, attacks, receivedDamage, spells, enemySkills, misses };
}
