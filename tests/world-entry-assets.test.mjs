import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {WORLD_ENTRY_ASSETS,visibleRgbaEqual} from '../scripts/encode-world-entry-assets.mjs';

test('visible pixel comparison preserves opaque, translucent and alpha channels',()=>{
  assert.equal(visibleRgbaEqual(Buffer.from([1,2,3,255]),Buffer.from([1,2,3,255])),true);
  assert.equal(visibleRgbaEqual(Buffer.from([1,2,3,128]),Buffer.from([2,2,3,128])),false);
  assert.equal(visibleRgbaEqual(Buffer.from([1,2,3,0]),Buffer.from([9,8,7,0])),true);
  assert.equal(visibleRgbaEqual(Buffer.from([1,2,3,0]),Buffer.from([1,2,3,1])),false);
  assert.equal(visibleRgbaEqual(Buffer.from([1]),Buffer.from([1])),false);
  assert.equal(visibleRgbaEqual(Buffer.alloc(4),Buffer.alloc(8)),false);
});

test('optimized world entry assets are smaller WebP files and originals remain',async()=>{
  for(const name of WORLD_ENTRY_ASSETS){
    const png=await readFile(new URL(`../public/assets/${name}.png`,import.meta.url));
    const webp=await readFile(new URL(`../public/assets/${name}.webp`,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.equal(webp.subarray(0,4).toString(),'RIFF');
    assert.equal(webp.subarray(8,12).toString(),'WEBP');
    assert.ok(webp.length<png.length,name);
  }
});

test('world and battle presentation modules reference optimized assets',async()=>{
  const battle=await readFile(new URL('../app/battle-visual-data.ts',import.meta.url),'utf8');
  const ui=await readFile(new URL('../app/game-ui-config.ts',import.meta.url),'utf8');
  const css=await readFile(new URL('../app/globals.css',import.meta.url),'utf8');
  assert.ok(battle.includes('/assets/sprites/newbie-raccoon-v1.webp'));
  assert.ok(battle.includes('/assets/monsters/bandit-chief-normal.webp'));
  assert.ok(ui.includes('/assets/monsters/bandit-chief-normal.webp'));
  assert.ok(css.includes('/assets/world-map/world-map-voyage.webp'));
});
