"use client";
import {settleRelicWarSeal} from './war-seals';
import type {GameState} from './game-state';
import { relicMaterialLoot } from './relic-material-loot';
import { TabsContent } from "@/components/ui/tabs";
import { rollRelicEquipment } from "./game-equipment-factory";
import { relicEquipmentScore } from "./game-progression-view";
import { appendGameLog as addLog } from "./game-runtime-actions";
import { ACTIVE_MERCENARY_LIMIT } from './guild-migration';
import { positionInventory } from './inventory-layout';
import { RelicDispatchPanel,freshRelicDungeon,relicDungeonAction,type RelicDungeonAction } from './relic-dungeon';
import type { GameViewModel } from './use-game-controller';
import { vitalStats } from "./vitals-engine";

type Props = Pick<GameViewModel, "activeTab" | "displayedPower" | "game" | "setActiveTab" | "setCityService" | "setGame" | "setSquadDestination">;

export function GameRelicPage({ activeTab, displayedPower, game, setActiveTab, setCityService, setGame, setSquadDestination }: Props) {
return (<TabsContent value="relic" className="tab-panel relic-dungeon-tab">
          {activeTab === "relic" && <RelicDispatchPanel
            onPrepare={destination => {
              if (destination === "mercenary") { setCityService("mercenary"); setActiveTab("city"); }
              else if (destination === "equipment") { setSquadDestination(previous => ({ key: previous.key + 1, window: "inventory" })); setActiveTab("squad"); }
              else setActiveTab(destination === "battle" ? "battle" : "squad");
            }}
            state={game.relicDungeon || freshRelicDungeon(vitalStats(game.hero).maxHp)}
            power={Math.floor(displayedPower(game.hero) + game.mercs.filter(unit => game.active.includes(unit.uid)).reduce((sum, unit) => sum + displayedPower(unit), 0))}
            dispatchParty={game.restingMercs.map(unit => ({ uid: unit.uid, name: unit.name, role: unit.role, level: unit.level, image: unit.image, hp: unit.hp, maxHp: vitalStats(unit).maxHp, power: displayedPower(unit), equipmentScore: relicEquipmentScore(unit) }))}
            onAction={(action: RelicDungeonAction, selectedPartyUids?: string[]) => { const sealRoll=Math.random(),sealChoice=Math.random(),materialRolls=[Math.random(),Math.random()];setGame(previous => {
              const current = previous.relicDungeon || freshRelicDungeon(vitalStats(previous.hero).maxHp);
              const activeParty = [previous.hero, ...previous.mercs.filter(unit => previous.active.includes(unit.uid)).slice(0, ACTIVE_MERCENARY_LIMIT)];
              const reservationActive = current.status === 'dispatching' || current.status === 'ready' || current.status === 'boss';
              const reservedUids = Array.isArray(current.dispatchPartyUids) ? current.dispatchPartyUids : [];
              const reservedParty = reservationActive ? previous.restingMercs.filter(unit => reservedUids.includes(unit.uid)) : [];
              const dispatchParty = current.status === 'cleared' || current.status === 'defeated' ? previous.restingMercs.filter(unit => !selectedPartyUids?.length || selectedPartyUids.includes(unit.uid)) : previous.restingMercs.filter(unit => !reservedUids.includes(unit.uid) && (!selectedPartyUids?.length || selectedPartyUids.includes(unit.uid)));
              const selectingParty = action === 'dispatch' || (action === 'challenge-boss' && !reservedParty.length);
              const party = selectingParty ? dispatchParty : (['claim', 'challenge-boss', 'attack-boss', 'retreat'].includes(action) && reservedParty.length ? reservedParty : activeParty);
              const partyPower = Math.floor(party.reduce((sum, unit) => sum + displayedPower(unit), 0));
              const partyEquipmentScore = party.reduce((sum, unit) => sum + relicEquipmentScore(unit), 0);
              const partyMaxHp = party.reduce((sum, unit) => sum + vitalStats(unit).maxHp, 0);
              const partyCurrentHp = party.reduce((sum, unit) => sum + Math.max(0, vitalStats(unit).hp), 0);
              const partyReady = party.some(unit => vitalStats(unit).hp > 0);
              const next = relicDungeonAction(current, action, partyPower, { maxHp: partyMaxHp, currentHp: partyCurrentHp, partyPower, partyEquipmentScore, partyNames: party.map(unit => unit.name), partyUids: party.map(unit => unit.uid), partyReady, now: Date.now(), dispatchDurationMs: import.meta.env.DEV ? 30_000 : 30 * 60 * 1000 });
              const reward = next.lastReward;
              const loot = reward.gold && (action === 'claim' || next.status === 'cleared') ? relicMaterialLoot(next.status === 'cleared' ? current.bossMonsterId : next.encounterMonsterId, materialRolls) : [];
              const gained = reward.gold ? `獲得 ${reward.gold.toLocaleString()} 兩；` : "";
              const relicItems = reward.equipment ? Array.from({ length: reward.equipment }, () => rollRelicEquipment(Math.max(1, Math.floor((next.progress || previous.stage) / 10)), Math.random, next.status === "cleared")) : [];
              const rewardLog = reward.gold || reward.shards || reward.materials || reward.equipment ? addLog(previous.logs, `遺跡遠征結算：${gained}${reward.materials ? `遺跡材料 +${reward.materials}；` : ""}${reward.equipment ? `古代裝備 +${reward.equipment}；` : ""}${reward.shards ? `遺跡碎片 +${reward.shards}。` : ""}`) : previous.logs;
              const materials: Record<string, number> = reward.shards || reward.materials || reward.equipment ? { ...previous.materials, "遺跡碎片": (previous.materials["遺跡碎片"] || 0) + reward.shards, "遺跡材料": (previous.materials["遺跡材料"] || 0) + reward.materials, "古代裝備": (previous.materials["古代裝備"] || 0) + reward.equipment } : { ...previous.materials };
              for (const item of loot) materials[item] = (materials[item] || 0) + 1;
              const settled:GameState = { ...previous, gold: previous.gold + reward.gold, inventory: relicItems.length ? positionInventory([...previous.inventory, ...relicItems]) : previous.inventory, materials, relicDungeon: next, logs: loot.length ? addLog(rewardLog, `遺跡戰利品：${loot.join('、')}。`) : rewardLog }; return settleRelicWarSeal(settled,current,next,sealRoll,sealChoice);
            });}}
          />}
        </TabsContent>);
}
