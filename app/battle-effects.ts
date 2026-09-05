import type {BattleEvent} from './dungeon-engine';
/** 此控制器只操作特效層：不更改遊戲狀態、不發獎、不控制刷怪時間。 */
export function createBattleEffects(root:HTMLElement){
 const popups=new Map<HTMLElement,()=>void>(),animations=new Map<string,()=>void>();
 const find=(kind:string,side:string)=>root.querySelector<HTMLElement>('[data-'+kind+'="'+side+'"]');
 function pulse(node:HTMLElement|null,cls:string){
  if(!node)return;
  const key=(node.dataset.motion||node.dataset.hit||'spawn')+cls;
  animations.get(key)?.();node.classList.remove(cls);void node.offsetWidth;node.classList.add(cls);
  const finish=()=>{node.classList.remove(cls);node.removeEventListener('animationend',done);clearTimeout(timer);animations.delete(key)};
  const done=(event:Event)=>{if(event.target===node)finish()};
  node.addEventListener('animationend',done);const timer=setTimeout(finish,1100);animations.set(key,finish);
 }
 function clear(){for(const finish of popups.values())finish();for(const finish of animations.values())finish()}
 function hit(event:BattleEvent){
  pulse(find('motion',event.attacker),'impact-lunge-'+event.attacker);
  pulse(find('hit',event.target),'impact-hit');
  if(event.skill){
   pulse(root,'impact-screen-shake');
   pulse(find('motion',event.attacker),'impact-critical-lunge');
   pulse(find('hit',event.target),'impact-critical-hit');
  }
  const host=find('popup',event.target);if(!host)return;
  if(popups.size>=32)popups.values().next().value?.();
  // 只在 React 保留的空特效層內建立節點；動畫結束 remove，另有逾時保險。
  const node=document.createElement('span');
  node.className='impact-number'+(event.skill?' impact-critical-number':'');
  node.textContent='-'+event.amount+(event.skill?' !!':'');node.setAttribute('aria-hidden','true');host.appendChild(node);
  const finish=()=>{node.removeEventListener('animationend',finish);clearTimeout(timer);node.remove();popups.delete(node)};
  node.addEventListener('animationend',finish);const timer=setTimeout(finish,1300);popups.set(node,finish);
  if(event.skill){
   for(let i=0;i<16;i++){
    const particle=document.createElement('i');const angle=Math.random()*Math.PI*2;const distance=28+Math.random()*70;
    particle.className='impact-particle';particle.style.setProperty('--particle-x',Math.cos(angle)*distance+'px');particle.style.setProperty('--particle-y',Math.sin(angle)*distance+'px');host.appendChild(particle);
    const remove=()=>{particle.removeEventListener('animationend',remove);particle.remove()};particle.addEventListener('animationend',remove);setTimeout(remove,900);
   }
  }
 }
 return {hit,clear,spawn:()=>{clear();pulse(find('spawn','enemy'),'impact-arrive')}};
}
