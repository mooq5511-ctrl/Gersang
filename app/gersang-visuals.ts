export type GersangNation = "taiwan" | "china" | "korea" | "japan";

export const gersangHeroArt: Record<GersangNation, string> = {
  taiwan: "/game-assets/cute-hero-taiwan-0.png",
  china: "/game-assets/cute-hero-china-0.png",
  korea: "/game-assets/cute-hero-korea-0.png",
  japan: "/game-assets/cute-hero-japan-0.png",
};
export const gersangHeroFemaleArt: Record<GersangNation, string> = {
  taiwan: "/game-assets/cute-hero-taiwan-female-0.png", china: "/game-assets/cute-hero-china-female-0.png", korea: "/game-assets/cute-hero-korea-female-0.png", japan: "/game-assets/cute-hero-japan-female-0.png",
};

const mercenaryIds = [
  "spear", "shield", "archer", "shaman", "samurai", "ninja", "gunner", "onmyoji",
  "blade", "monk", "healer", "cannon", "escort", "hunter", "elephant", "priest",
] as const;

export const gersangMercenaryArt = (index: number) =>
  `/game-assets/cute-merc-${mercenaryIds[((index % mercenaryIds.length) + mercenaryIds.length) % mercenaryIds.length]}-0.png`;

export function gersangUnitArt(templateId: string | undefined, name: string, fallbackIndex = 0) {
  const id = templateId?.replace(/^merchant-/, "");
  if (id === "swordmaster" || id === "sanada") return `/game-assets/cute-merc-${id}-0.png`;
  const exact = mercenaryIds.indexOf(id as (typeof mercenaryIds)[number]);
  if (exact >= 0) return gersangMercenaryArt(exact);
  const hash = Array.from(name).reduce((sum, char) => (sum * 31 + (char.codePointAt(0) || 0)) >>> 0, fallbackIndex);
  return gersangMercenaryArt(hash);
}

const itemArt: Record<string, string> = {
  weapon: "/game-assets/item-weapon-0.png",
  armor: "/game-assets/item-armor-0.png",
  helm: "/game-assets/item-helm-0.png",
  boots: "/game-assets/item-boots-0.png",
  gloves: "/game-assets/item-gloves-0.png",
  ring: "/game-assets/item-ring-0.png",
  amulet: "/game-assets/item-amulet-0.png",
  accessory: "/game-assets/item-accessory-0.png",
};

export function gersangItemArt(slot: string | undefined) {
  return itemArt[slot || ""] || itemArt.accessory;
}

// One original atlas keeps the ordinary shop gear visually consistent while
// each cell remains a name-specific, cute inventory icon.  Mythic set pieces
// intentionally do not use this helper: their supplied artwork is preserved.
const cuteEquipmentCells: Record<string, [number, number]> = {
  "木刀": [0, 0], "精鐵長刀": [1, 0], "鐵劍": [1, 0], "七星劍": [2, 0], "草雉劍": [3, 0], "倚天劍": [4, 0],
  "火熱劍": [0, 1], "寒冰劍": [1, 1], "雷劍": [2, 1],
  "牛皮盔甲": [3, 1], "虎皮盔甲": [4, 1], "銅製盔甲": [0, 2], "黑鐵盔甲": [1, 2], "玄鐵甲": [3, 3],
  "飛虎盔甲": [2, 2], "白虎盔甲": [3, 2], "水龍盔甲": [4, 2], "水靈珠": [4, 2],
  "白銀盔甲": [0, 3], "太皇盔甲": [1, 3], "商旅錦衣": [2, 3], "風靈符": [4, 3],
};

const cuteAtlasWidth = 1402;
const cuteAtlasHeight = 1122;
const cuteCellWidth = cuteAtlasWidth / 5;
const cuteCellHeight = cuteAtlasHeight / 4;

function cuteAtlasCell(column: number, row: number) {
  const x = column * cuteCellWidth;
  const y = row * cuteCellHeight;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${cuteCellWidth} ${cuteCellHeight}"><image href="/assets/equipment/cute/item-atlas.png" width="${cuteAtlasWidth}" height="${cuteAtlasHeight}"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Returns a cute, item-specific image for ordinary gear, with a safe fallback. */
export function cuteEquipmentArt(name: string | undefined, fallback: string) {
  const plainName = (name || "").replace(/^(普通|稀有|史詩|傳說)・/, "").replace(/^\+\d+的[^的]+的/, "");
  const cell = cuteEquipmentCells[plainName];
  return cell ? cuteAtlasCell(...cell) : fallback;
}

export function gersangBuildingArt(nation: GersangNation, service: string) {
  const supported = new Set(["market", "mercenary", "warehouse", "inn", "pharmacy", "weapon", "armor"]);
  const visualService = supported.has(service) ? service : "market";
  return `/game-assets/building-${nation}-${visualService}-0.png`;
}
