import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const map = readFileSync(new URL('../app/classic-map-interface.css', import.meta.url), 'utf8');
const quest = readFileSync(new URL('../app/quest-journal.css', import.meta.url), 'utf8');

test('tutorial navigation locks do not block character switching', () => {
  const rules = map.match(/[^{}]*data-onboarding-locked[^{}]*\{[^}]*\}/g) || [];
  assert.ok(rules.some(rule => rule.includes('pointer-events:none')));
  assert.ok(rules.every(rule => !rule.includes('.character-switch')));
});

test('collapsed quest HUD reserves a separate scene band on desktop and mobile', () => {
  assert.match(quest, /data-objective-collapsed="true"\] \.tab-panel \{ top: var\(--quest-hud-bottom\); \}/);
  assert.match(quest, /main-objective\.is-collapsed \{ top: var\(--quest-hud-top\)/);
  const bands = [...quest.matchAll(/--quest-hud-top: (\d+)px; --quest-hud-bottom: (\d+)px;/g)];
  assert.equal(bands.length, 2);
  for (const [, top, bottom] of bands) assert.ok(Number(bottom) - Number(top) >= 48);
  assert.match(quest, /calc\(100% - var\(--quicknav-width\) - 24px\)/);
});
