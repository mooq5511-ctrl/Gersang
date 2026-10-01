import { useState } from "react";
import type { GameState } from "./game-state";
import type { GameplayContract } from "../data/contracts/gameplay-contracts";
import { contractProgress } from "./game-contract-actions";
import { HANYANG_PROLOGUE_STEPS } from "./hanyang-prologue";
import { VILLAGE_NPCS, npcQuestProgress, type NpcId } from "./npc-dialogue";
import { CITY_HALL_COMMISSIONS, cityHallCommissionProgress, cityHallEffectiveReward, normalizeCityHallState } from "./city-hall-commissions";
import { newcomerUnlocks } from "./newcomer-unlocks";
import type { ProgressionRoadmapStage } from "./progression-roadmap";
import { ADVENTURE_QUESTS, dailyQuests, normalizeQuestLedger, questAvailability, questValue } from "./adventure-quests";

export type QuestDestination = "current" | "contracts" | "hall" | "battle" | "squad" | "trade" | "relic" | NpcId;
export type JournalEntry = { id: string; category: string; title: string; detail: string; status: string; requirement: string; reward: string; progress?: string; destination?: QuestDestination; minLevel?: number; maxLevel?: number; claimId?: string };
const prologueOrder = ["arrival", "outskirts", "first-sale", "journey-fund", "medicine", "guild", "formation", "caravan-crisis", "bandit-trial", "caravan-delivery", "return", "departure", "completed"];
const number = (value: number) => value.toLocaleString("zh-TW");

export function buildQuestJournal(game: GameState, current: { title: string; detail: string }, stages: ProgressionRoadmapStage[], contracts: GameplayContract[], now = Date.now()): JournalEntry[] {
  const unlocks = newcomerUnlocks(game);
  const step = game.hanyangPrologueStep === "first-battle" ? "outskirts" : game.hanyangPrologueStep;
  const index = prologueOrder.indexOf(step);
  const entries: JournalEntry[] = [{ id: "current", category: "主線", title: current.title, detail: current.detail, status: "目前目標", requirement: "依照任務目標推進。", reward: "完成後銜接下一個主線目標。", destination: "current" }];
  prologueOrder.forEach((id, position) => {
    const chapter = HANYANG_PROLOGUE_STEPS.find(item => item.step === id);
    if (!chapter) return;
    const done = position < index || step === "completed";
    entries.push({ id: `story:${id}`, category: "主線", title: chapter.title, detail: chapter.detail, status: done ? "已完成" : position === index ? "進行中" : "未解鎖", requirement: position === 0 ? "抵達漢陽。" : `完成「${HANYANG_PROLOGUE_STEPS.find(item => item.step === prologueOrder[position - 1])?.title}」。`, reward: id === "completed" || id === "departure" ? "開啟世界地圖，自由探索商路。" : "推進漢陽序章。", destination: !done && position === index ? "current" : undefined });
  });
  entries.push({ id: "first-trade", category: "主線", title: "完成第一趟東海商路", detail: "派遣傭兵運送貨物，完成第一筆貿易。", status: unlocks.firstTradeComplete ? "已完成" : unlocks.trade ? "可進行" : "未解鎖", requirement: "完成漢陽序章，並備妥貿易隊伍。", reward: "商路收益；符合隊伍條件後開啟遺跡遠征。" });
  entries.push({ id: "first-relic-reward", category: "主線", title: "派遣傭兵探索沉沒遺跡", detail: "派遣休息中的傭兵，取得第一份遺跡材料或古代裝備。", status: unlocks.firstRelicReward ? "已完成" : unlocks.relic ? "可進行" : "未解鎖", requirement: "完成第一趟貿易並擁有傭兵；資深商團已開啟。", reward: "遺跡掉落；開啟圖鑑與委託功能。" });
  entries.push({ id: "level-20", category: "成長", title: "提升主角至 Lv.20", detail: "持續戰鬥與培養隊伍，準備挑戰山賊首領。", status: game.hero.level >= 20 ? "已完成" : "可進行", requirement: "透過冒險累積角色經驗。", reward: "達成首領挑戰的等級條件。", progress: `${Math.min(game.hero.level, 20)} / 20` });
  entries.push({ id: "waystation", category: "成長", title: "建設驛站 Lv.1", detail: "在商團領地建設驛站，整備商路。", status: game.territory.buildings.waystation >= 1 ? "已完成" : "可規劃", requirement: "備妥領地建設所需資源。", reward: "達成首領挑戰的驛站條件。" });
  const equippedGreen = game.firstGreenEquipped || [game.hero, ...game.mercs, ...game.restingMercs].some(unit => Object.values(unit.equip).some(item => item && item.rarity !== "普通"));
  entries.push({ id: "first-green", category: "成長", title: "合成並穿戴第一件綠裝", detail: "收集 5 件符合合成条件的同名、同部位白裝，合成後穿戴；已有非普通裝備也能完成穿戴條件。", status: equippedGreen ? "已完成" : "可規劃", requirement: "合成材料須未強化、未鑲嵌；穿戴須符合角色等級。", reward: "提升實際能力，達成首領挑戰的裝備條件。" });
  entries.push({ id: "golden-starfish", category: "成長", title: "討伐黃金海星，開通白虎林", detail: "擊敗日本海底洞的黃金海星，取得前往白虎林的資格。", status: game.goldenStarfishDefeated ? "已完成" : game.lakeBossDefeated ? "可進行" : "未解鎖", requirement: "先擊敗千年湖首領，開通日本海底洞。", reward: "開通白虎林。" });
  stages.forEach(stage => entries.push({ id: `growth:${stage.id}`, category: "成長", title: stage.label, detail: stage.condition, status: stage.state === "done" ? "已完成" : stage.state === "current" ? "目前階段" : "未解鎖", requirement: stage.condition, reward: stage.reward }));
  VILLAGE_NPCS.forEach(npc => {
    const quest = npc.quest;
    if (!quest) return;
    const done = game.npcProgress.completedQuests.includes(quest.id);
    const active = game.npcProgress.activeQuests.includes(quest.id);
    const progress = npcQuestProgress(game, quest);
    const accessible = unlocks.prologueComplete || active || (npc.id === "kim-seongho" && step === "arrival");
    entries.push({ id: `npc:${quest.id}`, category: "村莊委託", title: quest.name, detail: active ? npc.inProgress : npc.beforeQuest, status: done ? "已完成" : active ? progress >= quest.target ? "可回報" : "進行中" : accessible ? "未接取" : "未解鎖", requirement: `向漢陽的${npc.name}接取${accessible ? "。" : "；先完成漢陽序章。"}`, reward: `${number(quest.reward.gold)} 兩・好感 +${quest.reward.affinity}`, progress: `${Math.min(progress, quest.target)} / ${quest.target}${active ? "" : "（現有條件，尚未接取）"}`, destination: accessible && !done ? npc.id : undefined });
  });
  contracts.forEach(quest => {
    const progress = contractProgress(game, quest.metric);
    const done = game.claimedContracts.includes(quest.id);
    // The current claim action grants gold only, not legacy resource metadata.
    const reward = `${number(quest.reward.gold)} 兩`;
    entries.push({ id: `contract:${quest.id}`, category: "冒險委託", title: quest.name, detail: quest.description, status: done ? "已完成" : !unlocks.contracts ? "未解鎖" : progress >= quest.target ? "可領取" : "進行中", requirement: "取得第一份遺跡收益後開啟冒險委託（資深商團已開啟）。", reward, progress: `${Math.min(progress, quest.target)} / ${quest.target}`, destination: unlocks.contracts && !done ? "contracts" : undefined });
  });
  const hall = normalizeCityHallState(game.cityHall);
  CITY_HALL_COMMISSIONS.forEach(quest => {
    const active = hall.active.find(item => item.id === quest.id);
    const done = hall.completedIds.includes(quest.id);
    const posted = hall.availableIds.includes(quest.id);
    const progress = active ? cityHallCommissionProgress(game, active) : 0;
    const reward = cityHallEffectiveReward(quest);
    entries.push({ id: `hall:${quest.id}`, category: "市政廳", title: quest.name, detail: `${quest.description} ${quest.actionHint}`, status: active ? progress >= quest.target ? "可回報" : "進行中" : done ? "已完成" : !unlocks.hall ? "未解鎖" : posted ? "未接取" : "尚未公告", requirement: !unlocks.hall ? "取得第一份遺跡收益後開啟市政廳（資深商團已開啟）。" : active ? `接取後${quest.objectiveLabel} ${number(quest.target)}；${quest.locationLabel}。` : posted ? "在市政廳接取後開始累計進度。" : "等待公告板刷新；此處僅預覽，不保證下一次出現。", reward: [`${number(reward.rewardGold)} 兩`, `信用經驗 ${number(reward.rewardCreditXp)}`, `角色經驗 ${number(reward.rewardXp)}`, ...Object.entries(reward.rewardMaterials || {}).map(([name, amount]) => `${name} ×${amount}`), reward.rewardEquipmentRarity ? `${reward.rewardEquipmentRarity}裝備` : ""].filter(Boolean).join("・"), progress: active ? `${Math.min(progress, quest.target)} / ${quest.target}` : undefined, destination: unlocks.hall && (active || posted) ? "hall" : undefined });
  });
  entries.push({ id: "resources", category: "資源", title: "資源用途", detail: "銀兩：日常招募、商店、客棧與建設。信用值：商團升階與技能點。遺跡材料：遺跡鍛造特殊裝備。", status: "說明", requirement: "各項功能依主線進度逐步開啟。", reward: "此項為資源說明，不是可領取獎勵的任務。" });
  const ledger = normalizeQuestLedger(game.questLedger, now, game.hero.level);
  const series = [...ADVENTURE_QUESTS, ...dailyQuests(ledger.daily.level)].map(quest => {
    const state = questAvailability(game, quest, ledger);
    const missing = quest.prerequisites.filter(id => !ledger.claimed.includes(id));
    return { id: quest.id, category: quest.category, title: quest.title, detail: `${quest.chapter}｜${quest.description}`, minLevel: quest.daily ? undefined : quest.minLevel, maxLevel: quest.daily ? undefined : quest.maxLevel, status: state.claimed ? "已完成" : state.ready ? "可領取" : state.unlocked ? "進行中" : "未解鎖", requirement: [`完成漢陽序章；主角 Lv.${quest.minLevel} 起可進行。`, quest.feature ? `需開啟${quest.feature === "trade" ? "貿易" : "遺跡地下城"}。` : "", missing.length ? `本章還有 ${missing.length} 項前置任務需完成並領獎：${missing.map(id => ADVENTURE_QUESTS.find(item => item.id === id)?.title).join("、")}。` : "", quest.daily ? `${ledger.daily.day} 每日任務，台灣時間 00:00 刷新。` : ""].filter(Boolean).join(" "), reward: `${number(quest.reward.gold)} 兩・角色經驗 ${number(quest.reward.xp)}${quest.reward.cores ? `・合成核心 ×${quest.reward.cores}` : ""}`, progress: quest.conditions.map(item => `${item.label} ${number(Math.min(item.target, questValue(game, item, ledger, quest.daily)))} / ${number(item.target)}`).join("；"), destination: state.unlocked && !state.claimed ? quest.destination : undefined, claimId: state.ready && !state.claimed ? quest.id : undefined } satisfies JournalEntry;
  });
  entries.splice(1, 0, ...series);
  return entries;
}

export function QuestJournal({ game, current, stages, contracts, onNavigate, onClaim, onClose }: { game: GameState; current: { title: string; detail: string }; stages: ProgressionRoadmapStage[]; contracts: GameplayContract[]; onNavigate: (destination: QuestDestination) => void; onClaim: (id: string) => void; onClose: () => void }) {
  const [category, setCategory] = useState("全部");
  const [selectedId, setSelectedId] = useState("current");
  const [levelRange, setLevelRange] = useState("recommended");
  const [hideCompleted, setHideCompleted] = useState(false);
  const entries = buildQuestJournal(game, current, stages, contracts);
  const bandEnd = Math.min(250, Math.ceil(game.hero.level / 10) * 10);
  const visible = entries.filter(entry => (category === "全部" || entry.category === category) && (!hideCompleted || entry.status !== "已完成") && (!entry.minLevel || levelRange === "all" || entry.maxLevel === (levelRange === "recommended" ? bandEnd : Number(levelRange))));
  const selected = visible.find(entry => entry.id === selectedId) || visible[0];
  return <div className="quest-journal">
    <header className="quest-journal-header"><div><small>商團指引</small><h2>任務日誌</h2><p>查看當前目標與後續旅程，不必一次完成所有任務。</p></div><button type="button" onClick={onClose} aria-label="收合任務面板">收合 ▴</button></header>
    <nav className="quest-journal-filters" aria-label="任務分類">{["全部", "主線", "等級成長", "階段任務", "戰鬥任務", "經營任務", "每日任務", "成長", "村莊委託", "冒險委託", "市政廳", "資源"].map(label => <button type="button" key={label} aria-pressed={category === label} onClick={() => setCategory(label)}>{label}<small>{label === "全部" ? entries.length : entries.filter(entry => entry.category === label).length}</small></button>)}</nav>
    <div className="quest-journal-tools"><label>等級章節 <select value={levelRange} onChange={event => setLevelRange(event.target.value)}><option value="recommended">目前階段（Lv.{bandEnd - 9}–{bandEnd}）</option><option value="all">完整旅程（Lv.1–250）</option>{Array.from({ length: 25 }, (_, index) => <option key={index} value={(index + 1) * 10}>Lv.{index * 10 + 1}–{(index + 1) * 10}</option>)}</select></label><label><input type="checkbox" checked={hideCompleted} onChange={event => setHideCompleted(event.target.checked)}/> 隱藏已完成</label><small>每日 00:00 台灣時間刷新</small></div>
    <div className="quest-journal-body"><aside className="quest-journal-list" aria-label="完整任務列表">{visible.map(entry => <button type="button" key={entry.id} aria-pressed={selected?.id === entry.id} onClick={() => setSelectedId(entry.id)}><small>{entry.category}・{entry.status}</small><strong>{entry.title}</strong></button>)}</aside>
      {selected ? <article className="quest-journal-detail"><small>{selected.category} / {selected.status}</small><h3>{selected.title}</h3><section><h4>任務目標</h4><p>{selected.detail}</p>{selected.progress ? <p className="quest-journal-progress">進度 {selected.progress}</p> : null}</section><section><h4>前置條件</h4><p>{selected.requirement}</p></section><section><h4>獎勵／階段成果</h4><p>{selected.reward}</p></section><footer>{selected.claimId ? <button type="button" onClick={() => onClaim(selected.claimId!)}>領取獎勵</button> : <button type="button" disabled={!selected.destination} onClick={() => { if (selected.destination) onNavigate(selected.destination); }}>{selected.destination ? selected.status === "可回報" ? "前往回報" : selected.status === "可領取" ? "前往領取" : "前往任務" : selected.status === "已完成" ? "已完成" : "任務預覽"}</button>}<p>{!selected.destination && selected.status !== "已完成" ? "可先查看後續內容；實際推進依目前主線與解鎖條件。" : "獎勵需依原本流程完成／回報，不會在預覽時自動發放。"}</p></footer></article> : <p>此篩選下沒有任務，請切換章節或顯示已完成任務。</p>}
    </div>
  </div>;
}
