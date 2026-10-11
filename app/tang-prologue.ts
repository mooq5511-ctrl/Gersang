import type { GameState, TangPrologueState } from './game-state';

export const TANG_GRAIN_COST = 8;

export const DEFAULT_TANG_PROLOGUE: TangPrologueState = {
  step: 'not-started',
  motherMet: false,
  grainPouch: false,
};

const steps = ['not-started', 'p01-completed', 'p02-accepted', 'p02-ready-to-return', 'p02-completed'] as const;

export function normalizeTangPrologue(raw: unknown): TangPrologueState | undefined {
  if (raw === undefined || raw === null) return undefined;
  const value = typeof raw === 'object' ? raw as Partial<TangPrologueState> : {};
  const step = steps.includes(value.step as typeof steps[number]) ? value.step! : 'not-started';
  return { step, motherMet: step !== 'not-started', grainPouch: step === 'p02-ready-to-return' };
}

/** Recheck the latest state inside React's update boundary. Repeated commands are no-ops. */
export function actTangPrologue<T extends Pick<GameState, 'gold' | 'tangPrologue'>>(game: T, action: 'talk' | 'accept' | 'buy' | 'deliver'): T {
  const progress = normalizeTangPrologue(game.tangPrologue) || DEFAULT_TANG_PROLOGUE;
  let step = progress.step;
  if (action === 'talk' && step === 'not-started') step = 'p01-completed';
  else if (action === 'accept' && step === 'p01-completed') step = 'p02-accepted';
  else if (action === 'buy' && step === 'p02-accepted' && Number.isFinite(game.gold) && game.gold >= TANG_GRAIN_COST) step = 'p02-ready-to-return';
  else if (action === 'deliver' && step === 'p02-ready-to-return') step = 'p02-completed';
  else return game;
  return { ...game, gold: game.gold - (action === 'buy' ? TANG_GRAIN_COST : 0), tangPrologue: { step, motherMet: true, grainPouch: step === 'p02-ready-to-return' } };
}

export function tangQuestLabel(progress: TangPrologueState) {
  switch (progress.step) {
    case 'not-started': return 'P-01 平凡的一天：與母親交談';
    case 'p01-completed': return 'P-02 母親的囑託：接受買糧委託';
    case 'p02-accepted': return 'P-02 母親的囑託：到村口糧販購買米糧';
    case 'p02-ready-to-return': return 'P-02 母親的囑託：把米糧交給母親';
    case 'p02-completed': return 'P-02 已完成：母親正在家門前等你';
  }
}
