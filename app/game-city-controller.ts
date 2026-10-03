import { selectBattleMapAction } from "./game-battle-actions";
import { gameplayContracts } from './game-catalog';
import { restAtInnAction,travelCityAction } from "./game-city-actions";
import { claimContractAction } from "./game-contract-actions";
import type { GameStateSetter } from './game-controller-types';
import { formatGameNumber as format } from "./game-display";
import { grantXp } from "./game-progression";
import { appendGameLog as addLog,enemyMaxForStage as enemyMax,payGameInnAction as payGameInn } from "./game-runtime-actions";
import { type CityService,type GameState } from "./game-state";
import './gersang-archive.css';
import './quest-journal.css';
import './relic-dungeon.css';
import { worldCities } from "./v15-data";

type Context = {
  currentCity: typeof worldCities[number];
  game: GameState;
  setCityService: (service: CityService) => void;
  setGame: GameStateSetter;
  setNotice: (notice: string) => void;
};

export function createCityController({ currentCity, game, setCityService, setGame, setNotice }: Context) {
function selectBattleMap(mapId: string) {
    setGame((previous) => selectBattleMapAction(previous, mapId, { notify: setNotice, enemyMax, addLog }));
  }

function travelToCity(cityId: string) {
    setGame(previous => travelCityAction(previous, cityId, addLog, format, setNotice));
    setCityService("mercenary");
  }

function restAtInn() {
    // 戰敗療傷中再次點擊客棧，直接走付費快速治療；不再被 dungeonBusy 擋住。
    if(game.hero.status==='客棧中'||game.dungeon?.status==='recovering'){setGame(payGameInn);return;}
    setGame(previous => restAtInnAction(previous, currentCity.priceFactor, currentCity.name, addLog, grantXp, setNotice));
  }

function claimContract(contractId: string) {
    setGame(previous => claimContractAction(previous, gameplayContracts, contractId, addLog, setNotice));
  }
  return { selectBattleMap, travelToCity, restAtInn, claimContract };
}
