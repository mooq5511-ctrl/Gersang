// Read-only acquisition audit. No save writes or assumption about actual wins/minute.
import './measure-equipment-early.mjs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const {rollWarSeal}=require('../app/war-seals.ts');

export function atLeastSeals(wins, needed, probability){
  if(!Number.isInteger(wins)||wins<0||!Number.isInteger(needed)||needed<1||probability<=0||probability>=1)throw new RangeError('Invalid acquisition inputs');
  if(wins<needed)return 0;
  let term=(1-probability)**wins, below=term;
  for(let count=1;count<needed;count++){
    term*=((wins-count+1)/count)*(probability/(1-probability));
    below+=term;
  }
  return Math.max(0,Math.min(1,1-below));
}

export function firstChapterSealAudit(){
  const counts={};
  for(let index=0;index<1000;index++)for(const choice of [.25,.75]){
    const seal=rollWarSeal('e_raccoon',(index+.5)/1000,'world',choice);
    if(seal)counts[seal.name]=(counts[seal.name]||0)+1;
  }
  const probability=(counts['長槍兵符']||0)/2000;
  if(probability===0)throw new Error('Starter source no longer supplies spear seals');
  return {source:'e_raccoon',counts,samples:2000,probability,
    needed:3,expectedWins:3/probability,
    chances:[30,60,100,200,300].map(wins=>({wins,chance:atLeastSeals(wins,3,probability)})),
    confidence:[.5,.9,.95].map(target=>{
      let wins=0;while(atLeastSeals(wins,3,probability)<target)wins++;
      return {target,wins};
    }),
    caveat:'Three spear promotions are a supplied combat fixture, not a proven minimum requirement. Independent uniform roll/choice assumed. Wins are authoritative victories, not monster count. No measured minutes, natural leveling, equipment funding, or guarantee claim.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(firstChapterSealAudit(),null,2));
