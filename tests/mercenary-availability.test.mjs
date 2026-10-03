import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {AVAILABLE_MERCENARY_IDS,isMercenaryAvailable} from '../app/mercenary-availability.ts';
import {merchantMercenaries} from '../app/mercenary-roster.ts';
const source=file=>readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
test('only the existing Korean spearman is available, full roster stays in project',()=>{
 assert.deepEqual(AVAILABLE_MERCENARY_IDS,['spear']);
 assert.deepEqual(merchantMercenaries.filter(spec=>isMercenaryAvailable(spec.id)).map(spec=>spec.name),['朝鮮槍兵']);
 assert.equal(merchantMercenaries.length,19);
 assert.equal(isMercenaryAvailable('general-test'),false);assert.equal(isMercenaryAvailable('shield'),false);
});
test('UI and controller restrict new recruits without resetting player saves',()=>{
 assert.match(source('mercenary-recruitment.tsx'),/filter\(\(\{spec\}\) => isMercenaryAvailable\(spec.id\)\)/);
 const controller=source('game-squad-controller.ts');assert.match(controller,/if \(!isMercenaryAvailable\(spec.id\)\)/);assert.match(controller,/if \(!isMercenaryAvailable\(`general-\$\{general.id\}`\)\)/);
 for(const file of ['use-game-state.ts','hanyang-prologue.ts','game-progression-view.ts']){
  const committed=execFileSync('git',['show',`HEAD:app/${file}`],{encoding:'utf8'});
  assert.equal(source(file).replace(/\r\n/g,'\n'),committed.replace(/\r\n/g,'\n'),`${file} must remain unchanged`);
 }
});
