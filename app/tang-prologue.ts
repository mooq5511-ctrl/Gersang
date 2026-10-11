import type { TangPrologueState } from './game-state';

export const TANG_GRAIN_COST = 8;

export const DEFAULT_TANG_PROLOGUE: TangPrologueState = {
  step: 'not-started',
  motherMet: false,
  grainPouch: false,
};

export function tangQuestLabel(progress: TangPrologueState) {
  switch (progress.step) {
    case 'not-started': return 'P-01 平凡的一天：與母親交談';
    case 'p01-completed': return 'P-02 母親的囑託：接受買糧委託';
    case 'p02-accepted': return 'P-02 母親的囑託：到村口糧販購買米糧';
    case 'p02-ready-to-return': return 'P-02 母親的囑託：把米糧交給母親';
    case 'p02-completed': return 'P-02 已完成：母親正在家門前等你';
  }
}
