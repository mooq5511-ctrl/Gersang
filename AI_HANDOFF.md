# AI_HANDOFF::GERSANG/V30

> MACHINE-FIRST CONTEXT PACK. Snapshot=2026-09-10; branch=`main`; baseline-before-this-file=`062531c5b587010216e074d39dcc1e8a4fcf7b8e`; repo=`https://github.com/mooq5511-ctrl/Gersang` PRIVATE; live=`https://east-sea-merchant-idle.mooq5511.chatgpt.site`; locale=`zh-TW`; product-name-in-user-intent=`放置你的巨商魂`; persistence=device-local/browser-only.

## 0::EXECUTION_CONTRACT

```yaml
runtime: Node>=22.13; pnpm; React=19.2.6; TypeScript=5.9; vinext=1.0.0-beta.5; Vite=8; Cloudflare Worker via @openai/sites-vite-plugin
install: pnpm install
dev: pnpm dev # localhost:3000
build: pnpm build # emits dist/server/index.js + dist/client
test: node --test tests/*.test.mjs
lint: pnpm lint
entry: app/page.tsx -> app/game-v15.tsx
server_state: none
database: none # .openai/hosting.json d1=null,r2=null
save: localStorage; three character slots + shared warehouse
git_remote: github=https://github.com/mooq5511-ctrl/Gersang.git; origin=local historical mirror
deployment: OpenAI Sites project_id exists in .openai/hosting.json; Claude/other AI normally deploy elsewhere unless returned to Sites-enabled environment
```

NONNEGOTIABLE: preserve old saves; never delete/rename storage keys without migration; keep `active` cap=11 mercs + hero=12; resting cap=10; equipment slots=8; dungeon enemies=12 clones; battle orientation=player-left/enemy-right; player front=`col3`, enemy front=`col0`; game data/assets may be user-provided/third-party—do not assume redistribution rights; do not commit `.env*`, build folders, tokens, credentials.

## ALPHA_DEVELOPMENT_POLICY (2026-09-20)

The sole current product goal is a fully playable single-player web RPG Alpha. Prioritize functional systems over polish: missing art must never block NPC dialogue, quests, combat, drops, equipment, shops, mercenaries, leaders, formations, maps, or persistence. Use a placeholder, silhouette, icon, emoji, or color block until the Alpha is feature-complete; do not add new final art during this phase. Keep new content data-driven and route image references through a replaceable placeholder asset path whenever practical, so artwork can be swapped during Beta without gameplay-code changes. Preserve already-working gameplay and saves while progressively moving new content toward modular data sources.

## 1::SYSTEM_GRAPH

```text
app/layout.tsx -> global CSS imports + metadata
app/page.tsx -> GameV15
GameV15 [aggregate root/state/UI/orchestration]
 ├─ persistence/migration: storage-guards -> equipment-slots.migrate -> guild-migration -> restoreGame/applyGersangVisuals
 ├─ identity: 3 CharacterProfile slots + shared warehouse
 ├─ map: isometric-world-map -> Phaser scene/navigation -> tabs
 ├─ trade: trade-panel -> trade-engine -> settleMerchantGame
 ├─ world battle: dungeon-panel -> battle-arena <- dungeon-engine <- realtime-battle-engine
 │                                      ├─ monster-ecology + gersang-world-map
 │                                      ├─ formation-position
 │                                      └─ inn-engine
 ├─ legacy road combat: resolveRoadEncounter -> mercenary-battle OR vitals-engine.resolveVitalBattle
 ├─ squad: caravan-status -> hero-status-panel/ability-panel/inventory-panel
 │                         ├─ hero-rules/vitals-engine
 │                         ├─ equipment-slots/divine-equipment/equipment-market
 │                         └─ formation UI/resting warehouse/wanderer exchange
 ├─ city: v15-data + mercenary-recruitment/roster + shops/pharmacy/village-exchange
 ├─ raid: thunder-altar-raid -> mythic-forge
 └─ codex: gersang-archive -> v15-data/v17-content/mythic-forge/village-exchange/gersang-visuals
```

AUTHORITATIVE_PATHS:

- Root state/effects/UI wiring: `app/game-v15.tsx` (1906 LOC; monolith; most cross-system changes land here).
- Current dungeon combat: `app/dungeon-engine.ts` + `app/realtime-battle-engine.js` + `app/battle-arena.tsx` + `app/dungeon-panel.tsx`.
- Current monsters/drop metadata: `app/monster-ecology.ts` (Dungeon stats/pools) + `app/v17-content.ts` (`sourceEnemies`, map monster cards/drop names) + hard map name→DungeonKey map near top of `game-v15.tsx`. These are duplicated sources and must be synchronized.
- Current team stats: `app/vitals-engine.ts`; hero total attributes/power/weight: `app/hero-rules.ts`; roster specs: `app/mercenary-roster.ts`.
- Current equipment: runtime `Equipment` type inside `game-v15.tsx`; slots/transactions=`equipment-slots.ts`; base shop items=`v15-data.ts`+`wearable-catalog.ts`+`v17-content.ts`; mythics=`mythic-forge.ts`; fixed rare dungeon drops=`divine-equipment.ts`; visuals=`gersang-visuals.ts`.
- Current maps: tab battle-map cards=`reference-data.ts.battleMaps`; 4-region/12-stage route model=`gersang-world-map.ts`; dungeon zone compatibility layer=`dungeon-engine.ts.WORLD_ZONES`; isometric town=`isometric-world-map.tsx`.
- CSS cascade order: `layout.tsx` imports `globals.css -> trade.css -> caravan-status.css -> hero-status.css -> inventory.css -> dungeon.css -> classic-fusion.css -> battle-impact.css -> ability-panel.css -> classic-map-interface.css -> readability.css`; later files override earlier.

LEGACY_OR_DEAD_CANDIDATES (verify before removal): `classic-map-interface.tsx/css` exported but not imported; `battle-effects.ts` no live import; `reference-data.referenceCategories/referenceEntryCount` superseded by `GersangArchive`; `game-data.ts` partly migration/formation only; `resolveRoadEncounter`+`mercenary-battle.ts` remain trade-route encounter implementation although `trade-engine.encounterCount()` currently always `0`; standalone `public/*.html` are demos, not app entry.

## 2::STATE_SCHEMA_AND_STORAGE

```ts
type GameState={
 version:30; dungeon?:DungeonState; trade:TradeState;
 credit:number;creditXp:number;creditLevel:number;idleStamp:number;
 gold:number;stage:number;kills:number;
 newbieBossDefeated:boolean;lakeBossDefeated:boolean;goldenStarfishDefeated:boolean;newbieCoins:number;
 city:string;battleMap:string;selectedMonster?:string;
 hero:Hero;mercs:Unit[];restingMercs:Unit[];active:string[];
 inventory:Equipment[];fusionCores:number;soulStones:number;awakeningStones:number;
 materials:Record<string,number>;exchangePurchases:Record<string,number>;medicines:Record<string,number>;
 autoSkill:boolean;autoMedicine:{healing:number;mana:number};autoMedicineAt:{healing:number;mana:number};
 claimedContracts:string[];lastEncounter:string;enemyHp:number;formation:string;logs:string[];lastSeen:number;
}
type Unit={uid,templateId,nation,tier,special,awakened?,physicalResist?,magicResist?,legendId?,name,role,skill,image,level,xp,points,str,agi,intel,vit,hp?,mp?,maxHp?,flatAttackBonus?,position,equip}
type Hero=Unit&{uid:'hero';templateId:'hero';nation:korea|china|japan|taiwan;tier:0;special:false;job;maxHp;status:'正常'|'客棧中';gender:'male'|'female'}
type Equipment={bagSlot?,uid,name,slot,atk,def,hp,image,enhance,rarity,magic[],requiredLevel?,source?,skill?,bonus?,resist?,socketGem?}
EquipmentSlot='weapon'|'helm'|'armor'|'boots'|'ring1'|'ring2'|'gloves'|'amulet'; EquipmentKind collapses ring1/ring2=>ring.
```

```yaml
PROFILE_INDEX: bt52_v19_character_profiles
PROFILE_SLOT: bt52_v19_character_slot_{0|1|2}
SHARED_WAREHOUSE: bt52_v20_shared_warehouse # max30 equipment, shared across profiles
legacy_import_order: bt52_v18_playable_database -> bt52_v17_actual_content -> bt52_v16_52jushang_reference -> bt52_v15_four_nations -> bt52_v14_strategy -> east-sea-merchant-save-v1
backups: slotKey:before-guild-migration; slotKey:before-seven-slots; corrupt values backed up by storage-guards and writes disabled on backup failure
save_behavior: every GameState change writes active slot; removes dungeon realtime events before JSON serialization; profile index updated; shared warehouse separate effect
reload_behavior: active dungeon never offline-simulates; any busy dungeon resumes as Hanyang recovery; running trade start timestamp shifted by offline pause
```

Migration pipeline=`migrateSevenSlotSave(raw)`→`migrateV14(raw)`→`Object.assign restore v30 defaults`→normalize hero/merc/resting vitals→`applyGersangVisuals`→`retainGuildRoster`. `retainGuildRoster` accepts only known `merchant-*` templates, returns gear from removed units, caps active IDs to 11. Preserve order/idempotence.

### Equipment skill eligibility helper

`app/equipmentSkill.js` is a standalone, UI-free JavaScript module. Its only responsibility is deciding whether an equipment skill is effective for a supplied character:

```js
isHeroExclusiveSkillEffective(character, equipment): boolean
```

The character is eligible only when `character.id === "hero_main"` and the equipment explicitly declares `exclusiveTo: "hero_main"` (or `skill.exclusiveTo: "hero_main"`). Unmarked equipment and non-hero characters return `false`. The module exports both the named function and the default function, plus `HERO_MAIN_ID`.

### Monster sprite asset helper

`app/monsterAssets.js` is a standalone, data-only JavaScript module. It exports a `database` object containing 56 current monster IDs and their `spriteUrl` paths, plus:

```js
getSprite(monsterId): string | undefined
```

`getSprite` returns the mapped asset path for a known monster ID and `undefined` for unknown IDs. It contains no battle, rendering, React, or DOM logic. The referenced 16 unique asset files were verified to exist under `public/assets`.

## 3::CURRENT_COMBAT_TRUTH

### 3.1 realtime dungeon path (live world-map UI)

```text
GameV15 applyDungeon(previous,action,...)
 -> totals/equipment via heroTotalAttributes+vitalStats+combatStats
 -> fighters=[hero,...activeMercs<=11]
 -> dungeonStep(state, heroDTO, action, ..., partyDTO, ..., autoSkill)
start: beginRealtime()
 -> map party semantic position to unique 3x4 player coords: front cols[3,2,1,0], mid[2,1,3,0], rear[0,1,2,3], rows distributed
 -> 12 enemy clones same monster at row=floor(i/4),col=i%4
 -> RealtimeBattleSystem.startBattle(): all 24 living actors snapshot targets and strike simultaneously at t=0
tick: shared React interval calls settleMerchantGame; dungeon due every >=50ms; engine update(elapsedMs/1000)
 -> each Unit independent cooldown=attackInterval*1000
 -> targeting sorts rowDistance first, then player target enemy col ASC; enemy target player col DESC
 -> normal damage=max(1,round(atk*100/(100+def))); no 90-110 RNG inside realtime engine
 -> normal attack MP=min(100,MP+20); if autoSkill&&MP>=100 at action start => skill, MP=0
 -> skill damage=skillPower if >0 else atk*skillMultiplier(2)
 -> event stream {id,timeMs,type,actorId,targetId,sourcePosition,targetPosition,ability,damage,hpAfter,winner}; snapshot keeps last160
 -> React BattleArena consumes unseen IDs; attack=lunge; damage=red flash+floating number; death=fade
 -> player victory => respawn in 500ms, reward once; lockedEnemyKey persists selected monster; next 12 clone wave
 -> enemy victory/draw => recover to Hanyang inn; no dungeon offline rewards
```

Critical constants/current semantics:

- Hero skill in realtime `skillPower=5000 + sum(INT of hero + deployed mercs)*10`; user calls it 蛟龍/蛇龍出水 inconsistently; code/log uses `蛇龍出水` in legacy helper, hero profile skill labels are nation-specific, engine event only says `skill`.
- Enemy clone stats: each gets full monster HP/ATK/DEF; `enemyHp` is aggregate of 12 HP bars; displayed max=`monster.hp*12`.
- Attack interval=`max(.6,2.2-combat.speed/100)`; default 1.5.
- White Tiger rule multiplier: if zone=`miasma-forest` OR DungeonKey prefix `e_white_tiger_` AND merc count>5, monster HP/MP/ATK/DEX/resist-like fields*2 before clone creation. UI text=`野獸的領地`.
- Dungeon reward: gold=0; XP=monster.xp divided floor by `(1+deployedMercs)` and given to each deployed actor; starter-outskirts always adds `古錢箱`; optional special coin/material; loot equipment rare roll=0.01% per unique loot entry, max one.
- Unlock flags: pirate king→千年湖; 狂風阿魯塔→日本海底洞; 黃金海星→白虎林. Map gate is implemented in battle-map UI predicates in `game-v15.tsx`, not `WORLD_ZONES.zoneUnlocked` alone.
- All starter-outskirts monsters drop `古錢箱`; opening N boxes consumes N and adds random 1..10 coins/box. Four rare 大吉 items each checked at 0.01%/box; stored in `materials`.
- Front semantic position adds +20% damage and rear semantic position has a 50% realtime dodge chance; both rules run per individual battle unit and are preserved in the snapshot.

### 3.2 realtime boss/status implementation

`boss-abilities.ts` is the authoritative data source for realtime boss mechanics. `dungeonStep` applies them only through the active `MercenaryRealtimeBattleSystem`; do not re-enable legacy aggregate `hit/counter` paths or damage will be doubled. Boss effects, the 天照五件套恐懼、護盾、詛咒與最多三層灼燒 are snapshot-safe. `BattleArena` now converts active serialized effects into visible unit badges: shield, armor, fear, curse, burn stacks, poison and control. Future battle UI work should add cooldown/readiness display without deriving state from text logs.

### 3.3 legacy road combat

`resolveRoadEncounter` uses `resolveMercenaryBattle` when any recognized merc exists else `resolveVitalBattle`; round-based, 3-enemy squads, rich 19 merc skills. `trade-engine.encounterCount=()=>0`, so normal voyages currently suppress random encounters per user request; functions/tests remain stale. If encounters are restored, road victories still award silver—different from dungeon no-silver rule.

## 4::PROGRESSION_ECONOMY_EQUIPMENT

```yaml
level_cap: 300
curve: app/level-progression.ts; LEVEL_CAP_TOTAL_XP=2_000_000_000; data/credit-level-1-300.csv
levelup_points: hero+5; merc+3
hero_levelup: base maxHP+20 and full heal
manual_simulation: trade=>gold+100,credit+1; training=>heroXP+10
idle: app/caravan-idle.ts; UI claims +10 gold/+5 credit per sec; paused during dungeon/recovery
credit: credit currency + creditXp/creditLevel share same xp curve; examine grantCreditXp because credit and XP are both modified by idle/manual flows
inventory: unlimited list (INVENTORY_CAPACITY=Infinity); bagSlot repaired; 8 equipped slots; sell single/all; materials separate Record
shop_quality: ordinary75%x1; rare10%x1.5; epic0.2%x10; legendary0.05%x150; unallocated probability falls back ordinary, so effective ordinary=89.75%, not displayed75%
gems: one gem type/equipment; user-selected add amount1..100; cumulative cap100; name=`+N {gem-prefix}的 {baseName}`; stats written to item.bonus + magic socket affix; hero-rules/vitals-engine consume bonuses
mythic_exchange: CaravanStatus right floating `平行世界流浪商團`; 1000 newbieCoins→complete 5pc Azure/Chiyou/Amaterasu; requiredLevel=1 (user requested no limit; effective equip logic checks level, so 1 is universal except impossible level0)
resting: team merc roster<=11; rest warehouse<=10; must withdraw from active before store
city: only UI main cities Hanyang/Nanjing/Edo/Taipei; v15-data still generates historical 20 cities but UI filters current four
pharmacy: buy quantity1..999; quickbar only 金創藥/回靈散; auto thresholds0(off)..99%; consume applies whole active squad
```

Equipment sets source=`mythic-forge.ts`; note type/recipe mismatch: `ThunderForgeId` includes `amaterasuStaff`, image asset folder contains `amaterasu-helm.gif` AND stale `amaterasu-staff.gif`; user corrected “天照神杖” to “天照頭盔”, but code still has `amaterasuStaff` ID/migration correction logic. Audit item name/slot/5pc detection before changing.

Material prices source=`village-exchange.ts.MATERIAL_PRICES`; price 0 intentionally means unsellable for some requested items. `古錢箱` sale requires confirmation in Inventory UI. `sellAllMaterials` behavior should preserve or explicitly handle unsellable/unknown items; existing tests disagree with current behavior.

## 5::UI_SURFACES

```yaml
login: splash -> 3 character slots -> create(name,nation,gender); no shared warehouse count on login
top_tabs:
  map: 斜角城鎮; Phaser isometric map; gate/teleport buttons route to existing tabs
  trade: 東海商路; TradePanel
  battle: 世界地圖; battle map nodes + selectable monster cards + DungeonPanel/BattleArena + logs
  raid: 雷霆祭壇; ThunderAltarRaid/forge
  squad: 主角與隊伍; CaravanStatus; selected hero/merc; attributes +1/+100; inventory; recruitment; right-side floating actions
  city: 四國城市; four capitals; merc/weapon/armor/warehouse/inn/pharmacy/exchange
  contracts: 冒險委託
  archive: 裝備圖鑑 searchable all equipment/gems/material price sources
caravan_floating:
  inventory: bag/equipment/material search/sell/open box
  wanderer: 3 mythic-set exchange
  rest: 10 slots
  formation: semantic front/mid/rear cycling; locked while dungeonBusy
battle_stage: 900x700 theatre CSS stage inside horizontal scroll; enemy/boss above and up to 12 player portraits below; logical formation remains semantic 3 rows x4 cols; damage/status animation in battle-impact.css
battle_visuals: app/battle-visual-data.ts owns monster art paths, sprite-sheet crops, and the shared /assets/placeholders/monster-placeholder.svg fallback; do not add image mappings directly in battle components
status_badges: app/battle-arena.tsx.battleUnitStatuses turns mercenaryState effects into visible unit badges; boss burn is stored as effects.bossBurn so it survives snapshots
generals: app/game-data.ts defines five recruitable city generals; app/general-recruitment.tsx exposes them in their matching city, and general-{id} units use the ordinary roster, formation, persistence, and shared MP-based automatic-skill path
material_trade: app/village-exchange.ts derives a positive fallback price for every v17 source-enemy drop, then overlays authored map and balance prices; bulk selling preserves unknown legacy items and ancient coin boxes
npc_content: data/npcs/hanyang.ts owns all ten Hanyang NPC definitions, portrait positions, dialogue, quest objectives, rewards, and affinity gates; app/npc-dialogue.ts owns only types, lookup, progress, and persistence rules
boss_abilities: data/skills/boss-abilities.ts owns realtime boss timing, damage, regeneration, curse, and burn values; dungeon-engine is the executor only
```

UI naming drift: Site metadata title in `layout.tsx`/Sites metadata may still say older V29/商途 text while user wants `放置你的巨商魂`. Audit all `<title>`, login title, header branding, manifest before next public release.

## 6::FILE_INDEX

|File/group|Role/dependencies/status|
|---|---|
|`app/game-v15.tsx`|Aggregate root; all GameState transitions, migration, save, UI tabs, shops, rewards; authoritative but oversized/high regression risk.|
|`app/realtime-battle-engine.js`|UI-free Unit/RealtimeBattleSystem; simultaneous t0, independent cooldown, targeting, event log, snapshot/offline simulation. JS under TS allowJs.|
|`app/dungeon-engine.ts`|Dungeon FSM + realtime adapter + rewards/recovery; contains obsolete aggregate battle closures.|
|`app/battle-arena.tsx`|DOM sprites/event animations/monster image map/gridToPixel.|
|`app/dungeon-panel.tsx`,`dungeon.css`,`battle-impact.css`|Battle command/status/feed/stage styling.|
|`app/monster-ecology.ts`|DungeonKey monster definitions/pools incl starter/lake/japan-sea/white-tiger.|
|`app/v17-content.ts`|Source monster cards/drops + official equipment/gems/contracts; separate from dungeon stats.|
|`app/gersang-world-map.ts`|4 nation regions, city/stage/drop route data used by WORLD_ZONES and material price defaults.|
|`app/reference-data.ts`|Battle map selection metadata + obsolete archive categories.|
|`app/isometric-world-map.tsx`|Phaser/A* isometric city navigation; callbacks switch tabs.|
|`app/formation-position.ts`|Semantic row helpers; legacy target/dodge/front multiplier.|
|`app/vitals-engine.ts`|Derived HP/MP/ATK/DEF/speed/accuracy; equipment bonuses; legacy battle resolver.|
|`app/mercenary-battle.ts`|Rich round/tactical resolver and 19 spec abilities; currently road encounter only.|
|`app/mercenary-roster.ts`|19 recruit specs incl `mazu`; Mazu test stats ~1000x normal.|
|`app/caravan-status.tsx`|Squad UI + floating inventory/wanderer/rest/formation windows.|
|`app/hero-status-panel.tsx`,`ability-panel.tsx`,`vital-bars.tsx`|Hero/member stat display and allocation; +1/+100 logic callback in GameV15.|
|`app/equipment-slots.ts`|8-slot compatibility/equip/unequip/migration.|
|`app/equipmentSkill.js`|Pure hero-only equipment-skill eligibility check; no DOM, React, or battle UI dependencies.|
|`app/monsterAssets.js`|Pure monster ID→`spriteUrl` database and `getSprite(monsterId)` lookup; 56 IDs, no DOM or battle logic.|
|`app/divine-equipment.ts`|Rare fixed equipment and detail lines.|
|`app/mythic-forge.ts`|Thunder/Azure/Chiyou/Amaterasu recipes, stats, set membership/images.|
|`app/equipment-market.ts`|Equipment sale price/single/all.|
|`app/inventory-panel.tsx`,`inventory-layout.ts`,`inventory-loot.ts`|Bag UI/search/filter/materials/open box; unlimited positions; rare loot helper.|
|`app/village-exchange.ts`|Material sale/buy prices and permanent weapon-upgrade purchases.|
|`app/trade-engine.ts`,`trade-panel.tsx`,`caravan-idle.ts`|Voyages/offline limits/cargo; encounters disabled; passive economy.|
|`app/inn-engine.ts`|10HP/2s recovery, paid heal=2 gold/missingHP, leave at full.|
|`app/thunder-altar-raid.tsx`|Raid presentation/reward/forge callbacks.|
|`app/guild-migration.ts`,`storage-guards.ts`|Roster/save safety.|
|`app/gersang-visuals.ts`|Name/template/slot→asset mapping; mythic art override elsewhere.|
|`app/gersang-archive.tsx`|Searchable equipment/material/gem codex.|
|`app/v15-data.ts`|Nation/city/base merc/legend/equipment/enemy generic datasets.|
|`app/game-data.ts`|Legacy merc/formations/shops; migration and current formation selection.|
|`app/level-progression.ts`|Shared level/credit XP curve.|
|`app/classic-presentation.ts`|Rarity/log label presentation.|
|`app/classic-map-interface*`,`battle-effects.ts`|Likely dead legacy UI.|
|`components/ui/*`|Generated Shadcn/Base UI primitives; do not bulk-edit.|
|`public/assets/archive/*`|2832 webp archive sprites; indexed by manifests; avoid broad imports/bundling.|
|`public/assets/characters/*`|58 combat sprites.|
|`public/assets/mercenary-portraits/*`|33 portraits incl `mazu.webp`.|
|`public/assets/equipment/*`|17 mythic set images; supplied art.|
|`public/assets/sprites/*`|18 generated battle/loot/nation sprites.|
|`public/game-assets/*`|141 general game/building/UI/audio assets (~26.6MB).|
|`public/data/GS_43707/*`|Imported reference CSV/JSON; not primary runtime for all systems.|
|`public/realtime-battle-demo.html`,`scripts/realtime-battle-demo.mjs`|Standalone engine visualization/demo.|
|`public/world-map-game.html`,`hero-*.html`,`caravan-panel.html`|Historical standalone prototypes.|
|`scripts/*`|Asset extraction/sprite-build tooling; Python/PowerShell.|
|`tests/*.test.mjs`|Node test suite; many are textual/source assertions and several encode obsolete requirements.|

## 7::DELIVERED_FEATURE_LEDGER

DONE/visible: rename map action to 世界地圖; four-capital city UI; male/female character creation; 3 profiles; shared30 warehouse; active11+hero; rest10; Mazu recruit; roster active/withdraw; semantic formation editor; realtime 12v12 top-bottom theatre stage; 12 identical monster clone display; per-unit cooldown/MP/autoskill/event animation; monster selection persistence through waves; starter/lake/japan-sea/white-tiger monster datasets; boss unlock flags; loot materials list/search/toggle; ancient coin box quantity/open/coins/rare 大吉; no dungeon silver; split XP; hero XP/credit curve; +100 allocation; pharmacy quantities + auto thresholds; equipment filters/sell-all/material prices; random shop quality; 8 equipment slots + gem socket quantity/name/stats; Azure/Chiyou/Amaterasu assets/stats/exchange; equipment codex; standalone `equipmentSkill.js` hero-only skill eligibility helper with verification; standalone `monsterAssets.js` monster sprite database and verified `getSprite` lookup; readability CSS; Phaser town map; published Sites v60 before handoff file.

PARTIAL/inconsistent: boss skills/statuses vs realtime engine; front multiplier/rear dodge vs realtime engine; Amaterasu headgear/staff naming; metadata/product name; tests; duplicated monster/drop sources; old 20-city data still exists although UI=4; `WORLD_ZONES` is old 12-stage layer while battleMap offers newer named maps; realtime enemy DEF uses `physical` percentage as flat DEF; enemy MP/skills generic only; combat event ability lacks actual skill name.

NOT_PRESENT/server: accounts/cloud save/backend/database/multiplayer/anti-cheat/admin/content CMS. All state is editable localStorage; random/economy authoritative client-side.

## 8::VERIFICATION_SNAPSHOT

```yaml
production_build: PASS (`pnpm build`, 2026-09-09 baseline); warning=client chunk >500kB; route `/` classified unknown by vinext static analysis but worker deploy succeeded
live_deploy: Sites version60 succeeded at live URL before AI_HANDOFF addition
tests_2026-09-10: total153 pass125 fail28 duration~0.49s
interpretation: test suite is not green largely because behavior intentionally changed (5→11 roster, random encounters→0, turn combat→12v12 realtime, price0 allowed, UI copy changed). Some failures expose real integration gaps. Do not blindly make code match stale assertions; classify each failure against current user ledger first.
notable_failing_groups:
 - battle sprite textual expectations old atlas markers
 - roster/migration tests expect5/9/16 instead of11/12/19
 - dungeon tests expect old one-target turn/cooldown/manual damage model
 - trade tests expect0..10 encounters although deliberately disabled
 - material tests demand all positive prices/preserve unknown behavior conflicting requested price0/new prices
 - world-map/drop/recovery assertions use pre-realtime timing
 - integration source-string assertions stale
```

Required next verification sequence after code changes: targeted tests for touched subsystem → `node --test tests/*.test.mjs` (record intentional failures) → `pnpm build` → browser manual: create/load profile, recruit/active/rest, formation, select each boss/map, battle multiple waves, autoskill/medicine, death→inn, loot→inventory, gem→derived stats, reload persistence. Add engine-level tests for 24 simultaneous t0 events, row/col targeting both sides, dead-target retarget, delta partition invariance, status expiration, reward-once.

## 9::NEXT_AI_BOOT_PROMPT

```text
Read AI_HANDOFF.md, package.json, app/game-v15.tsx, app/dungeon-engine.ts, app/realtime-battle-engine.js, app/battle-arena.tsx first. Treat GameState+storage migrations as compatibility-critical. Current live combat is realtime snapshot engine; never add legacy hit/counter damage in parallel. Before editing, state which duplicated data sources must stay synchronized. Preserve 11 merc+hero, 12 enemy clones, left/right 3x4 targeting, local saves, current assets. First task should be either (A) integrate boss/status/Amaterasu abilities into realtime engine with serializable status/events/tests, or (B) reconcile stale tests with current accepted requirements. Run pnpm build. Never commit secrets. Push to private github/main only when authorized.
```

## 10::CHANGE_HISTORY_HINTS

Recent commits encode direction: `49d5357` realtime 12-slot core → `3270ab9` replace combat with realtime 12v12 → `1406f5b` directional targeting → `b3ec913` compact side-by-side → `957c83f` standalone visualization → `c018473` event-driven stage + formation controls → `062531c` merge GitHub initial README. Earlier major checkpoints: Mazu=`fd16cd0`; world map rename=`c4cf51c`; cap11=`abaf0cd`; roster12 UI=`0cd4e00`; readability/material search=`2172965`; equipment codex=`418c143`; cute icons=`7f5e09a`.

END_STATE_HASH_HINT: before this file HEAD=`062531c5...`; after committing this file use Git as truth. Do not trust filenames containing V15/V17/V29 as current product version; runtime GameState version is 30.
