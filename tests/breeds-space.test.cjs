const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require(process.env.COCOS_TYPESCRIPT||'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript');
function load(name){const c={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,c);return c.exports;}
const {BREEDS,coatPixels,markingStyle,MARKING_STYLES}=load('CatBreeds');
assert.ok(BREEDS.length>=9);
for(const breed of BREEDS){const a=coatPixels(breed,123),b=coatPixels(breed,123),c=coatPixels(breed,456);assert.ok(MARKING_STYLES.includes(markingStyle(breed,123)));assert.equal(markingStyle(breed,123),markingStyle(breed,123));assert.equal(a.length,64*64*4);assert.deepEqual(a,b);assert.notDeepEqual(a,c);for(let i=3;i<a.length;i+=4)assert.equal(a[i],255);}
assert.notDeepEqual(coatPixels(BREEDS[0],42),coatPixels(BREEDS[2],42));
const {pairSpacing,HISS_DISTANCE,FIGHT_DISTANCE,THREAT_TRIGGER_DISTANCE,THREAT_SPEED,THREAT_DURATION}=load('GardenSpace');
assert.equal(THREAT_SPEED,10);assert.ok(THREAT_DURATION<0.35,'Ground-paw threat should release quickly after the pounce');assert.ok(THREAT_TRIGGER_DISTANCE<HISS_DISTANCE*2,'Ground-paw threat is reserved for nearby cats');
const {audioAllowed,backgroundMusicAllowed,soundEffectAllowed}=load('AudioPolicy');assert.equal(audioAllowed(true,false),false);assert.equal(audioAllowed(true,true),true);assert.equal(audioAllowed(false,true),false);assert.equal(backgroundMusicAllowed(true,true,true),false,'Gallery must mute background music');assert.equal(backgroundMusicAllowed(true,true,false),true,'Background music remains available outside Gallery');assert.equal(soundEffectAllowed(true,true,true,'fight'),false,'Gallery must mute fight sounds');assert.equal(soundEffectAllowed(true,true,true,'confrontation'),false,'Gallery must mute confrontation sounds');assert.equal(soundEffectAllowed(true,true,true,'place'),true,'Cat placement sounds remain available');assert.equal(soundEffectAllowed(true,true,false,'fight'),true,'Fight sounds remain available outside Gallery');
let a={x:-0.2,z:0},b={x:0.2,z:0};
for(let i=0;i<120;i++)({a,b}=pairSpacing(a,b,HISS_DISTANCE,1/60));
assert.ok(Math.abs(b.x-a.x-HISS_DISTANCE)<0.0001);assert.ok(Math.abs(a.x+b.x)<0.0001);
for(let i=0;i<120;i++)({a,b}=pairSpacing(a,b,FIGHT_DISTANCE,1/60));
assert.ok(Math.abs(b.x-a.x-FIGHT_DISTANCE)<0.0001);assert.ok(FIGHT_DISTANCE<HISS_DISTANCE);
let slowA={x:-0.75,z:0},slowB={x:0.75,z:0},fastA={...slowA},fastB={...slowB};
({a:slowA,b:slowB}=pairSpacing(slowA,slowB,FIGHT_DISTANCE,0.1,0.65));
({a:fastA,b:fastB}=pairSpacing(fastA,fastB,FIGHT_DISTANCE,0.1,1.45));
assert.ok(fastB.x-fastA.x<slowB.x-slowA.x,'Fight approach must be faster than hiss spacing');
const same=pairSpacing({x:0,z:0},{x:0,z:0},HISS_DISTANCE,0.02);assert.ok(Number.isFinite(same.a.x));assert.ok(same.b.x>same.a.x);
for(const name of ['music','hiss','fight','place']){const wav=fs.readFileSync('assets/bundles/audio-pack/'+name+'.wav');assert.equal(wav.toString('ascii',0,4),'RIFF');let energy=0;for(let i=44;i<wav.length;i+=2)energy+=wav.readInt16LE(i)**2;assert.ok(energy>0,'Audio must not be silent');}
for(let i=1;i<=5;i++){const mp3=fs.readFileSync('assets/bundles/audio-pack/laowu'+i+'.mp3');assert.ok(mp3.length>1000);assert.ok(mp3.toString('ascii',0,3)==='ID3'||(mp3[0]===0xff&&(mp3[1]&0xe0)===0xe0),'Confrontation audio must be MP3');}
const audioSource=fs.readFileSync('assets/scripts/GardenAudio.ts','utf8');assert.match(audioSource,/i<=5/);assert.doesNotMatch(audioSource,/i<=8/);
console.log('PASS: breed coats and marking motifs, spacing approach/retreat, replaceable WAV assets, laowu1-5 MP3 pool');
