/**
 * Battle-only visual references. Keeping image selection out of React lets the
 * Alpha use placeholders now and swap individual artwork during Beta without
 * touching combat or presentation logic.
 */
export const MONSTER_PLACEHOLDER = "/assets/placeholders/monster-placeholder.svg";

export const BATTLE_MONSTER_ART: Record<string, string> = {
  狸貓: "/assets/sprites/newbie-raccoon-v1.png",
  倭寇: "/assets/characters/char_049_pirate_skeleton_bow_R.png",
  鐵炮倭寇: "/assets/characters/char_053_pirate_skeleton_cannon_R.png",
  山賊: "/assets/characters/char_056_pirate_skeleton_captain_N.png",
  海賊: "/assets/characters/char_057_pirate_skeleton_captain_R.png",
  鐵鉤海賊: "/assets/characters/char_055_pirate_skeleton_captain_D.png",
  海賊王: "/assets/archive/s32_0028.webp",
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
  狂風阿魯塔: "/assets/monsters/gale-altur.gif",
  黃金海星: "/assets/monsters/golden-starfish.gif",
  狂虎: "/assets/monsters/gale-tiger.jpg",
  e_white_tiger_fierce_tiger: "/assets/monsters/gale-tiger.jpg",
  "訓練的雷獸": "/assets/monsters/sumeru/training-monsters.jpg",
  "訓練的瘟神": "/assets/monsters/sumeru/training-monsters.jpg",
  "訓練的虎鶴": "/assets/monsters/sumeru/training-monsters.jpg",
  "青臉夜叉金剛": "/assets/monsters/sumeru/vaisravana-area.jpg",
  神獸玄武: "/assets/monsters/sumeru/vaisravana-area.jpg",
  多聞天王: "/assets/monsters/sumeru/vaisravana-area.jpg",
  神獸白虎: "/assets/monsters/sumeru/virupaksa-area.jpg",
  廣目天王: "/assets/monsters/sumeru/virupaksa-area.jpg",
  辟寒金剛: "/assets/monsters/sumeru/virupaksa-area.jpg",
  紫賢金剛: "/assets/monsters/sumeru/virupaksa-area.jpg",
  強力棍兵: "/assets/monsters/sumeru/virupaksa-area.jpg",
};

export const BATTLE_MONSTER_CROP: Record<string, { size: string; position: string }> = {
  "訓練的雷獸": { size: "300% 100%", position: "0% 50%" },
  "訓練的瘟神": { size: "300% 100%", position: "50% 50%" },
  "訓練的虎鶴": { size: "300% 100%", position: "100% 50%" },
  "青臉夜叉金剛": { size: "260% 205%", position: "0% 0%" },
  神獸玄武: { size: "260% 205%", position: "58% 0%" },
  多聞天王: { size: "260% 205%", position: "42% 100%" },
  神獸白虎: { size: "300% 205%", position: "0% 0%" },
  廣目天王: { size: "300% 205%", position: "50% 0%" },
  辟寒金剛: { size: "300% 205%", position: "0% 100%" },
  紫賢金剛: { size: "300% 205%", position: "50% 100%" },
  強力棍兵: { size: "300% 205%", position: "100% 100%" },
};

export function battleMonsterImage(name: string, key?: string) {
  return BATTLE_MONSTER_ART[name] || (key ? BATTLE_MONSTER_ART[key] : undefined) || MONSTER_PLACEHOLDER;
}
