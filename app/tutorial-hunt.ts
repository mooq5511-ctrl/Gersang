import type {GameState} from './game-state';
import {DUNGEONS,freshDungeon} from './dungeon-engine';
import {runDungeonAction} from './game-battle-actions';
import {grantXp} from './game-progression';
import {FIRST_CARAVAN_TARGET} from './game-progression-view';
import {appendGameLog,enterGameInnAction,leaveGameInnAction} from './game-runtime-actions';

const key='e_starter_raccoon' as const;
const deps={addLog:appendGameLog,grantXp,enterInn:enterGameInnAction,leaveInn:leaveGameInnAction};

export function tutorialHuntReady(state:GameState){
  return state.hanyangPrologueStep==='outskirts'&&state.battleMap==='starter-outskirts'
    &&state.starterDeliveryKills<FIRST_CARAVAN_TARGET
    &&!['fighting','respawning','recovering'].includes(state.dungeon?.status??'idle');
}

/** Shortcut to the existing encounter, never a separate tutorial combat simulation. */
export function startTutorialHuntAction(state:GameState,now:number,rolls:Parameters<typeof runDungeonAction>[4]):GameState{
  if(!tutorialHuntReady(state))return state;
  const base={...state,selectedMonster:'偷糧狸',enemyHp:DUNGEONS[key].hp,
    dungeon:{...freshDungeon(),autoHunt:true,key,lockedEnemyKey:key,enemyHp:DUNGEONS[key].hp},
    logs:appendGameLog(state.logs,'指定遭遇怪物：偷糧狸，開始戰鬥。')};
  return runDungeonAction(base,'start',now,key,rolls,deps);
}
