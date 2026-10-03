import { grantCreditXp, grantTerritoryXp } from './game-progression';
import { formatGameNumber as format } from './game-display';
import { appendGameLog as addLog } from './game-runtime-actions';
import {
  abandonCityHallCommission,
  acceptCityHallCommission as acceptCityHallCommissionAction,
  buyCityHallRefreshTicket,
  claimCityHallCommission as claimCityHallCommissionAction,
  CITY_HALL_REFRESH_TICKET_PRICE,
  refreshCityHallCommissions,
} from './city-hall-commissions';
import type { GameStateSetter } from './game-controller-types';

type Context = {
  setGame: GameStateSetter;
  setNotice: (message: string) => void;
};

/** Bind UI feedback and the current render snapshot to the existing game actions. */
export function createCommissionsController({ setGame, setNotice }: Context) {
  function acceptCityHallCommission(commissionId: string) {
    setGame((previous) => {
      const result = acceptCityHallCommissionAction(previous, commissionId);
      if (result.error) {
        setNotice(result.error);
        return previous;
      }
      return {
        ...result.state,
        logs: addLog(
          result.state.logs,
          '已接取市政廳委託，目標進度從現在開始計算。',
        ),
      };
    });
  }

  function claimCityHallCommission(commissionId: string) {
    setGame((previous) => {
      const result = claimCityHallCommissionAction(previous, commissionId);
      if (result.error || !result.reward) {
        setNotice(result.error || '無法領取這份委託。');
        return previous;
      }
      const withHeroXp = grantTerritoryXp(
        result.state,
        result.state.hero,
        result.reward.rewardXp,
      );
      const withCreditXp = grantCreditXp(
        { ...result.state, hero: withHeroXp },
        result.reward.rewardCreditXp,
      );
      const materials = Object.entries(result.reward.rewardMaterials || {})
        .map(([name, amount]) => `${name} ×${amount}`)
        .join('、');
      const equipment = result.equipment
        ? `、獲得「${result.equipment.name}」`
        : '';
      return {
        ...withCreditXp,
        logs: addLog(
          withCreditXp.logs,
          `市政廳委託「${result.reward.name}」完成，獲得 ${format(result.reward.rewardGold)} 兩、主角經驗 ${format(result.reward.rewardXp)}、信用經驗 ${result.reward.rewardCreditXp}${materials ? `、${materials}` : ''}${equipment}。`,
        ),
      };
    });
  }

  function refreshCityHall() {
    setGame((previous) => {
      const result = refreshCityHallCommissions(previous);
      if (result.error) {
        setNotice(result.error);
        return previous;
      }
      return {
        ...result.state,
        logs: addLog(
          result.state.logs,
          '市政廳公告欄已使用刷新券，換上新的委託。',
        ),
      };
    });
  }

  function abandonCityHall(commissionId: string) {
    setGame((previous) => {
      const result = abandonCityHallCommission(previous, commissionId);
      if (result.error) {
        setNotice(result.error);
        return previous;
      }
      return {
        ...result.state,
        logs: addLog(result.state.logs, '已放棄市政廳委託，委託欄位已釋出。'),
      };
    });
  }

  function buyCityHallTicket() {
    setGame((previous) => {
      const result = buyCityHallRefreshTicket(previous);
      if (result.error) {
        setNotice(result.error);
        return previous;
      }
      return {
        ...result.state,
        logs: addLog(
          result.state.logs,
          `購買委託刷新券 ×1，支付 ${format(CITY_HALL_REFRESH_TICKET_PRICE)} 兩。`,
        ),
      };
    });
  }

  return {
    acceptCityHallCommission,
    claimCityHallCommission,
    refreshCityHall,
    abandonCityHall,
    buyCityHallTicket,
  };
}
