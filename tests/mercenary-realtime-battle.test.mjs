import test from 'node:test';
import assert from 'node:assert/strict';
import { merchantMercenaries } from '../app/mercenary-roster.ts';
import { MercenaryRealtimeBattleSystem } from '../app/mercenary-realtime-battle.js';
import { dungeonStep, freshDungeon } from '../app/dungeon-engine.ts';

const player = (id, overrides = {}) => ({ id, side: 'player', templateId: `merchant-${id}`, hp: 1000, maxHp: 1000, atk: 60, def: 0, accuracy: 1, mp: 40, maxMp: 40, attackInterval: 1, position: { row: 0, col: 3 }, ...overrides });
const enemy = (id = 'enemy', overrides = {}) => ({ id, side: 'enemy', hp: 1e7, maxHp: 1e7, atk: 0, def: 0, attackInterval: 1, position: { row: 0, col: 0 }, ...overrides });

for (const spec of merchantMercenaries) test(`world-map realtime: ${spec.id} active fires and respects cooldown`, () => {
  const battle = new MercenaryRealtimeBattleSystem(
    [player(spec.id), player('spear', { id: 'patient', hp: 200, mp: 0, atk: 0, position: { row: 1, col: 3 } })],
    [enemy()], { autoSkill: true, seed: 1 },
  );
  battle.startBattle();
  battle.update(10);
  const casts = battle.events.filter(event => event.type === 'skill' && event.actorId === spec.id && event.skillName === spec.active);
  assert.ok(casts.length > 0, `${spec.id} never cast`);
  for (let index = 1; index < casts.length; index++) assert.ok(casts[index].timeMs - casts[index - 1].timeMs >= spec.cooldown * 1000);
  assert.ok(battle.players.every(unit => unit.mp >= 0 && unit.mp <= unit.maxMp));
});

test('healer cures poison, obeys MP, and gives one postbattle aid without reviving', () => {
  const battle = new MercenaryRealtimeBattleSystem(
    [player('healer', { mp: 12 }), player('spear', { id: 'patient', hp: 200, mp: 0, maxHp: 1000, mercenaryState: { effects: { poison: { value: .03, until: 5000 } } }, position: { row: 1, col: 3 } })],
    [enemy('enemy', { hp: 1, maxHp: 1 })], { autoSkill: true },
  );
  battle.startBattle();
  assert.equal(battle.players[0].mp, 0);
  assert.ok(battle.players[1].hp >= 200 + 150 + 60);
  assert.equal(battle.players[1].state.effects.poison, undefined);
  assert.equal(battle.events.filter(event => event.skillName === '藥囊備急').length, 1);
  const saved = battle.snapshot(); battle.finishIfNeeded();
  assert.deepEqual(battle.snapshot(), saved);
});

test('status effects, skill state, terrain and seeded events survive world-map ticks', () => {
  const make = () => new MercenaryRealtimeBattleSystem([player('hunter')], [enemy('beast', { kind: 'beast', ranged: false })], { terrain: 'forest', seed: 42 });
  const whole = make(); whole.startBattle(); whole.update(4);
  let sliced = make(); sliced.startBattle();
  for (let i = 0; i < 4; i++) { sliced = MercenaryRealtimeBattleSystem.fromSnapshot(sliced.snapshot()); sliced.update(1); }
  assert.deepEqual(sliced.snapshot(), whole.snapshot());
  assert.ok(whole.events.some(event => event.type === 'status' && event.actorId === 'beast'));
  assert.ok(whole.players[0].cooldown < 1000);
});

test('world-map offensive passives change damage, armor or tempo', () => {
  const withFoe = (id, overrides = {}, terrain = 'field') => new MercenaryRealtimeBattleSystem([player(id, overrides)], [enemy('foe', { kind: 'beast', hp: 1e7 })], { terrain, autoSkill: false });
  const spear = withFoe('spear'); assert.ok(spear.planHit(spear.players[0], spear.enemies[0], 1, false, false, false, '', false).damage > 60);
  const archer = withFoe('archer'); assert.ok(archer.planHit(archer.players[0], archer.enemies[0], 1, false, false, false, '', false).damage > 60);
  const samurai = withFoe('samurai'); assert.ok(samurai.planHit(samurai.players[0], samurai.enemies[0], 1, false, false, false, '', false).damage > 60);
  const cannon = withFoe('cannon'); assert.ok(cannon.planHit(cannon.players[0], cannon.enemies[0], 1, false, false, false, '', false).damage > 60);
  const hunter = withFoe('hunter', {}, 'forest'); hunter.startBattle(); assert.ok(hunter.players[0].cooldown < 1000);
  const gunner = withFoe('gunner'); gunner.players[0].state.lastTarget = 'foe'; gunner.players[0].state.streak = 2; gunner.players[0].accuracy = .8; gunner.roll = () => .85; assert.ok(gunner.planHit(gunner.players[0], gunner.enemies[0], 1, false, false, false, '', false));
  const blade = withFoe('blade'); blade.players[0].state.stacks = 5; assert.equal(blade.attack(blade.players[0]), 69);
});

test('world-map defensive, healing and aura passives are live', () => {
  const shield = new MercenaryRealtimeBattleSystem([player('shield', { def: 100 })], [enemy()]); assert.equal(shield.defense(shield.players[0]), 120);
  const sanada = new MercenaryRealtimeBattleSystem([player('sanada', { hp: 400, maxHp: 1000, def: 100 })], [enemy()]); assert.ok(sanada.attack(sanada.players[0]) > 60); assert.ok(sanada.defense(sanada.players[0]) > 100);
  const elephant = new MercenaryRealtimeBattleSystem([player('elephant')], [enemy()]); elephant.heal(elephant.players[0], elephant.players[0], 100, 'test'); assert.equal(elephant.players[0].hp, 1000);
  elephant.players[0].hp = 500; elephant.heal(elephant.players[0], elephant.players[0], 100, 'test'); assert.equal(elephant.players[0].hp, 590);
  const onmyoji = new MercenaryRealtimeBattleSystem([player('onmyoji', { hp: 50 })], [enemy('foe', { atk: 1000 })]); onmyoji.startBattle(); assert.equal(onmyoji.players[0].hp, 1); assert.equal(onmyoji.events.filter(event => event.skillName === '式神護符').length, 1);
  const ninja = new MercenaryRealtimeBattleSystem([player('ninja')], [enemy('foe', { atk: 10 })]); ninja.roll = () => 0; ninja.startBattle(); assert.ok(ninja.events.some(event => event.type === 'miss' && event.actorId === 'foe'));
  const monk = new MercenaryRealtimeBattleSystem([player('monk')], [enemy('foe', { atk: 10 })]); monk.roll = () => 0; monk.startBattle(); assert.ok(monk.events.some(event => event.skillName === '金鐘護體'));
});

test('world-map debuffs, sword energy and priest MP recovery take effect', () => {
  const shaman = new MercenaryRealtimeBattleSystem([player('shaman')], [enemy('foe', { atk: 100 })]); shaman.startBattle(); assert.equal(shaman.attack(shaman.enemies[0]), 80);
  const spear = new MercenaryRealtimeBattleSystem([player('spear')], [enemy('foe', { def: 100 })]); spear.startBattle(); assert.equal(spear.defense(spear.enemies[0]), 85);
  const swordmaster = new MercenaryRealtimeBattleSystem([player('swordmaster')], [enemy()]); swordmaster.startBattle(); assert.ok(swordmaster.players[0].state.stacks >= 1);
  const priest = new MercenaryRealtimeBattleSystem([player('priest', { hp: 500, mp: 0 })], [enemy('foe', { atk: 0 })]); priest.startBattle(); priest.update(2); assert.ok(priest.events.some(event => event.type === 'restore-mp' && event.amount === 4));
});

for (const spec of merchantMercenaries) test(`world-map dungeonStep deploys ${spec.id} by independent ID`, () => {
  const hero = { hp: 100, maxHp: 1000, mp: 0, maxMp: 40, str: 1, dex: 1, mercenaryIntelligence: 0, attack: 1, defense: 0, staff: false };
  const party = [
    { uid: 'hero', name: '主角', hp: 100, maxHp: 1000, mp: 0, maxMp: 40, attack: 1, position: '前排' },
    { uid: 'merc-uid', templateId: `merchant-${spec.id}`, name: spec.name, hp: 1000, maxHp: 1000, mp: 40, maxMp: 40, attack: 60, position: '後排' },
  ];
  const started = dungeonStep(freshDungeon(), hero, 'start', 1000, 'e_starter_raccoon', .99, 0, 0, 0, party, 0, [1, 1, 1], true, 0);
  assert.equal(started.state.realtime.players[1].templateId, `merchant-${spec.id}`);
  assert.ok(started.state.realtime.events.some(event => event.type === 'skill' && event.actorId === 'merc-uid' && event.skillName === spec.active), `${spec.id} not cast on world map`);
  if (spec.id === 'healer') assert.ok(started.party[0].hp > 100);
});

test('existing saved world-map combat gains mercenary IDs without resetting the encounter', () => {
  const hero = { hp: 500, maxHp: 1000, mp: 0, maxMp: 40, str: 1, dex: 1, mercenaryIntelligence: 0, attack: 1, defense: 0, staff: false };
  const party = [
    { uid: 'hero', name: '主角', hp: 500, maxHp: 1000, mp: 0, maxMp: 40, attack: 1, position: '前排' },
    { uid: 'healer-uid', templateId: 'merchant-healer', name: '行腳郎中', hp: 1000, maxHp: 1000, mp: 12, maxMp: 40, attack: 60, position: '後排' },
  ];
  const started = dungeonStep(freshDungeon(), hero, 'start', 1000, 'e_starter_pirate_king', .99, 0, 0, 0, party, 0, [1, 1, 1], false, 0);
  const legacy = { ...started.state, realtime: { ...started.state.realtime, players: started.state.realtime.players.map(({ templateId: _templateId, maxMp: _maxMp, accuracy: _accuracy, ranged: _ranged, mercenaryState: _mercenaryState, ...unit }) => unit) } };
  const resumed = dungeonStep(legacy, hero, 'tick', 2600, undefined, .99, 0, 0, 0, started.party, 0, [1, 1, 1], true, 0);
  assert.equal(resumed.state.realtime.players[1].templateId, 'merchant-healer');
  assert.ok(resumed.state.realtime.events.some(event => event.type === 'skill' && event.skillName === '回春術'));
  assert.equal(resumed.state.serial, started.state.serial);
});
