# Mercenary Promotion System V1.0

## Scope and baseline

- Remote `main` and local HEAD were both `9b82a3d48f170c07f7489f37a89b3aefe862b832` when checked. No pull, merge, commit, push or deployment was performed.
- Existing modular Gersang game is retained. `game-v15.tsx` remains unchanged.
- Only the currently available `merchant-spear` line uses V1: 義勇兵 → 長槍兵 → 鐵騎兵 → 精銳兵 → 修羅兵 → 御皇兵 → 天魔兵 → 軒轅將神兵. The knife branch is not introduced into the currently spear-only recruitment catalog.
- All other 18 mercenary definitions, portraits and legacy promotion code remain in the project. Already-owned other mercenaries are retained. No task/prerequisite changes or save wipe.

## Module map

| Module | Responsibility |
| --- | --- |
| `app/mercenary-growth-v1.ts` | Eight stage intervals, promotion multipliers, leadership requirements, exact growth table |
| `app/mercenary-promotion-v1.ts` | Atomic paid promotion, migration default and original-save backup |
| `app/war-seals.ts` | Seven complete seals, deterministic drops, overflow pending claim, relic clearance guard |
| `app/mercenary-promotion-panel-v1.tsx` | Next stage, requirement, seal stock/source and promotion action |
| `app/vitals-engine.ts`, `app/game-progression.ts` | Real combat HP/attack/defense/power and XP gating |
| `app/game-battle-actions.ts`, `app/game-loop.ts`, `app/game-world-battle-panel.tsx` | World kills, manual/automatic hunt roll wiring and Battle Log |
| `app/game-relic-page.tsx` | Existing relic Boss clearance award integration |
| `app/game-profile-storage.ts`, `app/use-character-session.ts` | Migration/default/backup/storage |
| `app/item-tooltip-manager.ts`, `app/equipment-tooltip-card.tsx`, `app/inventory-panel.tsx` | Actual visible seal tooltip and inventory display |

## Growth and promotion behavior

- Lv.1 base: ATK 10 / DEF 5 / HP 100.
- Stage ranges: 1–11, 12–35, 36–55, 56–71, 72–111, 112–161, 162–211, 212–250.
- Per-level increments in stages 1–7: ATK/DEF/HP = 2/1/20, 5/2/40, 12/5/110, 32/14/300, 70/30/650, 200/84/1900, 800/330/7500.
- Promotion multipliers: 1.5 / 1.8 / 2.2 / 1.6 / 1.8 / 2 / 2.2. Promotion threshold applies only the multiplier; no linear increment on that level.
- Lv.213–250 compounds each level by 1.025. Lv.212 uses the seventh promotion multiplier. Internal values are never rounded between levels; only returned/displayed stats are floored.
- Leadership requirements: 5 / 10 / 20 / 30 / 45 / 60 / 80 / 100. The existing game has no independent leadership-budget system: V1 displays this requirement without inventing a new deployment limit. Existing 11 mercenary seats remain.
- XP may reach the next promotion level (e.g. Lv.12), but stats stay at the previous stage ceiling until the complete seal is consumed. Further XP remains saved, not discarded. After promotion the normal next XP award resumes leveling; promotion does not reset level or XP.
- Existing equipment and manually allocated attributes add bonuses to the reference growth baseline. Existing allocation points and MP/skills are retained. The reference curve governs unmodified ATK/DEF/HP.
- A requested rank must be exactly the next rank. A successful action consumes one seal and records Battle Log; insufficient level/seal, incorrect rank or battle/dispatch reservation does not consume anything.

## Initial drop balance (historical; superseded)

The following initial rates are no longer active. The user-approved source-specific rates and unopened rank-7/8 rules are documented in `war-seal-drop-balance-2026-10-03.md`.

| Existing source | Complete seals | Initial chance per settled victory |
| --- | --- | --- |
| Ordinary world monsters | 長槍兵符 / 鐵騎兵符 | 4% / 1% (exclusive) |
| Existing Elite encounters | 精銳兵符 | 8% |
| Existing world-map Boss | 精銳兵符 | 25% |
| Existing relic dungeon Boss | 修羅 / 御皇 / 天魔 / 軒轅將神兵符 | 30% total; conditional distribution 65% / 25% / 8% / 2% |

- These rates are a first implementation assumption, not user-approved final balance. No nonexistent high-level map is added. All currently existing relic Bosses participate in the V1 high-rank pool.
- World drops happen only with the authoritative victory reward. Relic drops require `clearedRuns` to increment. Idle and repeated settled actions do not grant another seal.
- New drop randomness is sampled outside React state updaters. Auto Hunt carries the same supplied rolls through settlement.
- No fragments, synthesis, seal sale or new store source. Existing “sell all materials” retains unpriced seals.

## Inventory and migration safety

- The current material/equipment list is unbounded, so normal seal drops always enter the material map. No gameplay bag cap has been invented.
- A finite-cap adapter retains new-stack overflow in `pendingWarSeals`; claiming is idempotent and existing stacks still accept more. Restore automatically claims pending seals into the existing unbounded bag. Tests cover this adapter, not a nonexistent live full-bag mode.
- Missing seal counts default to zero; invalid counts normalize to nonnegative integers. Optional new fields are backward compatible with the current version-30 save.
- Existing spear saves without `promotionStage` default to V1 stage 1; legacy `tier`, attributes, XP, equipment and identity remain. Old tier is not treated as payment for a new V1 promotion. Existing levels over 250 are bounded to the new mercenary cap, with the original save backed up first. This migration can change old spear combat strength and is not a player-data wipe.
- Before loading such an old spear save, the original is copied once to `<slot key>:before-mercenary-promotion-v1`. An existing backup is never overwritten; a failed backup aborts loading rather than overwriting the original.
- Other mercenaries keep legacy growth and promotion. Hero level cap remains unchanged at 300.

## Verification

- 383/383 current tests pass, including all 250 formula values, seven promotion boundaries, XP retention, success-only consumption, failure/busy states, finite-cap overflow/claim, actual Auto Hunt, existing Elite/world Boss kills, all existing relic Boss clearances, visible tooltip markup, real storage restore and backups.
- TypeScript `tsc --noEmit` passes. Production `vinext build` passes; pre-existing >500 kB chunk and route-classification warnings remain.
- New four core modules and relevant engine/storage/action wiring pass scoped Oxlint. `npm run lint` is blocked by nested `.site-sync3-20260928/.oxlintrc.json`; independently scanning `app` reports existing issues (unused declarations, hooks dependencies, images and accessibility). Copies were not deleted or rewritten to suppress this.
- Independent production browser on port 3106: natural character creation, isolated Lv.12 fixture, real promotion button, level/XP retention, inventory consumption 2 → 1 and Battle Log persistence verified. Later gameplay fixture is not a natural level-1-to-250 playthrough or final balance review.
- Browser review found the shared tooltip was defaulting seals to Lv.1 and omitting source/quantity. Added a seal-only rendered section and seven-seal markup regression coverage.
- Backpack tooltips are rendered into `document.body` with an SSR guard so the floating bag cannot clip their required-level/source/quantity text.
- After reloading the production browser, stage 2 / Lv.12 / EXP 777 / one remaining seal were retained; hover showed required Lv.12, purpose, source and owned ×1. No runtime errors were reported. Screenshot: `C:/Users/l9933/AppData/Local/Temp/promotion-v1-tooltip.png`.
- No real user browser storage was touched. Test server/browser are cleaned up after verification. No commit/push/merge/deploy.

Suggested commit: `feat: 實裝傭兵八階成長與完整兵符轉職 V1.0`

Next: naturally play the first spear progression and measure token waiting time, ordinary monster difficulty and the trade/relic growth connection before tuning rates.
