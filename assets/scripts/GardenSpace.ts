export interface Position {x:number;z:number;}
export const HISS_DISTANCE=1.5;
export const FIGHT_DISTANCE=0.58;
/** Symmetric approach/retreat with a bounded speed. Root distance, in metres. */
export function pairSpacing(a:Position,b:Position,target:number,dt:number,speed=0.65) {
    let dx=b.x-a.x,dz=b.z-a.z;let distance=Math.sqrt(dx*dx+dz*dz);
    if(distance<0.0001){dx=1;dz=0;distance=1;}
    const error=Math.sqrt((b.x-a.x)**2+(b.z-a.z)**2)-target;
    const move=Math.max(-dt*speed,Math.min(dt*speed,error/2));
    const x=dx/distance*move,z=dz/distance*move;
    return {a:{x:a.x+x,z:a.z+z},b:{x:b.x-x,z:b.z-z}};
}
