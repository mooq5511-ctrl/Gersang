"use client";

import { useEffect, useRef, useState } from "react";

const COLS = 12;
const ROWS = 12;
const TILE_W = 72;
const TILE_H = 36;

type Cell = { col: number; row: number };
type Destination = "city" | "trade" | "battle";

const blocked = new Set([
  "1,1", "1,2", "2,1", "2,2",
  "8,1", "8,2", "9,1", "9,2",
  "4,5", "5,5", "4,6", "5,6",
  "8,8", "9,8", "8,9", "9,9",
  "2,8", "2,9", "3,8", "3,9",
]);

const destinations: Record<Destination, Cell & { label: string }> = {
  city: { col: 3, row: 4, label: "市集" },
  trade: { col: 7, row: 3, label: "港口" },
  battle: { col: 7, row: 9, label: "城門" },
};

const cellKey = (cell: Cell) => `${cell.col},${cell.row}`;

function findPath(start: Cell, goal: Cell) {
  const open: Cell[] = [start];
  const cameFrom = new Map<string, Cell>();
  const cost = new Map<string, number>([[cellKey(start), 0]]);
  const moves = [
    { col: 1, row: 0 }, { col: -1, row: 0 }, { col: 0, row: 1 }, { col: 0, row: -1 },
    { col: 1, row: 1 }, { col: -1, row: -1 }, { col: 1, row: -1 }, { col: -1, row: 1 },
  ];

  while (open.length) {
    open.sort((a, b) => {
      const ah = Math.abs(goal.col - a.col) + Math.abs(goal.row - a.row);
      const bh = Math.abs(goal.col - b.col) + Math.abs(goal.row - b.row);
      return (cost.get(cellKey(a)) ?? 0) + ah - ((cost.get(cellKey(b)) ?? 0) + bh);
    });
    const current = open.shift()!;
    if (cellKey(current) === cellKey(goal)) {
      const path: Cell[] = [];
      let cursor = current;
      while (cellKey(cursor) !== cellKey(start)) {
        path.unshift(cursor);
        cursor = cameFrom.get(cellKey(cursor))!;
      }
      return path;
    }
    for (const move of moves) {
      const next = { col: current.col + move.col, row: current.row + move.row };
      if (next.col < 0 || next.row < 0 || next.col >= COLS || next.row >= ROWS || blocked.has(cellKey(next))) continue;
      const diagonal = move.col !== 0 && move.row !== 0;
      if (diagonal && (blocked.has(`${current.col + move.col},${current.row}`) || blocked.has(`${current.col},${current.row + move.row}`))) continue;
      const nextCost = (cost.get(cellKey(current)) ?? 0) + (diagonal ? 1.4 : 1);
      if (nextCost < (cost.get(cellKey(next)) ?? Infinity)) {
        cost.set(cellKey(next), nextCost);
        cameFrom.set(cellKey(next), current);
        if (!open.some((cell) => cellKey(cell) === cellKey(next))) open.push(next);
      }
    }
  }
  return [];
}

export function IsometricWorldMap({
  cityName,
  heroImage,
  onEnter,
}: {
  cityName: string;
  heroImage: string;
  onEnter: (destination: Destination) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas?: boolean) => void } | null>(null);
  const enterRef = useRef(onEnter);
  const [status, setStatus] = useState("點擊地面移動");
  enterRef.current = onEnter;

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      class WorldScene extends Phaser.Scene {
        private originX = 0;
        private originY = 0;
        private actor!: Phaser.GameObjects.Container;
        private actorCell: Cell = { col: 6, row: 10 };
        private marker!: Phaser.GameObjects.Graphics;
        private route: Cell[] = [];
        private movement?: Phaser.Tweens.Tween;
        private targetDestination?: Destination;

        preload() {
          this.load.image("map-hero", heroImage);
          this.load.image("map-reference-field", "/game-assets/reference-field.png");
          this.load.image("map-shallow", "/game-assets/map-shallow-0.png");
          this.load.image("map-pond", "/game-assets/map-korea-pond-0.png");
          this.load.image("map-tree", "/game-assets/map-china-tree-0.png");
          this.load.image("map-portal", "/game-assets/map-field-portal-0.png");
          this.load.image("map-inn", "/game-assets/building-korea-inn-0.png");
          this.load.image("map-market", "/game-assets/building-korea-market-0.png");
        }

        create() {
          this.drawWorld();
          this.marker = this.add.graphics().setDepth(900);
          this.actor = this.createActor();
          this.positionActor(this.actorCell);
          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.moveTo(this.cellFromScreen(pointer.x, pointer.y)));
          const navigate = (event: Event) => {
            const destination = (event as CustomEvent<Destination>).detail;
            this.targetDestination = destination;
            this.moveTo(destinations[destination]);
          };
          window.addEventListener("gersang:navigate-map", navigate);
          this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener("gersang:navigate-map", navigate));
          this.scale.on("resize", () => this.rebuild());
        }

        private iso(col: number, row: number) {
          return { x: this.originX + (col - row) * TILE_W / 2, y: this.originY + (col + row) * TILE_H / 2 };
        }

        private cellFromScreen(x: number, y: number): Cell {
          const dx = x - this.originX;
          const dy = y - this.originY;
          return { col: Math.floor(dy / TILE_H + dx / TILE_W), row: Math.floor(dy / TILE_H - dx / TILE_W) };
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
          this.originX = this.scale.width / 2;
          this.originY = Math.max(36, (this.scale.height - ROWS * TILE_H) / 2 - 8);
          this.add.image(this.scale.width / 2, this.scale.height / 2, "map-reference-field")
            .setDisplaySize(this.scale.width, this.scale.height).setDepth(-20);
          this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x102b26, 0.2).setDepth(-19);

          const roads = new Set<string>();
          for (let i = 0; i < COLS; i++) { roads.add(`${i},4`); roads.add(`${i},10`); }
          for (let i = 0; i < ROWS; i++) roads.add(`6,${i}`);
          const ground = this.add.graphics();
          for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
            const point = this.iso(col, row);
            const isRoad = roads.has(`${col},${row}`);
            if (!isRoad && (col + row) % 2 === 0) {
              this.add.image(point.x, point.y + TILE_H / 2, "map-shallow").setDisplaySize(TILE_W, TILE_H).setDepth(0);
            }
            this.diamond(ground, point.x, point.y, isRoad ? 0x9c8c6e : 0x416b4e, isRoad ? 0.9 : 0.18);
            ground.lineStyle(1, isRoad ? 0x5c513e : 0x6b9b6a, isRoad ? 0.7 : 0.3);
            ground.strokePoints([
              new Phaser.Geom.Point(point.x, point.y), new Phaser.Geom.Point(point.x + TILE_W / 2, point.y + TILE_H / 2),
              new Phaser.Geom.Point(point.x, point.y + TILE_H), new Phaser.Geom.Point(point.x - TILE_W / 2, point.y + TILE_H / 2),
            ], true);
          }
          this.drawHouse(1, 1, 0x7f3229, 0xc8783d);
          this.drawHouse(8, 1, 0x365d70, 0xcfa557);
          this.drawPond(4, 5);
          this.drawMarket(8, 8);
          this.drawTrees(2, 8);
          this.drawGate(7, 9);
          this.drawDestination("city", 0xd7a647);
          this.drawDestination("trade", 0x65b4b0);
          this.drawDestination("battle", 0xc96649);
        }

        private drawHouse(col: number, row: number, wall: number, roof: number) {
          const point = this.iso(col + 0.5, row + 0.45);
          this.add.image(point.x, point.y - 24, "map-inn").setOrigin(0.5, 1).setDisplaySize(108, 94).setDepth(120 + (col + row + 2) * 10);
        }

        private drawPond(col: number, row: number) {
          const point = this.iso(col + 0.5, row + 0.5);
          this.add.image(point.x, point.y + 15, "map-pond").setOrigin(0.5, 0.5).setDisplaySize(190, 126).setDepth(30);
        }

        private drawMarket(col: number, row: number) {
          const point = this.iso(col + 0.5, row + 0.5);
          this.add.image(point.x, point.y - 10, "map-market").setOrigin(0.5, 1).setDisplaySize(118, 92).setDepth(120 + (col + row + 2) * 10);
        }

        private drawTrees(col: number, row: number) {
          [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dc, dr]) => {
            const point = this.iso(col + dc, row + dr);
            this.add.image(point.x, point.y - 6, "map-tree").setOrigin(0.5, 1).setDisplaySize(74, 76).setDepth(120 + (col + row + dc + dr) * 10);
          });
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

        private createActor() {
          const shadow = this.add.ellipse(0, 12, 38, 13, 0x142a29, 0.45);
          const sprite = this.add.image(0, -17, "map-hero").setOrigin(0.5, 1).setDisplaySize(48, 66);
          return this.add.container(0, 0, [shadow, sprite]);
        }

        private positionActor(cell: Cell) {
          const point = this.iso(cell.col, cell.row);
          this.actor.setPosition(point.x, point.y + TILE_H / 2 - 5).setDepth(130 + (cell.col + cell.row) * 10);
        }

        private moveTo(destination: Cell) {
          if (destination.col < 0 || destination.row < 0 || destination.col >= COLS || destination.row >= ROWS || blocked.has(cellKey(destination))) {
            this.targetDestination = undefined; setStatus("該處無法通行"); return;
          }
          const clickedDestination = (Object.entries(destinations) as Array<[Destination, Cell]>).find(([, cell]) => cellKey(cell) === cellKey(destination));
          if (clickedDestination) this.targetDestination = clickedDestination[0];
          const path = findPath(this.actorCell, destination);
          if (!path.length && cellKey(destination) !== cellKey(this.actorCell)) { this.targetDestination = undefined; setStatus("找不到可行路線"); return; }
          if (!this.targetDestination || cellKey(destinations[this.targetDestination]) !== cellKey(destination)) this.targetDestination = undefined;
          this.movement?.stop();
          this.route = path;
          this.drawMarker(destination);
          setStatus(path.length ? `前往 ${this.targetDestination ? destinations[this.targetDestination].label : "目的地"}` : "已在目的地");
          this.walkNext();
        }

        private drawMarker(cell: Cell) {
          this.tweens.killTweensOf(this.marker); this.marker.clear(); this.marker.setAlpha(1);
          const point = this.iso(cell.col, cell.row);
          this.marker.lineStyle(3, 0xf5d36f, 0.95);
          this.marker.strokePoints([new Phaser.Geom.Point(point.x, point.y + 4), new Phaser.Geom.Point(point.x + 29, point.y + 18), new Phaser.Geom.Point(point.x, point.y + 32), new Phaser.Geom.Point(point.x - 29, point.y + 18)], true);
          this.tweens.add({ targets: this.marker, alpha: { from: 0.35, to: 1 }, duration: 430, yoyo: true, repeat: -1 });
        }

        private walkNext() {
          const next = this.route.shift();
          if (!next) {
            const destination = this.targetDestination;
            this.targetDestination = undefined;
            setStatus(destination ? `抵達${destinations[destination].label}` : "已抵達");
            if (destination) this.time.delayedCall(220, () => enterRef.current(destination));
            return;
          }
          const point = this.iso(next.col, next.row);
          this.movement = this.tweens.add({
            targets: this.actor, x: point.x, y: point.y + TILE_H / 2 - 5, duration: 145, ease: "Linear",
            onStart: () => this.actor.setDepth(130 + (next.col + next.row) * 10),
            onComplete: () => { this.actorCell = next; this.walkNext(); },
          });
        }

        private rebuild() {
          const saved = this.actorCell;
          this.tweens.killAll(); this.drawWorld(); this.marker = this.add.graphics().setDepth(900); this.actor = this.createActor(); this.actorCell = saved; this.positionActor(saved);
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        backgroundColor: "#315f63",
        scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
        render: { antialias: true },
        scene: WorldScene,
      });
    }

    boot();
    return () => { cancelled = true; gameRef.current?.destroy(true); gameRef.current = null; };
  }, [heroImage]);

  const navigate = (destination: Destination) => window.dispatchEvent(new CustomEvent("gersang:navigate-map", { detail: destination }));

  return (
    <section className="isometric-world" aria-label={`${cityName}斜角城鎮地圖`}>
      <div ref={hostRef} className="isometric-world-canvas" />
      <header className="isometric-world-heading"><small>目前所在</small><strong>{cityName}</strong><span>點擊地面移動</span></header>
      <nav className="isometric-destinations" aria-label="快速前往據點">
        <button type="button" onClick={() => navigate("city")}><b>市集</b><span>商店與客棧</span></button>
        <button type="button" onClick={() => navigate("trade")}><b>港口</b><span>東海商路</span></button>
        <button type="button" onClick={() => navigate("battle")}><b>城門</b><span>野外與副本</span></button>
      </nav>
      <output className="isometric-status" aria-live="polite">{status}</output>
    </section>
  );
}
