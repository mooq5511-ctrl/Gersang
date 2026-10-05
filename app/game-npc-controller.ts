import type { GameStateSetter } from './game-controller-types';
import { formatGameNumber as format } from "./game-display";
import { makeFirstCaravanSword } from "./game-equipment-factory";
import { FIRST_CARAVAN_QUEST_ID } from "./game-progression-view";
import { appendGameLog as addLog } from "./game-runtime-actions";
import { type CityService,type GameState } from "./game-state";
import './gersang-archive.css';
import { claimHanyangJourneyFund,completeHanyangPrologue,grantHanyangStarterSupplies,markHanyangCaravanDelivered,markHanyangMysteryNpcSeen,markHanyangReturnReported } from "./hanyang-prologue";
import { hanyangNpcGreeting } from './hanyang-npc-dialogue';
import { addInventoryItem } from './inventory-layout';
import { awardNpcAffinity,completeNpcQuest,npcById,npcGreeting,recordNpcLine,startNpcQuest,type NpcId,type NpcOption } from "./npc-dialogue";
import './quest-journal.css';
import './relic-dungeon.css';
import { worldCities } from "./v15-data";

type Context = {
  currentCity: typeof worldCities[number];
  game: GameState;
  setActiveNpcId: (id: NpcId | null) => void;
  setActiveTab: (tab: string) => void;
  setCityService: (service: CityService) => void;
  setGame: GameStateSetter;
  setNotice: (notice: string) => void;
  setNpcOpeningLine: (line: string) => void;
};

export function createNpcController({ currentCity, game, setActiveNpcId, setActiveTab, setCityService, setGame, setNotice, setNpcOpeningLine }: Context) {
function handleNpcAction({ option, npc }: { option: NpcOption; npc: NonNullable<ReturnType<typeof npcById>> }) {
    setGame(previous => {
      let next = recordNpcLine(previous, npc.id, `${npc.name}：${option.reply}`);
      if (next.hanyangPrologueStep === "arrival" && npc.id === "kim-seongho" && option.quest === "start") next = { ...next, hanyangPrologueStep: "outskirts", logs: addLog(next.logs, "村長：村外驛路就交給你了，先去處理偷糧狸。") };
      if (next.hanyangPrologueStep === "journey-fund" && npc.id === "wang-deokchang") next = claimHanyangJourneyFund(next, Math.floor(6000 * currentCity.priceFactor));
      if (next.hanyangPrologueStep === "caravan-crisis" && npc.id === "wang-deokchang" && option.prologueStep === "caravan-crisis") next = { ...next, hanyangPrologueStep: "bandit-trial", logs: addLog(next.logs, "王德昌：黑巾斥候堵住北邊驛路，請和槍兵一起找回商隊貨物。") };
      if (next.hanyangPrologueStep === "caravan-delivery" && npc.id === "wang-deokchang" && option.prologueStep === "caravan-delivery") next = markHanyangCaravanDelivered(next);
      if (next.hanyangPrologueStep === "return" && npc.id === "kim-seongho" && option.prologueStep === "return") next = markHanyangReturnReported(next);
      if (next.hanyangPrologueStep === "departure" && npc.id === "kim-seongho" && option.prologueStep === "departure") next = completeHanyangPrologue(next);
      if (npc.id === "mysterious-traveler") next = markHanyangMysteryNpcSeen(next);
      next = awardNpcAffinity(next, npc, option);
      if (option.quest === "start") {
        next = startNpcQuest(next, npc);
        if (next !== previous) next = { ...next, logs: addLog(next.logs, `接受村莊委託「${npc.quest?.name || ""}」。`) };
      }
      if (option.quest === "complete") {
        const beforeGold = next.gold;
        next = completeNpcQuest(next, npc);
        if (next.gold !== beforeGold) {
          let rewardLog = `完成村莊委託「${npc.quest?.name || ""}」，獲得 ${format(next.gold - beforeGold)} 兩。`;
          if (npc.quest?.id === FIRST_CARAVAN_QUEST_ID) {
            const whiteSword = makeFirstCaravanSword();
            const pickup = addInventoryItem(next.inventory, whiteSword);
            next = { ...next, inventory: pickup.inventory };
            rewardLog += pickup.error ? '背包已滿，白裝短劍暫無法收下。' : '獲得白裝「商路短劍」。';
          }
          next = { ...next, logs: addLog(next.logs, rewardLog) };
          if (npc.quest?.id === FIRST_CARAVAN_QUEST_ID) next = grantHanyangStarterSupplies({ ...next, creditLevel: Math.max(2, next.creditLevel), onboardingStep: "completed", hanyangPrologueStep: "first-sale", logs: addLog(next.logs, "商團升至 Lv.2，普通傭兵雇傭資格已記入名冊；接下來查看並穿戴戰利品。") });
        }
      }
      return next;
    });
    if (option.quest === "start" && npc.id === "kim-seongho") {
      setActiveTab("battle");
      setNotice("請前往世界地圖的新手村郊外，點選偷糧狸開始清除驛路。");
    }
    if (option.service) { setCityService(option.service); setActiveTab("city"); setActiveNpcId(null); }
    if (option.openContracts) { setActiveTab("contracts"); setActiveNpcId(null); }
    if (npc.id === "lee-taesan" && option.label === "前往世界地圖") { setActiveTab("battle"); setActiveNpcId(null); }
  }

function openNpcDialogue(npcId: NpcId) {
    const npc = npcById(npcId);
    if (!npc) return;
    const greeting = hanyangNpcGreeting(game, npcId) || npcGreeting(game, npc);
    setNpcOpeningLine(greeting);
    setGame(previous => recordNpcLine(previous, npc.id, `${npc.name}：${greeting}`));
    setActiveNpcId(npcId);
  }
  return { handleNpcAction, openNpcDialogue };
}
