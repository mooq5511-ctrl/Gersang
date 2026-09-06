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
          const bg = this.add.graphics().setDepth(-20);
          bg.fillGradientStyle(0x8eb6ad, 0x8eb6ad, 0x315f63, 0x315f63, 1);
          bg.fillRect(0, 0, this.scale.width, this.scale.height);
          for (let y = 10; y < this.scale.height; y += 22) {
            bg.lineStyle(1, 0xd6ebe2, 0.13); bg.lineBetween(0, y, this.scale.width, y - 26);
          }

          const roads = new Set<string>();
          for (let i = 0; i < COLS; i++) { roads.add(`${i},4`); roads.add(`${i},10`); }
          for (let i = 0; i < ROWS; i++) roads.add(`6,${i}`);
          const ground = this.add.graphics();
          for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
            const point = this.iso(col, row);
            const color = roads.has(`${col},${row}`) ? 0xb3a37d : (col + row) % 3 ? 0x678d57 : 0x759a62;
            this.diamond(ground, point.x, point.y, color);
            ground.lineStyle(1, 0x3d684b, 0.52);
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
          const g = this.add.graphics().setDepth(120 + (col + row + 2) * 10);
          g.fillStyle(wall); g.fillRect(point.x - 38, point.y - 34, 76, 55);
          g.fillStyle(0x203736); g.fillRect(point.x - 9, point.y - 5, 18, 26);
          g.fillStyle(0xefd088); g.fillRect(point.x - 30, point.y - 16, 14, 12); g.fillRect(point.x + 16, point.y - 16, 14, 12);
          g.fillStyle(roof); g.fillPoints([new Phaser.Geom.Point(point.x, point.y - 73), new Phaser.Geom.Point(point.x + 54, point.y - 31), new Phaser.Geom.Point(point.x, point.y - 12), new Phaser.Geom.Point(point.x - 54, point.y - 31)], true);
        }

        private drawPond(col: number, row: number) {
          const g = this.add.graphics().setDepth(30);
          for (let r = row; r < row + 2; r++) for (let c = col; c < col + 2; c++) {
            const point = this.iso(c, r); this.diamond(g, point.x, point.y, 0x3e858c);
            g.lineStyle(2, 0xb0dfd4, 0.4); g.lineBetween(point.x - 17, point.y + 17, point.x + 12, point.y + 17);
          }
        }

        private drawMarket(col: number, row: number) {
          const point = this.iso(col + 0.5, row + 0.5);
          const g = this.add.graphics().setDepth(120 + (col + row + 2) * 10);
          g.fillStyle(0x65402f); g.fillRect(point.x - 44, point.y - 18, 88, 40);
          g.fillStyle(0xe0b761); g.fillRect(point.x - 50, point.y - 50, 100, 18);
          for (let x = -42; x < 48; x += 20) { g.fillStyle(x % 40 ? 0xaa392f : 0xf0cf86); g.fillRect(point.x + x, point.y - 50, 12, 18); }
        }

        private drawTrees(col: number, row: number) {
          [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dc, dr]) => {
            const point = this.iso(col + dc, row + dr);
            const g = this.add.graphics().setDepth(120 + (col + row + dc + dr) * 10);
            g.fillStyle(0x413128); g.fillRect(point.x - 5, point.y - 27, 10, 44);
            g.fillStyle(0x315b40); g.fillCircle(point.x, point.y - 37, 23); g.fillCircle(point.x - 12, point.y - 27, 16); g.fillCircle(point.x + 13, point.y - 28, 16);
          });
        }

        private drawGate(col: number, row: number) {
          const point = this.iso(col + 1, row);
          const g = this.add.graphics().setDepth(120 + (col + row + 2) * 10);
          g.fillStyle(0x6c4c34); g.fillRect(point.x - 53, point.y - 50, 16, 68); g.fillRect(point.x + 37, point.y - 50, 16, 68);
          g.fillStyle(0x7e2e28); g.fillRect(point.x - 62, point.y - 65, 124, 20);
          g.fillStyle(0xd1aa54); g.fillRect(point.x - 20, point.y - 61, 40, 12);
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
