/** Recommended levels are guidance, not additional travel/challenge gates. */
export type EncounterTier = '入口怪' | '主力怪' | '菁英';
export const ENCOUNTER_TARGET_SECONDS: Record<EncounterTier, readonly [number, number]> = {
  入口怪: [5, 8], 主力怪: [8, 15], 菁英: [15, 25],
};
export const WORLD_MONSTER_PROGRESSION: Record<string, { min: number; max: number; focus: string }> = {
  'starter-outskirts': { min: 1, max: 15, focus: '認識隊伍與集火；野獸、刀匪與火銃手。' },
  'millennium-lake': { min: 15, max: 35, focus: '辨識物防與魔防；用不同攻擊破解咒衛與燈使。' },
  'japan-sea': { min: 35, max: 55, focus: '重甲與突襲交錯；前排承傷，優先清除高速目標。' },
  'miasma-forest': { min: 55, max: 80, focus: '毒蛛與遠程馭獸師；留意續航、補給與集火。' },
  'ice-temple': { min: 80, max: 110, focus: '慢速重擊與遠程法術；以防具和隊伍續航迎戰。' },
  'taj-mahal': { min: 110, max: 145, focus: '陵衛、咒舞者與刺客；考驗物理、法術的混合隊伍。' },
  sumeru: { min: 145, max: 190, focus: '高防山衛與迅捷靈獸；依隊伍強項選擇練功目標。' },
  shambhala: { min: 190, max: 250, focus: '毒蟒、獄卒與咒吏；高壓菁英與終盤裝備來源。' },
};

/** Stable IDs and explicit levels keep future row reordering from changing balance. */
export const WORLD_MONSTER_LEVELS: Record<string, number> = {
  e_starter_raccoon: 1, e_starter_black_bandit: 5, e_starter_wako: 2,
  e_starter_gunner: 7, e_starter_bandit: 5, e_starter_pirate: 10, e_starter_hook_pirate: 15,
  e_lake_red_thief: 15, e_lake_shamaness: 19, e_lake_commander: 22, e_lake_vendor: 27,
  e_lake_horn_fire: 23, e_lake_horn_water: 24, e_lake_horn_lightning: 25, e_lake_horn_wind: 26,
  e_lake_altur: 21, e_lake_dead_shamaness: 30, e_lake_shamaness_strong: 29,
  e_lake_male_shaman: 31, e_lake_evil_shaman: 33, e_lake_red_thief_chief: 35,
  e_japan_sea_kappa: 35, e_japan_sea_bat: 36, e_japan_sea_crab: 40,
  e_japan_sea_leech: 43, e_japan_sea_starfish: 46, e_japan_sea_starfish_strong: 52, e_sea_god: 55,
  e_white_tiger_spider: 55, e_white_tiger_soul_eater: 65, e_white_tiger_trainer: 80,
  e_yeti: 80, e_crystal: 95, e_snow: 110,
  e_taj_scarab: 110, e_taj_guard: 120, e_taj_dancer: 130, e_taj_assassin: 145,
  e_sumeru_training_thunder_beast: 145, e_sumeru_training_plague_god: 151,
  e_sumeru_training_tiger_crane: 157, e_sumeru_blue_yaksha_vajra: 165,
  e_sumeru_bihan_vajra: 170, e_sumeru_zixian_vajra: 175, e_sumeru_mighty_staff_guard: 180,
  e_sumeru_black_tortoise: 185, e_sumeru_white_tiger: 190,
  e_ghost: 190, e_snake: 210, e_shambhala_jailer: 230, e_shambhala_scribe: 250,
};
export const WORLD_ENTRY_MONSTERS: Record<string, string> = {
  'starter-outskirts': 'e_starter_raccoon', 'millennium-lake': 'e_lake_red_thief',
  'japan-sea': 'e_japan_sea_kappa', 'miasma-forest': 'e_white_tiger_spider',
  'ice-temple': 'e_yeti', 'taj-mahal': 'e_taj_scarab',
  sumeru: 'e_sumeru_training_thunder_beast', shambhala: 'e_ghost',
};
export function worldEncounterTier(id: string, region: string, elite: boolean, role: string): EncounterTier {
  if (elite || id === 'e_white_tiger_trainer') return '菁英';
  if (WORLD_ENTRY_MONSTERS[region] === id || role === '群居' || id === 'e_starter_wako') return '入口怪';
  return '主力怪';
}
