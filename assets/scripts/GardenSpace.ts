export interface Position {x:number;z:number;}
export const HISS_DISTANCE=1.28;
export const HISS_DISTANCE_MIN=1.12;
export const HISS_DISTANCE_MAX=1.40;
// The manual ground-paw threat is a short lunge: it is allowed only when the
// two cats are already close enough to see the action clearly.
export const THREAT_TRIGGER_DISTANCE=2.25;
export const THREAT_SPEED=10;
export const THREAT_STOP_DISTANCE=0.72;
export const THREAT_DURATION=0.28;
// Roots stay far enough apart that the heads meet while both cats face inward.
// Keep the grapple close while leaving a readable gap between the two square
// faces.  The old value put the head meshes through each other.
export const FIGHT_DISTANCE=1.08;
/** Symmetric approach/retreat with a bounded speed. Root distance, in metres. */
export function pairSpacing(a:Position,b:Position,target:number,dt:number,speed=0.65) {
    let dx=b.x-a.x,dz=b.z-a.z;let distance=Math.sqrt(dx*dx+dz*dz);
    if(distance<0.0001){dx=1;dz=0;distance=1;}
    const error=Math.sqrt((b.x-a.x)**2+(b.z-a.z)**2)-target;
    const move=Math.max(-dt*speed,Math.min(dt*speed,error/2));
    const x=dx/distance*move,z=dz/distance*move;
    return {a:{x:a.x+x,z:a.z+z},b:{x:b.x-x,z:b.z-z}};
}
