"use client";
import { TabsContent } from "@/components/ui/tabs";
import { IsometricWorldMap } from "./isometric-world-map";
import { npcById } from "./npc-dialogue";
import { NpcDialoguePanel } from "./npc-dialogue-panel";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "activeNpcId" | "activeTab" | "displayCityName" | "game" | "handleNpcAction" | "mapLocationLabel" | "mysteryNpcVisible" | "npcLabelsVisible" | "npcOpeningLine" | "openNpcDialogue" | "progressiveUnlocks" | "setActiveNpcId" | "setActiveTab" | "setCityService" | "setNpcLabelsVisible" | "tutorialCityLocked" | "tutorialMapLocked" | "tutorialNpcIds" | "tutorialTrialLocked">;

export function GameMapPage({ activeNpcId, activeTab, displayCityName, game, handleNpcAction, mapLocationLabel, mysteryNpcVisible, npcLabelsVisible, npcOpeningLine, openNpcDialogue, progressiveUnlocks, setActiveNpcId, setActiveTab, setCityService, setNpcLabelsVisible, tutorialMapLocked, tutorialNpcIds }: Props) {
return (<TabsContent value="map" className="tab-panel isometric-map-tab">
          {activeTab === "map" && <IsometricWorldMap cityName={displayCityName} locationLabel={mapLocationLabel} objectiveExpanded={false} npcLabelsVisible={npcLabelsVisible} onNpcLabelsVisibleChange={setNpcLabelsVisible} onNpcTalk={openNpcDialogue} tutorialLocked={tutorialMapLocked} tutorialNpcIds={tutorialNpcIds} npcVisible={npcId => npcId !== "mysterious-traveler" || mysteryNpcVisible} destinationVisible={destination => destination === "city" || destination === "battle" || destination === "trade" && progressiveUnlocks.trade || destination === "hall" && progressiveUnlocks.hall || destination === "raid" && progressiveUnlocks.raid} onEnter={(destination) => {
            if (destination === "city") { setCityService("mercenary"); setActiveTab("city"); }
            else if (destination === "trade") setActiveTab("trade");
            else if (destination === "raid") setActiveTab("raid");
            else if (destination === "hall") setActiveTab("hall");
            else if (destination === "battle") setActiveTab("battle");
            else setActiveTab("squad");
          }} />}
          {activeNpcId && npcById(activeNpcId) && <NpcDialoguePanel npc={npcById(activeNpcId)!} game={game} initialLine={npcOpeningLine} onAction={handleNpcAction} onClose={() => setActiveNpcId(null)} />}
        </TabsContent>);
}
