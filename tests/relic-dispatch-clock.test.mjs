import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../scripts/measure-equipment-early.mjs';
const require = createRequire(import.meta.url);
const {relicDispatchRemaining} = require('../app/relic-dispatch-clock.ts');

test('new expedition does not display idle time added to its duration', () => {
  const start = 100000, end = start + 1800000;
  assert.equal(relicDispatchRemaining(start, end, start - 36000), 1800000);
  assert.equal(relicDispatchRemaining(start, end, start), 1800000);
  assert.equal(relicDispatchRemaining(start, end, start + 1000), 1799000);
});

test('expired and malformed clocks never show negative or non-finite time', () => {
  assert.equal(relicDispatchRemaining(100, 200, 201), 0);
  assert.equal(relicDispatchRemaining(200, 100, 150), 0);
  assert.equal(relicDispatchRemaining(NaN, 200, 150), 0);
  assert.equal(relicDispatchRemaining(100, Infinity, 150), 0);
});
