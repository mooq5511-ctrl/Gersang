import test from 'node:test';
import assert from 'node:assert/strict';
import { RealtimeBattleSystem } from '../app/realtime-battle-engine.js';
import { calculateDamage, dungeonStep, freshDungeon, normalEncounterCount } from '../app/dungeon-engine.ts';

test('normal encounter size is one through twelve, while bosses stay solo', () => {
  const hero = { hp: 1e8, maxHp: 1e8, mp: 0, maxMp: 0, str: 1, dex: 1,
    mercenaryIntelligence: 0, attack: 1, defense: 0, staff: false };
  const start = (key, countRoll) => dungeonStep(freshDungeon(), hero, 'start', 1000, key,
    .99, 0, 0, 0, [], 0, [1, 1, 1], false, countRoll).state;
  assert.equal(normalEncounterCount(0), 1);
  assert.equal(normalEncounterCount(.5), 7);
  assert.equal(normalEncounterCount(.999999), 12);
  for (const [roll, expected] of [[0, 1], [.5, 7], [.999999, 12]]) {
    const battle = start('e_starter_raccoon', roll);
    assert.equal(battle.enemyCount, expected);
    assert.equal(battle.realtime.enemies.length, expected);
  }
  assert.equal(start('e_starter_pirate_king', .999999).realtime.enemies.length, 1);
});

test('next normal wave samples a new encounter size', () => {
  const hero = { hp: 1e8, maxHp: 1e8, mp: 0, maxMp: 0, str: 1, dex: 1,
    mercenaryIntelligence: 0, attack: 1e9, defense: 0, staff: false };
  const first = dungeonStep(freshDungeon(), hero, 'start', 1000, 'e_starter_raccoon',
    .99, 0, 0, 0, [], 0, [1, 1, 1], false, 0).state;
  assert.equal(first.enemyCount, 1);
  const settled = dungeonStep(first, hero, 'tick', 1050);
  assert.equal(settled.state.status, 'respawning');
  const next = dungeonStep(settled.state, hero, 'tick', 1550, undefined,
    .99, 0, 0, 0, [], 0, [1, 1, 1], false, .999999).state;
  assert.equal(next.enemyCount, 12);
  assert.equal(next.realtime.enemies.length, 12);
});

test('normal monster experience scales with defeated count and pays once', () => {
  const hero = { hp: 1e8, maxHp: 1e8, mp: 0, maxMp: 0, str: 1, dex: 1,
    mercenaryIntelligence: 0, attack: 1e9, defense: 0, staff: false };
  const started = dungeonStep(freshDungeon(), hero, 'start', 1000, 'e_lake_red_thief',
    .99, 0, 0, 0, [], 0, [1, 1, 1], false, .2);
  assert.equal(started.state.enemyCount, 3);
  const settled = dungeonStep(started.state, hero, 'tick', 10000);
  assert.equal(settled.state.status, 'respawning');
  assert.equal(settled.reward.xp, 25 * 3);
  assert.equal(dungeonStep(settled.state, hero, 'tick', 10050).reward, null);
});

const unit = (id, side, row, col, overrides = {}) => ({
  id, side, hp: 100, maxHp: 100, atk: 10, def: 0,
  attackInterval: 1, position: { row, col }, ...overrides,
});

test('realtime and boss attacks use the same armor mitigation', () => {
  const battle = new RealtimeBattleSystem([], []);
  const attacker = { atk: 100, skillPower: 0 };
  const defender = { def: 50 };
  assert.equal(battle.damageFor(attacker, defender), calculateDamage({ atk: 100 }, { def: 50 }, () => 0.5));
  assert.equal(calculateDamage({ atk: 100 }, { def: 50 }, () => 0), 60);
  assert.equal(calculateDamage({ atk: 100 }, { def: 50 }, () => 1), 73);
});

test('opening attacks resolve simultaneously even when both units die', () => {
  const battle = new RealtimeBattleSystem(
    [unit('hero', 'player', 0, 0, { hp: 10, atk: 10 })],
    [unit('enemy', 'enemy', 0, 0, { hp: 10, atk: 10 })],
  );
  battle.startBattle();
  assert.equal(battle.winner, 'draw');
  assert.deepEqual(battle.events.filter(event => event.type === 'damage').map(event => event.actorId), ['hero', 'enemy']);
  assert.equal(battle.events.filter(event => event.type === 'battle-end').length, 1);
});

test('survivors select a new living target after the first target falls', () => {
  const battle = new RealtimeBattleSystem(
    [unit('hero', 'player', 0, 0, { atk: 10 })],
    [unit('front', 'enemy', 0, 0, { hp: 10, atk: 0 }), unit('back', 'enemy', 0, 1, { atk: 0 })],
  );
  battle.startBattle();
  battle.update(1);
  assert.deepEqual(battle.events.filter(event => event.type === 'attack' && event.actorId === 'hero').map(event => event.targetId), ['front', 'back']);
});

test('a long time slice matches smaller slices, including events and restored state', () => {
  const make = () => new RealtimeBattleSystem(
    [unit('hero', 'player', 0, 0, { hp: 200, maxHp: 200, atk: 17, attackInterval: 0.6 })],
    [unit('enemy', 'enemy', 0, 0, { hp: 200, maxHp: 200, atk: 11, attackInterval: 0.8 })],
  );
  const whole = make(); whole.startBattle(); whole.update(2.4);
  let sliced = make(); sliced.startBattle();
  for (let index = 0; index < 24; index++) {
    sliced = RealtimeBattleSystem.fromSnapshot(sliced.snapshot());
    sliced.update(0.1);
  }
  assert.deepEqual(sliced.snapshot(), whole.snapshot());
});

test('finished battles do not emit another ending or reopen after repeated calls', () => {
  const battle = new RealtimeBattleSystem(
    [unit('hero', 'player', 0, 0, { atk: 100 })],
    [unit('enemy', 'enemy', 0, 0, { hp: 10, atk: 0 })],
  );
  battle.startBattle();
  const finished = battle.snapshot();
  battle.startBattle(); battle.finishIfNeeded(); battle.update(10);
  assert.deepEqual(battle.snapshot(), finished);
  assert.equal(battle.events.filter(event => event.type === 'battle-end').length, 1);
});

test('dungeon awards one reward for a completed realtime boss battle', () => {
  const hero = { hp: 1e8, maxHp: 1e8, mp: 0, maxMp: 0, str: 1, dex: 1,
    mercenaryIntelligence: 0, attack: 1e9, defense: 0, staff: false };
  const started = dungeonStep(freshDungeon(), hero, 'start', 1000, 'e_lake_gale_altur');
  assert.equal(started.state.realtime.winner, 'player');
  const settled = dungeonStep(started.state, hero, 'tick', 1050);
  assert.equal(settled.reward.xp, 250000);
  assert.equal(settled.state.status, 'respawning');
  assert.equal(settled.state.serial, started.state.serial + 1);
  const repeated = dungeonStep(settled.state, hero, 'tick', 1100);
  assert.equal(repeated.reward, null);
  assert.equal(repeated.state.serial, settled.state.serial);
});

test('tiger slow and bleed expire during realtime combat', () => {
  const hero = { hp: 1e8, maxHp: 1e8, mp: 0, maxMp: 0, str: 1, dex: 1,
    mercenaryIntelligence: 0, attack: 1, defense: 0, staff: false };
  const started = dungeonStep(freshDungeon(), hero, 'start', 1000, 'e_white_tiger_fierce_tiger');
  const slowed = { ...started.state, tigerSlowUntil: 1050, tigerMp: 0, tigerHowlAt: 99999,
    tigerBleeds: { hero: { until: 1050, next: 1000 } },
    realtime: { ...started.state.realtime, players: started.state.realtime.players.map(player => ({ ...player, attackInterval: 2.1 })) } };
  const expired = dungeonStep(slowed, hero, 'tick', 1100);
  assert.equal(expired.state.tigerSlowUntil, 0);
  assert.deepEqual(expired.state.tigerBleeds, {});
  assert.ok(Math.abs(expired.state.realtime.players[0].attackInterval - 1.5) < 1e-9);
});

test('gale altur applies its data-driven shield and wind shatter in realtime combat', () => {
  const hero = { hp: 1e9, maxHp: 1e9, mp: 0, maxMp: 0, str: 1, dex: 1,
    mercenaryIntelligence: 0, attack: 1, defense: 0, staff: false };
  const started = dungeonStep(freshDungeon(), hero, 'start', 1000, 'e_lake_gale_altur');
  const resolved = dungeonStep(started.state, hero, 'tick', 61000);
  const events = resolved.state.realtime.events;
  const gale = resolved.state.realtime.enemies[0];
  assert.ok(events.some(event => event.type === 'skill' && event.skillName === '白虎盾'));
  assert.ok(events.some(event => event.type === 'skill' && event.skillName === '風碎'));
  assert.equal(gale.mercenaryState.effects.bossShield.value, .3);
  assert.ok(events.some(event => event.type === 'damage' && event.skillName === '風碎' && event.damage === 2000));
});

test('golden starfish regenerates, curses, and can trigger its flame damage over time', () => {
  const hero = { hp: 1e9, maxHp: 1e9, mp: 0, maxMp: 0, str: 1, dex: 1,
    mercenaryIntelligence: 0, attack: 1, defense: 0, staff: false };
  const started = dungeonStep(freshDungeon(), hero, 'start', 1000, 'e_japan_sea_golden_starfish');
  const resolved = dungeonStep(started.state, hero, 'tick', 61000);
  const afterBurn = dungeonStep(resolved.state, hero, 'tick', 62000);
  const events = afterBurn.state.realtime.events;
  const player = afterBurn.state.realtime.players[0];
  assert.ok(events.some(event => event.type === 'skill' && event.skillName === '恢復術'));
  assert.ok(events.some(event => event.type === 'skill' && event.skillName === '詛咒'));
  assert.equal(player.mercenaryState.effects.bossCurseAttack.value, .25);
  assert.equal(player.mercenaryState.effects.bossCurseDefense.value, .3);
  assert.equal(player.mercenaryState.effects.bossCurseVulnerability.value, .15);
  assert.ok(player.mercenaryState.effects.bossBurn.value >= 1);
  assert.ok(events.some(event => event.type === 'skill' && event.skillName === '火焰燎原'));
  assert.ok(events.some(event => event.type === 'damage' && event.skillName === '灼燒'));
});
