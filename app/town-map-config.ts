/** Background-space coordinates for the interactive town layer. */
export type TownHotspotKind = "destination" | "npc" | "building";

export interface TownHotspot {
  id: string;
  label: string;
  kind: TownHotspotKind;
  /** Fixed 20 × 20 background grid coordinates (0 is left/top). */
  x: number;
  y: number;
  /** Optional interaction radius in grid units. */
  radius?: number;
}

export const TOWN_GRID_SIZE = 20 as const;

export const TOWN_MAP_BACKGROUND = {
  src: "/assets/backgrounds/castle-ruins.jpg",
  width: 392,
  height: 220,
} as const;

/** Add new NPCs/buildings here; coordinates stay stable across responsive sizes. */
export const TOWN_HOTSPOTS = [
  { id: "edo-castle", label: "江戶城", kind: "building", x: 4, y: 11, radius: 2 },
  { id: "edo-market", label: "市集", kind: "building", x: 7, y: 14, radius: 1.5 },
  { id: "edo-gate", label: "城門", kind: "destination", x: 14, y: 14, radius: 1.2 },
  { id: "edo-harbor", label: "港口", kind: "destination", x: 17, y: 8, radius: 1.2 },
] satisfies TownHotspot[];

export function townHotspotPixelPosition(hotspot: TownHotspot, width: number, height: number) {
  return { x: (hotspot.x / TOWN_GRID_SIZE) * width, y: (hotspot.y / TOWN_GRID_SIZE) * height };
}
