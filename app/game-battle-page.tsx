"use client";
import { TabsContent } from "@/components/ui/tabs";
import { BookOpen,Eye,EyeOff,Users } from "lucide-react";
import { battleMonsterImage } from './battle-visual-data';
import { DUNGEONS,freshDungeon } from './dungeon-engine';
import { runDungeonAction } from "./game-battle-actions";
import { formatGameNumber as format } from "./game-display";
import { grantXp,unitPower } from "./game-progression";
import { FIRST_CARAVAN_TARGET } from "./game-progression-view";
import { appendGameLog as addLog,enterGameInnAction as enterGameInn,leaveGameInnAction as leaveGameInn } from "./game-runtime-actions";
import { BATTLE_PANEL_LABELS,WORLD_MAP_NODE_POSITIONS,mapFeatureIcons } from './game-ui-config';
import { heroTotalAttributes } from './hero-rules';
import { MonsterCompendium } from './monster-compendium';
import { battleMaps } from "./reference-data";
import { TIER_EQUIPMENT_DROP_REGIONS } from "./tier-equipment";
import type { GameViewModel } from './use-game-controller';
import { sourceEnemies } from "./v17-content";
import { WORLD_MONSTER_PROGRESSION } from '../data/monsters/world-progression';
import { MONSTER_REDESIGN } from '../data/monsters/monster-redesign';
import {HANYANG_BOSS_LOCK_MESSAGE,hanyangWorldBossBlocked} from './hanyang-boss-access';
import {startTutorialHuntAction,tutorialHuntReady} from './tutorial-hunt';
import './tutorial-hunt.css';

type Props = Pick<GameViewModel, "activeUnits" | "battlePanelVisibility" | "consumeMedicine" | "currentMap" | "currentMapEnemies" | "currentMapGate" | "firstCaravanBossReady" | "game" | "mapGate" | "selectBattleMap" | "setBattlePanelVisibility" | "setGame" | "setBattleWindowRequest" | "tutorialBattleLocked">;

export function GameBattlePage({ activeUnits, battlePanelVisibility, currentMap, currentMapEnemies, currentMapGate, game, mapGate, selectBattleMap, setBattlePanelVisibility, setGame, setBattleWindowRequest, tutorialBattleLocked }: Props) {
return (<TabsContent value="battle" className="tab-panel">
          {tutorialBattleLocked && <section className="tutorial-hunt-objective" aria-label="目前教學戰鬥目標">
            <div><small>現在要做的事</small><h2>清除驛路上的偷糧狸</h2><p>擊敗 {FIRST_CARAVAN_TARGET} 隻後，回城向村長回報。</p><strong>進度 {Math.min(game.starterDeliveryKills,FIRST_CARAVAN_TARGET)} / {FIRST_CARAVAN_TARGET}</strong></div>
            <button type="button" disabled={!tutorialHuntReady(game)} onClick={()=>{
              if(!tutorialHuntReady(game))return;
              const now=Date.now(),rolls={roll:Math.random(),choice:Math.random(),spawnRoll:0,encounterCountRoll:Math.random(),retaliationRoll:Math.random(),materialRolls:[Math.random(),Math.random(),Math.random()],fusionCoreRoll:Math.random()};
              setBattleWindowRequest(request=>request+1);
              setGame(previous=>startTutorialHuntAction(previous,now,rolls));
            }}>{game.dungeon?.status==='recovering'?'療傷中，恢復後再出發':game.dungeon?.status==='fighting'||game.dungeon?.status==='respawning'?'正在清剿偷糧狸':'開始清剿偷糧狸'}</button>
          </section>}
          <section className="battle-panel-visibility" aria-label="戰鬥頁面區塊顯示">
            <strong>畫面區塊</strong>
            <div>
              {BATTLE_PANEL_LABELS.map(([key, label]) => {
                const visible = battlePanelVisibility[key];
                return <button key={key} type="button" role="switch" aria-checked={visible} aria-label={`${visible ? '隱藏' : '顯示'}${label}`} className={visible ? 'active' : ''} onClick={() => setBattlePanelVisibility(previous => ({ ...previous, [key]: !previous[key] }))}>
                  {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                  <span>{label}</span><small>{visible ? '顯示' : '隱藏'}</small>
                </button>;
              })}
            </div>
          </section>
          {battlePanelVisibility.partyVitals && <section className="panel party-vitals">
            <div className="panel-title"><Users /><h2>出戰隊伍</h2><span>簡易數值</span></div>
            <div className="combat-stat-pair"><span>出戰人數 <b>{1 + activeUnits.length}</b></span><span>總戰力 <b>{format(unitPower(game.hero) + activeUnits.reduce((sum, unit) => sum + unitPower(unit), 0))}</b></span><span>總力量 <b>{format([game.hero,...activeUnits].reduce((sum,unit)=>sum+heroTotalAttributes(unit).str,0))}</b></span><span>總智力 <b>{format([game.hero,...activeUnits].reduce((sum,unit)=>sum+heroTotalAttributes(unit).intel,0))}</b></span></div>
          </section>}
          <section className="panel battle-map-panel">
            {import.meta.env.DEV&&<button type="button" className="battle-map-test-unlock" disabled={tutorialBattleLocked} onClick={()=>setGame(previous=>({...previous,stage:Math.max(previous.stage,...battleMaps.map(map=>map.unlockStage)),newbieBossDefeated:true,lakeBossDefeated:true,goldenStarfishDefeated:true,logs:addLog(previous.logs,'測試模式：已解鎖全部戰鬥地圖。')}))}>測試用・解鎖全部地圖</button>}
            <header className="battle-world-map-header"><div><small>東方商路・遠征指揮台</small><h2>世界地圖・商路航線</h2><p>沿著商路選擇遠征區域；已解鎖的地點可直接前往戰鬥。</p></div><div className="battle-world-map-tools"><span>目前：{currentMap.name}</span><MonsterCompendium /></div></header>
            {battlePanelVisibility.mapNavigation && <div className="world-map-voyage-layout" aria-label="世界地圖商路航線">
              <div className="battle-world-map world-map-atlas">
                <div className="world-map-atlas-title" aria-hidden="true"><span>商路航線圖</span><small>大商帝國・遠征紀錄</small></div>
                <span className="world-map-landmass world-map-landmass-north" aria-hidden="true"/><span className="world-map-landmass world-map-landmass-west" aria-hidden="true"/><span className="world-map-landmass world-map-landmass-east" aria-hidden="true"/><span className="world-map-landmass world-map-landmass-south" aria-hidden="true"/>
                <span className="world-route route-one"/><span className="world-route route-two"/><span className="world-route route-three"/><span className="world-route route-four"/>
                {battleMaps.map((map) => {
                  const { unlocked, requirement } = mapGate(map);
                  const [x, y] = WORLD_MAP_NODE_POSITIONS[map.id] || [50, 50];
                  const tutorialMapBlocked = tutorialBattleLocked && map.id !== "starter-outskirts";
                  const available = unlocked && !tutorialMapBlocked;
                  const nodeStatus = tutorialMapBlocked ? "新手引導中" : currentMap.id === map.id ? "目前位置" : unlocked ? "前往" : "未解鎖";
                  return <button key={map.id} aria-label={`${map.name}・${available ? '前往' : '尚未解鎖'}`} title={available ? `${map.name}・${nodeStatus}` : `${map.name}・${tutorialMapBlocked ? '請先完成新手引導' : requirement}`} style={{ "--map-x": `${x}%`, "--map-y": `${y}%` } as React.CSSProperties} className={'battle-map-node map-theme-'+map.theme+' '+(currentMap.id === map.id ? "active " : "") + (available ? "" : "locked")} disabled={!available} onClick={() => selectBattleMap(map.id)}>
                    <span className="map-node-orb" aria-hidden="true"><span>{mapFeatureIcons[map.theme] || '✦'}</span></span><span className="map-node-copy"><small>{map.region}</small><strong>{map.name}</strong><em>{nodeStatus}</em></span>
                  </button>;
                })}
                <div className="world-map-legend" aria-label="地圖狀態圖例"><span><i className="legend-dot current"/>目前位置</span><span><i className="legend-dot explored"/>已探索</span><span><i className="legend-dot locked"/>未解鎖</span></div>
                <span className="world-map-compass" aria-hidden="true">N</span>
              </div>
              <aside className="world-map-detail-panel" aria-label="選定地區詳情">
                <div className="world-map-detail-kicker"><span className={'map-detail-status-dot map-theme-'+currentMap.theme}/><span>{currentMap.region}・遠征區域</span><b>{currentMapGate.unlocked && !tutorialBattleLocked ? '可前往' : '未解鎖'}</b></div>
                <h3>{currentMap.name}</h3>
                <p className="world-map-detail-description">{currentMap.description}</p>
                <dl className="world-map-detail-stats"><div><dt>建議等級</dt><dd>Lv.{WORLD_MONSTER_PROGRESSION[currentMap.id]?.min}–{WORLD_MONSTER_PROGRESSION[currentMap.id]?.max}</dd></div><div><dt>地圖開放進度</dt><dd>第 {currentMap.unlockStage} 區</dd></div></dl>
                <p className="world-map-detail-description">{WORLD_MONSTER_PROGRESSION[currentMap.id]?.focus}</p>
                <div className="world-map-detail-encounters"><small>本區遭遇</small><div>{currentMapEnemies.slice(0, 3).map(enemy => <span key={enemy.name}>{enemy.name}{enemy.boss ? '・首領' : ''}</span>)}</div></div>
                <div className="world-map-detail-note"><strong>{currentMapGate.unlocked && !tutorialBattleLocked ? '商路已打通' : tutorialBattleLocked ? '新手引導進行中' : currentMapGate.requirement}</strong><span>{tutorialBattleLocked && currentMap.id !== 'starter-outskirts' ? '完成村長交付的驛路任務後，其他地點會依序開放。' : '選擇下方怪物後即可開始自動狩獵。'}</span></div>
                <button type="button" className="world-map-detail-travel" disabled={!currentMapGate.unlocked || tutorialBattleLocked} onClick={() => selectBattleMap(currentMap.id)}>{currentMap.id === game.battleMap ? '目前正在此區域' : `前往・${currentMap.name}`}</button>
              </aside>
            </div>}
            <p className="battle-world-map-description">{currentMap.region}・建議 Lv.{WORLD_MONSTER_PROGRESSION[currentMap.id]?.min}–{WORLD_MONSTER_PROGRESSION[currentMap.id]?.max}。{WORLD_MONSTER_PROGRESSION[currentMap.id]?.focus} 推薦等級不限制挑戰。</p>
            {TIER_EQUIPMENT_DROP_REGIONS.filter(region => region.mapId === currentMap.id).map(region => <p key={region.id} className="battle-world-map-description">本區怪物掉落：Lv.{region.tiers.join('／Lv.')} 系列裝備（達到對應等級後可掉落；一般 4%、首領 12%）</p>)}
            {tutorialBattleLocked && <div className="onboarding-battle-guide" role="status"><strong>新手戰鬥教學・驛路清剿 {Math.min(game.starterDeliveryKills, FIRST_CARAVAN_TARGET)} / {FIRST_CARAVAN_TARGET}</strong><span>前往「新手村郊外」，點選偷糧狸開始戰鬥。擊敗怪物會獲得銀兩與經驗；完成 3 隻後，回去向村長報告。</span></div>}
            {battlePanelVisibility.monsterSelection && sourceEnemies.some(enemy => enemy.mapId === currentMap.id) && <section className="monster-choice-list" aria-label="選擇遭遇怪物"><header><div><small>本區域指定狩獵</small><strong>{game.selectedMonster ? `目前目標：${game.selectedMonster}` : "尚未指定・本區入口怪"}</strong></div><span>點選卡片即可開始戰鬥；收起視窗後仍會持續狩獵</span></header><div className="monster-choice-grid">{sourceEnemies.filter(enemy => enemy.mapId === currentMap.id).map(enemy => { const tutorialBossBlocked=hanyangWorldBossBlocked(game,enemy.dungeonId); const tutorialEnemyBlocked = tutorialBossBlocked || tutorialBattleLocked && !enemy.boss && enemy.name !== "偷糧狸"; const monsterImage = battleMonsterImage(enemy.name, enemy.dungeonId); return <button type="button" key={enemy.name} disabled={tutorialEnemyBlocked || game.dungeon?.status === 'recovering'} className={(game.selectedMonster === enemy.name ? "active " : "")+(enemy.boss ? "boss-target" : "")} onClick={() => { if(tutorialBossBlocked)return; setBattleWindowRequest(request => request + 1); setGame(previous => { const key=enemy.dungeonId; if(hanyangWorldBossBlocked(previous,key))return previous; const base={...previous,selectedMonster:enemy.name,enemyHp:enemy.hp||previous.enemyHp,dungeon:key?{...freshDungeon(),autoHunt:true,key,lockedEnemyKey:key,enemyHp:DUNGEONS[key].hp}:previous.dungeon,logs:addLog(previous.logs,`${enemy.boss?'首領挑戰：':'指定遭遇怪物：'}${enemy.name}，開始戰鬥。`)}; return key ? runDungeonAction(base,'start',Date.now(),key,{roll:Math.random(),choice:Math.random(),spawnRoll:0,encounterCountRoll:Math.random(),retaliationRoll:Math.random(),materialRolls:[Math.random(),Math.random(),Math.random()],fusionCoreRoll:Math.random()},{addLog,grantXp,enterInn:enterGameInn,leaveInn:leaveGameInn}) : base; }); }}><img className="monster-choice-art" src={monsterImage} alt={`${enemy.name}插圖`}/><div><strong>{enemy.name}{MONSTER_REDESIGN[enemy.id] ? '・Lv.' + MONSTER_REDESIGN[enemy.id].level + '・' + MONSTER_REDESIGN[enemy.id].encounterTier : ''}</strong><em>{tutorialEnemyBlocked ? '新手教學・尚未開放' : enemy.boss ? (game.newbieBossDefeated?"已討伐・可再戰":"首領挑戰") : game.selectedMonster === enemy.name ? "指定中" : "選擇目標"}</em></div><dl><span>HP <b>{enemy.hp ?? '—'}</b></span><span>MP <b>{enemy.mp ?? '—'}</b></span><span>ATK <b>{enemy.attack ?? '—'}</b></span><span>EXP <b>{enemy.xp}</b></span></dl><p>{tutorialBossBlocked ? HANYANG_BOSS_LOCK_MESSAGE : tutorialEnemyBlocked ? (game.onboardingStep === "mercenary-trial" ? '請點選黑巾斥候，開始劇情試煉。' : '請先完成第一份委託。') : `掉落：${enemy.drops.join("、")}`}</p></button>; })}</div></section>}
          </section>
          {battlePanelVisibility.battleLogs && <div className="battle-grid">
            <section className="panel log-panel">
              <div className="panel-title"><BookOpen /><h2>商團與戰鬥紀錄</h2></div>
              <div className="log-list">{game.logs.map((log, index) => <p key={index}>{log}</p>)}</div>
            </section>
          </div>}
        </TabsContent>);
}
