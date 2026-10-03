import type { GameStateSetter } from './game-controller-types';
import { appendGameLog as addLog } from "./game-runtime-actions";
import './gersang-archive.css';
import { promoteGuildRankAction } from "./guild-rank";
import { upgradeGuildSkillAction,type GuildSkillId } from "./guild-skills";
import './quest-journal.css';
import './relic-dungeon.css';

type Context = {
  setGame: GameStateSetter;
};

export function createGuildController({ setGame }: Context) {
function promoteGuildRank() {
    setGame((previous) => promoteGuildRankAction(previous, addLog));
  }

function upgradeGuildSkill(id: GuildSkillId) {
    setGame((previous) => upgradeGuildSkillAction(previous, id, addLog));
  }
  return { promoteGuildRank, upgradeGuildSkill };
}
