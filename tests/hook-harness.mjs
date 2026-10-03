import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// React lifecycle boundary for pure, deterministic hook contract tests.
export function harness(file, exportName, dependencies) {
  const slots=[],pending=[];
  let cursor=0;
  const changed=(a,b)=>!a||a.length!==b.length||a.some((v,i)=>!Object.is(v,b[i]));
  const hooks={
    useState(initial){const i=cursor++;if(!slots[i]){const slot={value:typeof initial==='function'?initial():initial};slot.setter=next=>{slot.value=typeof next==='function'?next(slot.value):next;};slots[i]=slot;}return [slots[i].value,slots[i].setter];},
    useRef(initial){const i=cursor++;slots[i]??={current:initial};return slots[i];},
    useCallback(callback,deps){const i=cursor++;if(changed(slots[i]?.deps,deps))slots[i]={value:callback,deps};return slots[i].value;},
    useEffectEvent(callback){const i=cursor++;if(!slots[i])slots[i]={call:(...args)=>slots[i].callback(...args)};slots[i].callback=callback;return slots[i].call;},
    useEffect(callback,deps){const i=cursor++;if(changed(slots[i]?.deps,deps))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:callback()};});},
  };
  const text=readFileSync(new URL(`../app/${file}`,import.meta.url),'utf8');
  const parsed=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
  const noImports=ts.factory.updateSourceFile(parsed,parsed.statements.filter(n=>!ts.isImportDeclaration(n)));
  const code=ts.createPrinter().printFile(noImports).replace(/^export /gm,'');
  const context=vm.createContext({...dependencies,...hooks});
  vm.runInContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  return {
    render(props){cursor=0;const result=context[exportName](props);while(pending.length)pending.shift()();return result;},
    unmount(){for(const slot of slots)slot?.cleanup?.();},
  };
}
