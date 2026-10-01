import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameSaveScheduler } from '../app/game-save-scheduler.ts';

test('continuous updates save the latest state at most once every two seconds', () => {
  const writes = [];
  const scheduler = createGameSaveScheduler(value => writes.push(value));
  for (let time = 0; time <= 4000; time += 50) {
    scheduler.update(time);
    scheduler.flush(time);
  }
  assert.deepEqual(writes, [0, 2000, 4000]);
});

test('page hide and slot cleanup flush the latest pending state exactly once', () => {
  const writes = [];
  const scheduler = createGameSaveScheduler(value => writes.push(value));
  scheduler.update('old');
  scheduler.flush(0);
  scheduler.update('latest');
  assert.equal(scheduler.flush(100), false);
  assert.equal(scheduler.flush(100, true), true);
  assert.equal(scheduler.flush(101, true), false);
  assert.deepEqual(writes, ['old', 'latest']);
});

test('a failed storage write remains pending and can be retried', () => {
  let fail = true;
  const writes = [];
  const scheduler = createGameSaveScheduler(value => { if (fail) throw Error('quota'); writes.push(value); });
  scheduler.update('reward');
  assert.throws(() => scheduler.flush(0), /quota/);
  fail = false;
  scheduler.flush(1, true);
  assert.deepEqual(writes, ['reward']);
});
