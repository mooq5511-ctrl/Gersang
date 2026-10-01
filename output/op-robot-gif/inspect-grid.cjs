const sharp=require('C:/Users/l9933/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main(){for(const [s,rows] of [[1,4],[2,6],[3,4]]){
 const {data,info}=await sharp(`${__dirname}/v4/sheet-${s}.png`).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h,channels:c}=info,ys=[],xs=[];
 for(let y=0;y<h;y++){let v=0;for(let x=0;x<w;x++){const p=(y*w+x)*c;v+=Math.max(data[p],data[p+1],data[p+2]);}ys.push(v/w);}
 for(let x=0;x<w;x++){let v=0;for(let y=0;y<h;y++){const p=(y*w+x)*c;v+=Math.max(data[p],data[p+1],data[p+2]);}xs.push(v/h);}
 console.log('SHEET',s,w,h);
 for(const [axis,a,n] of [['row',ys,rows],['col',xs,4]])for(let k=1;k<n;k++){
 const mid=Math.round(a.length*k/n),candidates=[];for(let t=Math.max(1,mid-50);t<Math.min(a.length-2,mid+50);t++)candidates.push({at:t,score:+((a[t-1]+a[t]+a[t+1])/3).toFixed(2)});
 console.log(axis,k,candidates.sort((a,b)=>a.score-b.score).slice(0,10));
 }
}}
main();
