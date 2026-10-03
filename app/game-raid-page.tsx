"use client";
import { TabsContent } from "@/components/ui/tabs";
import { appendGameLog as addLog } from "./game-runtime-actions";
import { ThunderAltarRaid } from "./thunder-altar-raid";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "amaterasuSetPieces" | "azureSetPieces" | "chiyouSetPieces" | "displayedPower" | "forgeThunderSet" | "game" | "setGame" | "setNotice">;

export function GameRaidPage({ amaterasuSetPieces, azureSetPieces, chiyouSetPieces, displayedPower, forgeThunderSet, game, setGame, setNotice }: Props) {
return (<TabsContent value="raid" className="tab-panel">
          <ThunderAltarRaid
            credit={game.credit}
            power={Math.floor(displayedPower(game.hero) + game.mercs.filter(unit => game.active.includes(unit.uid)).reduce((sum, unit) => sum + displayedPower(unit), 0))}
            materials={game.materials}
            azureSetPieces={azureSetPieces} chiyouSetPieces={chiyouSetPieces} amaterasuSetPieces={amaterasuSetPieces}
            onEnter={() => setGame(previous => ({ ...previous, credit: previous.credit - 50_000, logs: addLog(previous.logs, "進入「神仙谷・雷霆祭壇」，支付 50,000 信用值。") }))}
            onRefund={() => setGame(previous => ({ ...previous, credit: previous.credit + 25_000, logs: addLog(previous.logs, "雷霆祭壇挑戰失敗，退回 25,000 信用值。") }))}
            onMaterials={(materials) => setGame(previous => ({ ...previous, materials, logs: addLog(previous.logs, "雷霆祭壇戰利品已加入背包。") }))}
            onForge={forgeThunderSet}
            onNotice={setNotice}
          />
        </TabsContent>);
}
