import test from 'node:test';
import assert from 'node:assert/strict';
import { AutoHuntManager, AUTO_HUNT_RESPAWN_DELAY_MS } from '../app/auto-hunt-manager.ts';

test('Auto Hunt toggle changes only the requested on/off state', () => {
  assert.equal(AutoHuntManager.toggle({ autoHunt: false }), true);
  assert.equal(AutoHuntManager.toggle({ autoHunt: true }), false);
});

test('victory queues the next encounter only while Auto Hunt is enabled', () => {
  assert.deepEqual(AutoHuntManager.afterVictory({ autoHunt: true, status: 'fighting', spawnAt: 0 }, 1000), {
    autoHunt: true,
    status: 'respawning',
    spawnAt: 1000 + AUTO_HUNT_RESPAWN_DELAY_MS,
  });
  assert.deepEqual(AutoHuntManager.afterVictory({ autoHunt: false, status: 'fighting', spawnAt: 0 }, 1000), {
    autoHunt: false,
    status: 'idle',
    spawnAt: 0,
  });
});

test('Auto Hunt starts the queued encounter at its deadline and stops after defeat', () => {
  const queued = AutoHuntManager.afterVictory({ autoHunt: true, status: 'fighting', spawnAt: 0 }, 1000);
  assert.equal(AutoHuntManager.shouldStartNextEncounter(queued, queued.spawnAt - 1), false);
  assert.equal(AutoHuntManager.shouldStartNextEncounter(queued, queued.spawnAt), true);
  assert.deepEqual(AutoHuntManager.afterDefeat(), { autoHunt: false, spawnAt: 0 });
});
