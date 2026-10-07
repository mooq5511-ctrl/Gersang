'use client';
import { WorldBattleWindow } from './world-battle-window';
import './world-battle-window.css';
import { DungeonPanel } from './dungeon-panel';
import { freshDungeon } from './dungeon-engine';
import { combatStats, vitalStats } from './vitals-engine';
import { medicineCatalog } from './game-config';
import { AutoPotionManager, type AutoPotionSettings } from './auto-potion-manager';
import { configureAutoPotionAction } from './game-inventory-actions';
import { BattleLogManager } from './battle-log-manager';
import { Pill } from 'lucide-react';
import { runWorldBattleAction } from './world-battle-action';
import { grantXp } from './game-progression';
import { appendGameLog as addLog, enterGameInnAction as enterGameInn, leaveGameInnAction as leaveGameInn } from './game-runtime-actions';
import type { GameViewModel } from './use-game-controller';
type Props = Pick<GameViewModel, 'game' | 'ready' | 'activeSlot' | 'battleWindowRequest' | 'currentMap' | 'consumeMedicine' | 'setGame'>;
export function GameWorldBattlePanel({ game, ready, activeSlot, battleWindowRequest, currentMap, consumeMedicine, setGame }: Props) {
  return (<WorldBattleWindow state={game.dungeon || freshDungeon()} request={battleWindowRequest} enabled={ready && activeSlot !== null}>
        <DungeonPanel continuousHunt hero={game.hero} party={[game.hero,...game.mercs.filter(unit=>game.active.includes(unit.uid)).slice(0,11)]} state={game.dungeon||freshDungeon()} mp={vitalStats(game.hero).mp} autoSkill={game.autoSkill} toggleAutoSkill={()=>setGame(previous=>({...previous,autoSkill:!previous.autoSkill,logs:addLog(previous.logs,previous.autoSkill?'已關閉技能自動施放。':'已開啟技能自動施放。')}))} autoPotion={game.autoPotion} healingPotions={AutoPotionManager.available(game.medicines,medicineCatalog)} medicineStock={game.medicines} onAutoPotionChange={(change:Partial<AutoPotionSettings>)=>setGame(previous=>configureAutoPotionAction(previous,change,addLog))} battleLogs={BattleLogManager.getLogs(game.battleLogs)} clearBattleLogs={()=>setGame(previous=>({...previous,battleLogs:BattleLogManager.clear()}))} mapName={currentMap.name} mapRegion={currentMap.region} medicineQuickbar={<div className="battle-medicine-float" aria-label="隨身藥袋">{medicineCatalog.filter(medicine=>medicine.id==='healing'||medicine.id==='mana').map(medicine=><div className="battle-medicine-item" key={medicine.id}><button type="button" disabled={!game.medicines[medicine.id]} onClick={()=>consumeMedicine(medicine.id)} title={`${medicine.name}：${medicine.effect}`}><Pill /><span>{medicine.name}</span><b>{`×${game.medicines[medicine.id]||0}`}</b></button></div>)}</div>} dps={game.mercs.reduce((sum,unit)=>sum+(game.active.includes(unit.uid)?Math.max(0,Math.floor(combatStats(unit).attack*0.18)):0),0)} act={(action,key)=>{
          const now=Date.now();
          const rolls={roll:Math.random(),choice:Math.random(),spawnRoll:0,retaliationRoll:Math.random(),
            materialRolls:[Math.random(),Math.random(),Math.random()],gearDropRoll:Math.random(),gearChoiceRoll:Math.random(),
            sealDropRoll:Math.random(),sealChoiceRoll:Math.random(),encounterCountRoll:Math.random()};
          setGame(previous=>runWorldBattleAction(previous,action,now,key,rolls,{addLog,grantXp,enterInn:enterGameInn,leaveInn:leaveGameInn}));
        }}/>
      </WorldBattleWindow>);
}
