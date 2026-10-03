import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import vm from 'node:vm';

const baseline=JSON.parse(readFileSync(new URL('./fixtures/modularization-ae8da1b.json',import.meta.url),'utf8'));
const incoming=JSON.parse(readFileSync(new URL('./fixtures/merge-ui-6c66ce3.json',import.meta.url),'utf8'));
const read=file=>readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
const parse=file=>ts.createSourceFile(file,read(file),99,true,file.endsWith('tsx')?4:3);
function canonical(n){if(ts.isParenthesizedExpression(n))return canonical(n.expression);const children=[];ts.forEachChild(n,c=>{if(c.kind!==ts.SyntaxKind.ExportKeyword)children.push(canonical(c));});let value='';if(ts.isIdentifier(n)||ts.isStringLiteralLike(n)||ts.isNumericLiteral(n))value=n.text;if(ts.isJsxText(n))value=n.text.replace(/\s+/g,' ').trim();return [n.kind,value,children];}
const hash=n=>createHash('sha256').update(JSON.stringify(canonical(n))).digest('hex');
const controllers=['game-npc-controller.ts','game-city-controller.ts','game-territory-controller.ts','game-guild-controller.ts','game-navigation-controller.ts','game-ui-config.ts','use-trade-controller.ts'];

test('all remaining moved action functions preserve the immutable baseline syntax tree',()=>{
  const found={};function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text in baseline.functions)found[n.name.text]=hash(n);ts.forEachChild(n,visit);}
  controllers.forEach(file=>visit(parse(file)));
  assert.equal(Object.keys(found).length,20);
  assert.deepEqual(found,baseline.functions);
});

test('eight unchanged tabs preserve original baseline and two updated tabs preserve incoming UI changes',()=>{
  const found={};for(const value of Object.keys(baseline.pages)){const sf=parse(`game-${value}-page.tsx`);function visit(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(sf)==='TabsContent')found[value]=hash(n);ts.forEachChild(n,visit);}visit(sf);}
  assert.equal(Object.keys(found).length,10);
  assert.deepEqual(found,{...baseline.pages,...incoming.pages});
});

test('global battle panel preserves incoming battle actions and remains outside tab lifecycle',()=>{
  const sf=parse('game-world-battle-panel.tsx');let arena;
  function visit(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(sf)==='WorldBattleWindow')arena=hash(n);ts.forEachChild(n,visit);}visit(sf);
  assert.equal(arena,incoming.arena);
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
