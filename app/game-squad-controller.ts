import { type MercenarySpec } from './mercenary-roster';
import { mercenaryPortrait } from './mercenary-recruitment';
import { type MercenaryDef } from './game-data';
import { normalizeVitals } from './vitals-engine';
import { normalizeBattlePosition } from './formation-position';
import { appendGameLog as addLog } from './game-runtime-actions';
import { makeUid as uid } from './game-equipment-factory';
import { emptyEquipment } from './game-hero-factory';
import {
  allocateAttributeAction,
  cyclePositionAction,
  recruitGeneralAction,
  recruitMerchantAction,
  storeMercenaryAction,
  toggleActiveAction,
  withdrawMercenaryAction,
} from './game-squad-actions';
import { hanyangRecruitmentCost } from './hanyang-prologue';
import { type GameState, type Unit } from './game-state';
import type { WorldCity } from './v15-data';
import type { GameStateSetter } from './game-controller-types';

type Context = {
  game: GameState;
  currentCity: WorldCity;
  setGame: GameStateSetter;
  setNotice: (message: string) => void;
  selectedUid: string;
};

/** Bind UI feedback and the current render snapshot to the existing game actions. */
export function createSquadController({
  game,
  currentCity,
  setGame,
  setNotice,
  selectedUid,
}: Context) {
  function recruitMerchant(spec: MercenarySpec, index: number) {
    const cost = hanyangRecruitmentCost(
      game,
      Math.floor(6000 * currentCity.priceFactor),
    );
    setGame((previous) => {
      const next = recruitMerchantAction(
        previous,
        spec,
        index,
        cost,
        (entry, portraitIndex) =>
          normalizeVitals<Unit>({
            uid: uid('merchant-' + entry.id),
            templateId: 'merchant-' + entry.id,
            nation: 'legacy',
            tier: 1,
            jobClass: entry.name,
            special: entry.id === 'mazu',
            name: entry.name,
            role: entry.role,
            skill: entry.active,
            image: mercenaryPortrait(entry.id, portraitIndex),
            level: 1,
            xp: 0,
            points: 0,
            str: entry.ratings[1],
            agi: entry.ratings[3],
            vit: entry.ratings[0],
            intel: entry.intel ?? (entry.mp ? 20 : 10),
            position: normalizeBattlePosition(
              undefined,
              entry.name,
              entry.role,
            ),
            equip: emptyEquipment(),
          }),
        addLog,
      );
      return next;
    });
  }

  function toggleActive(unitUid: string) {
    setGame((previous) => toggleActiveAction(previous, unitUid, setNotice));
  }

  function storeMercenary(unitUid: string) {
    setGame((previous) => storeMercenaryAction(previous, unitUid, addLog));
  }

  function withdrawRestingMercenary(unitUid: string) {
    setGame((previous) => withdrawMercenaryAction(previous, unitUid, addLog));
  }

  function addStat(stat: 'str' | 'agi' | 'intel' | 'vit', amount = 1) {
    setGame((previous) =>
      allocateAttributeAction(previous, selectedUid, stat, amount),
    );
  }

  function cycleUnitPosition(unitUid: string) {
    setGame((previous) => cyclePositionAction(previous, unitUid, addLog));
  }

  function recruitGeneral(general: MercenaryDef) {
    setGame((previous) =>
      recruitGeneralAction(
        previous,
        general,
        (entry) =>
          normalizeVitals<Unit>({
            uid: uid('general-' + entry.id),
            templateId: 'general-' + entry.id,
            nation: 'legacy',
            tier: 1,
            jobClass: entry.job,
            special: false,
            name: entry.name,
            role: entry.job,
            skill: entry.skill,
            image: entry.idle,
            level: 1,
            xp: 0,
            points: 0,
            str: entry.str,
            agi: entry.agi,
            vit: entry.vit,
            intel: entry.intel,
            position: normalizeBattlePosition(undefined, entry.name, entry.job),
            equip: emptyEquipment(),
          }),
        addLog,
      ),
    );
  }

  return {
    recruitMerchant,
    toggleActive,
    storeMercenary,
    withdrawRestingMercenary,
    addStat,
    cycleUnitPosition,
    recruitGeneral,
  };
}
