import { useEffect, useRef, useState, type ReactNode } from "react";

export type RelicRoomType = "entrance" | "monster" | "elite" | "event" | "treasure" | "rest" | "boss";

export type RelicRoom = {
  id: string;
  type: RelicRoomType;
  title: string;
  description: string;
  icon: string;
  danger: number;
};

export type RelicDungeonAction = "enter" | "explore" | "attack-boss" | "retreat" | "dispatch" | "claim" | "challenge-boss";
export type RelicPartyMember = { name: string; role?: string; level: number; image?: string; hp?: number; maxHp?: number };
export type RelicDungeonContext = { maxHp: number; currentHp: number; partyPower: number; partyNames: string[]; partyReady: boolean; partyUids?: string[]; now?: number; dispatchDurationMs?: number };

export type RelicDungeonState = {
  status: "idle" | "dispatching" | "ready" | "exploring" | "boss" | "cleared" | "defeated";
  relicId: "sunken-kingdom";
  floor: number;
  maxFloor: number;
  roomIndex: number;
  rooms: RelicRoom[];
  hp: number;
  maxHp: number;
  bossHp: number;
  bossMaxHp: number;
  bossRage: boolean;
  partyPower: number;
  partyNames: string[];
  partyCount: number;
  progress: number;
  dispatchStartedAt: number;
  dispatchEndsAt: number;
  dispatchPartyNames: string[];
  dispatchPartyUids: string[];
  dispatchPower: number;
  materialsFound: number;
  equipmentFound: number;
  bossUnlocked: boolean;
  relicShards: number;
  clearedRuns: number;
  lastReward: { gold: number; shards: number; materials: number; equipment: number };
  logs: string[];
};

const RELIC_ROOMS: RelicRoom[] = [
  { id: "gate", type: "entrance", title: "沉沒王朝・入口", description: "石門後傳來潮濕的呼吸聲，古老符文正逐一亮起。", icon: "⌂", danger: 0 },
  { id: "moss-guard", type: "monster", title: "苔甲守衛", description: "鏽蝕的石像從積水中站起，守護著第一段甬道。", icon: "♜", danger: 1 },
  { id: "broken-altar", type: "event", title: "斷裂祭壇", description: "祭壇上的火種仍未熄滅，伸手觸碰或許能換來力量。", icon: "✦", danger: 1 },
  { id: "buried-vault", type: "treasure", title: "埋藏寶庫", description: "牆後傳來金屬碰撞聲，這裡曾是王朝的軍需庫。", icon: "◇", danger: 1 },
  { id: "venom-pool", type: "elite", title: "毒沼巢穴", description: "深綠色霧氣裡盤踞著被遺跡污染的巨蜥。", icon: "☠", danger: 2 },
  { id: "moonwell", type: "rest", title: "月井回廊", description: "月光穿過地裂，清澈泉水短暫壓下了身上的傷勢。", icon: "☾", danger: 0 },
  { id: "royal-crypt", type: "monster", title: "王陵甬道", description: "沉睡千年的骸骨列隊而來，手中仍握著斷劍。", icon: "†", danger: 2 },
  { id: "oracle", type: "event", title: "失語神諭", description: "石壁浮現一段預言：『帶著火種的人，才能看見王座。』", icon: "☼", danger: 2 },
  { id: "golden-antechamber", type: "treasure", title: "黃金前廳", description: "通往王座的門前堆滿陪葬品，但每一枚金幣都沾著詛咒。", icon: "⬡", danger: 3 },
  { id: "sunken-throne", type: "boss", title: "沉沒王・阿斯塔洛斯", description: "遺跡最深處的古王甦醒了。擊敗他，才能帶走王朝的核心。", icon: "♛", danger: 4 },
];

function copyRooms() {
  const middle = RELIC_ROOMS.slice(1, -1).map(room => ({ ...room }));
  for (let index = middle.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [middle[index], middle[swapIndex]] = [middle[swapIndex], middle[index]];
  }
  return [{ ...RELIC_ROOMS[0] }, ...middle, { ...RELIC_ROOMS[RELIC_ROOMS.length - 1] }];
}

export function freshRelicDungeon(maxHp = 100): RelicDungeonState {
  const safeMaxHp = Math.max(1, Math.floor(maxHp));
  return {
    status: "idle",
    relicId: "sunken-kingdom",
    floor: 1,
    maxFloor: 1,
    roomIndex: 0,
    rooms: copyRooms(),
    hp: safeMaxHp,
    maxHp: safeMaxHp,
    bossHp: 0,
    bossMaxHp: 0,
    bossRage: false,
    partyPower: 0,
    partyNames: [],
    partyCount: 0,
    progress: 0,
    dispatchStartedAt: 0,
    dispatchEndsAt: 0,
    dispatchPartyNames: [],
    dispatchPartyUids: [],
    dispatchPower: 0,
    materialsFound: 0,
    equipmentFound: 0,
    bossUnlocked: false,
    relicShards: 0,
    clearedRuns: 0,
    lastReward: { gold: 0, shards: 0, materials: 0, equipment: 0 },
    logs: ["遺跡入口已定位：沉沒王朝。準備好後即可開始探索。"],
  };
}

function advance(state: RelicDungeonState, hp: number, log: string, reward = { gold: 0, shards: 0, materials: 0, equipment: 0 }): RelicDungeonState {
  const nextIndex = state.roomIndex + 1;
  const nextRoom = state.rooms[nextIndex];
  if (!nextRoom) return { ...state, hp, status: "cleared", lastReward: reward, logs: [log, ...state.logs].slice(0, 12) };
  if (nextRoom.type === "boss") {
    const bossMaxHp = Math.max(1200, Math.floor((state.partyPower || powerForBoss(state)) * 4));
    return { ...state, hp, roomIndex: nextIndex, status: "boss", bossHp: bossMaxHp, bossMaxHp, bossRage: false, lastReward: reward, logs: [log, "王座深處傳來沉重的鎧甲聲……", ...state.logs].slice(0, 12) };
  }
  return { ...state, hp, roomIndex: nextIndex, floor: Math.min(state.maxFloor, nextIndex + 1), status: "exploring", lastReward: reward, logs: [log, ...state.logs].slice(0, 12) };
}

function powerForBoss(state: RelicDungeonState) {
  return Math.max(1, state.maxHp * 2);
}

/** 與Python原型一致的非線性減傷，供派遣結算使用。 */
export function calculateRelicDamage(attack: number, defense: number, layer: number) {
  const safeLayer = Math.max(1, Math.floor(layer));
  const reductionRate = Math.max(0, defense) / (Math.max(0, defense) + (100 * safeLayer));
  return Math.max(1, Math.floor(Math.max(0, attack) * (1 - reductionRate)));
}

export function relicDungeonAction(state: RelicDungeonState, action: RelicDungeonAction, power: number, context?: RelicDungeonContext): RelicDungeonState {
  const safePower = Math.max(1, Math.floor(power));
  const clean = { ...state, lastReward: { gold: 0, shards: 0, materials: 0, equipment: 0 } };
  if (action === "dispatch") {
    const names = context?.partyNames || [];
    if (!context?.partyReady || names.length === 0) return { ...clean, logs: ["請先安排至少 1 名休息中的傭兵，再派遣進入遺跡。", ...clean.logs].slice(0, 12) };
    const startedAt = context.now || Date.now();
    const duration = Math.max(30_000, context.dispatchDurationMs || 30 * 60 * 1000);
    const dispatchMaxHp = Math.max(1, Math.floor(context.maxHp || clean.maxHp));
    return { ...clean, status: "dispatching", hp: dispatchMaxHp, maxHp: dispatchMaxHp, dispatchStartedAt: startedAt, dispatchEndsAt: startedAt + duration, dispatchPartyNames: [...names], dispatchPartyUids: [...(context.partyUids || [])], dispatchPower: safePower, partyPower: safePower, partyNames: [...names], partyCount: names.length, logs: [`${names.length} 名休息中的傭兵已出發，預計 ${Math.ceil(duration / 60000)} 分鐘後回報。`, ...clean.logs].slice(0, 12) };
  }
  if (action === "claim" && state.status === "dispatching") {
    const now = context?.now || Date.now();
    if (now < state.dispatchEndsAt) return { ...clean, logs: [`遠征尚未完成，還需 ${Math.ceil((state.dispatchEndsAt - now) / 60000)} 分鐘。`, ...clean.logs].slice(0, 12) };
    const layer = Math.max(1, Math.floor(state.progress / 10) + 1);
    const monsterHp = Math.floor(50 * (1.14 ** (layer - 1)));
    const monsterDefense = Math.floor(5 * (1.1 ** (layer - 1)));
    const partyDamage = calculateRelicDamage(state.dispatchPower, monsterDefense, layer);
    const clearSeconds = Math.max(1, Math.ceil(monsterHp / partyDamage));
    const clearEfficiency = Math.max(0.45, Math.min(1.35, 10 / clearSeconds));
    const progressGain = Math.min(38, Math.max(12, Math.floor(10 + state.dispatchPartyNames.length * 3 + clearEfficiency * 12)));
    const progress = Math.min(100, state.progress + progressGain);
    const reward = { gold: 1800 + state.dispatchPartyNames.length * 700, shards: Math.max(1, Math.floor(progressGain / 18)), materials: 2 + state.dispatchPartyNames.length, equipment: progressGain >= 30 ? 1 : 0 };
    const unlocked = progress >= 100;
    const battleLog = `第 ${layer} 層遠征戰報：以每秒 ${partyDamage} 點有效傷害完成清剿，耗時約 ${clearSeconds} 秒。`;
    return { ...clean, status: unlocked ? "ready" : "idle", floor: Math.max(state.floor, layer), maxFloor: Math.max(state.maxFloor, layer), progress, bossUnlocked: state.bossUnlocked || unlocked, dispatchStartedAt: 0, dispatchEndsAt: 0, materialsFound: state.materialsFound + reward.materials, equipmentFound: state.equipmentFound + reward.equipment, relicShards: state.relicShards + reward.shards, lastReward: reward, logs: [`遠征隊回報：遺跡材料 +${reward.materials}、古代裝備 +${reward.equipment}、遺跡碎片 +${reward.shards}。`, battleLog, unlocked ? "沉沒王朝的王座已開啟，可以挑戰獨特 Boss。" : `遺跡探索進度 +${progressGain}%。`, ...clean.logs].slice(0, 12) };
  }
  if (action === "challenge-boss" && (state.status === "ready" || state.bossUnlocked)) {
    const bossMaxHp = Math.max(1200, Math.floor((state.dispatchPower || safePower) * 4));
    return { ...clean, status: "boss", bossHp: bossMaxHp, bossMaxHp, bossRage: false, logs: ["派遣隊帶回了王座座標，沉沒王・阿斯塔洛斯甦醒。", ...clean.logs].slice(0, 12) };
  }
  if (action === "enter") {
    const partyMaxHp = Math.max(1, Math.floor(context?.maxHp || state.maxHp));
    if (context && !context.partyReady) return { ...clean, logs: ["目前出戰隊伍生命值不足，請先到客棧恢復後再進入遺跡。", ...clean.logs].slice(0, 12) };
    const next = freshRelicDungeon(partyMaxHp);
    return { ...next, status: "exploring", hp: Math.min(partyMaxHp, Math.max(1, Math.floor(context?.currentHp || partyMaxHp))), partyPower: safePower, partyNames: context?.partyNames || [], partyCount: context?.partyNames?.length || 1, logs: [`${context?.partyNames?.length || 1} 名隊員點燃遺跡入口的引魂燈，迷宮開始重組。`, ...next.logs] };
  }
  if (action === "retreat") return { ...clean, status: "idle", hp: clean.maxHp, bossHp: 0, bossRage: false, roomIndex: 0, logs: ["你在石門關閉前撤出遺跡；本次探索進度已保留在紀錄中。", ...clean.logs].slice(0, 12) };
  if (action === "attack-boss" && state.status === "boss") {
    const battlePower = Math.max(1, state.dispatchPower || safePower);
    const damage = Math.max(80, Math.floor(battlePower * 0.55));
    const enrageThreshold = state.bossMaxHp * 0.5;
    const enraged = state.bossRage || state.bossHp <= enrageThreshold;
    const retaliation = Math.max(8, Math.floor(state.maxHp * (enraged ? 0.04 : 0.02)));
    const hp = Math.max(0, state.hp - retaliation);
    const bossHp = Math.max(0, state.bossHp - damage);
    if (hp <= 0) return { ...clean, status: "defeated", hp: 0, bossHp, bossRage: enraged, logs: [`沉沒王反擊造成 ${retaliation} 傷害，你被迫撤出遺跡。`, ...clean.logs].slice(0, 12) };
    if (bossHp <= 0) {
      const reward = { gold: 12000, shards: 3, materials: 5, equipment: 2 };
      return { ...clean, status: "cleared", hp, bossHp: 0, bossRage: enraged, relicShards: state.relicShards + reward.shards, clearedRuns: state.clearedRuns + 1, lastReward: reward, logs: [`你以 ${damage} 傷害擊潰沉沒王，取得遺跡核心！`, ...clean.logs].slice(0, 12) };
    }
    return { ...clean, status: "boss", hp, bossHp, bossRage: enraged, logs: [enraged && !state.bossRage ? "沉沒王進入狂暴：反擊傷害提高！" : `你對沉沒王造成 ${damage} 傷害；王的反擊削去 ${retaliation} HP。`, ...clean.logs].slice(0, 12) };
  }
  if (action !== "explore" || state.status !== "exploring") return clean;
  const room = state.rooms[state.roomIndex];
  if (!room) return { ...clean, status: "cleared" };
  const damage = Math.max(4, Math.floor(5 + room.danger * 5 + safePower * 0.004));
  const hpAfter = Math.max(1, state.hp - damage);
  switch (room.type) {
    case "entrance": return advance(state, hpAfter, "你踏入遺跡第一層，石門在身後緩緩閉合。");
    case "monster": return advance(state, hpAfter, `${room.title}被擊破，隊伍受到 ${damage} 點反擊傷害。`, { gold: 1200 + room.danger * 450, shards: 0, materials: 1, equipment: 0 });
    case "elite": return advance(state, hpAfter, `${room.title}清剿完成，付出 ${damage} HP 代價換來稀有碎片。`, { gold: 2600, shards: 1, materials: 2, equipment: 0 });
    case "event": return advance(state, Math.min(state.maxHp, hpAfter + 10), `${room.title}的火種回應了你，恢復 10 HP 並獲得祝福。`);
    case "treasure": return advance(state, hpAfter, `${room.title}已開啟，取得遺跡銀兩。`, { gold: 3400, shards: 1, materials: 2, equipment: 1 });
    case "rest": return advance(state, Math.min(state.maxHp, state.hp + Math.floor(state.maxHp * 0.28)), `${room.title}讓隊伍恢復了部分體力。`);
    default: return advance(state, hpAfter, `${room.title}前的石門已開啟。`);
  }
}

export function RelicDungeonPanel({ state, power, party, onAction, footer }: { state: RelicDungeonState; power: number; party: RelicPartyMember[]; onAction: (action: RelicDungeonAction) => void; footer?: ReactNode }) {
  const room = state.rooms[state.roomIndex] || state.rooms[state.rooms.length - 1];
  const progress = Math.min(100, Math.round((state.roomIndex / Math.max(1, state.rooms.length - 1)) * 100));
  const livePartyMaxHp = party.reduce((sum, member) => sum + Math.max(0, member.maxHp || 0), 0);
  const livePartyHp = party.reduce((sum, member) => sum + Math.max(0, Math.min(member.maxHp || 0, member.hp || 0)), 0);
  const displayMaxHp = state.status === "idle" && livePartyMaxHp > 0 ? livePartyMaxHp : state.maxHp;
  const displayHp = state.status === "idle" && livePartyMaxHp > 0 ? livePartyHp : state.hp;
  const hpPercent = Math.round((displayHp / Math.max(1, displayMaxHp)) * 100);
  const bossPercent = state.bossMaxHp ? Math.round((state.bossHp / state.bossMaxHp) * 100) : 0;
  const canExplore = state.status === "exploring";
  return <section className="relic-dungeon-shell" aria-label="遺跡地下城">
    <header className="relic-dungeon-hero"><div><span className="relic-eyebrow">封印遺跡・第一遠征</span><h2>沉沒王朝地下城</h2><p>一座會自行改變路線的古代迷宮。每次探索都會遇到不同的守衛、事件與寶藏，最深處則由沉沒王親自鎮守。</p></div><div className="relic-hero-seal" aria-hidden="true">♛</div></header>
    <div className="relic-dungeon-layout">
      <section className="relic-map-card"><div className="relic-card-heading"><div><small>迷宮路線</small><strong>第 {state.floor} 層・{state.roomIndex + 1} / {state.rooms.length}</strong></div><span>{state.status === "idle" ? "尚未進入" : state.status === "boss" ? "首領房間" : state.status === "cleared" ? "已通關" : state.status === "defeated" ? "遠征失敗" : "探索中"}</span></div><div className="relic-progress"><i style={{ width: `${progress}%` }} /></div><div className="relic-room-path">{state.rooms.map((entry, index) => <span key={entry.id} className={`${index < state.roomIndex ? "visited" : ""} ${index === state.roomIndex ? "current" : ""} ${entry.type === "boss" ? "boss" : ""}`} title={entry.title}>{entry.icon}</span>)}</div><div className="relic-room-preview"><span className={`relic-room-icon relic-room-${room.type}`}>{room.icon}</span><div><small>目前房間</small><h3>{room.title}</h3><p>{room.description}</p></div></div></section>
      <aside className="relic-status-card"><div className="relic-card-heading"><div><small>遠征狀態</small><strong>{state.status === "boss" ? "沉沒王現身" : state.status === "cleared" ? "遺跡已清除" : state.status === "defeated" ? "隊伍撤出" : "探索隊伍"}</strong></div><span>戰力 {(state.status === "idle" ? power : (state.partyPower || power)).toLocaleString()}</span></div><div className="relic-party-strip"><small>本次出戰・{state.status === "idle" ? party.length : (state.partyCount || party.length)} 名</small><div>{(state.status === "idle" || !state.partyNames.length ? party.map(member => member.name) : state.partyNames).map(name => <span key={name}>{name}</span>)}</div></div><div className="relic-vital"><div><span>整隊遠征 HP</span><b>{displayHp.toLocaleString()} / {displayMaxHp.toLocaleString()}</b></div><div className="relic-hp-bar"><i style={{ width: `${hpPercent}%` }} /></div></div>{state.status === "boss" && <div className="relic-boss-vital"><div><span>獨特 Boss・沉沒王 {state.bossRage && <em className="relic-rage-badge">狂暴</em>}</span><b>{state.bossHp.toLocaleString()} / {state.bossMaxHp.toLocaleString()}</b></div><div className="relic-boss-bar"><i style={{ width: `${bossPercent}%` }} /></div><small className="relic-boss-tip">{state.bossRage ? "王朝殘火燃燒中：反擊傷害提升" : "生命低於 50% 時進入狂暴"}</small></div>}<dl className="relic-reward-stats"><div><dt>遺跡碎片</dt><dd>{state.relicShards}</dd></div><div><dt>通關次數</dt><dd>{state.clearedRuns}</dd></div></dl><div className="relic-action-row">{state.status === "idle" && <button type="button" className="relic-primary-action" onClick={() => onAction("enter")}>進入遺跡</button>}{canExplore && <button type="button" className="relic-primary-action" onClick={() => onAction("explore")}>{room.type === "rest" ? "在月井休整" : room.type === "treasure" ? "探索寶庫" : room.type === "event" ? "調查房間" : "突破房間"}</button>}{state.status === "boss" && <button type="button" className="relic-primary-action" onClick={() => onAction("attack-boss")}>攻擊沉沒王</button>}{(state.status === "exploring" || state.status === "boss" || state.status === "defeated" || state.status === "cleared") && <button type="button" className="relic-secondary-action" onClick={() => onAction("retreat")}>{state.status === "defeated" ? "重新整備" : "撤出遺跡"}</button>}</div></aside>
    </div>
    <div className="relic-bottom-grid"><section className="relic-log-card"><div className="relic-card-heading"><div><small>遺跡紀錄</small><strong>本次遠征</strong></div><span>最多 12 則</span></div><ol>{state.logs.slice(0, 6).map((log, index) => <li key={`${log}-${index}`}>{log}</li>)}</ol></section><section className="relic-reward-card"><div className="relic-card-heading"><div><small>探索規則</small><strong>迷宮不是單純刷怪</strong></div></div><ul><li>房間會在戰鬥、事件、寶庫與休息之間交錯。</li><li>隊伍 HP 會帶到下一個房間，請安排月井回復。</li><li>擊敗沉沒王可取得遺跡碎片，後續可兌換專屬傭兵與裝備。</li></ul></section></div>{footer}</section>;
}

function RelicBossBattlePanel({ state, power, party, onAction }: { state: RelicDungeonState; power: number; party: RelicPartyMember[]; onAction: (action: RelicDungeonAction) => void }) {
  const [autoBattle, setAutoBattle] = useState(false);
  const onActionRef = useRef(onAction);
  const bossPercent = state.bossMaxHp ? Math.round((state.bossHp / state.bossMaxHp) * 100) : 0;
  const partyPercent = state.maxHp ? Math.round((state.hp / state.maxHp) * 100) : 0;
  const partyCondition = partyPercent <= 25 ? "危急" : partyPercent <= 60 ? "受損" : "穩定";
  const phase = state.bossRage ? "狂暴終局" : bossPercent <= 50 ? "王朝殘火" : "古王甦醒";
  const battleParty = state.dispatchPartyNames.length ? party.filter(member => state.dispatchPartyNames.includes(member.name)) : party;
  const shownParty = battleParty.length ? battleParty : state.dispatchPartyNames.map(name => ({ name, level: 1 }));
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);
  useEffect(() => {
    if (!autoBattle || state.status !== "boss" || state.bossHp <= 0) return undefined;
    const timer = window.setInterval(() => onActionRef.current("attack-boss"), 1000);
    return () => window.clearInterval(timer);
  }, [autoBattle, state.status]);
  return <section className="relic-boss-battle" aria-label="遺跡 Boss 戰鬥畫面">
    <header className="relic-boss-battle-header"><div><span className="relic-eyebrow">王座解放・最終決戰</span><h2>沉沒王・阿斯塔洛斯</h2><p>古王以遺跡核心重塑王座，派遣隊伍必須在王朝殘火熄滅前完成討伐。</p></div><div className="relic-boss-stage-badge"><strong>{phase}</strong><small>獨特 Boss</small></div></header>
    <div className="relic-boss-battle-grid">
      <figure className="relic-boss-art-frame"><img src="/assets/monsters/relic-boss-op-admin.png" alt="沉沒王・阿斯塔洛斯"/><div className="relic-boss-art-vignette"/><figcaption><span>沉沒王朝・王座核心</span><strong>萬界之上的管理者</strong></figcaption></figure>
      <aside className="relic-boss-console"><div className="relic-boss-console-title"><div><small>王座核心 HP</small><strong>{state.bossHp.toLocaleString()} <span>/ {state.bossMaxHp.toLocaleString()}</span></strong></div><b>{bossPercent}%</b></div><div className="relic-boss-large-bar"><i style={{ width: `${bossPercent}%` }}/></div><section className={`relic-party-vital-panel ${partyPercent <= 25 ? "critical" : partyPercent <= 60 ? "damaged" : ""}`}><div className="relic-boss-console-title"><div><small>遠征隊生命值</small><strong>{state.hp.toLocaleString()} <span>/ {state.maxHp.toLocaleString()}</span></strong></div><b>{partyCondition}</b></div><div className="relic-party-large-bar"><i style={{ width: `${partyPercent}%` }}/></div><small className="relic-party-vital-tip">Boss反擊會削減隊伍生命值；歸零時遠征失敗。</small></section><div className="relic-boss-phases"><span className={bossPercent > 50 ? "active" : "complete"}>Ⅰ 古王甦醒</span><span className={bossPercent > 25 && bossPercent <= 50 ? "active" : bossPercent <= 50 ? "complete" : ""}>Ⅱ 王朝殘火</span><span className={state.bossRage ? "active" : ""}>Ⅲ 狂暴終局</span></div><section className="relic-boss-party"><div className="relic-boss-section-heading"><span>參戰遠征隊</span><b>商團戰力 {power.toLocaleString()}</b></div><div className="relic-boss-party-list">{shownParty.slice(0, 6).map(member => <div className="relic-boss-party-member" key={member.name}><div className="relic-boss-party-avatar">{member.image ? <img src={member.image} alt=""/> : member.name.slice(0, 1)}</div><span>{member.name}</span><small>Lv.{member.level}</small></div>)}</div></section><section className="relic-boss-event"><div className="relic-boss-section-heading"><span>戰鬥事件</span><b>{state.bossRage ? "反擊增幅" : "核心穩定"}</b></div><p>{state.bossRage ? "王座核心過載，沉沒王的反擊傷害提升。" : bossPercent <= 75 ? "遺跡符文開始崩解，Boss即將進入下一階段。" : "隊伍已突破王座外圍護壁，持續輸出即可。"}</p></section><div className="relic-boss-action-row"><button type="button" className="relic-primary-action" onClick={() => onAction("attack-boss")}>攻擊沉沒王</button><button type="button" className={`relic-secondary-action ${autoBattle ? "is-active" : ""}`} onClick={() => setAutoBattle(value => !value)}>{autoBattle ? "停止自動戰鬥" : "自動戰鬥"}</button><button type="button" className="relic-secondary-action" onClick={() => onAction("retreat")}>撤出遺跡</button></div></aside>
    </div>
    <div className="relic-boss-battle-footer"><div><small>討伐規則</small><span>戰鬥結果會依派遣隊伍的總戰力與Boss階段即時結算。</span></div><div><small>本次遠征</small><span>傷害與獎勵會保留至遺跡戰報。</span></div></div>
  </section>;
}

/** 派遣版遺跡介面：保留同一套遠征狀態與 Boss 戰，讓休息中的傭兵成為主要探索資源。 */
export function RelicDispatchPanel({ state, power, dispatchParty, onAction }: { state: RelicDungeonState; power: number; dispatchParty: RelicPartyMember[]; onAction: (action: RelicDungeonAction) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.status !== "dispatching") return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.status, state.dispatchEndsAt]);
  const remaining = Math.max(0, state.dispatchEndsAt - now);
  const canDispatch = dispatchParty.length > 0;
  const partyNames = state.status === "dispatching" && state.dispatchPartyNames.length ? state.dispatchPartyNames : dispatchParty.map(member => member.name);
  const statusText = state.status === "dispatching" ? "遠征隊行進中" : state.status === "ready" ? "王座已定位" : state.status === "boss" ? "獨特 Boss 戰" : state.status === "cleared" ? "遺跡已通關" : state.status === "defeated" ? "遠征失敗" : "等待派遣";
  const progress = Math.min(100, Math.max(0, Number.isFinite(state.progress) ? state.progress : 0));
  const bossPercent = state.bossMaxHp ? Math.round((state.bossHp / state.bossMaxHp) * 100) : 0;
  const dispatchMinutes = Math.floor(remaining / 60000);
  const dispatchSeconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");
  return <section className="relic-dungeon-shell relic-dispatch-mode" aria-label="遺跡地下城派遣遠征">
    <header className="relic-dungeon-hero"><div><span className="relic-eyebrow">傭兵派遣・第一遺跡</span><h2>沉沒王朝遠征隊</h2><p>派遣休息中的傭兵深入遺跡，帶回材料與古代裝備；探索進度達 100% 後，才能打開沉沒王的王座。</p></div><div className="relic-hero-seal" aria-hidden="true">♛</div></header>
    {state.status === "boss" ? <RelicBossBattlePanel state={state} power={state.dispatchPower || power} party={dispatchParty} onAction={onAction}/> : <div className="relic-dispatch-grid">
      <section className="relic-map-card"><div className="relic-card-heading"><div><small>遺跡探索進度</small><strong>{progress}%・沉沒王朝</strong></div><span>{statusText}</span></div><div className="relic-progress"><i style={{ width: `${progress}%` }} /></div><div className="relic-dispatch-milestones"><span className={progress >= 25 ? "reached" : ""}>第一層</span><span className={progress >= 50 ? "reached" : ""}>王陵</span><span className={progress >= 75 ? "reached" : ""}>黃金前廳</span><span className={progress >= 100 ? "reached boss" : ""}>王座</span></div><div className="relic-dispatch-report"><span className="relic-room-icon relic-room-treasure">◇</span><div><small>本次遺跡報告</small><h3>{state.status === "dispatching" ? "傭兵正在穿越地下甬道" : progress >= 100 ? "王座座標已確認" : "等待下一支遠征隊"}</h3><p>{state.status === "dispatching" ? `預計 ${dispatchMinutes}:${dispatchSeconds} 後返回。遠征期間傭兵會暫時無法再次派遣。` : progress >= 100 ? "派遣隊已找到古王陵寢，現在可以組織主力挑戰 Boss。" : "每次派遣都會累積探索進度，並帶回材料與裝備。"}</p></div></div></section>
      <aside className="relic-status-card"><div className="relic-card-heading"><div><small>派遣編制</small><strong>{state.status === "dispatching" ? "遠征中" : "休息中的傭兵"}</strong></div><span>商團戰力 {state.status === "dispatching" ? state.dispatchPower.toLocaleString() : power.toLocaleString()}</span></div><div className="relic-party-strip"><small>{state.status === "dispatching" ? "目前遠征隊" : "可派遣名單"}・{partyNames.length} 名</small><div>{partyNames.length ? partyNames.map(name => <span key={name}>{name}</span>) : <em>目前沒有休息中的傭兵</em>}</div></div><dl className="relic-reward-stats"><div><dt>遺跡材料</dt><dd>{state.materialsFound}</dd></div><div><dt>古代裝備</dt><dd>{state.equipmentFound}</dd></div><div><dt>遺跡碎片</dt><dd>{state.relicShards}</dd></div><div><dt>通關次數</dt><dd>{state.clearedRuns}</dd></div></dl><div className="relic-dispatch-actions">{state.status === "dispatching" && <button type="button" className="relic-primary-action" disabled={remaining > 0} onClick={() => onAction("claim")}>{remaining > 0 ? `遠征中 ${dispatchMinutes}:${dispatchSeconds}` : "領取遠征報告"}</button>}{(state.status === "idle" || state.status === "cleared" || state.status === "defeated") && <button type="button" className="relic-primary-action" disabled={!canDispatch} onClick={() => onAction("dispatch")}>{canDispatch ? "派遣傭兵" : "沒有可派遣傭兵"}</button>}{state.status === "ready" && <button type="button" className="relic-primary-action" onClick={() => onAction("challenge-boss")}>組織 Boss 討伐</button>}{state.status === "boss" && <><div className="relic-boss-vital"><div><span>沉沒王・阿斯塔洛斯 {state.bossRage && <em className="relic-rage-badge">狂暴</em>}</span><b>{state.bossHp.toLocaleString()} / {state.bossMaxHp.toLocaleString()}</b></div><div className="relic-boss-bar"><i style={{ width: `${bossPercent}%` }} /></div></div><button type="button" className="relic-primary-action" onClick={() => onAction("attack-boss")}>攻擊沉沒王</button></>}{state.status === "exploring" && <button type="button" className="relic-primary-action" onClick={() => onAction("explore")}>繼續舊版探索</button>}</div></aside>
    </div>}
    <div className="relic-bottom-grid"><section className="relic-log-card"><div className="relic-card-heading"><div><small>遠征紀錄</small><strong>商團派遣報告</strong></div><span>最近 6 則</span></div><ol>{state.logs.slice(0, 6).map((log, index) => <li key={`${log}-${index}`}>{log}</li>)}</ol></section><section className="relic-reward-card"><div className="relic-card-heading"><div><small>派遣規則</small><strong>讓休息中的傭兵持續創造價值</strong></div></div><ul><li>遺跡派遣只使用休息中的傭兵，不佔用目前上陣隊伍。</li><li>傭兵人數與總戰力越高，探索進度與回報越好。</li><li>遠征報告會依關卡層數計算有效傷害與清剿速度。</li><li>探索進度達 100% 後，解鎖沉沒王・阿斯塔洛斯。</li></ul></section></div>
  </section>;
}
