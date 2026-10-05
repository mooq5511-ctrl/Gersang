"use client";
import { TabsContent } from "@/components/ui/tabs";
import {settleRelicRewards,relicRewardRandom} from './relic-reward-settlement';
import {toggleRelicAutoExplore,stopRelicAutoExplore} from './relic-auto-explore';
import { relicEquipmentScore } from "./game-progression-view";
import { ACTIVE_MERCENARY_LIMIT } from './guild-migration';
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
            onAction={(action: RelicDungeonAction, selectedPartyUids?: string[]) => { const rewardSeed=Math.random(),eventNow=Date.now();setGame(previous => {
              const current = previous.relicDungeon || freshRelicDungeon(vitalStats(previous.hero).maxHp);
              if(action==='toggle-auto-explore')return toggleRelicAutoExplore(previous,selectedPartyUids||[],eventNow,rewardSeed,import.meta.env.DEV?30_000:30*60*1000);
              if(current.autoExplore?.enabled&&action==='toggle-auto-battle')return stopRelicAutoExplore(previous,'玩家中止自動攻略；已取得獎勵保留。');
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
              const next = relicDungeonAction(current, action, partyPower, { maxHp: partyMaxHp, currentHp: partyCurrentHp, partyPower, partyEquipmentScore, partyNames: party.map(unit => unit.name), partyUids: party.map(unit => unit.uid), partyReady, now: eventNow, dispatchDurationMs: import.meta.env.DEV ? 30_000 : 30 * 60 * 1000 });
              const settled=settleRelicRewards(previous,current,next,action,relicRewardRandom(rewardSeed));
              return action==='retreat'&&current.autoExplore?.enabled?stopRelicAutoExplore(settled,'玩家撤出遺跡；已取得獎勵與隊伍傷勢保留。'):settled;
            });}}
          />}
        </TabsContent>);
}
