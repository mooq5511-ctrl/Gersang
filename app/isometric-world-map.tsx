"use client";

import { useEffect, useRef } from "react";
import { TOWN_MAP_BACKGROUND } from "./town-map-config";
import { HANYANG_MYSTERY_NPC, VILLAGE_NPCS, type NpcId } from "./npc-dialogue";

const COLS = 12;
const ROWS = 12;
const TILE_W = 72;
const TILE_H = 36;

type Cell = { col: number; row: number };
type Destination = "city" | "trade" | "battle" | "raid" | "hall";

const destinations: Record<Destination, Cell & { label: string }> = {
  city: { col: 3, row: 4, label: "市集" },
  trade: { col: 7, row: 3, label: "港口" },
  battle: { col: 7, row: 9, label: "城門" },
  raid: { col: 3, row: 7, label: "雷霆祭壇" },
  hall: { col: 9, row: 4, label: "市政廳" },
};

export function IsometricWorldMap({
  cityName,
  locationLabel,
  objectiveExpanded,
  npcLabelsVisible,
  onNpcLabelsVisibleChange,
  onEnter,
  onNpcTalk,
  tutorialLocked = false,
  tutorialNpcIds,
  npcVisible,
}: {
  cityName: string;
  locationLabel: string;
  objectiveExpanded: boolean;
  npcLabelsVisible: boolean;
  onNpcLabelsVisibleChange: (visible: boolean) => void;
  onEnter: (destination: Destination) => void;
  onNpcTalk: (npcId: NpcId) => void;
  tutorialLocked?: boolean;
  tutorialNpcIds?: NpcId[];
  npcVisible?: (npcId: NpcId) => boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      class WorldScene extends Phaser.Scene {
        private originX = 0;
        private originY = 0;

        preload() {
          this.load.image("town-background", TOWN_MAP_BACKGROUND.src);
          this.load.image("map-portal", "/game-assets/map-field-portal-0.png");
          this.load.image("map-inn", "/game-assets/building-korea-inn-0.png");
          this.load.image("map-market", "/game-assets/building-korea-market-0.png");
          this.load.image("map-mercenary", "/game-assets/building-korea-mercenary-0.png");
          this.load.image("map-warehouse", "/game-assets/building-korea-warehouse-0.png");
          this.load.image("map-pharmacy", "/game-assets/building-korea-pharmacy-0.png");
          this.load.image("map-weapon", "/game-assets/building-korea-weapon-0.png");
          this.load.image("map-armor", "/game-assets/building-korea-armor-0.png");
        }

        create() {
          this.drawWorld();
          this.scale.on("resize", () => this.rebuild());
        }

        private iso(col: number, row: number) {
          return { x: this.originX + (col - row) * TILE_W / 2, y: this.originY + (col + row) * TILE_H / 2 };
        }

        private diamond(graphics: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha = 1) {
          graphics.fillStyle(color, alpha);
          graphics.fillPoints([
            new Phaser.Geom.Point(x, y), new Phaser.Geom.Point(x + TILE_W / 2, y + TILE_H / 2),
            new Phaser.Geom.Point(x, y + TILE_H), new Phaser.Geom.Point(x - TILE_W / 2, y + TILE_H / 2),
          ], true);
        }

        private drawWorld() {
          this.children.removeAll();
          const backgroundScale = Math.max(this.scale.width / TOWN_MAP_BACKGROUND.width, this.scale.height / TOWN_MAP_BACKGROUND.height);
          this.add.image(this.scale.width / 2, this.scale.height / 2, "town-background")
            .setDisplaySize(TOWN_MAP_BACKGROUND.width * backgroundScale, TOWN_MAP_BACKGROUND.height * backgroundScale)
            .setDepth(-100);
          this.originX = this.scale.width / 2;
          this.originY = Math.max(36, (this.scale.height - ROWS * TILE_H) / 2 - 8);

          // The artwork already contains the village roads and buildings. Keep Phaser as
          // an interaction/position layer so a second set of tile art does not look pasted on.
          return;

          const roads = new Set<string>();
          for (let i = 0; i < COLS; i++) { roads.add(`${i},4`); roads.add(`${i},10`); }
          for (let i = 0; i < ROWS; i++) roads.add(`6,${i}`);
          for (const key of ["5,3","6,3","7,3","5,4","6,4","7,4","5,5","6,5","7,5","2,7","3,7","4,7","3,8","3,9","7,8","8,8","9,8"]) roads.add(key);
          const ground = this.add.graphics();
          for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
            const point = this.iso(col, row);
            const isRoad = roads.has(`${col},${row}`);
            const variation = (col * 7 + row * 11) % 3;
            this.diamond(ground, point.x, point.y, isRoad ? [0x887a5b,0x98896a,0x796e55][variation] : [0x355b3a,0x406b43,0x2f5438][variation], isRoad ? 1 : 0.98);
            ground.lineStyle(1, isRoad ? 0x514735 : 0x6e965d, isRoad ? 0.8 : 0.22);
            ground.strokePoints([
              new Phaser.Geom.Point(point.x, point.y), new Phaser.Geom.Point(point.x + TILE_W / 2, point.y + TILE_H / 2),
              new Phaser.Geom.Point(point.x, point.y + TILE_H), new Phaser.Geom.Point(point.x - TILE_W / 2, point.y + TILE_H / 2),
            ], true);
            if (!isRoad && (col * 5 + row * 3) % 5 === 0) this.drawGrassTuft(point.x + 8, point.y + 22, 40 + col + row);
          }
          // Keep the isometric guide visible while allowing the town artwork to read through.
          ground.setAlpha(0.34);
          this.drawStoneBorder();
          this.drawFacility(1, 1, "map-inn", "客棧", 108, 94);
          this.drawFacility(8, 1, "map-mercenary", "傭兵公會", 112, 96);
          this.drawFacility(1, 8, "map-warehouse", "共用倉庫", 108, 92);
          this.drawFacility(9, 5, "map-pharmacy", "藥店", 96, 84);
          this.drawFacility(3, 9, "map-weapon", "武器舖", 98, 86);
          this.drawFacility(9, 9, "map-armor", "防具舖", 98, 86);
          this.drawMarket(8, 8);
          this.drawGate(7, 9);
          this.drawGate(3, 7);
          this.drawDestination("city", 0xd7a647);
          this.drawDestination("trade", 0x65b4b0);
          this.drawDestination("battle", 0xc96649);
          this.drawDestination("raid", 0x9170e8);
        }

        private drawGrassTuft(x: number, y: number, seed: number) {
          const tuft = this.add.graphics().setDepth(30);
          tuft.lineStyle(1.5, seed % 2 ? 0x95b75f : 0x73944f, 0.72);
          tuft.lineBetween(x, y, x - 3, y - 7); tuft.lineBetween(x + 2, y, x + 5, y - 8); tuft.lineBetween(x + 4, y + 1, x + 9, y - 5);
        }

        private drawStoneBorder() {
          const border = this.add.graphics().setDepth(65);
          border.lineStyle(3, 0x413b2e, 0.9);
          const corners = [this.iso(0, 0), this.iso(COLS - 1, 0), this.iso(COLS - 1, ROWS - 1), this.iso(0, ROWS - 1)];
          border.strokePoints(corners.map(point => new Phaser.Geom.Point(point.x, point.y + TILE_H / 2)), true);
        }

        private drawFacility(col: number, row: number, texture: string, label: string, width: number, height: number) {
          const point = this.iso(col + 0.5, row + 0.45);
          this.add.image(point.x, point.y - 24, texture).setOrigin(0.5, 1).setDisplaySize(width, height).setDepth(120 + (col + row + 2) * 10);
          const sign = this.add.text(point.x, point.y - height - 24, label, { fontFamily: '"Microsoft JhengHei", sans-serif', fontSize: "11px", color: "#f6df9b", backgroundColor: "#1d1710d9", padding: { x: 5, y: 2 } });
          sign.setOrigin(0.5, 1).setDepth(840);
        }

        private drawMarket(col: number, row: number) {
          const point = this.iso(col + 0.5, row + 0.5);
          this.add.image(point.x, point.y - 10, "map-market").setOrigin(0.5, 1).setDisplaySize(118, 92).setDepth(120 + (col + row + 2) * 10);
        }

        private drawGate(col: number, row: number) {
          const point = this.iso(col + 1, row);
          this.add.image(point.x, point.y - 6, "map-portal").setOrigin(0.5, 1).setDisplaySize(128, 102).setDepth(120 + (col + row + 2) * 10);
        }

        private drawDestination(id: Destination, color: number) {
          const target = destinations[id];
          const point = this.iso(target.col, target.row);
          const g = this.add.graphics().setDepth(70);
          this.diamond(g, point.x, point.y + 3, color, 0.52);
          const text = this.add.text(point.x, point.y + 10, target.label, { fontFamily: '"Microsoft JhengHei", sans-serif', fontSize: "13px", color: "#fff5d6", backgroundColor: "#102224dd", padding: { x: 6, y: 3 } });
          text.setOrigin(0.5, 1).setDepth(860);
        }

        private rebuild() {
          this.drawWorld();
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        audio: { noAudio: true },
        transparent: true,
        backgroundColor: "rgba(0,0,0,0)",
        scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
        render: { antialias: true },
        scene: WorldScene,
      });
    }

    boot();
    return () => { cancelled = true; gameRef.current?.destroy(true); gameRef.current = null; };
  }, []);

  const navigate = (destination: Destination) => {
    if (!tutorialLocked) onEnter(destination);
  };

  return (
    <section className="isometric-world" aria-label={`${cityName}斜角城鎮地圖`} data-objective-expanded={objectiveExpanded} data-npc-labels={npcLabelsVisible ? "shown" : "hidden"}>
      <div ref={hostRef} className="isometric-world-canvas" />
      <div className="village-npc-layer" aria-label="漢陽村 NPC">
        {[...VILLAGE_NPCS, HANYANG_MYSTERY_NPC].filter(npc => (npcVisible?.(npc.id) ?? true) && (!tutorialLocked || tutorialNpcIds?.includes(npc.id))).map(npc => <button key={npc.id} type="button" className={'village-npc-pin'+(tutorialLocked && tutorialNpcIds?.includes(npc.id) ? ' tutorial-target' : '')} style={{ left: `${npc.map.x}%`, top: `${npc.map.y}%` }} onClick={() => onNpcTalk(npc.id)} aria-label={`與${npc.role}${npc.name}交談`}>
          <span>●</span><b>{npc.name}</b><small>{npc.role}</small>
        </button>)}
      </div>
      <button type="button" className="village-city-hall-pin" disabled={tutorialLocked} onClick={() => navigate("hall")} aria-label="前往市政廳委託公告">
        <span className="village-city-hall-icon" aria-hidden="true">♜</span>
        <span><b>市政廳</b><small>委託公告</small></span>
      </button>
      <header className="isometric-world-heading"><small>目前所在</small><strong>{locationLabel}</strong><span>選擇設施互動</span></header>
      <button type="button" className="map-label-toggle" disabled={tutorialLocked} aria-pressed={npcLabelsVisible} aria-label={npcLabelsVisible ? "隱藏 NPC 名牌" : "顯示 NPC 名牌"} onClick={() => onNpcLabelsVisibleChange(!npcLabelsVisible)}>
        {npcLabelsVisible ? "隱藏 NPC 名牌" : "顯示 NPC 名牌"}
      </button>
      <nav className="isometric-destinations" aria-label="快速前往據點" aria-disabled={tutorialLocked}>
        <button type="button" disabled={tutorialLocked} onClick={() => navigate("city")}><b>市集</b><span>商店與客棧</span></button>
        <button type="button" disabled={tutorialLocked} onClick={() => navigate("trade")}><b>港口</b><span>東海商路</span></button>
        <button type="button" disabled={tutorialLocked} onClick={() => navigate("battle")}><b>城門</b><span>野外與副本</span></button>
        <button type="button" disabled={tutorialLocked} onClick={() => navigate("raid")}><b>雷霆祭壇</b><span>神仙谷首領戰</span></button>
        <button type="button" disabled={tutorialLocked} onClick={() => navigate("hall")}><b>市政廳</b><span>村莊委託公告欄</span></button>
      </nav>
      <output className="isometric-status" aria-live="polite">點擊 NPC 或設施互動</output>
    </section>
  );
}
