import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../app/gem-workshop.tsx',import.meta.url),'utf8');
function fixture({gold=1000,ok=true,accept=true}={}){
  const Button=()=>{},Select=()=>{},calls=[];
  const item={uid:'owned-item',name:'sword'},selected={uid:'owned-unit',name:'unit',equip:{weapon:item}};
  const gem={id:'ruby',name:'ruby',label:'power',values:[2],costs:[10]};
  const quote=ok?{ok:true,item:{...item,socketGem:{count:3}},amount:3,cost:900,value:6}:{ok:false,error:'missing equipment'};
  const preview={unchanged:false,delta:{attack:2,defense:0,maxHp:0,maxMp:0}};
  const modules={
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    '@/components/ui/button':{Button},'@/components/ui/select':{Select,SelectContent:()=>{},SelectItem:()=>{},SelectTrigger:()=>{},SelectValue:()=>{}},
    'lucide-react':{Gem:()=>{}},'./game-display':{formatGameNumber:String},
    './game-ui-config':{slotLabels:{weapon:'weapon'},slots:['weapon']},'../data/items/official-gems':{officialGems:[gem]},
    './gem-socket-quote':{GEM_SOCKET_LIMIT:100,gemSocketResult:(...args)=>{calls.push(['quote',...args]);return quote;}},
    './gem-investment-preview':{gemInvestmentPreview:(...args)=>{calls.push(['preview',...args]);return preview;}},
    './gem-investment-confirmation':{confirmGemInvestment:(...args)=>{calls.push(['confirm',...args.slice(0,3)]);return args[3]('confirm recipe');}},'./gem-workshop.css':{},
  };
  const context=vm.createContext({exports:{},window:{confirm:message=>{calls.push(['prompt',message]);return accept;}},require:id=>{assert.ok(id in modules,id);return modules[id];}});
  vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:99,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
  const tree=context.exports.GemWorkshop({game:{gold},selected,gemSlot:'weapon',gemAmount:3,
    setGemSlot:value=>calls.push(['slot',value]),setGemAmount:value=>calls.push(['amount',value]),socketGem:(...args)=>calls.push(['socket',...args])});
  const found=[];function visit(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}found.push(node);visit(node.props?.children);}visit(tree);
  return {calls,item,selected,gem,quote,preview,button:found.find(node=>node.type===Button),select:found.find(node=>node.type===Select),input:found.find(node=>node.type==='input')};
}
test('actual gem workshop quotes owned slot and confirms before forwarding exact recipe',()=>{
  const h=fixture();assert.equal(h.button.props.disabled,false);
  assert.deepEqual(h.calls[0],['quote',h.item,h.gem,0,3]);
  assert.deepEqual(h.calls[1],['preview',h.selected,'weapon',h.quote.item]);
  h.button.props.onClick();assert.deepEqual(h.calls.slice(2),[['confirm',h.preview,h.quote,'ruby'],['prompt','confirm recipe'],['socket','ruby',0,3]]);
});
test('unaffordable, invalid or cancelled gem investments never invoke the transaction',()=>{
  for(const options of [{gold:899},{gold:NaN},{ok:false},{accept:false}]){
    const h=fixture(options);h.button.props.onClick();
    assert.equal(h.calls.some(call=>call[0]==='socket'),false);
    assert.equal(h.button.props.disabled,options.accept===false?false:true);
  }
});
test('gem slot and quantity controls reject empty slots and clamp to the actual limit',()=>{
  const h=fixture();h.select.props.onValueChange('');h.select.props.onValueChange('weapon');
  assert.deepEqual(h.calls.filter(call=>call[0]==='slot'),[['slot','weapon']]);
  for(const value of ['0','999','invalid','4.9'])h.input.props.onChange({target:{value}});
  assert.deepEqual(h.calls.filter(call=>call[0]==='amount'),[['amount',1],['amount',100],['amount',1],['amount',4]]);
});
