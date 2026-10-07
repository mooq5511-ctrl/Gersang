import {runDungeonAction, type DungeonAction} from './game-battle-actions';
import {FIRST_CARAVAN_TARGET} from './game-progression-view';
import type {GameState} from './game-state';
import {syncHanyangDeliveryKills, syncHanyangReturnProgress} from './hanyang-story-transitions';

/** Manual actions use the same story gates as the regular loop. */
export function runWorldBattleAction(...args: Parameters<typeof runDungeonAction>): GameState {
  const [previous, action, , key, , deps] = args;
  let next = runDungeonAction(...args);
  const won = next.kills > previous.kills;
  if (won) {
    next = syncHanyangDeliveryKills(next, FIRST_CARAVAN_TARGET);
    next = syncHanyangReturnProgress(next);
  }
  // Keep the legacy non-punitive recruitment trial only on a resolved fight.
  // Stopping or retreating is not a scripted defeat.
  const resolved = previous.dungeon?.status === 'fighting' && (won || next.dungeon?.status === 'recovering');
  const trial = previous.onboardingStep === 'mercenary-trial' &&
    (key ?? previous.dungeon?.key) === 'e_starter_black_bandit' && !isControlAction(action) && resolved;
  if (trial) return {
    ...next, hero: previous.hero, mercs: previous.mercs, gold: previous.gold,
    inventory: previous.inventory, medicines: previous.medicines, onboardingStep: 'hire-first-merc',
    dungeon: next.dungeon ? {...next.dungeon, status: 'idle', autoHunt: false, realtime: undefined, realtimeCursor: 0} : next.dungeon,
    logs: deps.addLog(next.logs, '黑巾斥候壓制了你的隊伍；這不是懲罰，而是提醒你需要傭兵。'),
  };
  const delivery = previous.onboardingStep === 'travel-to-outskirts' || previous.onboardingStep === 'first-battle';
  if (delivery && next.starterDeliveryKills > previous.starterDeliveryKills) return {
    ...next, onboardingStep: next.starterDeliveryKills >= FIRST_CARAVAN_TARGET ? 'return-village-chief' : 'first-battle',
    dungeon: next.dungeon ? {...next.dungeon, autoHunt: false} : next.dungeon,
  };
  return next;
}

function isControlAction(action: DungeonAction) {
  return ['start', 'start-auto-hunt', 'toggle-auto-hunt', 'stop', 'retreat'].includes(action);
}
