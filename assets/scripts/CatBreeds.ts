export interface Breed { name:string; fur:string; top:string; dark:string; cream:string; pattern:'stripe'|'patch'|'point'|'solid'|'tuxedo'; eye:string; }
export const BREEDS:Breed[]=[
    {name:'橘猫',fur:'#BC823D',top:'#D7A96B',dark:'#81532F',cream:'#E5CEAA',pattern:'stripe',eye:'#817644'},
    {name:'狸花',fur:'#857361',top:'#A6957C',dark:'#3B342F',cream:'#C4B7A0',pattern:'stripe',eye:'#85964B'},
    {name:'三花',fur:'#E7DECD',top:'#F0E8D9',dark:'#36332E',cream:'#F4EBDD',pattern:'patch',eye:'#A69A55'},
    {name:'布偶',fur:'#E1D8C6',top:'#EEE4D3',dark:'#61514B',cream:'#F5EBDD',pattern:'point',eye:'#70A7CA'},
    {name:'英短蓝猫',fur:'#7B8792',top:'#A0AAB3',dark:'#59646D',cream:'#A9B2B9',pattern:'solid',eye:'#C69646'},
    {name:'奶牛猫',fur:'#ECE9DD',top:'#F5F0E5',dark:'#303238',cream:'#F6F1E8',pattern:'patch',eye:'#89A66C'},
    {name:'暹罗',fur:'#CFBCA0',top:'#E4D1B2',dark:'#453A35',cream:'#E8D7BD',pattern:'point',eye:'#619FC6'},
    {name:'黑猫',fur:'#34373D',top:'#50545B',dark:'#21242A',cream:'#55585D',pattern:'solid',eye:'#B5AD50'},
];
export function seeded(seed:number){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function rgb(hex:string){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
/** Seeded coat atlas: stable within a cat, different for every newly placed cat. */
export function coatPixels(breed:Breed,seed:number,size=64):Uint8Array {
    const random=seeded(seed),data=new Uint8Array(size*size*4);
    const spots=Array.from({length:10},(_,i)=>({x:random(),y:random(),rx:0.09+random()*0.18,ry:0.10+random()*0.19,color:breed.name==='三花'&&i%2?'#BB793C':breed.dark}));
    const phase=random()*6,frequency=5+Math.floor(random()*3);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const u=x/size,v=y/size;let color=breed.fur;
        if(breed.pattern==='stripe'&&Math.sin(u*Math.PI*2*frequency+Math.sin(v*12+phase)*0.8+phase)>0.73)color=breed.dark;
        if(breed.pattern==='patch')for(const s of spots)if(((u-s.x)/s.rx)**2+((v-s.y)/s.ry)**2<1)color=s.color;
        if(breed.pattern==='point'&&(u<0.07||u>0.93))color=breed.top;
        const channels=rgb(color), shade=0.94+0.06*Math.sin(v*Math.PI)+random()*0.025;
        const i=(y*size+x)*4;data[i]=Math.round(channels[0]*shade);data[i+1]=Math.round(channels[1]*shade);data[i+2]=Math.round(channels[2]*shade);data[i+3]=255;
    }
    return data;
}
