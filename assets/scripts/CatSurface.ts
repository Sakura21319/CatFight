/** One closed, connected skin. Rings share vertices; no separate torso blocks. */
export function torsoGeometry(arch: number) {
    const positions:number[]=[], normals:number[]=[], uvs:number[]=[], indices:number[]=[];
    const ring=[[0.112,-0.125],[0.14,-0.097],[0.14,0.097],[0.112,0.125],[-0.112,0.125],[-0.14,0.097],[-0.14,-0.097],[-0.112,-0.125]];
    for(let i=0;i<=8;i++) {
        const t=i/8, lift=arch*Math.sin(Math.PI*t);
        for(const [x,y] of ring){positions.push(x,y+lift,(t-0.5)*0.8);normals.push(x/0.14,y/0.125,-arch*Math.PI/0.8*Math.cos(Math.PI*t));uvs.push(t,ring.findIndex(p=>p[0]===x&&p[1]===y)/8);}
    }
    for(let i=0;i<8;i++)for(let j=0;j<8;j++){
        const a=i*8+j,b=i*8+(j+1)%8,c=b+8,d=a+8;indices.push(a,b,c,a,c,d);
    }
    for(let j=1;j<7;j++){indices.push(0,j+1,j);indices.push(64,64+j,64+j+1);}
    return {positions,normals,uvs,indices};
}


