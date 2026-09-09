// Original synthesized placeholders. Replace matching WAV files to change sounds.
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve('assets/resources/audio');fs.mkdirSync(dir,{recursive:true});
const rate=22050;
function write(name,seconds,sample){
  const count=Math.floor(seconds*rate),wav=Buffer.alloc(44+count*2);wav.write('RIFF');wav.writeUInt32LE(36+count*2,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++){const t=i/rate;wav.writeInt16LE(Math.round(Math.max(-0.9,Math.min(0.9,sample(t)))*32767),44+i*2);}fs.writeFileSync(path.join(dir,name+'.wav'),wav);
}
const notes=[261.63,329.63,392,329.63,293.66,349.23,440,349.23,220,261.63,329.63,261.63,196,246.94,293.66,246.94];
write('music',16,t=>{const n=Math.floor(t),u=t-n,f=notes[n],env=Math.min(1,u/0.03)*Math.exp(-u*3)*Math.min(1,(1-u)/0.08);return (Math.sin(2*Math.PI*f*t)*0.23+Math.sin(2*Math.PI*f*2*t)*0.04)*env;});
let s=8321;function noise(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/2147483648-1;}
write('hiss',0.6,t=>noise()*0.21*Math.sin(Math.PI*t/0.6));
write('fight',1.5,t=>{const u=t%0.125;return (noise()*0.13+Math.sin(2*Math.PI*115*t)*0.08)*Math.exp(-u*38)*Math.min(1,(1.5-t)*10);});
write('place',0.22,t=>Math.sin(2*Math.PI*(600*t+260*t*t))*Math.exp(-t*19)*Math.min(1,t*100)*0.25);
console.log('Generated original WAV placeholders: music, hiss, fight, place');

