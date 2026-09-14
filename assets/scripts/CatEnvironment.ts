import { Node } from 'cc';
import { BlockFactory } from './VoxelCat';

export class CatEnvironment {
    private garden:Node;
    private cage:Node;
    private walls:{node:Node;x:number;z:number}[]=[];
    public isCage=false;
    constructor(parent:Node,block:BlockFactory) {
        this.garden=new Node('Expanded garden');parent.addChild(this.garden);
        block(this.garden,'Sand floor',[0,-0.1,0],[12,0.18,10],'#D3C3A6');
        for(let x=-6;x<=6;x++)block(this.garden,'Floor seam',[x,-0.004,0],[0.012,0.008,10],'#BDAD91');
        for(let z=-5;z<=5;z++)block(this.garden,'Floor seam',[0,-0.004,z],[12,0.008,0.012],'#BDAD91');
        for(const x of [-6,6])block(this.garden,'Garden border',[x,0.08,0],[0.12,0.28,10.1],'#77856A');
        for(const z of [-5,5])block(this.garden,'Garden border',[0,0.08,z],[12,0.28,0.12],'#77856A');
        this.cage=new Node('White cage');parent.addChild(this.cage);this.cage.active=false;
        block(this.cage,'White tray',[0,-0.11,0],[12,0.2,10],'#E4E7E7');
        block(this.cage,'Soft pad',[0,0.001,0],[11.65,0.015,9.65],'#CBD3D5');
        for(const side of [-1,1]) {
            const wallX=new Node('Cage X bars');this.cage.addChild(wallX);this.walls.push({node:wallX,x:side,z:0});
            const wallZ=new Node('Cage Z bars');this.cage.addChild(wallZ);this.walls.push({node:wallZ,x:0,z:side});
            for(let z=-5;z<=5;z+=0.4)block(wallX,'White vertical bar',[side*6,1.2,z],[0.045,2.4,0.045],'#F5F5EF');
            for(let x=-6;x<=6;x+=0.4)block(wallZ,'White vertical bar',[x,1.2,side*5],[0.045,2.4,0.045],'#F5F5EF');
            for(const y of [0.08,1.25,2.4]){
                block(wallX,'Horizontal rail',[side*6,y,0],[0.08,0.06,10.05],'#FAFAF4');
                block(wallZ,'Horizontal rail',[0,y,side*5],[12.05,0.06,0.08],'#FAFAF4');
            }
            block(this.cage,'Tray edge',[side*6,0.07,0],[0.13,0.2,10],'#F2F3EF');
            block(this.cage,'Tray edge',[0,0.07,side*5],[12,0.2,0.13],'#F2F3EF');
        }
        block(this.cage,'Rest mat',[-4.8,0.025,-3.8],[1.4,0.04,1.1],'#A7B8BB');
    }
    toggle(){this.isCage=!this.isCage;this.garden.active=!this.isCage;this.cage.active=this.isCage;}
    setWorldVisible(visible:boolean){
        this.garden.active=visible&&!this.isCage;
        this.cage.active=visible&&this.isCage;
    }
    view(yaw:number){for(const wall of this.walls)wall.node.active=wall.x*Math.sin(yaw)+wall.z*Math.cos(yaw)<0.1;}
}
