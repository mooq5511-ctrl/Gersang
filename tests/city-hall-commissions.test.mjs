import test from 'node:test';
import assert from 'node:assert/strict';
import {
  abandonCityHallCommission,
  acceptCityHallCommission,
  buyCityHallRefreshTicket,
  claimCityHallCommission,
  cityHallActiveLimit,
  freshCityHallState,
  normalizeCityHallState,
  refreshCityHallCommissions,
} from '../app/city-hall-commissions.ts';

const state = (overrides = {}) => ({
  gold: 10_000,
  creditLevel: 1,
  kills: 0,
  stage: 1,
  mercs: [],
  restingMercs: [],
  inventory: [],
  hero: { equip: {} },
  materials: {},
  cityHall: freshCityHallState(),
  ...overrides,
});

test('city hall active commission limit follows guild level', () => {
  assert.equal(cityHallActiveLimit(1), 3);
  assert.equal(cityHallActiveLimit(3), 4);
  assert.equal(cityHallActiveLimit(5), 5);
  assert.equal(cityHallActiveLimit(8), 6);
});

test('accepted commission leaves the board and starts progress from acceptance', () => {
  const first = acceptCityHallCommission(state({ kills: 4 }), 'hall-clear-raccoon');
  assert.equal(first.error, undefined);
  assert.equal(first.state.cityHall.active[0].startValue, 4);
  assert.ok(!first.state.cityHall.availableIds.includes('hall-clear-raccoon'));
});

test('commission cannot be claimed before its target and rewards once after completion', () => {
  const accepted = acceptCityHallCommission(state(), 'hall-clear-raccoon').state;
  const early = claimCityHallCommission({ ...accepted, kills: 4 }, 'hall-clear-raccoon');
  assert.equal(early.error, '委託條件尚未完成。');
  const complete = claimCityHallCommission({ ...accepted, kills: 5 }, 'hall-clear-raccoon');
  assert.equal(complete.error, undefined);
  assert.equal(complete.state.gold, 10_900);
  assert.equal(complete.state.materials['肉類'], 2);
  assert.equal(complete.state.cityHall.active.length, 0);
  assert.equal(claimCityHallCommission(complete.state, 'hall-clear-raccoon').error, '找不到這份進行中的市政廳委託。');
});

test('refresh uses a ticket and preserves active commissions', () => {
  const accepted = acceptCityHallCommission(state({ cityHall: { ...freshCityHallState(), refreshTickets: 1 } }), 'hall-clear-raccoon').state;
  const refreshed = refreshCityHallCommissions(accepted);
  assert.equal(refreshed.error, undefined);
  assert.equal(refreshed.state.cityHall.refreshTickets, 0);
  assert.ok(refreshed.state.cityHall.active.some((entry) => entry.id === 'hall-clear-raccoon'));
  assert.equal(refreshCityHallCommissions(refreshed.state).error, '沒有委託刷新券，請先到商店購買。');
});

test('abandoning a commission releases the slot without granting a reward', () => {
  const accepted = acceptCityHallCommission(state(), 'hall-clear-raccoon').state;
  const abandoned = abandonCityHallCommission(accepted, 'hall-clear-raccoon');
  assert.equal(abandoned.error, undefined);
  assert.equal(abandoned.state.cityHall.active.length, 0);
  assert.equal(abandoned.state.gold, 10_000);
  assert.ok(abandoned.state.cityHall.availableIds.includes('hall-clear-raccoon'));
});

test('refresh ticket purchase is paid with gold and survives normalization', () => {
  const bought = buyCityHallRefreshTicket(state({ gold: 2_000 }));
  assert.equal(bought.error, undefined);
  assert.equal(bought.state.gold, 0);
  assert.equal(bought.state.cityHall.refreshTickets, 1);
  const restored = normalizeCityHallState({ refreshTickets: 4, availableIds: ['hall-clear-raccoon', 'hall-clear-raccoon', 'invalid'] });
  assert.equal(restored.refreshTickets, 4);
  assert.deepEqual(restored.availableIds.slice(0, 2), ['hall-clear-raccoon', 'hall-drive-bandits']);
});
