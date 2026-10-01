const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/l9933/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main(){
 const version=process.argv[4]||'v2';
 if(!/^v[0-9]+$/.test(version))throw Error('Invalid output version');
 const dir=path.join(__dirname,version),size=384;fs.mkdirSync(dir,{recursive:true});
 const repairs=process.argv[6]?JSON.parse(fs.readFileSync(process.argv[6],'utf8')):{};
 const specs=[{file:process.argv[2],cols:4,rows:4},{file:process.argv[3],cols:4,rows:6}],cells=[];
 if(process.argv[5])specs.push({file:process.argv[5],cols:4,rows:4});
 for(const [s,spec] of specs.entries()){
  const m=await sharp(spec.file).metadata(),cw=Math.floor(m.width/spec.cols),ch=Math.floor(m.height/spec.rows);
  const layouts=['v5','v6'].includes(version)?[
   {x:[0,315,628,938,1254],y:[0,300,618,929,1254]},
   {x:[0,256,512,768,1024],y:[0,230,450,725,974,1195,1536]},
   {x:[0,314,627,940,1254],y:[0,314,604,910,1254]}
  ]:null;
  const grid=layouts?.[s];
  if(grid&&(grid.x.at(-1)!==m.width||grid.y.at(-1)!==m.height))throw Error('Calibrated layout does not match source dimensions');
  fs.copyFileSync(spec.file,path.join(dir,`sheet-${s+1}.png`));
  for(let i=0;i<spec.cols*spec.rows;i++){
   const col=i%spec.cols,row=Math.floor(i/spec.cols),inset=grid?3:0;
   const left=grid?grid.x[col]+inset:col*cw,top=grid?grid.y[row]+inset:row*ch;
   const width=grid?grid.x[col+1]-grid.x[col]-inset*2:cw;
   const height=(grid?grid.y[row+1]-grid.y[row]-inset*2:ch)-(['v5','v6'].includes(version)&&s===1&&row===3?8:0);
   const override=repairs[cells.length+1];
   const source=override?sharp(override):sharp(spec.file).extract({left,top,width,height});
   const buf=await source.resize(size-24,size-24,{fit:'contain',background:'#000'}).extend({top:12,bottom:12,left:12,right:12,background:'#000'}).removeAlpha().png().toBuffer();
   fs.writeFileSync(path.join(dir,`frame-${String(cells.length+1).padStart(2,'0')}.png`),buf);cells.push(buf);
  }
 }
 const strip=await sharp({create:{width:size,height:size*cells.length,channels:3,background:'#000'}}).composite(cells.map((input,i)=>({input,left:0,top:i*size}))).png({palette:true,colours:256,dither:0.6}).toBuffer();
 const raw=await sharp(strip).removeAlpha().raw().toBuffer(),palette=[],map=new Map(),indexed=Buffer.alloc(size*size*cells.length);
 for(let i=0;i<indexed.length;i++){const k=raw[i*3]*65536+raw[i*3+1]*256+raw[i*3+2];if(!map.has(k)){map.set(k,palette.length);palette.push([raw[i*3],raw[i*3+1],raw[i*3+2]]);}indexed[i]=map.get(k);}
 if(palette.length>256)throw Error('Palette overflow');
 const chunks=[],put=a=>chunks.push(Buffer.from(a)),u16=n=>[n&255,n>>8&255];
 put(Buffer.from('GIF89a'));put([...u16(size),...u16(size),0xf7,0,0]);for(let i=0;i<256;i++)put(palette[i]||[0,0,0]);
 put([0x21,0xff,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0]);
 for(let i=0;i<cells.length;i++){
  const delay=i===0?50:i===cells.length-1?100:8;
  put([0x21,0xf9,4,4,...u16(delay),0,0]);put([0x2c,0,0,0,0,...u16(size),...u16(size),0,8]);
  const pixels=indexed.subarray(i*size*size,(i+1)*size*size),bytes=[];let acc=0,bits=0;
  const code=n=>{acc|=n<<bits;bits+=9;while(bits>=8){bytes.push(acc&255);acc>>>=8;bits-=8;}};
  for(let p=0;p<pixels.length;p+=200){code(256);for(let j=p;j<Math.min(p+200,pixels.length);j++)code(pixels[j]);}
  code(257);if(bits)bytes.push(acc&255);for(let p=0;p<bytes.length;p+=255){const b=bytes.slice(p,p+255);put([b.length,...b]);}put([0]);
 }
 put([0x3b]);const dest=path.join(dir,`op-dragon-robot-sword-${version}.gif`);fs.writeFileSync(dest,Buffer.concat(chunks));
 const m=await sharp(dest,{animated:true}).metadata();await sharp(dest,{animated:true}).raw().toBuffer();
 if(m.pages!==cells.length)throw Error('Incorrect frame count');console.log(JSON.stringify({file:dest,frames:m.pages,size:m.width,delays:m.delay,bytes:fs.statSync(dest).size}));
}
main().catch(e=>{console.error(e);process.exit(1);});
