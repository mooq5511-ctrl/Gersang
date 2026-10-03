"use client";
import { TabsContent } from "@/components/ui/tabs";
import { CityHall } from "./city-hall";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "abandonCityHall" | "acceptCityHallCommission" | "buyCityHallTicket" | "claimCityHallCommission" | "game" | "refreshCityHall">;

export function GameHallPage({ abandonCityHall, acceptCityHallCommission, buyCityHallTicket, claimCityHallCommission, game, refreshCityHall }: Props) {
return (<TabsContent value="hall" className="tab-panel">
          <CityHall game={game} onAccept={acceptCityHallCommission} onClaim={claimCityHallCommission} onAbandon={abandonCityHall} onRefresh={refreshCityHall} onBuyTicket={buyCityHallTicket} />
        </TabsContent>);
}
