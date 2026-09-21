/**
 * UI-agnostic 12 vs 12 real-time auto-combat engine.
 * Time is supplied by the caller through update(deltaSeconds), so it can run
 * from requestAnimationFrame, a server tick, or an offline simulation loop.
 */
import { mitigatedDamage } from './combat-damage.js';

export class Unit {
  constructor({ id, side, hp, maxHp, atk, def, magicDef = def, physicalResist = 0, magicResist = 0, attackInterval = 1.5, cooldown = 0, mp = 0, skillPower = 0, position }) {
    if (!id) throw new Error('Unit.id is required.');
    if (side !== 'player' && side !== 'enemy') throw new Error('Unit.side must be player or enemy.');
    if (!position || !Number.isInteger(position.row) || !Number.isInteger(position.col) || position.row < 0 || position.row > 2 || position.col < 0 || position.col > 3) {
      throw new Error(`${id} requires a 3 × 4 position: { row: 0..2, col: 0..3 }.`);
    }

    this.id = id;
    this.side = side;
    this.maxHp = Math.max(1, Number(maxHp) || 1);
    this.hp = Math.max(0, Math.min(this.maxHp, Number(hp) || 0));
    this.atk = Math.max(0, Number(atk) || 0);
    this.def = Math.max(0, Number(def) || 0);
    this.magicDef = Math.max(0, Number(magicDef) || 0);
    this.physicalResist = Number(physicalResist) || 0;
    this.magicResist = Number(magicResist) || 0;
    this.attackInterval = Math.max(0.05, Number(attackInterval) || 1.5);
    this.cooldown = Math.max(0, Number(cooldown) || 0);
    this.mp = Math.max(0, Math.min(100, Number(mp) || 0));
    this.skillPower = Math.max(0, Number(skillPower) || 0);
    this.position = { row: position.row, col: position.col };
  }

  get alive() { return this.hp > 0; }
}

export class RealtimeBattleSystem {
  constructor(players = [], enemies = [], { skillMultiplier = 2, autoSkill = true } = {}) {
    if (players.length > 12 || enemies.length > 12) throw new Error('RealtimeBattleSystem supports at most 12 units per side.');
    this.players = players.map(unit => unit instanceof Unit ? unit : new Unit(unit));
    this.enemies = enemies.map(unit => unit instanceof Unit ? unit : new Unit(unit));
    if (this.players.some(unit => unit.side !== 'player') || this.enemies.some(unit => unit.side !== 'enemy')) throw new Error('Units must be placed in the matching side list.');

    this.skillMultiplier = Math.max(1, Number(skillMultiplier) || 2);
    this.autoSkill = Boolean(autoSkill);
    this.timeMs = 0;
    this.running = false;
    this.winner = null;
    this.events = [];
    this.eventId = 0;
  }

  get units() { return [...this.players, ...this.enemies]; }
  living(side) { return (side === 'player' ? this.players : this.enemies).filter(unit => unit.alive); }

  /** Starts the clock and resolves every living unit's opening attack as one simultaneous batch. */
  startBattle() {
    if (this.running || this.winner) return this.events;
    if (!this.living('player').length || !this.living('enemy').length) return this.finishIfNeeded();
    this.running = true;
    this.log('battle-start', { playerCount: this.living('player').length, enemyCount: this.living('enemy').length });
    this.resolveReadyAttacks(this.living('player').concat(this.living('enemy')));
    return this.events;
  }

  /**
   * Advances a precise time slice in seconds. The loop stops at every due
   * attack moment so a large offline delta has the same result as many frames.
   */
  update(deltaTime) {
    if (!this.running || this.winner) return this.events;
    let remainingMs = Math.max(0, Number(deltaTime) || 0) * 1000;
    const epsilon = 0.0001;

    while (remainingMs > epsilon && this.running) {
      const living = this.living('player').concat(this.living('enemy'));
      if (!living.length || this.finishIfNeeded()) break;
      const nextReadyIn = Math.min(...living.map(unit => Math.max(0, unit.cooldown)));
      const step = Math.min(remainingMs, nextReadyIn);

      if (step > epsilon) {
        for (const unit of living) unit.cooldown = Math.max(0, unit.cooldown - step);
        this.timeMs += step;
        remainingMs -= step;
      }

      const ready = this.living('player').concat(this.living('enemy')).filter(unit => unit.cooldown <= epsilon);
      if (ready.length) this.resolveReadyAttacks(ready);
      else if (step <= epsilon) break;
    }
    return this.events;
  }

  /**
   * Left-versus-right targeting:
   * - Player attacks Enemy col 0 → 1 → 2 → 3.
   * - Enemy attacks Player col 3 → 2 → 1 → 0.
   * Same row wins first; if empty, the nearest row wins before front depth.
   */
  findTarget(attacker) {
    const candidates = this.living(attacker.side === 'player' ? 'enemy' : 'player');
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => {
      const rowDistance = Math.abs(a.position.row - attacker.position.row) - Math.abs(b.position.row - attacker.position.row);
      if (rowDistance) return rowDistance;
      const column = attacker.side === 'player'
        ? a.position.col - b.position.col
        : b.position.col - a.position.col;
      return column || a.id.localeCompare(b.id);
    })[0];
  }

  damageFor(attacker, defender, multiplier = 1, skill = false) {
    const attackPower = skill && attacker.skillPower > 0 ? attacker.skillPower : attacker.atk * multiplier;
    return mitigatedDamage(attackPower, defender.def);
  }

  /**
   * Snapshots all targets before applying damage. This is why opening attacks
   * remain simultaneous even when the first damage instance kills a target.
   */
  resolveReadyAttacks(actors) {
    const actions = actors
      .filter(actor => actor.alive)
      .map(actor => {
        const target = this.findTarget(actor);
        if (!target) return null;
        const skill = this.autoSkill && actor.mp >= 100;
        return { actor, target, skill, damage: this.damageFor(actor, target, skill ? this.skillMultiplier : 1, skill) };
      })
      .filter(Boolean);

    if (!actions.length) return this.finishIfNeeded();

    const incoming = new Map();
    for (const action of actions) {
      action.actor.cooldown = action.actor.attackInterval * 1000;
      if (action.skill) action.actor.mp = 0;
      else action.actor.mp = Math.min(100, action.actor.mp + 20);
      this.log('attack', {
        actorId: action.actor.id,
        targetId: action.target.id,
        sourcePosition: { ...action.actor.position },
        targetPosition: { ...action.target.position },
        ability: action.skill ? 'skill' : 'attack',
        mpAfter: action.actor.mp,
      });
      incoming.set(action.target.id, [...(incoming.get(action.target.id) || []), action]);
    }

    for (const [targetId, hits] of incoming) {
      const target = this.units.find(unit => unit.id === targetId);
      if (!target) continue;
      for (const hit of hits) {
        const hpBefore = target.hp;
        const dealt = Math.min(hpBefore, hit.damage);
        target.hp = Math.max(0, hpBefore - hit.damage);
        this.log('damage', {
          actorId: hit.actor.id,
          targetId: target.id,
          sourcePosition: { ...hit.actor.position },
          targetPosition: { ...target.position },
          ability: hit.skill ? 'skill' : 'attack',
          damage: dealt,
          hpAfter: target.hp,
        });
      }
      if (target.hp <= 0) {
        const finishingHit = hits[hits.length - 1];
        this.log('death', {
          actorId: finishingHit?.actor.id,
          targetId: target.id,
          sourcePosition: finishingHit ? { ...finishingHit.actor.position } : undefined,
          targetPosition: { ...target.position },
        });
      }
    }
    return this.finishIfNeeded();
  }

  /** Runs a headless battle; a 0.1 second step is suitable for offline resolution. */
  simulateUntilFinished({ stepSeconds = 0.1, maxSeconds = 300 } = {}) {
    if (!this.running) this.startBattle();
    const maxSteps = Math.ceil(maxSeconds / stepSeconds);
    for (let step = 0; this.running && step < maxSteps; step += 1) this.update(stepSeconds);
    return { winner: this.winner, elapsedMs: Math.round(this.timeMs), events: this.events };
  }

  /** Serializable state used by React/localStorage between game ticks. */
  snapshot() {
    const copy = unit => ({
      id: unit.id, side: unit.side, hp: unit.hp, maxHp: unit.maxHp,
      atk: unit.atk, def: unit.def, magicDef: unit.magicDef, physicalResist: unit.physicalResist, magicResist: unit.magicResist, attackInterval: unit.attackInterval,
      cooldown: unit.cooldown, mp: unit.mp, position: { ...unit.position },
      skillPower: unit.skillPower,
    });
    return {
      players: this.players.map(copy), enemies: this.enemies.map(copy),
      skillMultiplier: this.skillMultiplier, autoSkill: this.autoSkill, timeMs: this.timeMs,
      running: this.running, winner: this.winner, eventId: this.eventId,
      events: this.events.slice(-160),
    };
  }

  static fromSnapshot(snapshot) {
    const battle = new RealtimeBattleSystem(snapshot.players || [], snapshot.enemies || [], { skillMultiplier: snapshot.skillMultiplier, autoSkill: snapshot.autoSkill !== false });
    battle.timeMs = Number(snapshot.timeMs) || 0;
    battle.running = Boolean(snapshot.running);
    battle.winner = snapshot.winner || null;
    battle.eventId = Number(snapshot.eventId) || 0;
    battle.events = Array.isArray(snapshot.events) ? [...snapshot.events] : [];
    return battle;
  }

  finishIfNeeded() {
    if (this.winner) return true;
    const playersAlive = this.living('player').length;
    const enemiesAlive = this.living('enemy').length;
    if (playersAlive && enemiesAlive) return false;
    this.running = false;
    this.winner = playersAlive ? 'player' : enemiesAlive ? 'enemy' : 'draw';
    this.log('battle-end', { winner: this.winner });
    return true;
  }

  log(type, detail = {}) {
    const event = { id: ++this.eventId, timeMs: Math.round(this.timeMs), type, ...detail };
    this.events.push(event);
    return event;
  }
}

/** A 3 rows × 4 columns test formation for console or automated tests. */
export function createTwelveUnitDemo() {
  const makeSide = (side) => Array.from({ length: 12 }, (_, index) => new Unit({
    id: `${side}-${index + 1}`,
    side,
    hp: side === 'player' ? 260 : 230,
    maxHp: side === 'player' ? 260 : 230,
    atk: side === 'player' ? 38 + index : 32 + index,
    def: 10 + (index % 4) * 3,
    attackInterval: 0.8 + (index % 4) * 0.2,
    mp: index === 0 ? 100 : 0,
    position: { row: Math.floor(index / 4), col: index % 4 },
  }));
  return new RealtimeBattleSystem(makeSide('player'), makeSide('enemy'));
}
