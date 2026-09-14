import { mercenarySpec } from './mercenary-roster.ts';
import { damageAfterDefense, type Fighter } from './vitals-engine.ts';
import {positionRank,rearDodge} from './formation-position.ts';

export type TacticalFighter = Fighter & { templateId?: string; maxHp?: number; maxMp?: number; accuracy?: number };
export type TacticalEnemy = { name: string; hp: number; attack: number; defense: number; physical: number; magic: number; speed?: number; boss?: boolean; bandit?: boolean; kind?: 'beast' | 'cavalry' | 'human'; ranged?: boolean; magicAttack?: boolean; poison?: boolean; back?: boolean };
export type BattleEvent = { round: number; actor: string; skill: string; target?: string; amount?: number };
type Status = { value: number; until: number };

/** Encounter-local positions and effects are never persisted into character saves. */
export function resolveMercenaryBattle(party: TacticalFighter[], enemies: TacticalEnemy[], terrain = 'field', random = Math.random) {
  const fighters = party.map(unit => ({ ...unit }));
  const create = (unit: TacticalFighter, side: number, index: number, foe?: TacticalEnemy) => ({
    unit, side, foe, spec: side === 0 ? mercenarySpec(unit.templateId) : undefined,
    maxHp: unit.maxHp ?? unit.hp, maxMp: unit.maxMp ?? unit.mp,
    back: side ? !!foe?.back : unit.position==='後排'||!!mercenarySpec(unit.templateId)?.ranged,
    pos: side ? (foe?.back ? 4 : 3) : unit.position==='後排'?-1:unit.position==='中排'?-0.5:0,
    key: side + ':' + index, cooldown: 1, actions: 0, stacks: 0, lastTarget: '', streak: 0,
    survived: false, counterRound: 0, sandUsed: false, nextSlash: 2,
    blind: 0, stun: 0, root: 0, poison: 0, slowFlat: { value: 0, until: 0 },
    effects: new Map<string, Status>(), shield: 0, shieldUntil: 0,
    guardKey: '', guardUntil: 0, moved: false,
  });
  const allies = fighters.map((unit, i) => create(unit, 0, i));
  const foes = enemies.map((enemy, i) => create({ uid: 'enemy-'+i, name: enemy.name, hp: enemy.hp, maxHp: enemy.hp, mp: 0, attack: enemy.attack, defense: enemy.defense, intelligence: 0, cost: 0, skill: '', speed: enemy.speed ?? 25, accuracy: 1 }, 1, i, enemy));
  const actors = [...allies, ...foes];
  const openingPassives = new Set(allies.filter(a => a.unit.hp > 0).map(a => a.spec?.id));
  const events: BattleEvent[] = [];
  let rounds = 0, casts = 0, spentMp = 0, attacks = 0, receivedDamage = 0, misses = 0;
  const alive = (side: number) => (side ? foes : allies).filter(a => a.unit.hp > 0);
  type Actor = typeof allies[number];
  const log = (a: Actor, skill: string, target?: Actor, amount?: number) => events.push({ round: rounds, actor: a.unit.name, skill, target: target?.unit.name, amount });
  const effect = (a: Actor, key: string) => { const e = a.effects.get(key); return e && e.until >= rounds ? e.value : 0; };
  const setEffect = (a: Actor, key: string, value: number, duration: number) => a.effects.set(key, { value, until: rounds + duration - 1 });
  const woodland = ['forest', 'mountain', 'stockade'].includes(terrain);
  const speed = (a: Actor) => Math.max(1, ((a.unit.speed ?? 25) - (a.slowFlat.until >= rounds ? a.slowFlat.value : 0)) * (a.spec?.id === 'hunter' && woodland ? 1.15 : 1) * (1 - Math.max(effect(a, 'cannonSlow'), effect(a, 'hunterSlow'))));
  const attack = (a: Actor) => a.unit.attack * (a.spec?.id === 'blade' ? 1 + a.stacks * 0.03 : 1) * (a.spec?.id === 'sanada' && a.unit.hp < a.maxHp * .45 ? 1.15 : 1) * (1 - Math.max(effect(a, 'shamanWeak'), effect(a, 'elephantWeak')));
  const defense = (a: Actor) => a.unit.defense * (a.spec?.id === 'shield' && a.unit.hp > a.maxHp * 0.5 ? 1.2 : 1) * (a.spec?.id === 'sanada' && a.unit.hp < a.maxHp * .45 ? 1.15 : 1) * (1 - Math.max(effect(a, 'spearArmor'),effect(a,'sanadaArmor')));
  const lowest = (list: Actor[]) => [...list].sort((a, b) => a.unit.hp / a.maxHp - b.unit.hp / b.maxHp)[0];
  const front = (list: Actor[]) => { const f = list.filter(a => !a.back); return f.length ? f : list; };
  const formationFront=(list:Actor[])=>{const rank=Math.min(...list.map(a=>positionRank(a.unit.position)));return list.filter(a=>positionRank(a.unit.position)===rank)};
  const heal = (source: Actor, target: Actor, amount: number, skill: string) => {
    if (target.unit.hp <= 0) return;
    const restored = Math.min(target.maxHp - target.unit.hp, Math.floor(amount * (target.spec?.id === 'elephant' ? 0.9 : 1)));
    target.unit.hp += restored; log(source, skill, target, restored);
  };
  const applyDamage = (source: Actor, target: Actor, damage: number, magic: boolean, counter = false) => {
    const absorbed = target.shieldUntil >= rounds ? Math.min(target.shield, damage) : 0;
    target.shield -= absorbed; damage -= absorbed;
    if (absorbed) log(target, '護盾吸收', target, absorbed);
    if (damage >= target.unit.hp && target.spec?.id === 'onmyoji' && !target.survived) {
      damage = Math.max(0, target.unit.hp - 1); target.survived = true; log(target, '式神護符');
    }
    const actual = Math.min(target.unit.hp, damage);
    target.unit.hp = Math.max(0, target.unit.hp - damage);
    if (!target.side) receivedDamage += actual;
    if (target.unit.hp > 0 && target.spec?.id === 'blade') { target.stacks = Math.min(5, target.stacks + 1); log(target, '越戰越勇', target, target.stacks); }
    if (!magic && !counter && target.unit.hp > 0 && target.spec?.id === 'monk' && target.counterRound !== rounds && random() < 0.2 && source.unit.hp > 0) {
      target.counterRound = rounds;
      const retaliation = damageAfterDefense(attack(target) * 0.6, defense(source), source.foe?.physical ?? 0);
      log(target, '金鐘護體', source, retaliation); applyDamage(target, source, retaliation, false, true);
    }
    return actual;
  };
  const hit = (source: Actor, initial: Actor, multiplier: number, magic: boolean, area: boolean, basic = false, pierce = 0) => {
    if (source.unit.hp <= 0 || initial.unit.hp <= 0) return false;
    let target = initial;
    let guardReduction = 1;
    if (!area) {
      const guard = actors.find(a => a.guardKey === target.key && a.guardUntil >= rounds && a.unit.hp > 0);
      if (guard) { guard.guardKey = ''; target = guard; guardReduction = 0.6; log(guard, '舉盾護商・代受', initial); }
    }
    if(source.side===1&&rearDodge(target.unit.position,random())){misses++;log(target,'🏹 後排閃避',source);return false}
    const accuracy = Math.min(1, Math.max(0.05, (source.unit.accuracy ?? 1) - source.blind + (source.spec?.id === 'hunter' && woodland ? 0.05 : 0) + (source.spec?.id === 'gunner' && source.lastTarget === target.key && source.streak >= 2 ? 0.1 : 0)));
    source.blind = 0;
    if (source.spec?.id === 'gunner') { source.streak = source.lastTarget === target.key ? source.streak + 1 : 1; source.lastTarget = target.key; }
    if (random() >= accuracy || (!magic && !area && target.spec?.id === 'ninja' && random() < 0.15)) { misses++; log(source, '攻擊落空', target); return false; }
    let raw = attack(source) * multiplier;
    if (source.spec?.id === 'spear' && ['beast', 'cavalry'].includes(target.foe?.kind || '')) { raw *= 1.15; log(source, '長槍拒馬', target); }
    if (source.spec?.id === 'archer' && target.foe?.kind === 'beast') { raw *= 1.2; log(source, '獵虎眼', target); }
    if (!magic && source.spec?.id === 'samurai' && source.unit.hp > source.maxHp * 0.7) raw *= 1.15;
    if (!magic && source.spec?.id === 'cannon' && !source.moved) raw *= 1.15;
    let damage = damageAfterDefense(raw, defense(target) * (1 - pierce), magic ? target.foe?.magic ?? 0 : target.foe?.physical ?? 0);
    if (!magic && basic && !source.foe?.ranged && target.spec?.id === 'spear') damage *= 0.9;
    if (!magic && target.spec?.id === 'elephant') damage *= 0.88;
    if (!target.side && rounds <= 2) {
      if (magic && openingPassives.has('shaman')) damage *= 0.9;
      if (!magic && openingPassives.has('escort')) damage *= 0.92;
      if (target.unit.position==='前排' && openingPassives.has('sanada')) damage *= 0.9;
    }
    if (target.foe?.bandit && woodland && rounds <= 2) damage *= 0.85;
    const dealt = applyDamage(source, target, Math.max(1, Math.floor(damage * guardReduction)), magic);
    if (dealt > 0 && source.spec?.id === 'swordmaster') { source.stacks = Math.min(3, source.stacks + 1); log(source, '劍氣凝神', source, source.stacks); }
    log(source, magic ? '法術傷害' : '物理傷害', target, dealt);
    return true;
  };
  for (const a of allies.filter(a => a.unit.hp > 0)) {
    if (['shaman', 'escort'].includes(a.spec?.id || '')) log(a, a.spec!.passive);
    if (a.spec?.id === 'hunter' && woodland) log(a, a.spec.passive);
  }
  for (const a of foes) if (a.foe?.bandit && woodland) log(a, '山寨地利');
  while (rounds < 30 && alive(0).length && alive(1).length) {
    rounds++;
    const turns = [...actors].sort((a, b) => speed(b) - speed(a));
    for (const a of turns) {
      if (a.unit.hp <= 0 || !alive(0).length || !alive(1).length) continue;
      a.moved = false;
      if (a.poison > 0) { a.poison--; const harm = applyDamage(a,a,Math.max(1,Math.floor(a.maxHp*0.03)),true,true); log(a, '中毒', a, harm); if (a.unit.hp <= 0) continue; }
      if (a.stun > 0) { a.stun--; log(a, '暈眩，跳過行動'); continue; }
      const rooted = a.root > 0; if (rooted) a.root--;
      const targets = alive(1 - a.side);
      let target = a.side ? formationFront(targets)[(rounds-1)%formationFront(targets).length] : front(targets)[0];
      const spec = a.spec;
      let use = !!spec && rounds >= a.cooldown && a.unit.mp >= spec.mp;
      let patient = lowest(alive(a.side));
      if (spec?.id === 'shield') { patient = lowest(alive(a.side).filter(b => b !== a)); use = use && !!patient && patient.unit.hp < patient.maxHp * 0.5; }
      if (spec?.id === 'healer') use = use && patient.unit.hp < patient.maxHp * 0.65;
      if (spec?.id === 'priest') use = use && patient.unit.hp < patient.maxHp * 0.7;
      if (use) {
        if (spec!.id === 'archer') target = lowest(targets);
        if (['shaman', 'escort'].includes(spec!.id)) target = [...targets].sort((x,y) => attack(y)-attack(x))[0];
        if (['hunter', 'onmyoji'].includes(spec!.id)) target = [...targets].sort((x,y) => speed(y)-speed(x))[0];
        if (spec!.id === 'gunner') target = [...targets].sort((x,y) => defense(y)-defense(x))[0];
        if (spec!.id === 'ninja') { const back = targets.filter(t => t.back); target = [...(back.length ? back : targets)].sort((x,y) => defense(x)-defense(y))[0]; }
      }
      const ranged = a.side ? a.foe?.ranged : spec?.ranged ?? true;
      const support = use && ['shield', 'healer', 'priest'].includes(spec!.id);
      const reach = ranged || support || (use && spec?.id === 'ninja') ? 99 : 1;
      if (Math.abs(a.pos - target.pos) > reach && !rooted) {
        const distance = Math.min(speed(a) / 10, Math.max(0, Math.abs(a.pos - target.pos) - reach));
        a.pos += Math.sign(target.pos - a.pos) * distance; a.moved = distance > 0;
        if (a.moved) log(a, '移動接敵');
      }
      if (Math.abs(a.pos - target.pos) > reach) { log(a, rooted ? '定身，目標不在射程' : '尚未進入射程'); }
      else if (a.side) {
        const foe = a.foe!;
        if (foe.bandit && !a.sandUsed && a.unit.hp < a.maxHp * 0.5) {
          a.sandUsed = true; log(a, '揚沙偷襲', target);
          if (hit(a, target, 0.6, false, false)) target.blind = Math.max(target.blind, 0.2);
        } else if (foe.bandit && rounds >= a.nextSlash) {
          a.nextSlash = rounds + 3; log(a, '攔路劈砍', target);
          if (hit(a, target, 1.3, false, false)) target.slowFlat = { value: 1, until: rounds + 1 };
        } else {
          if (hit(a, target, 1, !!foe.magicAttack, false, true) && foe.poison) target.poison = 2;
        }
      } else if (use && spec) {
        a.cooldown = rounds + spec.cooldown;
        a.unit.mp -= spec.mp; spentMp += spec.mp; casts++;
        log(a, spec.active, support ? patient : target);
        const strike = (t: Actor, mult: number, magic = false, area = false, pierce = 0) => hit(a, t, mult, magic, area, false, pierce);
        switch (spec.id) {
          case 'spear': if (strike(target,1.4)) setEffect(target,'spearArmor',0.15,2); break;
          case 'shield': a.guardKey=patient.key; a.guardUntil=rounds+1; break;
          case 'archer': strike(target,target.unit.hp < target.maxHp*0.3 ? 2 : 1.7); break;
          case 'shaman': if (strike(target,1.1,true)) setEffect(target,'shamanWeak',0.2,2); break;
          case 'samurai': strike(target,1.8); if (target.unit.hp <= 0) heal(a,a,a.maxHp*0.08,'一閃斬・回復'); break;
          case 'ninja': if (strike(target,1.3)) target.blind=Math.max(target.blind,0.2); break;
          case 'gunner': strike(target,1.8,false,false,0.3); break;
          case 'onmyoji': for (const t of [...targets].sort((x,y)=>speed(y)-speed(x)).slice(0,2)) if (strike(t,1,true,true) && !t.foe?.boss && !t.root) t.root=1; break;
          case 'blade': for (const t of front(targets).slice(0,3)) strike(t,targets.length===1 ? 1.5 : 1.1,false,targets.length>1); break;
          case 'monk': if (strike(target,target.foe?.boss ? 1.6 : 1.3) && !target.foe?.boss && !target.stun) target.stun=1; break;
          case 'healer': heal(a,patient,patient.maxHp*0.15+attack(a),'回春術・治療'); patient.poison=0; break;
          case 'cannon': for (const t of targets.slice(0,3)) if (strike(t,1.3,false,true)) setEffect(t,'cannonSlow',0.2,2); break;
          case 'escort': strike(target,0.75); if (target.unit.hp>0) strike(target,0.75); break;
          case 'hunter': if (strike(target,1.2)) { setEffect(target,'hunterSlow',0.4,2); if (target.foe?.kind==='beast' && !target.foe.boss && !target.root) target.root=1; } break;
          case 'elephant': for (const t of front(targets).slice(0,3)) if (strike(t,1,false,true)) setEffect(t,'elephantWeak',0.15,2); break;
          case 'priest': for (const t of alive(0)) { t.shield=Math.max(t.shieldUntil>=rounds ? t.shield : 0,Math.floor(t.maxHp*0.1)); t.shieldUntil=rounds+1; t.blind=0; log(a,'梵音護陣・護盾',t,t.shield); } break;
          case 'swordmaster': { const victim=lowest(front(targets));const empowered=a.stacks>=3;if(empowered)a.stacks=0;strike(victim,2.1*(empowered?1.35:1),false,false,empowered ? .15 : 0);if(victim.unit.hp<=0)a.stacks=Math.min(3,a.stacks+1);break; }
          case 'sanada': for(const t of targets.filter(t=>Math.abs(t.pos-target.pos)<=1).slice(0,3))if(strike(t,1.55,false,true)&&t.foe?.boss)setEffect(t,'sanadaArmor',.12,1);break;
          case 'mazu': for(const t of targets)strike(t,10,true,true);for(const t of alive(0))heal(a,t,t.maxHp*.5,'海神護航・治療');break;
        }
      } else {
        const legacySpell = !spec && !!a.unit.skill && a.unit.cost > 0 && a.unit.mp >= a.unit.cost;
        if (legacySpell) { a.unit.mp-=a.unit.cost; spentMp+=a.unit.cost; casts++; log(a,a.unit.skill); }
        else attacks++;
        hit(a,target,legacySpell ? 1.8+a.unit.intelligence*0.12/Math.max(1,a.unit.attack) : 1,legacySpell,false,true);
      }
      a.actions++;
      if (a.unit.hp>0 && spec?.id==='priest' && a.actions%3===0) { const mp=Math.min(4,a.maxMp-a.unit.mp); a.unit.mp+=mp; log(a,'靜心持咒',a,mp); }
    }
  }
  for (const a of alive(0)) if (a.spec?.id==='healer') { const patient=lowest(alive(0)); heal(a,patient,patient.maxHp*0.08,'藥囊備急'); }
  return { fighters, won: !alive(1).length, enemyHp: foes.reduce((n,a)=>n+a.unit.hp,0), rounds, casts, spentMp, attacks, receivedDamage, misses, events,
    spells: events.filter(e=>!['物理傷害','法術傷害','移動接敵'].includes(e.skill)).slice(0,24).map(e=>'第 '+e.round+' 回合・'+e.actor+'・'+e.skill+(e.target ? ' → '+e.target : '')+(e.amount!==undefined ? ' '+e.amount : '')),
    enemySkills: [] as string[],
  };
}
