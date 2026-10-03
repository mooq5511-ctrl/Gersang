import type { GameStateSetter } from './game-controller-types';
import { formatGameNumber as format } from "./game-display";
import { makeUid as uid } from "./game-equipment-factory";
import { FIRST_CARAVAN_QUEST_ID } from "./game-progression-view";
import { appendGameLog as addLog } from "./game-runtime-actions";
import { type CityService,type Equipment,type GameState } from "./game-state";
import './gersang-archive.css';
import { gersangItemArt } from './gersang-visuals';
import { claimHanyangJourneyFund,completeHanyangPrologue,grantHanyangStarterSupplies,markHanyangCaravanDelivered,markHanyangMysteryNpcSeen,markHanyangReturnReported } from "./hanyang-prologue";
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
      if (next.hanyangPrologueStep === "caravan-crisis") next = { ...next, hanyangPrologueStep: "bandit-trial" };
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
            const whiteSword: Equipment = { uid: uid('first-caravan-sword'), name: '商路短劍', slot: 'weapon', atk: 18, def: 0, hp: 0, image: gersangItemArt('weapon'), enhance: 0, rarity: '普通', magic: [], bonus: { str: 0, agi: 0, intel: 0, vit: 0 }, resist: { physical: 0, magic: 0 }, requiredLevel: 1, source: '第一份商隊委託' };
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
    const greeting = game.hanyangPrologueStep === "caravan-delivery" && npcId === "wang-deokchang"
      ? "這箱貨……你真的從黑巾斥候手裡帶回來了？先別急著高興，我有件事要讓你看清楚。"
      : game.hanyangPrologueStep === "return" && npcId === "kim-seongho"
        ? "你回來了。王德昌已把貨物收妥？那麼，告訴我北邊商路究竟發生了什麼。"
        : game.hanyangPrologueStep === "departure" && npcId === "kim-seongho"
          ? "我都聽明白了。漢陽欠你一份人情，但別把這裡當成終點。"
          : npcGreeting(game, npc);
    setNpcOpeningLine(greeting);
    setGame(previous => recordNpcLine(previous, npc.id, `${npc.name}：${greeting}`));
    setActiveNpcId(npcId);
  }
  return { handleNpcAction, openNpcDialogue };
}
