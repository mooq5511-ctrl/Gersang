"use client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TabsContent } from "@/components/ui/tabs";
import { BookOpen,Gem,Shield,Sparkles,Swords,Users } from "lucide-react";
import { gameplayContracts } from './game-catalog';
import { contractProgress } from "./game-contract-actions";
import { formatGameNumber as format } from "./game-display";
import { merchantMercenaries } from './mercenary-roster';
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "claimContract" | "game" | "openNpcDialogue" | "setActiveTab" | "trackedNpcQuests">;

export function GameContractsPage({ claimContract, game, openNpcDialogue, setActiveTab, trackedNpcQuests }: Props) {
return (<TabsContent value="contracts" className="tab-panel">
          <section className="panel contract-board">
            <div className="panel-title"><BookOpen /><h2>冒險委託所</h2><span>{game.claimedContracts.length}/{gameplayContracts.length} 已完成</span></div>
            <p className="section-copy">招募公會傭兵、討伐怪物與收集裝備，完成委託後領取商團資金。</p>
            <div className="contract-grid">{gameplayContracts.map((contract) => {
              const progress = contractProgress(game, contract.metric);
              const completed = progress >= contract.target;
              const claimed = game.claimedContracts.includes(contract.id);
              return <article className={claimed ? "claimed" : completed ? "complete" : ""} key={contract.id}>
                <div><small>{contract.category}</small><strong>{contract.name}</strong></div>
                <p>{contract.description}</p>
                <Progress value={Math.min(100, progress / contract.target * 100)} />
                <span>{Math.min(progress, contract.target)} / {contract.target}</span>
                <em>獎勵 {format(contract.reward.gold)} 兩</em>
                <Button size="sm" disabled={!completed || claimed} onClick={() => claimContract(contract.id)}>{claimed ? "已領取" : completed ? "領取獎勵" : "進行中"}</Button>
              </article>;
            })}</div>
          </section>
          <section className="panel contract-board">
            <div className="panel-title"><Users /><h2>漢陽村莊委託追蹤</h2><span>{trackedNpcQuests.length} 項進行中</span></div>
            <p className="section-copy">完成條件後返回委託人回報；進度會隨冒險自動更新。</p>
            {trackedNpcQuests.length ? <div className="contract-grid">{trackedNpcQuests.map(({npc,quest,progress})=>{const ready=progress>=quest.target;return <article className={ready?"complete":""} key={quest.id}>
              <div><small>{npc.role}・{npc.name}</small><strong>{quest.name}</strong></div>
              <p>{ready?"委託條件已達成，請回到委託人領取獎勵。":"依照委託要求持續冒險，達成後回報。"}</p>
              <Progress value={Math.min(100,progress/quest.target*100)} />
              <span>{Math.min(progress,quest.target)} / {quest.target}{ready?"・可回報":""}</span>
              <em>獎勵 {format(quest.reward.gold)} 兩・好感 +{quest.reward.affinity}</em>
              <Button size="sm" variant="outline" onClick={()=>{setActiveTab("map");openNpcDialogue(npc.id);}}>{ready?"返回回報":"前往委託人"}</Button>
            </article>})}</div> : <p className="empty-state">目前沒有進行中的村莊委託；與漢陽 NPC 交談即可接受任務。</p>}
          </section>
          <section className="panel implemented-systems">
            <div className="panel-title"><Sparkles /><h2>已融入玩法的資料</h2><span>不再使用參考圖鑑</span></div>
            <div>
              <article><Swords /><strong>怪物與地圖</strong><p>敵人名稱、抗性、技能、經驗和材料掉落直接控制戰鬥。</p></article>
              <article><Users /><strong>中央傭兵公會</strong><p>{merchantMercenaries.length} 種公會傭兵，搭配被動與主動技能，透過等級、能力點與裝備成長。</p></article>
              <article><Shield /><strong>物品與裝備</strong><p>刀劍、盔甲、等級限制、能力加成和裝備技能進入商店與裝備欄。</p></article>
              <article><Gem /><strong>匠人與寶石</strong><p>五種寶石可實際鑲嵌並提升角色能力。</p></article>
            </div>
          </section>
        </TabsContent>);
}
