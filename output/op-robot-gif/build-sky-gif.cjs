const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/l9933/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main(){
 const dir=path.join(__dirname,'v7'),manifest=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),size=384;
 fs.mkdirSync(dir,{recursive:true});const cells=[];
 async function align(file,action=0){
  const {data,info}=await sharp(file).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height,c=info.channels,redRows=[];let minX=w,maxX=0,minY=h,maxY=0;
  for(let y=0;y<h;y++){let reds=0;for(let x=0;x<w;x++){const p=(y*w+x)*c,r=data[p],g=data[p+1],b=data[p+2];if(Math.max(r,g,b)>60){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}if(x>w*.44&&x<w*.56&&y<h*.65&&r>160&&r>g*1.45&&r>b*1.25)reds++;}redRows[y]=reds;}
  let crown=null;for(let y=0;y<h*.65;y++)if(redRows[y]>=3){let weight=0,sum=0,end=y;while(end<h&&redRows[end]>=2){weight+=redRows[end];sum+=end*redRows[end];end++;}if(weight>=15){crown=sum/weight;break;}y=end;}
  if(crown===null)crown=minY+(maxY-minY)*.08;
  if(action===9)crown=h*.15;
  if(action===10)crown=h*.255;
  if(action===11||action===12)crown=h*.415;
  const foot=maxY,targetFoot=362,targetCrown=182;
  const scale=Math.min((targetFoot-targetCrown)/Math.max(1,foot-crown),354/Math.max(1,foot-minY),354/Math.max(1,maxX-minX));
  const left=Math.round(size/2-(minX+maxX)/2*scale),top=Math.round(targetFoot-foot*scale);
  const resized=await sharp(file).resize(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale))).removeAlpha().toBuffer();
  const rm=await sharp(resized).metadata(),sx=Math.max(0,-left),sy=Math.max(0,-top),tw=Math.min(rm.width-sx,size-Math.max(0,left)),th=Math.min(rm.height-sy,size-Math.max(0,top));
  const clipped=await sharp(resized).extract({left:sx,top:sy,width:tw,height:th}).toBuffer();
  return sharp({create:{width:size,height:size,channels:3,background:'#000'}}).composite([{input:clipped,left:Math.max(0,left),top:Math.max(0,top)}]).png().toBuffer();
 }
 for(let i=1;i<=16;i++)cells.push(await align(path.join(__dirname,'v6',`frame-${String(i).padStart(2,'0')}.png`)));
 for(let i=1;i<=16;i++){
  const src=manifest[i];if(!src)throw Error(`Missing action frame ${i}`);
  fs.copyFileSync(src,path.join(dir,`action-original-${String(i).padStart(2,'0')}.png`));
  cells.push(await align(src,i));
 }
 for(let i=0;i<cells.length;i++)fs.writeFileSync(path.join(dir,`frame-${String(i+1).padStart(2,'0')}.png`),cells[i]);
 const contact=await Promise.all(cells.map(async(input,i)=>({input:await sharp(input).resize(128,128).toBuffer(),left:i%8*128,top:Math.floor(i/8)*128})));
 await sharp({create:{width:1024,height:512,channels:3,background:'#000'}}).composite(contact).png().toFile(path.join(dir,'contact-sheet.png'));
 const strip=await sharp({create:{width:size,height:size*cells.length,channels:3,background:'#000'}}).composite(cells.map((input,i)=>({input,left:0,top:i*size}))).png({palette:true,colours:256,dither:0.6}).toBuffer();
 const raw=await sharp(strip).removeAlpha().raw().toBuffer(),palette=[],map=new Map(),indexed=Buffer.alloc(size*size*cells.length);
 for(let i=0;i<indexed.length;i++){const k=raw[i*3]*65536+raw[i*3+1]*256+raw[i*3+2];if(!map.has(k)){map.set(k,palette.length);palette.push([raw[i*3],raw[i*3+1],raw[i*3+2]]);}indexed[i]=map.get(k);}if(palette.length>256)throw Error('Palette overflow');
 const chunks=[],put=a=>chunks.push(Buffer.from(a)),u16=n=>[n&255,n>>8&255];put(Buffer.from('GIF89a'));put([...u16(size),...u16(size),0xf7,0,0]);for(let i=0;i<256;i++)put(palette[i]||[0,0,0]);put([0x21,0xff,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0]);
 const actionDelays=[18,18,22,25,25,30,45,65,16,8,8,30,18,20,20,120];
 for(let i=0;i<cells.length;i++){
  const delay=i===0?50:i<16?8:actionDelays[i-16];put([0x21,0xf9,4,4,...u16(delay),0,0]);put([0x2c,0,0,0,0,...u16(size),...u16(size),0,8]);
  const pixels=indexed.subarray(i*size*size,(i+1)*size*size),bytes=[];let acc=0,bits=0;const code=n=>{acc|=n<<bits;bits+=9;while(bits>=8){bytes.push(acc&255);acc>>>=8;bits-=8;}};
  for(let p=0;p<pixels.length;p+=200){code(256);for(let j=p;j<Math.min(p+200,pixels.length);j++)code(pixels[j]);}code(257);if(bits)bytes.push(acc&255);for(let p=0;p<bytes.length;p+=255){const b=bytes.slice(p,p+255);put([b.length,...b]);}put([0]);
 }
 put([0x3b]);const dest=path.join(dir,'op-king-sky-cleaving-v7.gif');fs.writeFileSync(dest,Buffer.concat(chunks));
 const m=await sharp(dest,{animated:true}).metadata();await sharp(dest,{animated:true}).raw().toBuffer();if(m.pages!==32)throw Error('Incorrect frame count');console.log(JSON.stringify({file:dest,frames:m.pages,delays:m.delay,bytes:fs.statSync(dest).size}));
}
main().catch(e=>{console.error(e);process.exit(1);});
