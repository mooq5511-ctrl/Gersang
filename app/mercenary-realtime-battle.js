import { RealtimeBattleSystem } from './realtime-battle-engine.js';
import { mitigatedDamage } from './combat-damage.js';
import { mercenarySpec } from './mercenary-roster.ts';
import { AMATERASU_GAZE } from './equipment-set-effects.ts';
import { formationDamageMultiplier, rearDodge } from './formation-position.ts';

const freshState = () => ({ readyAt: 0, actions: 0, stacks: 0, lastTarget: '', streak: 0, survived: false, counterRound: -1, guardKey: '', guardUntil: 0, effects: {}, shield: 0, shieldUntil: 0, bossRuntime: {} });
const byRatio = (a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id);

/** World-map real-time skills use the same stable merchant IDs as the tactical encounter. */
export class MercenaryRealtimeBattleSystem extends RealtimeBattleSystem {
  constructor(players = [], enemies = [], options = {}) {
    super(players, enemies, options);
    this.seed = Number(options.seed) || 1;
    this.terrain = options.terrain || 'field';
    this.woodland = ['forest', 'mountain', 'stockade', 'alishan', 'black-forest', 'hallasan', 'datun-mountain', 'miasma-forest'].includes(this.terrain);
    for (const [index, unit] of this.players.entries()) this.attach(unit, players[index]);
    for (const [index, unit] of this.enemies.entries()) this.attach(unit, enemies[index]);
    this.aidApplied = Boolean(options.aidApplied);
  }

  attach(unit, raw = {}) {
    unit.templateId = raw.templateId || '';
    unit.spec = mercenarySpec(unit.templateId);
    unit.maxMp = unit.spec ? Math.max(0, Number(raw.maxMp ?? 40)) : 100;
    unit.mp = Math.max(0, Math.min(unit.maxMp, Number(raw.mp) || 0));
    unit.kind = raw.kind || 'human';
    unit.boss = Boolean(raw.boss);
    unit.poisonAttack = Boolean(raw.poisonAttack);
    unit.magicAttack = Boolean(raw.magicAttack);
    unit.ranged = raw.ranged !== false;
    unit.accuracy = Math.max(0.05, Math.min(1, Number(raw.accuracy ?? 1)));
    unit.amaterasuGaze = Boolean(raw.amaterasuGaze);
    unit.formationPosition = raw.formationPosition || '中排';
    unit.generalSkillName = typeof raw.generalSkillName === 'string' ? raw.generalSkillName : '';
    unit.state = { ...freshState(), ...raw.mercenaryState, effects: { ...raw.mercenaryState?.effects } };
  }

  roll() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  effect(unit, key) {
    const entry = unit.state.effects[key];
    return entry && entry.until > this.timeMs ? entry.value : 0;
  }

  setEffect(unit, key, value, rounds) {
    unit.state.effects[key] = { value, until: this.timeMs + rounds * unit.attackInterval * 1000 + 1 };
  }

  setTimedEffect(unit, key, value, durationMs) {
    unit.state.effects[key] = { value, until: this.timeMs + durationMs };
  }

  attack(unit) {
    let amount = unit.atk * (1 - Math.max(this.effect(unit, 'shamanWeak'), this.effect(unit, 'elephantWeak'), this.effect(unit, 'bossCurseAttack')));
    if (unit.spec?.id === 'blade') amount *= 1 + unit.state.stacks * 0.03;
    if (unit.spec?.id === 'sanada' && unit.hp < unit.maxHp * 0.45) amount *= 1.15;
    if (unit.side === 'player') amount *= formationDamageMultiplier(unit.formationPosition);
    return amount;
  }

  defense(unit) {
    let amount = unit.def * (1 - Math.max(this.effect(unit, 'spearArmor'), this.effect(unit, 'sanadaArmor'), this.effect(unit, 'bossCurseDefense'), this.effect(unit, 'amaterasuFearDefense')));
    amount *= 1 + this.effect(unit, 'bossShield');
    if (unit.spec?.id === 'shield' && unit.hp > unit.maxHp * 0.5) amount *= 1.2;
    if (unit.spec?.id === 'sanada' && unit.hp < unit.maxHp * 0.45) amount *= 1.15;
    return amount;
  }

  heal(source, target, amount, name) {
    if (!target?.alive) return;
    const restored = Math.max(0, Math.min(target.maxHp - target.hp, Math.floor(amount * (target.spec?.id === 'elephant' ? 0.9 : 1))));
    target.hp += restored;
    this.log('heal', { actorId: source.id, targetId: target.id, skillName: name, amount: restored, hpAfter: target.hp });
  }

  sortedEnemies(actor) {
    return this.living(actor.side === 'player' ? 'enemy' : 'player').sort((a, b) => a.position.col - b.position.col || a.position.row - b.position.row);
  }

  skillTargets(actor) {
    const foes = this.sortedEnemies(actor);
    const id = actor.spec?.id;
    const front = foes.filter(unit => unit.position.col === foes[0]?.position.col);
    if (id === 'mazu') return foes;
    if (id === 'cannon') return foes.slice(0, 3);
    if (id === 'blade' || id === 'elephant') return front.slice(0, 3);
    if (id === 'onmyoji') return [...foes].sort((a, b) => a.attackInterval - b.attackInterval).slice(0, 2);
    if (id === 'ninja') { const rear = foes.filter(unit => unit.position.col === Math.max(...foes.map(unit => unit.position.col))); return [...rear].sort((a, b) => this.defense(a) - this.defense(b)).slice(0, 1); }
    if (id === 'gunner') return [...foes].sort((a, b) => this.defense(b) - this.defense(a)).slice(0, 1);
    if (id === 'shaman' || id === 'escort') return [...foes].sort((a, b) => this.attack(b) - this.attack(a)).slice(0, 1);
    if (id === 'hunter') return [...foes].sort((a, b) => a.attackInterval - b.attackInterval).slice(0, 1);
    if (id === 'archer') return [...foes].sort(byRatio).slice(0, 1);
    if (id === 'swordmaster') return [...front].sort(byRatio).slice(0, 1);
    if (id === 'sanada') { const lead = front[0]; return lead ? [lead, ...foes.filter(unit => unit !== lead && Math.abs(unit.position.row - lead.position.row) <= 1 && Math.abs(unit.position.col - lead.position.col) <= 1)].slice(0, 3) : []; }
    return front.slice(0, 1);
  }

  skillReady(actor) {
    const spec = actor.spec;
    if (!spec || !this.autoSkill || this.timeMs < actor.state.readyAt || actor.mp < spec.mp) return false;
    if (spec.id === 'healer' || spec.id === 'priest') {
      const allies = this.living('player');
      const patient = [...allies].sort(byRatio)[0];
      return Boolean(patient && patient.hp < patient.maxHp * (spec.id === 'healer' ? 0.65 : 0.7));
    }
    if (spec.id === 'shield') return this.living('player').some(unit => unit !== actor && unit.hp < unit.maxHp * 0.5);
    return true;
  }

  /** Plans attacks before applying any damage, preserving simultaneous opening hits. */
  resolveReadyAttacks(actors) {
    const plans = actors.filter(actor => actor.alive).map(actor => {
      if (this.effect(actor, 'poison')) {
        const damage = Math.min(actor.hp, Math.max(1, Math.floor(actor.maxHp * this.effect(actor, 'poison'))));
        actor.hp -= damage;
        this.log('damage', { actorId: actor.id, targetId: actor.id, ability: 'poison', damage, hpAfter: actor.hp });
        if (!actor.alive) { this.log('death', { actorId: actor.id, targetId: actor.id }); return null; }
      }
      if (this.effect(actor, 'stun') || (this.effect(actor, 'root') && !actor.ranged)) {
        this.log('status', { actorId: actor.id, skillName: this.effect(actor, 'stun') ? '暈眩' : '定身' });
        delete actor.state.effects.stun;
        delete actor.state.effects.root;
        actor.cooldown = actor.attackInterval * 1000;
        return null;
      }
      const cast = this.skillReady(actor);
      const spec = actor.spec;
      const genericSkill = !spec && this.autoSkill && actor.mp >= 100;
      const targets = cast ? (['healer', 'priest', 'shield'].includes(spec.id) ? [] : this.skillTargets(actor)) : [this.findTarget(actor)].filter(Boolean);
      actor.cooldown = actor.attackInterval * (actor.spec?.id === 'hunter' && this.woodland ? 1 / 1.15 : 1) * (1 + this.effect(actor, 'slow')) * 1000;
      actor.state.actions++;
      if (cast) {
        actor.mp -= spec.mp;
        actor.state.readyAt = this.timeMs + spec.cooldown * actor.attackInterval * 1000;
        this.log('skill', { actorId: actor.id, targetId: targets[0]?.id, skillName: spec.active, mpAfter: actor.mp });
      } else if (!spec && this.autoSkill && actor.mp >= 100) {
        actor.mp = 0;
        if (actor.generalSkillName) this.log('skill', { actorId: actor.id, targetId: targets[0]?.id, skillName: actor.generalSkillName, mpAfter: actor.mp });
      } else actor.mp = Math.min(actor.maxMp, actor.mp + 20);
      if (spec?.id === 'priest' && actor.state.actions % 3 === 0) {
        const restored = Math.min(4, actor.maxMp - actor.mp);
        actor.mp += restored;
        this.log('restore-mp', { actorId: actor.id, skillName: spec.passive, amount: restored });
      }
      return { actor, cast, spec, targets, genericSkill };
    }).filter(Boolean);

    const hits = [];
    const support = [];
    for (const plan of plans) {
      const { actor, cast, spec } = plan;
      if (cast && spec.id === 'healer') { support.push(plan); continue; }
      if (cast && spec.id === 'priest') { support.push(plan); continue; }
      if (cast && spec.id === 'shield') { support.push(plan); continue; }
      const targets = plan.targets;
      if (!targets.length) continue;
      for (const target of targets) {
        const id = cast ? spec.id : '';
        const area = targets.length > 1;
        const magic = ['shaman', 'onmyoji'].includes(id) || (!spec && actor.magicAttack);
        const multiplier = !cast ? 1 : ({ spear: 1.4, archer: target.hp < target.maxHp * 0.3 ? 2 : 1.7, shaman: 1.1, samurai: 1.8, ninja: 1.3, gunner: 1.8, onmyoji: 1, blade: targets.length === 1 ? 1.5 : 1.1, monk: target.boss ? 1.6 : 1.3, cannon: 1.3, escort: 0.75, hunter: 1.2, elephant: 1, swordmaster: 2.1, sanada: 1.55, mazu: 10 })[id] || 1;
        const repeat = id === 'escort' ? 2 : 1;
        for (let index = 0; index < repeat; index++) hits.push(this.planHit(actor, target, multiplier, magic, area, cast, id, plan.genericSkill));
      }
    }

    for (const hit of hits.filter(Boolean)) this.applyHit(hit);
    for (const plan of support) this.applySupport(plan);
    for (const plan of plans) if (plan.cast && plan.spec.id === 'mazu') for (const ally of this.living('player')) this.heal(plan.actor, ally, ally.maxHp * 0.5, '海神護航・治療');
    return this.finishIfNeeded();
  }

  planHit(actor, original, multiplier, magic, area, cast, id, genericSkill) {
    if (!original) return null;
    let target = original;
    let reduction = 1;
    if (!area) {
      const guard = this.players.find(unit => unit.alive && unit.state.guardKey === target.id && unit.state.guardUntil > this.timeMs);
      if (guard) { target = guard; guard.state.guardKey = ''; reduction = 0.6; this.log('skill', { actorId: guard.id, targetId: original.id, skillName: '舉盾護商・代受' }); }
    }
    this.log('attack', { actorId: actor.id, targetId: target.id, sourcePosition: { ...actor.position }, targetPosition: { ...target.position }, ability: cast ? 'skill' : 'attack', mpAfter: actor.mp });
    const blind = this.effect(actor, 'blind');
    let accuracy = actor.accuracy - blind;
    if (actor.spec?.id === 'hunter' && this.woodland) accuracy += 0.05;
    if (actor.spec?.id === 'gunner' && actor.state.lastTarget === target.id && actor.state.streak >= 2) accuracy += 0.1;
    if (actor.spec?.id === 'gunner') { actor.state.streak = actor.state.lastTarget === target.id ? actor.state.streak + 1 : 1; actor.state.lastTarget = target.id; }
    if (blind) delete actor.state.effects.blind;
    if (this.roll() >= Math.min(1, Math.max(0.05, accuracy)) || (!magic && !area && target.spec?.id === 'ninja' && this.roll() < 0.15)) {
      this.log('miss', { actorId: actor.id, targetId: target.id }); return null;
    }
    if (target.side === 'player' && rearDodge(target.formationPosition, this.roll())) { this.log('miss', { actorId: actor.id, targetId: target.id, skillName: '後排閃避' }); return null; }
    const amaterasuGaze = !cast && !genericSkill && actor.amaterasuGaze && this.roll() < AMATERASU_GAZE.procChance;
    let raw = amaterasuGaze ? actor.atk * AMATERASU_GAZE.attackMultiplier : this.attack(actor) * multiplier;
    if (amaterasuGaze) { this.setTimedEffect(original, 'amaterasuFearDefense', AMATERASU_GAZE.fearDefenseReduction, AMATERASU_GAZE.fearDurationMs); this.log('skill', { actorId: actor.id, targetId: original.id, skillName: AMATERASU_GAZE.name }); this.log('status', { actorId: actor.id, targetId: original.id, skillName: `恐懼・防禦 -${Math.round(AMATERASU_GAZE.fearDefenseReduction * 100)}%` }); }
    if (genericSkill) raw = actor.skillPower > 0 ? actor.skillPower : raw * this.skillMultiplier;
    if (actor.spec?.id === 'spear' && ['beast', 'cavalry'].includes(target.kind)) raw *= 1.15;
    if (actor.spec?.id === 'archer' && target.kind === 'beast') raw *= 1.2;
    if (!magic && actor.spec?.id === 'samurai' && actor.hp > actor.maxHp * 0.7) raw *= 1.15;
    if (!magic && actor.spec?.id === 'cannon') raw *= 1.15;
    let pierce = id === 'gunner' ? 0.3 : 0;
    if (id === 'swordmaster' && actor.state.stacks >= 3) { raw *= 1.35; pierce = 0.15; actor.state.stacks = 0; }
    let damage = mitigatedDamage(raw, this.defense(target) * (1 - pierce));
    if (!magic && target.spec?.id === 'elephant') damage *= 0.88;
    if (!magic && !cast && !actor.ranged && target.spec?.id === 'spear') damage *= 0.9;
    if (magic && this.timeMs < 2000 && this.players.some(unit => unit.alive && unit.spec?.id === 'shaman') && target.side === 'player') damage *= 0.9;
    if (!magic && this.timeMs < 2000 && this.players.some(unit => unit.alive && unit.spec?.id === 'escort') && target.side === 'player') damage *= 0.92;
    if (target.side === 'player' && target.position.col >= 2 && this.timeMs < 2000 && this.players.some(unit => unit.alive && unit.spec?.id === 'sanada')) damage *= 0.9;
    damage *= 1 + this.effect(target, 'bossCurseVulnerability');
    return { actor, target, original, damage: Math.max(1, Math.floor(damage * reduction)), magic, cast, id };
  }

  applyHit({ actor, target, damage, magic, cast, id }) {
    const hpBefore = target.hp;
    const shield = target.state.shieldUntil > this.timeMs ? Math.min(target.state.shield, damage) : 0;
    target.state.shield -= shield;
    damage -= shield;
    if (shield) this.log('shield', { actorId: target.id, amount: shield });
    if (damage >= target.hp && target.spec?.id === 'onmyoji' && !target.state.survived) {
      target.state.survived = true;
      damage = Math.max(0, target.hp - 1);
      this.log('skill', { actorId: target.id, skillName: '式神護符' });
    }
    const dealt = Math.min(target.hp, damage);
    target.hp = Math.max(0, target.hp - damage);
    this.log('damage', { actorId: actor.id, targetId: target.id, ability: cast ? 'skill' : 'attack', damage: dealt, hpAfter: target.hp });
    if (hpBefore > 0 && target.hp <= 0) this.log('death', { actorId: actor.id, targetId: target.id });
    if (target.hp > 0 && target.spec?.id === 'blade' && dealt > 0) target.state.stacks = Math.min(5, target.state.stacks + 1);
    if (target.hp > 0 && !magic && target.spec?.id === 'monk' && target.state.counterRound !== Math.floor(this.timeMs / 1000) && this.roll() < 0.2 && actor.alive) {
      target.state.counterRound = Math.floor(this.timeMs / 1000);
      const counter = Math.min(actor.hp, mitigatedDamage(this.attack(target) * 0.6, this.defense(actor)));
      actor.hp -= counter;
      this.log('skill', { actorId: target.id, targetId: actor.id, skillName: '金鐘護體' });
      this.log('damage', { actorId: target.id, targetId: actor.id, ability: 'skill', damage: counter, hpAfter: actor.hp });
      if (!actor.alive) this.log('death', { actorId: target.id, targetId: actor.id });
    }
    if (actor.poisonAttack && dealt > 0 && target.alive) this.setEffect(target, 'poison', 0.03, 2);
    if (id === 'spear' && dealt > 0) this.setEffect(target, 'spearArmor', 0.15, 2);
    if (id === 'shaman' && dealt > 0) this.setEffect(target, 'shamanWeak', 0.2, 2);
    if (id === 'ninja' && dealt > 0) this.setEffect(target, 'blind', 0.2, 1);
    if (id === 'onmyoji' && dealt > 0 && !target.boss) this.setEffect(target, 'root', 1, 1);
    if (id === 'monk' && dealt > 0 && !target.boss) this.setEffect(target, 'stun', 1, 1);
    if (id === 'cannon' && dealt > 0) this.setEffect(target, 'slow', 0.2, 2);
    if (id === 'hunter' && dealt > 0) { this.setEffect(target, 'slow', 0.4, 2); if (target.kind === 'beast' && !target.boss) this.setEffect(target, 'root', 1, 1); }
    if (id === 'elephant' && dealt > 0) this.setEffect(target, 'elephantWeak', 0.15, 2);
    if (id === 'sanada' && dealt > 0 && target.boss) this.setEffect(target, 'sanadaArmor', 0.12, 1);
    if (id === 'samurai' && hpBefore > 0 && !target.alive) this.heal(actor, actor, actor.maxHp * 0.08, '一閃斬・回復');
    if (actor.spec?.id === 'swordmaster' && dealt > 0) actor.state.stacks = Math.min(3, actor.state.stacks + 1);
    if (id === 'swordmaster' && hpBefore > 0 && !target.alive) actor.state.stacks = Math.min(3, actor.state.stacks + 1);
  }

  applySupport({ actor, spec }) {
    const allies = this.living('player');
    if (spec.id === 'healer') {
      const patient = [...allies].sort(byRatio)[0];
      if (patient) { this.heal(actor, patient, patient.maxHp * 0.15 + this.attack(actor), '回春術・治療'); delete patient.state.effects.poison; }
    } else if (spec.id === 'shield') {
      const patient = [...allies].filter(unit => unit !== actor).sort(byRatio)[0];
      if (patient) { actor.state.guardKey = patient.id; actor.state.guardUntil = this.timeMs + 2 * 1000; }
    } else if (spec.id === 'priest') {
      for (const ally of allies) {
        ally.state.shield = Math.max(ally.state.shieldUntil > this.timeMs ? ally.state.shield : 0, Math.floor(ally.maxHp * 0.1));
        ally.state.shieldUntil = this.timeMs + 2 * 1000;
        delete ally.state.effects.blind;
        this.log('shield', { actorId: actor.id, targetId: ally.id, skillName: '梵音護陣・護盾', amount: ally.state.shield });
      }
    }
  }

  finishIfNeeded() {
    const ended = super.finishIfNeeded();
    if (ended && !this.aidApplied) {
      this.aidApplied = true;
      for (const healer of this.living('player').filter(unit => unit.spec?.id === 'healer')) {
        const patient = [...this.living('player')].sort(byRatio)[0];
        if (patient) this.heal(healer, patient, patient.maxHp * 0.08, '藥囊備急');
      }
    }
    return ended;
  }

  snapshot() {
    const result = super.snapshot();
    const enrich = (copies, units) => copies.map((copy, index) => ({ ...copy,
      templateId: units[index].templateId, maxMp: units[index].maxMp, kind: units[index].kind,
      boss: units[index].boss, poisonAttack: units[index].poisonAttack, magicAttack: units[index].magicAttack,
      ranged: units[index].ranged, accuracy: units[index].accuracy,
      amaterasuGaze: units[index].amaterasuGaze,
      formationPosition: units[index].formationPosition,
      generalSkillName: units[index].generalSkillName,
      mercenaryState: { ...units[index].state, effects: { ...units[index].state.effects }, bossRuntime: { ...units[index].state.bossRuntime } },
    }));
    return { ...result, players: enrich(result.players, this.players), enemies: enrich(result.enemies, this.enemies), seed: this.seed, aidApplied: this.aidApplied, terrain: this.terrain };
  }

  static fromSnapshot(snapshot) {
    const battle = new MercenaryRealtimeBattleSystem(snapshot.players || [], snapshot.enemies || [], { autoSkill: snapshot.autoSkill !== false, skillMultiplier: snapshot.skillMultiplier, seed: snapshot.seed, aidApplied: snapshot.aidApplied, terrain: snapshot.terrain });
    battle.timeMs = Number(snapshot.timeMs) || 0;
    battle.running = Boolean(snapshot.running);
    battle.winner = snapshot.winner || null;
    battle.eventId = Number(snapshot.eventId) || 0;
    battle.events = Array.isArray(snapshot.events) ? [...snapshot.events] : [];
    return battle;
  }
}
