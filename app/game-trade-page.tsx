"use client";
import { TabsContent } from "@/components/ui/tabs";
import { TradePanel } from "./trade-panel";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "availableRestingMercs" | "displayedPower" | "game" | "sendCaravan" | "setGame" | "upgradeCaravan" | "upgradeTradePort">;

export function GameTradePage({ availableRestingMercs, displayedPower, game, sendCaravan, setGame, upgradeCaravan, upgradeTradePort }: Props) {
return (<TabsContent value="trade" className="tab-panel trade-tab-panel">
          <TradePanel trade={game.trade} gold={game.gold} stage={Math.max(game.stage, game.hero.level)} mercenaries={availableRestingMercs.map((unit) => ({ uid: unit.uid, name: unit.name, level: unit.level, power: displayedPower(unit), available: true }))} logs={game.logs} lastEncounter={game.lastEncounter}
            onDispatch={sendCaravan} onUpgrade={upgradeCaravan} onUpgradePort={upgradeTradePort}
            onSelectCargo={(cargoId) => setGame((previous) => ({ ...previous, trade: { ...previous.trade, selectedCargoId: cargoId } }))}
            onToggleInsurance={() => setGame((previous) => ({ ...previous, trade: { ...previous.trade, insurance: !previous.trade.insurance } }))}
            onSelect={(selectedRouteId) => setGame((previous) => ({ ...previous, trade: { ...previous.trade, selectedRouteId } }))}
            onToggleAuto={() => setGame((previous) => ({ ...previous, trade: { ...previous.trade, auto: !previous.trade.auto } }))} />
        </TabsContent>);
}
