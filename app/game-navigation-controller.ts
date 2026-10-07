import type { Dispatch,SetStateAction } from 'react';
import { DUNGEONS,freshDungeon } from './dungeon-engine';
import { selectBattleMapAction } from "./game-battle-actions";
import type { GameStateSetter } from './game-controller-types';
import { getProgressionView } from "./game-progression-view";
import { appendGameLog as addLog,enemyMaxForStage as enemyMax } from "./game-runtime-actions";
import { type CityService,type GameState } from "./game-state";
import './gersang-archive.css';
import { type NpcId } from "./npc-dialogue";
import './quest-journal.css';
import './relic-dungeon.css';
import { sourceEnemies } from "./v17-content";
import { syncHanyangReturnProgress } from './hanyang-story-transitions';

type Context = {
  game: GameState;
  mainObjective: ReturnType<typeof getProgressionView>["mainObjective"];
  openNpcDialogue: (id: NpcId) => void;
  setActiveNpcId: (id: NpcId | null) => void;
  setActiveTab: (tab: string) => void;
  setCityService: (service: CityService) => void;
  setGame: GameStateSetter;
  setNotice: (notice: string) => void;
  setNpcOpeningLine: (line: string) => void;
  setSquadDestination: Dispatch<SetStateAction<{ key: number; window?: "inventory" | "territory" }>>;
  revealBattleTarget?: () => void;
};

export function createNavigationController({ game, mainObjective, openNpcDialogue, setActiveNpcId, setActiveTab, setCityService, setGame, setNotice, setNpcOpeningLine, setSquadDestination, revealBattleTarget }: Context) {
function goToObjective() {
    if (game.hanyangPrologueStep === "arrival") {
      setNpcOpeningLine("村長金成浩神色凝重地望向你：終於等到你了，村外驛路出事了，現在只有你能幫忙！");
      setActiveNpcId("kim-seongho");
      setActiveTab("map");
      return;
    }
    if (game.hanyangPrologueStep === "bandit-trial" && syncHanyangReturnProgress(game) !== game) {
      // Recheck the latest state inside the updater; a stale UI snapshot is not
      // evidence that the current encounter was won.
      setGame(syncHanyangReturnProgress);
      setActiveTab("map");
      return;
    }
    if (game.hanyangPrologueStep === "caravan-crisis") {
      setGame(previous => ({ ...previous, hanyangPrologueStep: "bandit-trial", logs: addLog(previous.logs, "商隊夥計：不好了！北邊商路又出事了，黑巾斥候把路堵住了。") }));
      setActiveTab("battle");
      return;
    }
    if ('npcId' in mainObjective && mainObjective.npcId) {
      setActiveTab('map');
      openNpcDialogue(mainObjective.npcId);
      return;
    }
    if ('mapId' in mainObjective && mainObjective.mapId && 'monsterName' in mainObjective && mainObjective.monsterName) {
      const objectiveMapId = mainObjective.mapId;
      const objectiveMonsterName = mainObjective.monsterName;
      setGame(previous => {
        const moved = selectBattleMapAction(previous, objectiveMapId, { notify: setNotice, enemyMax, addLog });
        const target = sourceEnemies.find(enemy => enemy.mapId === objectiveMapId && enemy.name === objectiveMonsterName);
        const key = target?.dungeonId;
        if (!target || !key) return moved;
        return { ...moved, selectedMonster: target.name, enemyHp: target.hp || moved.enemyHp, dungeon: { ...freshDungeon(), autoHunt: moved.dungeon?.autoHunt === true, key, lockedEnemyKey: key, enemyHp: DUNGEONS[key].hp }, logs: addLog(moved.logs, `主線目標已指向：${target.name}。`) };
      });
      setActiveTab('battle');
      revealBattleTarget?.();
      return;
    }
    if (mainObjective.tab === 'city') setCityService(('service' in mainObjective ? mainObjective.service : undefined) || 'inn');
    if (mainObjective.tab === 'squad') setSquadDestination(previous => ({ key: previous.key + 1, window: mainObjective.window }));
    setActiveTab(mainObjective.tab);
  }
  return { goToObjective };
}
