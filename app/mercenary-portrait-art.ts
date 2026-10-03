const portraitIds = new Set(['spear', 'shield', 'archer', 'shaman', 'samurai', 'ninja', 'gunner', 'onmyoji', 'blade', 'monk', 'healer', 'cannon', 'escort', 'hunter', 'elephant', 'priest', 'swordmaster', 'sanada', 'mazu']);

/** Display-only artwork: never replaces the unit's saved battle sprite. */
export function mercenaryCardArt(unit: { uid?: string; templateId?: string; image?: string }): string | undefined {
  if (unit.uid === 'hero' || unit.templateId?.startsWith('general-')) return undefined;
  const template = unit.templateId==='merchant-promotion-bow'?'archer':unit.templateId?.replace(/^merchant-/, '');
  const legacy = unit.image?.match(/\/cute-merc-([a-z]+)-0\.png(?:\?.*)?$/)?.[1];
  const id = template && portraitIds.has(template) ? template : !unit.templateId ? legacy : undefined;
  // The incoming transparent-v2 assets were not committed; keep shipped portraits until all are supplied.
  if (id && portraitIds.has(id)) return `/assets/mercenary-portraits/semireal-v1/${id}.jpg`;
  if (!unit.templateId && unit.image === '/assets/mercenary-portraits/mazu.webp') return '/assets/mercenary-portraits/semireal-v1/mazu.jpg';
  return undefined;
}
