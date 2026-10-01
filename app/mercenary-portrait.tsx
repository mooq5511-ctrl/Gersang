/* Static pre-optimized assets: the vinext game engine is also imported in Node tests. */
/* eslint-disable next/no-img-element */
import { mercenaryCardArt } from './mercenary-portrait-art';

type PortraitUnit = { uid?: string; templateId?: string; image?: string };
export function MercenaryPortrait({ unit, alt = '' }: { unit: PortraitUnit; alt?: string }) {
  const portrait = mercenaryCardArt(unit);
  const src = portrait || unit.image;
  if (!src) return null;
  return <img className={portrait ? 'mercenary-semireal-portrait' : undefined} src={src} alt={alt} width={portrait ? 512 : 128} height={portrait ? 768 : 128} loading="lazy" decoding="async" />;
}
