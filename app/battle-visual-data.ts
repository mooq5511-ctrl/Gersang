/**
 * Battle-only visual references. Keeping image selection out of React lets the
 * Alpha use placeholders now and swap individual artwork during Beta without
 * touching combat or presentation logic.
 */
export const MONSTER_PLACEHOLDER = "/assets/placeholders/monster-placeholder.svg";
import { ORIGINAL_ECOLOGY_MONSTERS, ORIGINAL_LEGACY_DUNGEON_MONSTERS } from '../data/monsters/dungeon-monsters.ts';
import { MONSTER_REDESIGN } from '../data/monsters/monster-redesign.ts';
const previousMonsterNames: Record<string, string> = Object.fromEntries(Object.entries({ ...ORIGINAL_ECOLOGY_MONSTERS, ...ORIGINAL_LEGACY_DUNGEON_MONSTERS }).map(([id, monster]) => [id, monster.name]));

export const BATTLE_MONSTER_ART: Record<string, string> = {
  狸貓: "/assets/sprites/newbie-raccoon-v1.png",
  倭寇: "/assets/characters/char_049_pirate_skeleton_bow_R.png",
  鐵炮倭寇: "/assets/characters/char_053_pirate_skeleton_cannon_R.png",
  山賊: "/assets/characters/char_056_pirate_skeleton_captain_N.png",
  海賊: "/assets/characters/char_057_pirate_skeleton_captain_R.png",
  鐵鉤海賊: "/assets/characters/char_055_pirate_skeleton_captain_D.png",
  山賊首領: "/assets/monsters/bandit-chief-normal.png",
  海賊王: "/assets/monsters/bandit-chief-normal.png",
  赤賊: "/assets/characters/char_054_pirate_skeleton_captain_A.png",
  巫女: "/assets/characters/char_052_pirate_skeleton_cannon_N.png",
  司令武女: "/assets/characters/char_052_pirate_skeleton_cannon_N.png",
  "詭異的小販": "/assets/characters/char_054_pirate_skeleton_captain_A.png",
  "詭異的獨角鬼(火)": "/assets/characters/char_057_pirate_skeleton_captain_R.png",
  "詭異的獨角鬼(水)": "/assets/characters/char_049_pirate_skeleton_bow_R.png",
  "詭異的獨角鬼(雷)": "/assets/characters/char_053_pirate_skeleton_cannon_N.png",
  "詭異的獨角鬼(風)": "/assets/characters/char_056_pirate_skeleton_captain_N.png",
  阿魯塔: "/assets/characters/char_055_pirate_skeleton_captain_D.png",
  "死靈武女(強)": "/assets/characters/char_052_pirate_skeleton_cannon_N.png",
  "巫女(強)": "/assets/characters/char_052_pirate_skeleton_cannon_N.png",
  神漢男巫: "/assets/characters/char_049_pirate_skeleton_bow_R.png",
  邪靈巫師: "/assets/characters/char_053_pirate_skeleton_cannon_N.png",
  赤賊頭目: "/assets/characters/char_054_pirate_skeleton_captain_A.png",
  狂風阿魯塔: "/assets/monsters/gale-altur-witch.png",
  黃金海星: "/assets/monsters/golden-starfish-boss.png",
  狂虎: "/assets/monsters/gale-tiger.jpg",
  e_white_tiger_fierce_tiger: "/assets/monsters/gale-tiger.jpg",
  // 須彌山一般怪物暫不使用立繪；未列出的怪物會自動使用共用佔位圖。
  多聞天王: "/assets/monsters/sumeru/vaisravana-area.jpg",
  廣目天王: "/assets/monsters/sumeru/virupaksa-area.jpg",
  "沉沒王・阿斯塔洛斯": "/assets/monsters/relic-boss-op-admin.png",
  "深淵遺跡海龍": "/assets/monsters/relic-boss-abyssal-dragon.png",
  "虛空鎮墓巨像": "/assets/monsters/relic-boss-void-colossus.png",
  "潮汐女皇・奈芙拉": "/assets/monsters/relic-boss-tide-empress.png",
};

export const BATTLE_MONSTER_INJURED_ART: Record<string, string> = {
  山賊首領: "/assets/monsters/bandit-chief-injured.png",
  海賊王: "/assets/monsters/bandit-chief-injured.png",
};

export const BATTLE_MONSTER_CROP: Record<string, { size: string; position: string }> = {
  多聞天王: { size: "260% 205%", position: "42% 100%" },
  廣目天王: { size: "300% 205%", position: "50% 0%" },
};

export function battleMonsterImage(name: string, key?: string) {
  const stableKey = key || Object.keys(MONSTER_REDESIGN).find(id => MONSTER_REDESIGN[id].name === name);
  return BATTLE_MONSTER_ART[name] || (stableKey ? BATTLE_MONSTER_ART[stableKey] || BATTLE_MONSTER_ART[previousMonsterNames[stableKey]] : undefined) || MONSTER_PLACEHOLDER;
}

export function battleMonsterInjuredImage(name: string, key?: string) {
  return BATTLE_MONSTER_INJURED_ART[name] || (key ? BATTLE_MONSTER_INJURED_ART[key] : undefined);
}
