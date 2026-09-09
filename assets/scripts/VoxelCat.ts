import { Node } from 'cc';
import { Breed, BREEDS } from './CatBreeds';
import { CatState } from './CatRules';

export type BlockFactory = (parent: Node, name: string, position: number[], scale: number[], color: string, round?:boolean) => Node;
export interface VoxelRig { body: Node; head: Node; legs: Node[]; tail: Node; torso: Node; arch: number; setArch?: (amount:number)=>void; }

/** All limbs rotate at their shoulder/hip, never around the centre of a paw. */
export function createVoxelCat(root: Node, block: BlockFactory, breed: Breed = BREEDS[0]): VoxelRig {
    const {fur,top,dark,cream}=breed;
    const body=new Node('Torso roll pivot'); root.addChild(body); body.setPosition(0,0.36,0);
    const torso=block(body,'Continuous torso',[0,0,0],[1,1,1],fur);
    const head=new Node('Wide folded-ear head');body.addChild(head);head.setPosition(0,0.01,0.45);
    block(head,'Head core',[0,0,-0.015],[0.37,0.295,0.31],top,true);
    block(head,'Wide cheeks',[0,-0.016,0.01],[0.385,0.19,0.28],top,true);
    for(const side of [-1,1]) {
        const ear=block(head,'Low folded ear',[side*0.143,0.081,-0.01],[0.094,0.038,0.105],breed.pattern==='point'?dark:fur,true);
        ear.setRotationFromEuler(14,0,-side*12);
    }
    {
        if(breed.pattern==='point')block(head,'Point face mask',[0,-0.008,0.136],[0.28,0.21,0.017],dark);
        for(const side of [-1,1]) {
            const eyeX=side*0.093, socket=breed===BREEDS[0]?'#A88A5E':dark;
            // Stepped pixel silhouette follows the reference photo's large, nearly round eyes.
            block(head,'Pixel eye socket centre',[eyeX,0.024,0.159],[0.074,0.058,0.021],socket);
            block(head,'Pixel eye socket top',[eyeX,0.059,0.159],[0.052,0.014,0.021],socket);
            block(head,'Pixel eye socket bottom',[eyeX,-0.011,0.159],[0.052,0.014,0.021],socket);
            block(head,'Pixel iris centre',[eyeX,0.023,0.174],[0.058,0.048,0.018],breed.eye);
            block(head,'Pixel iris cap',[eyeX,0.052,0.174],[0.038,0.012,0.018],breed.eye);
            block(head,'Pixel pupil centre',[eyeX,0.021,0.186],[0.040,0.047,0.014],'#202126');
            block(head,'Pixel pupil cap',[eyeX,0.050,0.186],[0.026,0.011,0.014],'#202126');
            block(head,'Square catchlight',[eyeX-side*0.012,0.042,0.195],[0.010,0.011,0.009],'#F5F0DD');
            const lid=block(head,'Low pixel eyelid',[eyeX,0.067,0.189],[0.076,0.014,0.014],breed.pattern==='point'?dark:top);lid.setRotationFromEuler(0,0,side*7);
            block(head,'Cream muzzle',[side*0.045,-0.062,0.157],[0.101,0.059,0.054],breed===BREEDS[0]?'#D9BB85':cream,true);
            const mouth=block(head,'Pixel closed mouth',[side*0.021,-0.094,0.185],[0.035,0.005,0.008],'#765844');mouth.setRotationFromEuler(0,0,side*7);
        }
        block(head,'Pixel nose bridge',[0,-0.046,0.186],[0.030,0.012,0.016],'#A47A64');
        block(head,'Pixel nose base',[0,-0.059,0.188],[0.044,0.014,0.016],'#98705A');
        block(head,'Nose line',[0,-0.078,0.19],[0.005,0.024,0.008],'#765844');
    }
    if(breed.pattern==='stripe') {
        for(const x of [-0.055,0,0.055]) {
            const stripe=block(head,'Forehead tabby marking',[x,0.105,0.115],[0.019,0.06,0.013],fur,true);
            stripe.setRotationFromEuler(-18,0,x*160);
        }
        for(const side of [-1,1])for(let i=0;i<2;i++) {
            const stripe=block(head,'Cheek marking',[side*0.154,-0.025-i*0.025,0.09],[0.043,0.015,0.009],fur,true);
            stripe.setRotationFromEuler(0,side*30,side*8);
        }
    }
    const legs:Node[]=[];
    for(const x of [-0.115,0.115])for(const z of [-0.27,0.27]) {
        const joint=new Node('Hip shoulder pivot');body.addChild(joint);joint.setPosition(x,-0.07,z);legs.push(joint);
        block(joint,'Straight block leg',[0,-0.13,0],[0.085,0.26,0.10],breed.pattern==='point'?dark:fur);
        block(joint,'Square paw',[0,-0.265,0.018],[0.10,0.05,0.135],cream);
        for(let j=0;j<2;j++)block(joint,'Leg marking',[0,-0.09-j*0.075,0.052],[0.088,0.027,0.009],dark);
    }
    const tail=new Node('Tail base');body.addChild(tail);tail.setPosition(0,0.015,-0.405);
    block(tail,'Long thin square tail',[0,0,-0.21],[0.055,0.055,0.43],breed.pattern==='point'?dark:fur);
    block(tail,'Raised tail tip',[0,0.036,-0.445],[0.055,0.11,0.055],top);
    for(let j=0;j<4;j++)block(tail,'Tail band',[0,0,-0.08-j*0.095],[0.059,0.059,0.024],dark);
    return {body,head,legs,tail,torso,arch:0};
}

export function poseVoxelCat(rig:VoxelRig,state:CatState,time:number,dt=1) {
    const hiss=state==='Hiss',fight=state==='Fight';
    // Roll about the torso centre; the lower flank rests just above the ground.
    rig.body.setPosition(0,fight?0.165:0.36,0);
    rig.body.setRotationFromEuler(0,0,fight?90:0);
    rig.body.setScale(1,1,1);
    rig.arch+=((hiss?0.23:0)-rig.arch)*Math.min(1,dt*12);
    rig.setArch?.(rig.arch);
    rig.head.setPosition(0,0.01-0.125*rig.arch/0.23,0.45);
    rig.head.setRotationFromEuler(24*rig.arch/0.23,0,0);
    rig.legs.forEach((joint,i)=> {
        // 7 complete fore/aft cycles per second, all four legs stay active.
        const phase=(i===0||i===3)?0:Math.PI;
        const swing=fight?Math.sin(time*Math.PI*14+phase)*62:state==='Walk'?Math.sin(time*9+phase)*24:0;
        joint.setRotationFromEuler(swing,0,hiss?(i<2?-9:9):0);
    });
    rig.tail.setRotationFromEuler(hiss?-62:0,Math.sin(time*3)*(fight?6:12),0);
}





