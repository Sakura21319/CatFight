import { _decorator, Component, Node, Camera, Color, Material, Mesh, MeshRenderer, Texture2D, primitives, utils, Vec3, input, Input, EventTouch, EventMouse, geometry, Canvas, UITransform, Label, Layers, view } from 'cc';
import { CatState, proximityGroups } from './CatRules';
import { torsoGeometry } from './CatSurface';
import { createVoxelCat, poseVoxelCat, VoxelRig } from './VoxelCat';
import { BREEDS, coatPixels } from './CatBreeds';
import { pairSpacing, HISS_DISTANCE, FIGHT_DISTANCE } from './GardenSpace';
import { CatEnvironment } from './CatEnvironment';
import { GardenAudio } from './GardenAudio';
const { ccclass } = _decorator;
interface Cat extends VoxelRig { root:Node; state:CatState; timer:number; target:Vec3; breed:number; coat:Material; texture:Texture2D; }

@ccclass('CatGarden')
export class CatGarden extends Component {
    private cats:Cat[]=[];
    private camera!:Camera;
    private status!:Label;
    private mats=new Map<string,Material>();
    private skins=new Map<number,Mesh>();
    private sharedBox!:Mesh;
    private sharedRound!:Mesh;
    private clock=0;
    private selected=0;
    private closeup=false;
    private lastTouch=-100;
    private ui!:Node;
    private environment!:CatEnvironment;
    private sound!:GardenAudio;
    private yaw=0.45;
    private elevation=0.63;
    private zoom=5.5;
    private pointer:{x:number;y:number;lastX:number;lastY:number;dragged:boolean}|null=null;
    private readonly radius=1.9;

    start(){
        this.sharedBox=utils.createMesh(primitives.box());this.sharedRound=utils.createMesh(primitives.sphere(0.5,{segments:12}));
        const cam=new Node('Orbit camera');this.node.addChild(cam);this.camera=cam.addComponent(Camera);
        this.camera.clearColor=new Color(236,231,217);this.camera.projection=Camera.ProjectionType.ORTHO;this.camera.near=0.1;this.camera.far=60;
        this.environment=new CatEnvironment(this.node,(p,n,v,s,c)=>this.part(p,n,v,s,c));this.sound=new GardenAudio(this.node);
        this.makeUI();this.orbit();this.spawn(new Vec3(-0.7,0,0));
        input.on(Input.EventType.TOUCH_START,this.touchStart,this);input.on(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.on(Input.EventType.TOUCH_END,this.touchEnd,this);input.on(Input.EventType.TOUCH_CANCEL,this.cancel,this);
        input.on(Input.EventType.MOUSE_DOWN,this.mouseStart,this);input.on(Input.EventType.MOUSE_MOVE,this.mouseMove,this);input.on(Input.EventType.MOUSE_UP,this.mouseEnd,this);input.on(Input.EventType.MOUSE_WHEEL,this.wheel,this);
    }
    private material(hex:string){if(!this.mats.has(hex)){const m=new Material();m.initialize({effectName:'builtin-unlit'});m.setProperty('mainColor',new Color().fromHEX(hex));this.mats.set(hex,m);}return this.mats.get(hex)!;}
    private part(parent:Node,name:string,p:number[],s:number[],color:string,round=false){
        const n=new Node(name);parent.addChild(n);n.setPosition(p[0],p[1],p[2]);n.setScale(s[0],s[1],s[2]);
        const r=n.addComponent(MeshRenderer);r.mesh=round?this.sharedRound:this.sharedBox;r.setMaterial(this.material(color),0);return n;
    }
    private spawn(pos:Vec3){
        if(this.cats.length>=48)return;
        const breed=BREEDS[this.selected],root=new Node(breed.name);this.node.addChild(root);root.setPosition(pos);
        const rig=createVoxelCat(root,(p,n,v,s,c,round)=>this.part(p,n,v,s,c,round),breed);
        const renderer=rig.torso.getComponent(MeshRenderer)!;
        const texture=new Texture2D();texture.reset({width:64,height:64,format:Texture2D.PixelFormat.RGBA8888});texture.uploadData(coatPixels(breed,Math.floor(Math.random()*0xffffffff)));
        const coat=new Material();coat.initialize({effectName:'builtin-unlit',defines:{USE_TEXTURE:true}});coat.setProperty('mainTexture',texture);renderer.setMaterial(coat,0);
        rig.setArch=(amount:number)=>{amount=Math.round(amount/0.23*16)/16*0.23;if(!this.skins.has(amount))this.skins.set(amount,utils.createMesh(torsoGeometry(amount)));renderer.mesh=this.skins.get(amount)!;};rig.setArch(0);
        this.cats.push({root,...rig,state:'Idle',timer:1+Math.random()*2,target:pos.clone(),breed:this.selected,coat,texture});this.sound.play('place');
    }
    private text(parent:Node,name:string,value:string,y:number,size:number){
        const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.setPosition(0,y,0);n.addComponent(UITransform).setContentSize(710,46);
        const l=n.addComponent(Label);l.string=value;l.fontSize=size;l.lineHeight=size+8;l.color=new Color(66,70,53);return l;
    }
    private makeUI(){
        view.setDesignResolutionSize(750,1000,2);this.ui=new Node('Garden UI');this.node.addChild(this.ui);this.ui.layer=Layers.Enum.UI_2D;this.ui.addComponent(UITransform).setContentSize(750,1000);
        const canvas=this.ui.addComponent(Canvas),cn=new Node('UI Camera');this.ui.addChild(cn);cn.setPosition(0,0,1000);
        const c=cn.addComponent(Camera);c.projection=Camera.ProjectionType.ORTHO;c.orthoHeight=500;c.clearFlags=Camera.ClearFlag.DEPTH_ONLY;c.visibility=Layers.Enum.UI_2D;c.priority=10;c.far=2000;canvas.cameraComponent=c;
        this.text(this.ui,'Title','猫咪小院',435,34);this.text(this.ui,'Subtitle','轻点放猫 · 拖动旋转 · 滚轮缩放',389,19);
        this.button('切换场地',-255,()=>{this.environment.toggle();this.environment.view(this.yaw);},325);
        this.button('看猫脸',-85,()=>{if(!this.cats.length)this.spawn(new Vec3());this.closeup=!this.closeup;if(!this.closeup)this.orbit();},325);
        const audio=this.button('声音：关',85,()=>{this.sound.toggle();audio.string=this.sound.enabled?'【声音：开】':'【声音：关】';},325);
        this.button('清空',255,()=>this.clear(),325);
        this.button('双猫演示',-255,()=>this.demo(2),265);this.button('三猫演示',-85,()=>this.demo(3),265);
        this.button('向左转',85,()=>{this.closeup=false;this.yaw-=0.4;this.orbit();},265);this.button('向右转',255,()=>{this.closeup=false;this.yaw+=0.4;this.orbit();},265);
        this.status=this.text(this.ui,'Status','',-270,19);
        BREEDS.forEach((b,i)=>this.button(b.name,[-255,-85,85,255][i%4],()=>{this.selected=i;},i<4?-323:-376));
        this.button('拉近',-170,()=>{this.closeup=false;this.zoom=Math.max(1.5,this.zoom-0.7);this.orbit();},-432);
        this.button('全部品种',0,()=>{this.clear();for(let i=0;i<BREEDS.length;i++){this.selected=i;this.spawn(new Vec3((i%4-1.5)*2.2,0,(Math.floor(i/4)-0.5)*2.5));}this.selected=0;},-432);
        this.button('拉远',170,()=>{this.closeup=false;this.zoom=Math.min(9,this.zoom+0.7);this.orbit();},-432);
        this.text(this.ui,'Hint','每只猫花纹随机 · 最多 48 只 · 声音默认关闭',-480,16);
    }
    private button(title:string,x:number,action:()=>void,y:number){const l=this.text(this.ui,title,'【'+title+'】',y,19);l.node.setPosition(x,y,0);l.node.getComponent(UITransform)!.setContentSize(160,48);l.node.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;this.pointer=null;action();});return l;}
    private orbit(){this.camera.node.setPosition(Math.sin(this.yaw)*12,Math.tan(this.elevation)*12,Math.cos(this.yaw)*12);this.camera.node.lookAt(new Vec3(0,0.15,0));this.camera.orthoHeight=this.zoom;this.environment.view(this.yaw);}
    private clear(){this.closeup=false;this.orbit();for(const c of this.cats){c.root.destroy();c.coat.destroy();c.texture.destroy();}this.cats=[];}
    private demo(count:number){this.clear();this.zoom=3.4;this.orbit();this.spawn(new Vec3(-0.75,0,0));this.spawn(new Vec3(0.75,0,0));if(count===3)this.spawn(new Vec3(0,0,1.3));}
    private isWorld(x:number,y:number){const c=this.ui.getComponent(Canvas)!.cameraComponent!,p=this.ui.getComponent(UITransform)!.convertToNodeSpaceAR(c.screenToWorld(new Vec3(x,y,0)));return p.y>-235&&p.y<225;}
    private begin(x:number,y:number){if(this.isWorld(x,y)&&!this.closeup)this.pointer={x,y,lastX:x,lastY:y,dragged:false};}
    private move(x:number,y:number){const p=this.pointer;if(!p)return;if(Math.abs(x-p.x)+Math.abs(y-p.y)>8)p.dragged=true;if(p.dragged){this.yaw-=(x-p.lastX)*0.006;this.elevation=Math.max(0.3,Math.min(1.12,this.elevation+(y-p.lastY)*0.003));this.orbit();}p.lastX=x;p.lastY=y;}
    private end(x:number,y:number){const p=this.pointer;this.pointer=null;if(p&&!p.dragged)this.place(x,y);}
    private cancel(){this.pointer=null;}
    private touchStart(e:EventTouch){this.lastTouch=this.clock;const p=e.getLocation();this.begin(p.x,p.y);}
    private touchMove(e:EventTouch){const p=e.getLocation();this.move(p.x,p.y);}
    private touchEnd(e:EventTouch){this.lastTouch=this.clock;const p=e.getLocation();this.end(p.x,p.y);}
    private mouseStart(e:EventMouse){if(e.getButton()!==0||this.clock-this.lastTouch<0.4)return;const p=e.getLocation();this.begin(p.x,p.y);}
    private mouseMove(e:EventMouse){if(this.clock-this.lastTouch<0.4)return;const p=e.getLocation();this.move(p.x,p.y);}
    private mouseEnd(e:EventMouse){if(e.getButton()!==0||this.clock-this.lastTouch<0.4)return;const p=e.getLocation();this.end(p.x,p.y);}
    private wheel(e:EventMouse){if(this.closeup)return;this.zoom=Math.max(1.5,Math.min(9,this.zoom-e.getScrollY()*0.004));this.orbit();}
    private place(x:number,y:number){
        if(this.closeup||!this.isWorld(x,y))return;const ray=new geometry.Ray();this.camera.screenPointToRay(x,y,ray);const t=-ray.o.y/ray.d.y;if(t<=0)return;
        const p=new Vec3(ray.o.x+ray.d.x*t,0,ray.o.z+ray.d.z*t);if(Math.abs(p.x)>5.3||Math.abs(p.z)>4.3||this.cats.some(c=>Vec3.distance(c.root.position,p)<0.65))return;this.spawn(p);
    }
    private clamp(c:Cat){const p=c.root.position;c.root.setPosition(Math.max(-5.3,Math.min(5.3,p.x)),0,Math.max(-4.3,Math.min(4.3,p.z)));}
    update(dt:number){
        dt=Math.min(dt,0.05);this.clock+=dt;
        if(this.closeup&&this.cats.length){const c=this.cats[0];c.root.setRotationFromEuler(0,0,0);poseVoxelCat(c,'Idle',this.clock);const p=c.root.position;this.camera.node.setPosition(p.x+0.16,p.y+0.49,p.z+2);this.camera.node.lookAt(new Vec3(p.x,p.y+0.39,p.z+0.4));this.camera.orthoHeight=0.55;this.status.string=BREEDS[c.breed].name+' · 神态近景';return;}
        const groups=proximityGroups(this.cats.map(c=>c.root.position),this.radius);
        for(const ids of groups){
            const group=ids.map(i=>this.cats[i]);
            if(group.length>=3){
                for(const c of group){c.state='Hiss';c.timer=1;this.face(c,group.find(o=>o!==c)!.root.position);}
                for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)if(Vec3.distance(group[i].root.position,group[j].root.position)<1.35)this.space(group[i],group[j],1.35,dt*0.45);
            }else if(group.length===2){
                const [a,b]=group;
                if(a.state!==b.state||['Hiss','Fight','Recover'].indexOf(a.state)<0){a.state=b.state='Hiss';a.timer=b.timer=2+Math.random()*2;this.sound.play('hiss');}
                a.timer-=dt;b.timer=a.timer;
                if(a.timer<=0){const next:CatState=a.state==='Fight'?'Recover':a.state==='Recover'?'Hiss':Math.random()<0.7?'Fight':'Hiss';a.state=b.state=next;a.timer=b.timer=next==='Fight'?3:next==='Recover'?1.3:2.5;this.sound.play(next==='Fight'?'fight':'hiss');}
                this.space(a,b,a.state==='Fight'?FIGHT_DISTANCE:HISS_DISTANCE,dt,a.state==='Fight'?1.45:0.65);this.face(a,b.root.position);this.face(b,a.root.position);
                if(a.state==='Fight'){a.root.setRotationFromEuler(0,a.root.eulerAngles.y-90,0);b.root.setRotationFromEuler(0,b.root.eulerAngles.y-90,0);}
            }else{
                const c=group[0];if(['Idle','Walk'].indexOf(c.state)<0){c.state='Idle';c.timer=1.5;}c.timer-=dt;
                if(c.timer<=0){c.state=c.state==='Idle'?'Walk':'Idle';c.timer=1.5+Math.random()*3;c.target.set((Math.random()-0.5)*10.2,0,(Math.random()-0.5)*8.2);}
                if(c.state==='Walk'){this.face(c,c.target);const d=Vec3.subtract(new Vec3(),c.target,c.root.position);if(d.length()>0.08){d.normalize().multiplyScalar(dt*0.3);c.root.setPosition(Vec3.add(d,c.root.position,d));}else c.timer=0;}
            }
        }
        for(const c of this.cats){this.clamp(c);poseVoxelCat(c,c.state,this.clock,dt);}
        const fighting=this.cats.some(c=>c.state==='Fight');this.status.string=`${this.environment.isCage?'白笼（近侧隐藏）':'大庭院'} · ${BREEDS[this.selected].name}已选 · ${this.cats.length}只 · ${fighting?'贴近缠斗':this.cats.some(c=>c.state==='Hiss')?'保持距离对峙':'悠闲散步'}`;
    }
    private space(a:Cat,b:Cat,target:number,dt:number,speed=0.65){const p=pairSpacing(a.root.position,b.root.position,target,dt,speed);a.root.setPosition(p.a.x,0,p.a.z);b.root.setPosition(p.b.x,0,p.b.z);}
    private face(c:Cat,p:Readonly<Vec3>){const d=Vec3.subtract(new Vec3(),p,c.root.position);c.root.setRotationFromEuler(0,Math.atan2(d.x,d.z)*180/Math.PI,0);}
    onDestroy(){
        input.off(Input.EventType.TOUCH_START,this.touchStart,this);input.off(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.off(Input.EventType.TOUCH_END,this.touchEnd,this);input.off(Input.EventType.TOUCH_CANCEL,this.cancel,this);
        input.off(Input.EventType.MOUSE_DOWN,this.mouseStart,this);input.off(Input.EventType.MOUSE_MOVE,this.mouseMove,this);input.off(Input.EventType.MOUSE_UP,this.mouseEnd,this);input.off(Input.EventType.MOUSE_WHEEL,this.wheel,this);
        for(const c of this.cats){c.coat.destroy();c.texture.destroy();}for(const m of this.mats.values())m.destroy();for(const m of this.skins.values())m.destroy();this.sharedBox?.destroy();this.sharedRound?.destroy();
    }
}

