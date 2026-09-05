export type GersangNation = "taiwan" | "china" | "korea" | "japan";

export const gersangHeroArt: Record<GersangNation, string> = {
  taiwan: "/game-assets/hero-taiwan-0.png",
  china: "/game-assets/hero-china-0.png",
  korea: "/game-assets/hero-korea-0.png",
  japan: "/game-assets/hero-japan-0.png",
};

const mercenaryIds = [
  "spear", "shield", "archer", "shaman", "samurai", "ninja", "gunner", "onmyoji",
  "blade", "monk", "healer", "cannon", "escort", "hunter", "elephant", "priest",
] as const;

export const gersangMercenaryArt = (index: number) =>
  `/game-assets/merc-${mercenaryIds[((index % mercenaryIds.length) + mercenaryIds.length) % mercenaryIds.length]}-0.png`;

export function gersangUnitArt(templateId: string | undefined, name: string, fallbackIndex = 0) {
  const id = templateId?.replace(/^merchant-/, "");
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

export function gersangBuildingArt(nation: GersangNation, service: string) {
  const supported = new Set(["market", "mercenary", "warehouse", "inn", "pharmacy", "weapon", "armor"]);
  const visualService = supported.has(service) ? service : "market";
  return `/game-assets/building-${nation}-${visualService}-0.png`;
}
