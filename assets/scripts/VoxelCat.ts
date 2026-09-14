import { Node } from 'cc';
import { Breed, BREEDS, MarkingStyle, markingStyle, seeded } from './CatBreeds';
import { CatState } from './CatRules';

export type BlockFactory = (parent: Node, name: string, position: number[], scale: number[], color: string, round?:boolean) => Node;
export interface BodyType { name:string; scale:[number,number,number]; }
export const BODY_TYPES:BodyType[]=[
    {name:'标准体型',scale:[1,1,1]},
    {name:'胖猫',scale:[1.16,1.06,1.08]},
    {name:'瘦猫',scale:[0.87,0.95,0.94]},
    {name:'长猫',scale:[0.96,1.02,1.18]},
    {name:'短猫',scale:[1.03,0.98,0.86]},
];
export interface VoxelOptions { bodyType?:BodyType; seed?:number; earStyle?:number; }
export interface VoxelRig { body: Node; head: Node; mouth: Node; mouthScale:number; legs: Node[]; tail: Node; tailSegments:Node[]; claws:Node[]; torso: Node; arch: number; bodyScale:[number,number,number]; hissArch?:number; setArch?: (amount:number)=>void; strutHeadYaw?:number; strutArmPitches?:number[]; strutArmSpreads?:number[]; }

type MarkRandom=()=>number;

/**
 * Generate the face as a small, seeded pixel-marking atlas.  The coat type
 * still controls the palette, while the motif is rerolled per cat so two
 * cats of the same breed can have different blazes, masks, spots or muzzle
 * markings.  Every motif includes a crown mark because the game camera looks
 * down on the cats.
 */
function addHeadMarkings(head:Node,block:BlockFactory,breed:Breed,random:MarkRandom,motif:MarkingStyle){
    const dark=breed.dark,cream=breed.cream;
    const tricolor=breed.name==='三花';
    const patchColor=tricolor?(random()<0.5?'#BB793C':'#4B3A32'):dark;
    const put=(name:string,p:number[],s:number[],color=dark)=>block(head,name,p,s,color);
    const count=motif==='speckle'?6:motif==='tabby'?4:motif==='crown'?2:3;
    for(let i=0;i<count;i++){
        const x=motif==='split'?(random()<0.5?-0.10:0.10):motif==='crown'?(random()-0.5)*0.06:(i-(count-1)/2)*0.065+(random()-0.5)*0.018;
        const z=-0.105+random()*0.19;
        const width=motif==='speckle'?0.018+random()*0.022:breed.pattern==='patch'?0.06+random()*0.08:0.022+random()*0.016;
        put('Top head marking',[x,0.164,z],[width,0.012,motif==='speckle'?0.025:breed.pattern==='patch'?0.055+random()*0.045:0.075+random()*0.045],breed.pattern==='patch'?patchColor:dark);
    }
    if(motif==='tabby'){
        for(let i=0;i<3+Math.floor(random()*2);i++){
            const x=(i-1.5)*0.052+(random()-0.5)*0.012;
            const stripe=put('Forehead tabby marking',[x,0.105+(random()-0.5)*0.012,0.158],[0.020+random()*0.009,0.055+random()*0.025,0.014]);
            stripe.setRotationFromEuler(-18,0,x*160);
        }
        for(const side of [-1,1])for(let i=0;i<2+Math.floor(random()*2);i++){
            const stripe=put('Cheek marking',[side*(0.145+random()*0.018),-0.025-i*0.025,0.142],[0.042+random()*0.018,0.014+random()*0.009,0.011]);
            stripe.setRotationFromEuler(0,side*(24+random()*14),side*(6+random()*6));
        }
    }else if(motif==='blaze'){
        put('White forehead blaze',[0,0.105,0.205],[0.040+random()*0.025,0.085,0.012],cream);
        put('White crown blaze',[0,0.174,0.025],[0.045+random()*0.025,0.012,0.17],cream);
    }else if(motif==='split'){
        const side=random()<0.5?-1:1;
        // Keep the side patch at the temple so it never covers an eye.
        put('Split face patch',[side*0.17,0.035,0.205],[0.065,0.055,0.012],patchColor);
        put('Split crown patch',[side*0.085,0.174,0.02],[0.13,0.012,0.13],patchColor);
    }else if(motif==='mask'){
        // The mask is an eyebrow band above the eyes, never a plate in front
        // of them.  The pupils and catchlights remain unobstructed.
        put('Pixel eyebrow mask',[0,0.108,0.205],[0.25,0.028,0.012],dark);
        put('Mask crown patch',[0,0.174,0.02],[0.22,0.012,0.11],dark);
    }else if(motif==='moustache'){
        for(const side of [-1,1])put('Muzzle moustache marking',[side*0.055,-0.073,0.208],[0.060,0.020,0.012],dark);
        put('Moustache forehead mark',[0,0.105,0.205],[0.028,0.065,0.012],dark);
    }else if(motif==='speckle'){
        for(let i=0;i<4;i++)put('Forehead pixel fleck',[(random()-0.5)*0.24,0.112+random()*0.045,0.207],[0.018+random()*0.018,0.018+random()*0.018,0.012],i%2?dark:breed.top);
    }else{
        put('Crown diamond',[0,0.174,0.03],[0.10,0.012,0.14],patchColor);
        put('Crown side fleck',[-0.11,0.174,-0.06],[0.035,0.012,0.06],dark);
        put('Crown side fleck',[0.11,0.174,-0.06],[0.035,0.012,0.06],dark);
    }
}

function addFixedHeadMarkings(head:Node,block:BlockFactory,breed:Breed){
    const put=(name:string,p:number[],s:number[],color:string)=>block(head,name,p,s,color);
    if(breed.pattern==='point'){
        // Ragdoll/Siamese: stable dark ears, temples and crown points.
        put('Top head marking',[-0.105,0.164,0.015],[0.055,0.012,0.12],breed.dark);
        put('Top head marking',[0.105,0.164,0.015],[0.055,0.012,0.12],breed.dark);
        put('Fixed point temple',[-0.17,0.035,0.145],[0.055,0.15,0.012],breed.dark);
        put('Fixed point temple',[0.17,0.035,0.145],[0.055,0.15,0.012],breed.dark);
    }else{
        // British shorthair: a quiet, fixed blue-grey crown sheen.
        put('Top head marking',[0,0.164,0.015],[0.16,0.012,0.18],breed.top);
        put('Fixed solid crown fleck',[-0.10,0.174,-0.07],[0.035,0.012,0.05],breed.dark);
        put('Fixed solid crown fleck',[0.10,0.174,-0.07],[0.035,0.012,0.05],breed.dark);
    }
}

/** All limbs rotate at their shoulder/hip, never around the centre of a paw. */
export function createVoxelCat(root: Node, block: BlockFactory, breed: Breed = BREEDS[0], options:VoxelOptions = {}): VoxelRig {
    const {fur,top,dark,cream}=breed;
    const seed=options.seed ?? Math.floor(Math.random()*0xffffffff),random=seeded(seed);
    const bodyType=options.bodyType??BODY_TYPES[0],bodyScale=bodyType.scale;
    const body=new Node('Torso roll pivot'); root.addChild(body); body.setPosition(0,0.36,0);
    const torso=block(body,'Continuous torso',[0,0,0],[1,1,1],fur);
    const head=new Node('Wide folded-ear head');body.addChild(head);head.setPosition(0,0.01,0.45);
    block(head,'Wide square head core',[0,0,-0.015],[0.39,0.29,0.31],top);
    block(head,'Square crown',[0,0.132,-0.018],[0.30,0.055,0.285],top);
    block(head,'Left pixel temple',[-0.19,0.025,-0.005],[0.045,0.18,0.25],top);
    block(head,'Right pixel temple',[0.19,0.025,-0.005],[0.045,0.18,0.25],top);
    block(head,'Wide square cheek block',[0,-0.04,0.01],[0.405,0.19,0.28],top);
    const earStyle=options.earStyle??Math.floor(random()*3);
    for(const side of [-1,1]) {
        const earScale=earStyle===1?[0.105,0.082,0.125]:earStyle===2?[0.145,0.045,0.082]:[0.125,0.052,0.105];
        const ear=block(head,earStyle===1?'Upright square ear':earStyle===2?'Wide low square ear':'Low folded square ear',[side*(earStyle===2?0.17:0.168),0.092,-0.018],earScale,breed.pattern==='point'?dark:fur);
        ear.setRotationFromEuler(earStyle===1?-3:earStyle===2?22:12,side*(earStyle===1?3:8),-side*(earStyle===2?12:22));
        const inner=block(ear,'Folded ear inner',[0,-0.003,0.055],[0.068,0.022,0.009],breed.pattern==='point'?top:'#B98B78');
        inner.setRotationFromEuler(0,0,side*8);
    }
    const mouth=new Node('Chewing mouth pivot');head.addChild(mouth);
    const eyeScaleX=0.92+random()*0.16,eyeScaleY=0.90+random()*0.20,eyeSpacing=0.96+random()*0.08,mouthScale=0.88+random()*0.24;
    const eyeSize=(s:number[])=>[s[0]*eyeScaleX,s[1]*eyeScaleY,s[2]];
    {
        if(breed.pattern==='point')block(head,'Point face mask',[0,-0.008,0.136],[0.28,0.21,0.017],dark);
        for(const side of [-1,1]) {
            const eyeX=side*0.098*eyeSpacing, socket=breed===BREEDS[0]?'#9B8059':dark;
            // Stepped pixel silhouette follows the reference photo's large, nearly round eyes.
            block(head,'Pixel eye socket centre',[eyeX,0.029,0.159],eyeSize([0.092,0.073,0.021]),socket);
            block(head,'Pixel eye socket top',[eyeX,0.072,0.159],eyeSize([0.060,0.016,0.021]),socket);
            block(head,'Pixel eye socket bottom',[eyeX,-0.014,0.159],eyeSize([0.060,0.016,0.021]),socket);
            block(head,'Pixel iris centre',[eyeX,0.031,0.175],eyeSize([0.074,0.060,0.018]),breed.eye);
            block(head,'Pixel iris cap',[eyeX,0.067,0.175],eyeSize([0.048,0.013,0.018]),breed.eye);
            block(head,'Pixel pupil centre',[eyeX,0.031,0.187],eyeSize([0.059,0.058,0.014]),'#17191D');
            block(head,'Pixel pupil cap',[eyeX,0.066,0.187],eyeSize([0.038,0.012,0.014]),'#17191D');
            block(head,'Square catchlight',[eyeX-side*0.015,0.054,0.196],eyeSize([0.013,0.014,0.009]),'#F5F0DD');
            const lid=block(head,'Low pixel eyelid',[eyeX,0.082,0.189],eyeSize([0.091,0.014,0.014]),breed.pattern==='point'?dark:top);lid.setRotationFromEuler(0,0,side*6);
            const muzzleColor=breed===BREEDS[0]?'#D9BB85':cream;
            block(head,'Square muzzle lobe',[side*0.050,-0.067,0.159],[0.116,0.068,0.052],muzzleColor);
            block(head,'Lower muzzle pixel',[side*0.037,-0.103,0.166],[0.081,0.031,0.046],muzzleColor);
            const mouthLine=block(mouth,'Pixel closed mouth',[side*0.022,-0.108,0.185],[0.038,0.005,0.008],'#765844');mouthLine.setRotationFromEuler(0,0,side*7);
            for(let w=0;w<3;w++){
                const whisker=block(head,'Pixel whisker',[side*(0.14+w*0.028),-0.055-w*0.021,0.181],[0.085,0.006,0.006],'#E9E0CA');
                whisker.setRotationFromEuler(0,0,side*(8+w*5));
            }
        }
        block(head,'Pixel nose bridge',[0,-0.045,0.186],[0.036,0.013,0.016],'#B68472');
        block(head,'Wide pink nose base',[0,-0.061,0.188],[0.054,0.018,0.016],'#A67464');
        block(head,'Nose line',[0,-0.086,0.19],[0.005,0.029,0.008],'#765844');
        block(mouth,'Square chin',[0,-0.126,0.157],[0.105,0.035,0.047],breed===BREEDS[0]?'#CFB481':cream);
    }
    if(breed.markingMode==='fixed')addFixedHeadMarkings(head,block,breed);
    else addHeadMarkings(head,block,breed,random,markingStyle(breed,seed));
    // Small breed-aware face flecks vary per cat while leaving the eyes and muzzle readable.
    if(random()<0.72)for(const side of [-1,1])block(head,'Random cheek fleck',[side*(0.17+random()*0.018),-0.055-random()*0.025,0.145],[0.022+random()*0.018,0.012,0.010],dark);
    const legs:Node[]=[],claws:Node[]=[];
    for(const x of [-0.115,0.115])for(const z of [-0.27,0.27]) {
        const joint=new Node('Hip shoulder pivot');body.addChild(joint);joint.setPosition(x,-0.07,z);legs.push(joint);
        block(joint,'Long block leg',[0,-0.19,0],[0.085,0.38,0.10],breed.pattern==='point'?dark:fur);
        block(joint,'Square paw',[0,-0.405,0.018],[0.10,0.05,0.135],cream);
        // Three small pixel claws sit on the front edge of every paw.  They
        // inherit the shoulder rotation, so the forepaws visibly fan out in
        // the hiss pose instead of reading as a single square block.
        for(const clawX of [-0.032,0,0.032]) {
            const claw=block(joint,'Pixel claw',[clawX,-0.414,0.101],[0.016,0.018,0.052],breed.pattern==='point'?top:'#F3EBDD');
            claws.push(claw);
        }
        for(let j=0;j<3;j++)block(joint,'Leg marking',[0,-0.09-j*0.08,0.052],[0.088,0.027,0.009],dark);
    }
    const tail=new Node('Tail base');body.addChild(tail);tail.setPosition(0,0.015,-0.405);
    const tailSegments:Node[]=[];
    for(let j=0;j<7;j++){
        const segmentColor=breed.pattern==='point'?dark:(j===6?top:j%3===2?dark:fur);
        const segment=block(tail,'Tail segment '+j,[0,0,-0.035-j*0.075],[0.055,0.055,0.09],segmentColor);tailSegments.push(segment);
    }
    block(tail,'Raised tail tip',[0,0.036,-0.57],[0.055,0.11,0.055],top);
    return {body,head,mouth,mouthScale,legs,tail,tailSegments,claws,torso,arch:0,bodyScale};
}

export function poseVoxelCat(rig:VoxelRig,state:CatState,time:number,dt=1,headYaw=0,fightRoll=1,tailRate=1,healSitting=false,fightStyle=0,tailPhase=0) {
    const hiss=state==='Hiss',fight=state==='Fight',heal=state==='Heal',strut=state==='Strut',leap=state==='Leap',threat=state==='Threat',run=state==='Run',crouch=state==='Crouch',lie=state==='Lie';
    const hissArch=hiss?(rig.hissArch??0.31):0;
    // Roll about the torso centre; the lower flank rests just above the ground.
    rig.body.setPosition(0,leap?0.72:strut?0.57:threat?0.50:fight?(fightStyle===1?0.42:fightStyle===3?0.27:0.15):hiss?0.43+hissArch*0.097:heal&&healSitting?0.31:crouch?0.29:lie?0.16:0.43,heal&&healSitting?-0.18:lie?-0.08:0);
    // In the body-embrace fight, each cat lies onto the flank facing the
    // other cat: the lower belly turns inward, so the pair is belly-to-belly
    // instead of back-to-back.
    rig.body.setRotationFromEuler(strut?-62:leap?-12:threat?-18:heal&&healSitting?-28:crouch?10:0,0,fight?(fightStyle===1?0:fightStyle===3?-82*fightRoll:90*fightRoll):0);
    rig.body.setScale(rig.bodyScale[0],rig.bodyScale[1],rig.bodyScale[2]);
    // State changes snap directly so confrontation and fighting have no blend pose.
    rig.arch=hissArch;
    rig.setArch?.(rig.arch);
    const archRatio=rig.arch/0.31;
    rig.head.setPosition(0,(crouch?-0.07:lie?-0.11:0.01)-0.17*archRatio,0.45);
    const activeHeadYaw=strut?(rig.strutHeadYaw??0):fight&&fightStyle===3?fightRoll*38:headYaw;
    rig.head.setRotationFromEuler((crouch?12:lie?22:fight&&fightStyle===3?18:30)*archRatio,activeHeadYaw,-Math.sign(activeHeadYaw)*9*archRatio);
    const chew=heal?0.72+Math.abs(Math.sin(time*7))*0.42:1;
    rig.mouth.setScale(rig.mouthScale,rig.mouthScale*chew,rig.mouthScale);
    rig.mouth.setPosition(0,heal?Math.sin(time*7)*0.006:0,0);
    rig.legs.forEach((joint,i)=> {
        // 7 complete fore/aft cycles per second, all four legs stay active.
        const phase=(i===0||i===3)?0:Math.PI;
        const front=i%2===1;
        const sideKick=fightStyle===2?Math.sin(time*Math.PI*12+phase)*76:0;
        const humanStep=front?(rig.strutArmPitches?.[i]??-18):62+Math.sin(time*14+phase)*34;
        const swing=threat?(front?-76:0):lie?0:crouch?(front?-24:18):fight?(fightStyle===2?sideKick:fightStyle===3?(front?-58+Math.sin(time*Math.PI*9+phase)*9:16+Math.sin(time*Math.PI*12+phase)*20):fightStyle===1?(front?-72+Math.sin(time*Math.PI*7+phase)*12:18+Math.sin(time*Math.PI*10+phase)*34):(front?-58+Math.sin(time*Math.PI*8+phase)*14:Math.sin(time*Math.PI*14+phase)*72)):leap?52+Math.sin(time*18+phase)*12:strut?humanStep:run?Math.sin(time*16+phase)*42:state==='Walk'?Math.sin(time*11+phase)*30:hiss?(front?-24:11):heal&&healSitting?(front?-7:-62):0;
        // In the threat pose the paws fan away from the centreline.  With the
        // current left/right joint convention the left paw needs -Z rotation
        // and the right paw +Z rotation; the reverse would cross them.
        const embrace=threat&&front?(i===1?-48:48):fight&&front&&fightStyle!==2?(fightStyle===3?(i===1?-52:52):(i<2?-32:32)):0;
        const armSpread=strut&&front?(rig.strutArmSpreads?.[i]??0):0;
        const pawSpread=hiss?(front?(i===1?-30:30):(i===0?-10:10)):strut?armSpread:embrace;
        joint.setRotationFromEuler(swing,0,pawSpread);
    });
    rig.tail.setRotationFromEuler(hiss?-62:strut?28:leap?18:0,hiss?Math.sin(time*tailRate+tailPhase)*42:run?Math.sin(time*5+tailPhase)*20:state==='Walk'?Math.sin(time*3+tailPhase)*12:fight?Math.sin(time*3)*6:0,0);
    rig.tailSegments.forEach((segment,i)=>{const spread=hiss?Math.sin(time*tailRate+tailPhase+i*0.58)*(8+i*4):run?Math.sin(time*5+tailPhase+i*0.6)*(5+i*2):state==='Walk'?Math.sin(time*3+tailPhase+i*0.5)*(3+i*1.2):0;segment.setRotationFromEuler(0,spread,0);});
}





