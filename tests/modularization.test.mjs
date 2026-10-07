import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import vm from 'node:vm';
// Keep original fixture files immutable. These four functions and the global
// arena were deliberately changed after extraction; execute their behavioral
// coverage here instead of copying current hashes into historical fixtures.
import './hanyang-objective-navigation.test.mjs';
import './hanyang-npc-dialogue.test.mjs';
import './mythic-equipment-v1.test.mjs';
import './world-battle-panel-wiring.test.mjs';
import './world-battle-action.test.mjs';
import './page-extraction-unchanged.test.mjs';
import './city-shop-wiring.test.mjs';
import './world-monster-selection-wiring.test.mjs';
import './battle-map-page-wiring.test.mjs';
import './page-extraction-remainder.test.mjs';
import './gem-workshop-wiring.test.mjs';
import './gem-investment-confirmation.test.mjs';
import './gem-socket-transaction.test.mjs';
import './hanyang-boss-access.test.mjs';
import './tutorial-hunt.test.mjs';
import './relic-reward-settlement.test.mjs';

const baseline=JSON.parse(readFileSync(new URL('./fixtures/modularization-ae8da1b.json',import.meta.url),'utf8'));
const incoming=JSON.parse(readFileSync(new URL('./fixtures/merge-ui-6c66ce3.json',import.meta.url),'utf8'));
const read=file=>readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
const parse=file=>ts.createSourceFile(file,read(file),99,true,file.endsWith('tsx')?4:3);
function canonical(n){if(ts.isParenthesizedExpression(n))return canonical(n.expression);const children=[];ts.forEachChild(n,c=>{const sealAddition=(ts.isVariableDeclaration(c)||ts.isShorthandPropertyAssignment(c))&&['sealDropRoll','sealChoiceRoll'].includes(c.name?.text);if(c.kind!==ts.SyntaxKind.ExportKeyword&&!sealAddition)children.push(canonical(c));});let value='';if(ts.isIdentifier(n)||ts.isStringLiteralLike(n)||ts.isNumericLiteral(n))value=n.text;if(ts.isJsxText(n))value=n.text.replace(/\s+/g,' ').trim();return [n.kind,value,children];}
const hash=n=>createHash('sha256').update(JSON.stringify(canonical(n))).digest('hex');
const controllers=['game-npc-controller.ts','game-city-controller.ts','game-territory-controller.ts','game-guild-controller.ts','game-navigation-controller.ts','game-ui-config.ts','use-trade-controller.ts'];
const behaviorCoveredFunctions=new Set(['goToObjective','handleNpcAction','openNpcDialogue','redeemWandererSet']);
const unchangedFunctions=entries=>Object.fromEntries(Object.entries(entries).filter(([name])=>!behaviorCoveredFunctions.has(name)));

test('sixteen unchanged moved functions preserve baseline trees; four changed functions execute behavior coverage',()=>{
  const found={};function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text in baseline.functions)found[n.name.text]=hash(n);ts.forEachChild(n,visit);}
  controllers.forEach(file=>visit(parse(file)));
  assert.equal(Object.keys(found).length,20);
  for(const name of behaviorCoveredFunctions)assert.ok(name in found,`missing behavior-covered function ${name}`);
  assert.equal(Object.keys(unchangedFunctions(found)).length,16);
  assert.deepEqual(unchangedFunctions(found),unchangedFunctions(baseline.functions));
});

test('six unchanged tabs preserve immutable baselines; evolved pages retain audited remainders and execute behavior coverage',()=>{
  const found={};for(const value of Object.keys(baseline.pages)){const sf=parse(`game-${value}-page.tsx`);function visit(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(sf)==='TabsContent')found[value]=hash(n);ts.forEachChild(n,visit);}visit(sf);}
  assert.equal(Object.keys(found).length,10);
  // city/battle are NOT simply exempted: page-extraction-remainder compares
  // every unmodified subtree to git 6c66ce3 and asserts exact reviewed boundary
  // counts; the imported suites execute those boundaries and failure paths.
  // Original whole-page fixtures remain unchanged for historical reference.
  const evolvedPages=new Set(['squad','relic','city','battle']);
  const unchanged=Object.fromEntries(Object.entries(found).filter(([key])=>!evolvedPages.has(key)));
  const expected=Object.fromEntries(Object.entries({...baseline.pages,...incoming.pages}).filter(([key])=>!evolvedPages.has(key)));
  assert.equal(Object.keys(unchanged).length,6);
  assert.deepEqual(unchanged,expected);
  assert.match(read('game-squad-page.tsx'),/promotionItems=\{\{\.\.\.game.materials/);
  assert.match(read('game-relic-page.tsx'),/settleRelicRewards\(previous,current,next,action,relicRewardRandom\(rewardSeed\)\)/);
});

test('global battle panel has one arena outside tab lifecycle; updated actions execute behavior coverage',()=>{
  const sf=parse('game-world-battle-panel.tsx');let arenas=0;
  function visit(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(sf)==='WorldBattleWindow')arenas++;ts.forEachChild(n,visit);}visit(sf);
  assert.equal(arenas,1);
  const root=read('game-v15.tsx');
  assert.ok(root.indexOf('<GameWorldBattlePanel')<root.search(/<Tabs\s/));
  assert.doesNotMatch(root,/<GameOnboarding/);
});

test('entry is composition only and every tab remains connected to the typed controller',()=>{
  const root=read('game-v15.tsx'),controller=read('use-game-controller.ts');
  assert.match(root,/const view = useGameController\(\)/);
  assert.doesNotMatch(root,/useState|useEffect|localStorage|function handleNpcAction|dispatchTradeAction/);
  for(const value of Object.keys(baseline.pages))assert.match(root,new RegExp(`Game${value[0].toUpperCase()+value.slice(1)}Page`));
  for(const hook of ['useGameState','useCharacterSession','useGameLoop','useGamePreferences','useGameMaintenance','useTradeController','useHanyangReturnEffects','useHanyangFormationEffect','useHanyangKillEffect'])assert.match(controller,new RegExp(hook+'\\('));
  for(const factory of ['Squad','Inventory','Commissions','Npc','City','Territory','Guild','Navigation'])assert.match(controller,new RegExp(`create${factory}Controller\\(`));
  assert.match(controller,/getGameView\(/);
});

test('view projection passes only requested values and keeps setters by identity',()=>{
  const sf=parse('use-game-controller.ts'),fn=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='selectGameView');
  const code=ts.transpileModule(fn.getText(sf).replace('export ',''),{compilerOptions:{target:99}}).outputText;
  const context=vm.createContext({});vm.runInContext(code,context);
  const setter=()=>{},game={gold:42},view={game,setGame:setter,privateState:'not passed'};
  const selected=context.selectGameView(view,['game','setGame']);
  assert.deepEqual(Object.keys(selected),['game','setGame']);assert.equal(selected.game,game);assert.equal(selected.setGame,setter);assert.equal(selected.privateState,undefined);
});
