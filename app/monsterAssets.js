/**
 * Static monster-to-sprite mapping.
 *
 * This module intentionally contains no rendering, battle, or DOM logic.
 */
export const database = {
  e_starter_raccoon: { spriteUrl: "/assets/sprites/newbie-raccoon-v1.png" },
  e_starter_wako: { spriteUrl: "/assets/characters/char_049_pirate_skeleton_bow_R.png" },
  e_starter_gunner: { spriteUrl: "/assets/characters/char_053_pirate_skeleton_cannon_R.png" },
  e_starter_bandit: { spriteUrl: "/assets/characters/char_056_pirate_skeleton_captain_N.png" },
  e_starter_pirate: { spriteUrl: "/assets/characters/char_057_pirate_skeleton_captain_R.png" },
  e_starter_hook_pirate: { spriteUrl: "/assets/characters/char_055_pirate_skeleton_captain_D.png" },
  e_starter_pirate_king: { spriteUrl: "/assets/archive/s32_0028.webp" },

  e_lake_red_thief: { spriteUrl: "/assets/characters/char_054_pirate_skeleton_captain_A.png" },
  e_lake_shamaness: { spriteUrl: "/assets/characters/char_052_pirate_skeleton_cannon_N.png" },
  e_lake_commander: { spriteUrl: "/assets/characters/char_052_pirate_skeleton_cannon_N.png" },
  e_lake_vendor: { spriteUrl: "/assets/characters/char_054_pirate_skeleton_captain_A.png" },
  e_lake_horn_fire: { spriteUrl: "/assets/characters/char_057_pirate_skeleton_captain_R.png" },
  e_lake_horn_water: { spriteUrl: "/assets/characters/char_049_pirate_skeleton_bow_R.png" },
  e_lake_horn_lightning: { spriteUrl: "/assets/characters/char_053_pirate_skeleton_cannon_R.png" },
  e_lake_horn_wind: { spriteUrl: "/assets/characters/char_056_pirate_skeleton_captain_N.png" },
  e_lake_altur: { spriteUrl: "/assets/characters/char_055_pirate_skeleton_captain_D.png" },
  e_lake_dead_shamaness: { spriteUrl: "/assets/characters/char_052_pirate_skeleton_cannon_N.png" },
  e_lake_shamaness_strong: { spriteUrl: "/assets/characters/char_052_pirate_skeleton_cannon_N.png" },
  e_lake_male_shaman: { spriteUrl: "/assets/characters/char_049_pirate_skeleton_bow_R.png" },
  e_lake_evil_shaman: { spriteUrl: "/assets/characters/char_053_pirate_skeleton_cannon_R.png" },
  e_lake_red_thief_chief: { spriteUrl: "/assets/characters/char_054_pirate_skeleton_captain_A.png" },
  e_lake_gale_altur: { spriteUrl: "/assets/monsters/gale-altur.gif" },

  e_japan_sea_kappa: { spriteUrl: "/assets/characters/char_049_pirate_skeleton_bow_R.png" },
  e_japan_sea_bat: { spriteUrl: "/assets/characters/char_053_pirate_skeleton_cannon_R.png" },
  e_japan_sea_crab: { spriteUrl: "/assets/characters/char_055_pirate_skeleton_captain_D.png" },
  e_japan_sea_leech: { spriteUrl: "/assets/characters/char_052_pirate_skeleton_cannon_N.png" },
  e_japan_sea_starfish: { spriteUrl: "/assets/monsters/golden-starfish.gif" },
  e_japan_sea_starfish_strong: { spriteUrl: "/assets/monsters/golden-starfish.gif" },
  e_japan_sea_golden_starfish: { spriteUrl: "/assets/monsters/golden-starfish.gif" },

  e_white_tiger_soul_eater: { spriteUrl: "/assets/monsters/gale-tiger.jpg" },
  e_white_tiger_trainer: { spriteUrl: "/assets/monsters/gale-tiger.jpg" },
  e_white_tiger_spider: { spriteUrl: "/assets/monsters/gale-tiger.jpg" },
  e_white_tiger_fierce_tiger: { spriteUrl: "/assets/monsters/gale-tiger.jpg" },

  e_sumeru_training_thunder_beast: { spriteUrl: "/assets/monsters/sumeru/training-monsters.jpg" },
  e_sumeru_training_plague_god: { spriteUrl: "/assets/monsters/sumeru/training-monsters.jpg" },
  e_sumeru_training_tiger_crane: { spriteUrl: "/assets/monsters/sumeru/training-monsters.jpg" },
  e_sumeru_blue_yaksha_vajra: { spriteUrl: "/assets/monsters/sumeru/vaisravana-area.jpg" },
  e_sumeru_bihan_vajra: { spriteUrl: "/assets/monsters/sumeru/virupaksa-area.jpg" },
  e_sumeru_zixian_vajra: { spriteUrl: "/assets/monsters/sumeru/virupaksa-area.jpg" },
  e_sumeru_mighty_staff_guard: { spriteUrl: "/assets/monsters/sumeru/virupaksa-area.jpg" },
  e_sumeru_black_tortoise: { spriteUrl: "/assets/monsters/sumeru/vaisravana-area.jpg" },
  e_sumeru_white_tiger: { spriteUrl: "/assets/monsters/sumeru/virupaksa-area.jpg" },
  e_sumeru_vaisravana: { spriteUrl: "/assets/monsters/sumeru/vaisravana-area.jpg" },
  e_sumeru_virupaksa: { spriteUrl: "/assets/monsters/sumeru/virupaksa-area.jpg" },

  e_raccoon: { spriteUrl: "/assets/sprites/newbie-raccoon-v1.png" },
  e_mad_cow: { spriteUrl: "/assets/sprites/enemy-idle.png" },
  e_yellow_dragon: { spriteUrl: "/assets/sprites/enemy-idle.png" },
  e_big_eye: { spriteUrl: "/assets/sprites/enemy-idle.png" },
  e_boar: { spriteUrl: "/assets/sprites/enemy-idle.png" },
  e_tomb_raider: { spriteUrl: "/assets/sprites/enemy-idle.png" },
  e_ghost_cat: { spriteUrl: "/assets/sprites/enemy-idle.png" },
  e_kappa: { spriteUrl: "/assets/characters/char_049_pirate_skeleton_bow_R.png" },
  e_amakusa: { spriteUrl: "/assets/sprites/enemy-idle.png" },
  e_poison_moth: { spriteUrl: "/assets/sprites/enemy-idle.png" },
  e_xiongnu: { spriteUrl: "/assets/sprites/enemy-idle.png" },
  e_undersea_king: { spriteUrl: "/assets/sprites/enemy-idle.png" },
};

/**
 * Return the sprite URL for a monster id.
 *
 * @param {string} monsterId
 * @returns {string | undefined}
 */
export function getSprite(monsterId) {
  return database[monsterId]?.spriteUrl;
}

export default database;
