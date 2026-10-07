/** One bounded, user-requested reveal; never starts combat or changes game data. */
export function revealBattleObjective() {
  if (typeof document === 'undefined' || typeof requestAnimationFrame === 'undefined') return;
  let attempts = 0;
  const reveal = () => {
    const section = document.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden]):not([data-hidden]) .monster-choice-list');
    if (!section) {
      if (++attempts < 10) requestAnimationFrame(reveal);
      return;
    }
    const target = section.querySelector<HTMLButtonElement>('button.active:not(:disabled)');
    if (target) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
    } else section.scrollIntoView({ block: 'center', behavior: 'instant' });
  };
  requestAnimationFrame(reveal);
}
