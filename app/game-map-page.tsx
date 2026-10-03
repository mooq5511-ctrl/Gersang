"use client";
import { TabsContent } from "@/components/ui/tabs";
import { IsometricWorldMap } from "./isometric-world-map";
import { npcById } from "./npc-dialogue";
import { NpcDialoguePanel } from "./npc-dialogue-panel";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "activeNpcId" | "activeTab" | "displayCityName" | "game" | "handleNpcAction" | "mapLocationLabel" | "mysteryNpcVisible" | "npcLabelsVisible" | "npcOpeningLine" | "objectiveExpanded" | "openNpcDialogue" | "progressiveUnlocks" | "setActiveNpcId" | "setActiveTab" | "setCityService" | "setNpcLabelsVisible" | "tutorialCityLocked" | "tutorialMapLocked" | "tutorialNpcIds" | "tutorialTrialLocked">;

export function GameMapPage({ activeNpcId, activeTab, displayCityName, game, handleNpcAction, mapLocationLabel, mysteryNpcVisible, npcLabelsVisible, npcOpeningLine, objectiveExpanded, openNpcDialogue, progressiveUnlocks, setActiveNpcId, setActiveTab, setCityService, setNpcLabelsVisible, tutorialCityLocked, tutorialMapLocked, tutorialNpcIds, tutorialTrialLocked }: Props) {
return (<TabsContent value="map" className="tab-panel isometric-map-tab">
          {activeTab === "map" && <IsometricWorldMap cityName={displayCityName} locationLabel={mapLocationLabel} objectiveExpanded={objectiveExpanded} npcLabelsVisible={npcLabelsVisible} onNpcLabelsVisibleChange={setNpcLabelsVisible} onNpcTalk={openNpcDialogue} tutorialLocked={tutorialMapLocked} tutorialNpcIds={tutorialNpcIds} npcVisible={npcId => npcId !== "mysterious-traveler" || mysteryNpcVisible} destinationVisible={destination => destination === "city" || destination === "battle" || destination === "trade" && progressiveUnlocks.trade || destination === "hall" && progressiveUnlocks.hall || destination === "raid" && progressiveUnlocks.raid} onEnter={(destination) => {
            if (destination === "city") { setCityService("mercenary"); setActiveTab("city"); }
            else if (destination === "trade") setActiveTab("trade");
            else if (destination === "raid") setActiveTab("raid");
            else if (destination === "hall") setActiveTab("hall");
            else if (destination === "battle") setActiveTab("battle");
            else setActiveTab("squad");
          }} />}
          {game.hanyangPrologueStep === "completed" && (tutorialMapLocked || tutorialTrialLocked || tutorialCityLocked) && <aside className="village-onboarding-buddy" aria-live="polite"><span className="village-onboarding-avatar" aria-hidden="true">🧭</span><div><strong>小嚮導・米米</strong><p>{game.onboardingStep === "return-village-chief" ? "驛路已清出來了，村長應該等急了，快回去向他報告！" : game.onboardingStep === "mercenary-trial" ? "不好！黑巾山賊正在搶奪貨物，這是村長強制交給你的緊急任務，請立即迎戰！" : game.onboardingStep === "hire-first-merc" ? "一個人守不住商路，請立刻前往傭兵公會招募普通傭兵。" : "村長似乎有急事找你，請先移動至村長處。"}</p><small>{game.onboardingStep === "return-village-chief" ? "點擊村長，交付第一份商隊委託" : game.onboardingStep === "mercenary-trial" ? "任務已自動接受・前往新手村郊外" : game.onboardingStep === "hire-first-merc" ? "傭兵公會已開放・招募第一名普通傭兵" : "目前只有村長可以互動"}</small></div></aside>}
          {activeNpcId && npcById(activeNpcId) && <NpcDialoguePanel npc={npcById(activeNpcId)!} game={game} initialLine={npcOpeningLine} onAction={handleNpcAction} onClose={() => setActiveNpcId(null)} />}
        </TabsContent>);
}
