/** Data-only boss ability definitions for the realtime dungeon battle. */
export type BossAbilitySet={
  shield?:{name:string;initialDelayMs:number;cooldownMs:number;durationMs:number;defenseBonus:number};
  trueDamage?:{name:string;initialDelayMs:number;cooldownMs:number;damage:number};
  regeneration?:{name:string;initialDelayMs:number;cooldownMs:number;attackMultiplier:number;maxHpPerSecond:number;durationMs:number};
  flame?:{name:string;procChance:number;attackMultiplier:number;burnAttackRatio:number;burnDurationMs:number;maxStacks:number};
  curse?:{name:string;initialDelayMs:number;cooldownMs:number;durationMs:number;attackReduction:number;defenseReduction:number;damageTakenIncrease:number};
};

export const BOSS_ABILITY_SETS={
  e_lake_gale_altur:{
    shield:{name:'白虎盾',initialDelayMs:60_000,cooldownMs:60_000,durationMs:3_000,defenseBonus:.3},
    trueDamage:{name:'風碎',initialDelayMs:30_000,cooldownMs:30_000,damage:2_000},
  },
  e_japan_sea_golden_starfish:{
    regeneration:{name:'恢復術',initialDelayMs:60_000,cooldownMs:60_000,attackMultiplier:1.5,maxHpPerSecond:.005,durationMs:3_000},
    flame:{name:'火焰燎原',procChance:.3,attackMultiplier:1.8,burnAttackRatio:.15,burnDurationMs:6_000,maxStacks:3},
    curse:{name:'詛咒',initialDelayMs:60_000,cooldownMs:60_000,durationMs:8_000,attackReduction:.25,defenseReduction:.3,damageTakenIncrease:.15},
  },
} as const satisfies Record<string,BossAbilitySet>;

export const bossAbilitiesFor=(key:string):BossAbilitySet|undefined=>BOSS_ABILITY_SETS[key as keyof typeof BOSS_ABILITY_SETS];
