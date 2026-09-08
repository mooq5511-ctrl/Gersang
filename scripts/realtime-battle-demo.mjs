import { createTwelveUnitDemo } from '../app/realtime-battle-engine.js';

const battle = createTwelveUnitDemo();
battle.startBattle();

// Opening 12 vs 12 simultaneous attacks all share the 0 ms timestamp.
console.log('Opening events:', battle.events.filter(event => event.timeMs === 0));

// Tick in 100 ms slices: each fighter keeps its independent attack cooldown.
for (let elapsed = 0; elapsed < 5 && battle.running; elapsed += 0.1) battle.update(0.1);
console.log('First five seconds:', battle.events);
console.log('Battle state:', {
  winner: battle.winner,
  elapsedMs: Math.round(battle.timeMs),
  playersAlive: battle.living('player').length,
  enemiesAlive: battle.living('enemy').length,
});
