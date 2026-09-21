import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleMonsterImage,MONSTER_PLACEHOLDER} from '../app/battle-visual-data.ts';

test('vertical realtime theater displays both sides and falls back to a monster placeholder',()=>{
 const arena=readFileSync(new URL('../app/battle-arena.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../app/battle-impact.css',import.meta.url),'utf8');
 assert.match(arena,/battle-theater-enemy/);assert.match(arena,/battle-theater-player/);
 assert.match(arena,/data-unit-id=\{unit\.id\}/);assert.match(arena,/event\.type==='damage'/);
 assert.ok(arena.indexOf('battle-theater-enemy')<arena.indexOf('battle-theater-player'));
 assert.match(css,/\.battle-theater-enemy-units/);assert.match(css,/\.battle-theater-player-units/);
 assert.match(css,/\.realtime-floating-damage/);assert.match(arena,/realtime-unit-hit/);
 assert.equal(battleMonsterImage('尚未登錄的怪物'),MONSTER_PLACEHOLDER);
});
