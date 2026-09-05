import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

test('four nations and enemy use generated sprite sheets tied to attack events',()=>{
 const arena=readFileSync(new URL('../app/battle-arena.tsx',import.meta.url),'utf8');
 const effects=readFileSync(new URL('../app/battle-effects.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../app/battle-impact.css',import.meta.url),'utf8');
 assert.match(arena,/data-sprite="hero" data-nation=\{hero\.nation\|\|'korea'\}/);
 assert.match(effects,/find\('sprite',event\.attacker\),'impact-sprite-attack'/);
 assert.match(effects,/attacker==='hero'&&!data\.skill\?'impact-sprite-normal-attack':'impact-sprite-attack'/);
 assert.match(css,/hero-normal-attack\.png/);
 assert.match(css,/steps\(9,end\)/);
 assert.ok(statSync(new URL('../public/game-assets/hero-normal-attack.png',import.meta.url)).size>1000);
 for(const nation of ['taiwan','korea','japan','china']){
  assert.match(css,new RegExp(nation+'-idle\\.png'));
  assert.match(css,new RegExp(nation+'-attack\\.png'));
  assert.ok(statSync(new URL('../public/assets/sprites/'+nation+'-idle.png',import.meta.url)).size>1000);
  assert.ok(statSync(new URL('../public/assets/sprites/'+nation+'-attack.png',import.meta.url)).size>1000);
 }
 assert.match(css,/steps\(3,end\)/);
 assert.match(css,/battle-sprite-attack/);
});
