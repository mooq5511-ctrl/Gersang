import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const guild=createRequire(import.meta.url)('../app/guild-skills.ts');
const source=readFileSync(new URL('../app/caravan-status.tsx',import.meta.url),'utf8');
const sf=ts.createSourceFile('caravan-status.tsx',source,99,true,ts.ScriptKind.TSX);
const fn=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='GuildSkillTree');
assert.ok(fn);
function renderTree(rank=1,points=0){
  let selected='tradeProsperity';
  const upgrades=[];
  const context=vm.createContext({...guild,exports:{},useState:()=>[selected,id=>{selected=id;}],
    require:()=>({jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})})});
  vm.runInContext(ts.transpileModule(fn.getText(sf),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:99,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
  const state=guild.freshGuildSkills(),before=structuredClone(state);
  const render=()=>context.GuildSkillTree({rankInfo:{rank,label:'測試階位'},guildSkillPoints:points,guildSkills:state,upgradeGuildSkill:id=>upgrades.push(id),close:()=>{}});
  return {render,upgrades,state,before};
}
function find(node,predicate){
  if(!node)return;
  if(Array.isArray(node)){for(const child of node){const result=find(child,predicate);if(result)return result;}return;}
  if(typeof node!=='object')return;
  if(predicate(node))return node;
  return find(node.props?.children,predicate);
}
test('actual guild tree exposes six native list items without default list spacing',()=>{
  for(const [rank,points] of [[1,0],[50,5]]){
    const view=renderTree(rank,points),tree=view.render();
    const list=find(tree,n=>n.props?.className==='guild-skill-grid');
    assert.equal(list.type,'ul');
    assert.equal(list.props['aria-label'],'商團技能節點');
    const cards=list.props.children;
    assert.equal(cards.length,guild.GUILD_SKILLS.length);
    for(const card of cards){assert.equal(card.type,'li');assert.match(card.props.className,/guild-skill-card/);}
    assert.deepEqual(view.state,view.before);
    assert.equal(view.upgrades.length,0);
  }
  const css=readFileSync(new URL('../app/guild-territory-layout.css',import.meta.url),'utf8');
  assert.match(css,/\.caravan-status \.floating-guild-skills \.guild-skill-grid\s*\{[^}]*margin:\s*0;[^}]*list-style:\s*none;/);
});
test('selecting a skill is read-only and the existing upgrade action receives that skill',()=>{
  const view=renderTree(50,5),tree=view.render();
  const list=find(tree,n=>n.props?.className==='guild-skill-grid');
  const selected=list.props.children[1];
  selected.props.children.props.onClick();
  assert.equal(view.upgrades.length,0);
  const updated=view.render();
  const detail=find(updated,n=>n.props?.className==='guild-skill-detail');
  const action=find(detail,n=>n.type==='button');
  action.props.onClick();
  assert.deepEqual(view.upgrades,[guild.GUILD_SKILLS[1].id]);
  assert.deepEqual(view.state,view.before);
});
