const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/l9933/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

// Mechanical packaging only: six generated cells, no invented tween frames.
async function main() {
  const source = process.argv[2];
  const out = __dirname;
  const meta = await sharp(source).metadata();
  const cw = Math.floor(meta.width / 3), ch = Math.floor(meta.height / 2);
  const size = 512;
  const cells = [];
  for (let i = 0; i < 6; i++) {
    const cell = await sharp(source).extract({left: (i % 3) * cw, top: Math.floor(i / 3) * ch, width: cw, height: ch}).resize(size, size).removeAlpha().png().toBuffer();
    fs.writeFileSync(path.join(out, `frame-${i + 1}.png`), cell);
    cells.push(cell);
  }
  const strip = await sharp({create:{width:size,height:size*6,channels:3,background:'#000'}}).composite(cells.map((input,i)=>({input,left:0,top:i*size}))).png({palette:true,colours:256,dither:0.6}).toBuffer();
  const raw = await sharp(strip).removeAlpha().raw().toBuffer();
  const palette = [], map = new Map(), indexed = Buffer.alloc(size*size*6);
  for (let p=0;p<indexed.length;p++) {
    const k = raw[p*3]*65536+raw[p*3+1]*256+raw[p*3+2];
    if (!map.has(k)) {map.set(k,palette.length);palette.push([raw[p*3],raw[p*3+1],raw[p*3+2]]);}
    indexed[p]=map.get(k);
  }
  if(palette.length>256) throw new Error(`Palette exceeded 256: ${palette.length}`);
  const chunks=[];
  const put=(a)=>chunks.push(Buffer.from(a));
  const u16=(n)=>[n&255,n>>8&255];
  put(Buffer.from('GIF89a'));put([...u16(size),...u16(size),0xf7,0,0]);
  for(let i=0;i<256;i++)put(palette[i]||[0,0,0]);
  put([0x21,0xff,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0]);
  const delays=[90,45,45,45,55,180];
  for(let i=0;i<6;i++) {
    put([0x21,0xf9,4,4,...u16(delays[i]),0,0]);
    put([0x2c,0,0,0,0,...u16(size),...u16(size),0,8]);
    const pixels=indexed.subarray(i*size*size,(i+1)*size*size);
    const bytes=[];let bits=0,acc=0;
    const code=(n)=>{acc|=n<<bits;bits+=9;while(bits>=8){bytes.push(acc&255);acc>>>=8;bits-=8;}};
    // Reset dictionary before code width grows; legal GIF LZW, intentionally simple.
    for(let start=0;start<pixels.length;start+=200){code(256);for(let p=start;p<Math.min(start+200,pixels.length);p++)code(pixels[p]);}
    code(257);if(bits)bytes.push(acc&255);
    for(let p=0;p<bytes.length;p+=255){const block=bytes.slice(p,p+255);put([block.length,...block]);}put([0]);
  }
  put([0x3b]);
  const dest=path.join(out,'op-dragon-robot-transform-v1.gif');
  fs.writeFileSync(dest,Buffer.concat(chunks));
  fs.copyFileSync(source,path.join(out,'keyframes-sheet.png'));
  const check=await sharp(dest,{animated:true}).metadata();
  if(check.pages!==6||check.width!==512||check.pageHeight!==512)throw new Error('Invalid GIF dimensions/frame count');
  await sharp(dest,{animated:true}).raw().toBuffer();
  console.log(JSON.stringify({file:dest,frames:check.pages,width:check.width,height:check.pageHeight,delay:check.delay,loop:check.loop,bytes:fs.statSync(dest).size}));
}
main().catch(e=>{console.error(e);process.exit(1);});
