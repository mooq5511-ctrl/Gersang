import type {DungeonKey} from './dungeon-engine';
import type {GameState} from './game-state';
import {sourceEnemyForDungeonKey} from './v17-content';

export const HANYANG_BOSS_LOCK_MESSAGE='請先完成村長的新手引導，再挑戰世界首領。';

/** Keep story teaching fights available; only actual world bosses wait for prologue completion. */
export function hanyangWorldBossBlocked(state:Pick<GameState,'hanyangPrologueStep'>,key:DungeonKey|undefined):boolean {
  return !!state.hanyangPrologueStep&&state.hanyangPrologueStep!=='completed'&&!!key&&sourceEnemyForDungeonKey(key)?.boss===true;
}
