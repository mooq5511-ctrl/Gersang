"use client";
import { TabsList,TabsTrigger } from "@/components/ui/tabs";
import { BookOpen,Building2,Castle,Crown,Map,Ship,Users } from "lucide-react";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "progressiveUnlocks">;

export function GameTabNavigation({ progressiveUnlocks }: Props) {
return (<TabsList className="nav-list v15-nav">
          <TabsTrigger value="map"><Map />斜角城鎮</TabsTrigger>
          <TabsTrigger value="battle"><Map />世界地圖</TabsTrigger>
          <TabsTrigger value="squad"><Users />主角與隊伍</TabsTrigger>
          <TabsTrigger value="city"><Castle />四國城市</TabsTrigger>
          {progressiveUnlocks.trade && <TabsTrigger value="trade"><Ship />東海商路</TabsTrigger>}
          {progressiveUnlocks.relic && <TabsTrigger value="relic"><Castle />遺跡地下城</TabsTrigger>}
          {progressiveUnlocks.collection && <TabsTrigger value="archive"><BookOpen />裝備圖鑑</TabsTrigger>}
          {progressiveUnlocks.contracts && <TabsTrigger value="contracts"><BookOpen />冒險委託</TabsTrigger>}
          {progressiveUnlocks.hall && <TabsTrigger value="hall"><Building2 />市政廳</TabsTrigger>}
          {progressiveUnlocks.raid && <TabsTrigger value="raid"><Crown />雷霆祭壇</TabsTrigger>}
        </TabsList>);
}
