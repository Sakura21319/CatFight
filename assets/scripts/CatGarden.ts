import { _decorator, Component, Node, Camera, Color, Material, Mesh, MeshRenderer, Texture2D, Sprite, SpriteFrame, Rect, Size, assetManager, primitives, utils, Vec3, input, Input, EventTouch, EventMouse, EventKeyboard, KeyCode, geometry, Canvas, UITransform, Label, Layers, view, Graphics } from 'cc';
import { CatState, proximityGroups } from './CatRules';
import { torsoGeometry } from './CatSurface';
import { createVoxelCat, poseVoxelCat, VoxelRig, BODY_TYPES } from './VoxelCat';
import { BREEDS, Breed, coatPixels } from './CatBreeds';
import { pairSpacing, HISS_DISTANCE, HISS_DISTANCE_MIN, HISS_DISTANCE_MAX, FIGHT_DISTANCE, THREAT_TRIGGER_DISTANCE, THREAT_SPEED, THREAT_STOP_DISTANCE, THREAT_DURATION } from './GardenSpace';
import { CatEnvironment } from './CatEnvironment';
import { GardenAudio } from './GardenAudio';
const { ccclass } = _decorator;
interface Cat extends VoxelRig { root:Node; state:CatState; timer:number; threatCooldown:number; threatTarget:Vec3|null; target:Vec3; breed:number; profile:Breed; bodyType:string; coat:Material; texture:Texture2D; headYaw:number; bodyOffset:number; looking:boolean; fightRoll:number; fightStyle:number; tailRate:number; tailPhase:number; hissDistance:number; health:number; maxHealth:number; healSitting:boolean; healFx:Node; healPluses:Node[]; healPlusBases:Vec3[]; roadExpression:RoadCatExpression; spriteNode?:Node; sprite?:Sprite; }
interface RoadCar { root:Node; speed:number; length:number; lane:number; frameIndex:number; vehicle:'car'|'truck'; knocked:boolean; crushTimer:number; spriteNode?:Node; sprite?:Sprite; }
interface RoadHole { node:Node; x:number; z:number; filled:boolean; }
type AppMode='MainMenu'|'Gallery'|'LevelMenu'|'Road'|'OldWu'|'Settings';
type RoadCatExpression='normal'|'hit'|'hiss';

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
    private closeup=false;
    private lastTouch=-100;
    private ui!:Node;
    private environment!:CatEnvironment;
    private sound!:GardenAudio;
    private mode:AppMode='MainMenu';
    private galleryNodes:Node[]=[];
    private buildingGallery=true;
    private levelMenu!:Node;
    private mainMenu!:Node;
    private settingsUi!:Node;
    private coverNode!:Node;
    private settingsBackdrop!:Node;
    private navigationUi!:Node;
    private navigationBackButton!:Node;
    private navigationSettingsButton!:Node;
    private navigationBackSprite!:Sprite;
    private navigationSettingsSprite!:Sprite;
    private settingsReturnMode:AppMode='MainMenu';
    private menuBackdropFrame:SpriteFrame|null=null;
    private mainCoverButtons:{node:Node;action:()=>void}[]=[];
    private settingsAudioLabel!:Label;
    private roadUi!:Node;
    private wuUi!:Node;
    private levelStatus!:Label;
    private roadStatus!:Label;
    private wuStatus!:Label;
    private roadCars:RoadCar[]=[];
    private roadHoles:RoadHole[]=[];
    private roadFilledHoles=0;
    private levelDecor:Node[]=[];
    private roadPlayer:Cat|null=null;
    private roadWon=false;
    private roadFailed=false;
    private roadPancake=false;
    private roadPancakeTarget:RoadHole|null=null;
    private roadHitDelay=0;
    private roadRushAvailable=true;
    private roadRushActive=false;
    private roadRushButton!:Node;
    private roadRushItemNode!:Node;
    private roadRushItemFrame:SpriteFrame|null=null;
    private roadRushRunFrames:SpriteFrame[]=[];
    private roadAbsorbBanner!:Node;
    private roadInstinctMoving=false;
    private roadLeftHeld=false;
    private roadRightHeld=false;
    private roadTouchDirection=0;
    private roadJoystick!:Node;
    private roadJoystickKnob!:Node;
    private roadJoystickPointerId=-1;
    private roadDialog!:Node;
    private roadDialogTitle!:Label;
    private roadDialogPrimary!:Label;
    private roadDialogSecondary!:Label;
    private roadDialogPrimaryAction:()=>void=()=>{};
    private roadDialogSecondaryAction:()=>void=()=>{};
    private roadInstinctStrength=0;
    private roadInstinctTargetX=0;
    private wuPlayer:Cat|null=null;
    private oldWu:Cat|null=null;
    private oldWuBreed:Breed={name:'老吴银渐层',fur:'#A7ADB1',top:'#D9DDE0',dark:'#687179',cream:'#E8EAEC',pattern:'stripe',eye:'#657985',markingMode:'fixed'};
    private oldWuAwake=false;
    private oldWuEyeTimer=2;
    private oldWuMeter=0;
    private oldWuPulse=0;
    private oldWuWon=false;
    private oldWuFailed=false;
    private yaw=0.45;
    // Keep the default gallery view flatter and closer to the 2D pixel-game
    // presentation while retaining a small orbit range for inspection.
    private elevation=0.98;
    private zoom=5.5;
    private pointer:{x:number;y:number;lastX:number;lastY:number;dragged:boolean}|null=null;
    private touchPoints=new Map<number,{x:number;y:number}>();
    private pinchDistance=0;
    private readonly radius=1.9;
    private previewFightStyle=0;
    private spriteRoot!:Node;
    private backgroundNode!:Node;
    private roadCatFrames:Record<RoadCatExpression,SpriteFrame|null>={normal:null,hit:null,hiss:null};
    private carTexture:Texture2D|null=null;
    private carFrames:SpriteFrame[][]=[];
    private truckTexture:Texture2D|null=null;
    private truckFrames:SpriteFrame[][]=[];
    private readonly uiWidth=1280;
    private readonly uiHeight=720;
    private readonly defaultCameraColor=new Color(236,231,217);
    private readonly settingsCameraColor=new Color(18,31,41);
    private readonly roadSpeed=3.8;
    private readonly roadInstinctSpeed=3.1;
    private readonly roadInstinctRange=3.4;
    private readonly roadJoystickRange=42;
    private readonly roadRushSpeed=5.6;
    private readonly use2D=true;

    start(){
        this.sharedBox=utils.createMesh(primitives.box());this.sharedRound=utils.createMesh(primitives.sphere(0.5,{segments:12}));
        const cam=new Node('Orbit camera');this.node.addChild(cam);this.camera=cam.addComponent(Camera);
        this.camera.clearColor=this.defaultCameraColor;this.camera.projection=Camera.ProjectionType.ORTHO;this.camera.near=0.1;this.camera.far=60;
        this.environment=new CatEnvironment(this.node,(p,n,v,s,c)=>this.part(p,n,v,s,c));this.sound=new GardenAudio(this.node);
        this.makeUI();this.load2DAssets();this.orbit();this.showModeUI();
        input.on(Input.EventType.TOUCH_START,this.touchStart,this);input.on(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.on(Input.EventType.TOUCH_END,this.touchEnd,this);input.on(Input.EventType.TOUCH_CANCEL,this.cancel,this);
        input.on(Input.EventType.MOUSE_DOWN,this.mouseStart,this);input.on(Input.EventType.MOUSE_MOVE,this.mouseMove,this);input.on(Input.EventType.MOUSE_UP,this.mouseEnd,this);input.on(Input.EventType.MOUSE_WHEEL,this.wheel,this);input.on(Input.EventType.KEY_DOWN,this.keyDown,this);input.on(Input.EventType.KEY_UP,this.keyUp,this);
    }
    private makeFrame(texture:Texture2D,x:number,y:number,w:number,h:number){
        const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(x,y,w,h);frame.originalSize=new Size(w,h);return frame;
    }
    private loadBundleAsset(bundleName:string,path:string,type:any,callback:any){
        const load=(bundle:any)=>bundle.load(path,type,callback);
        const existing=assetManager.getBundle(bundleName);
        if(existing){load(existing);return;}
        assetManager.loadBundle(bundleName,(error,bundle)=>{
            if(error||!bundle){callback(error||new Error('Bundle unavailable: '+bundleName));return;}
            load(bundle);
        });
    }
    private load2DAssets(){
        this.loadBundleAsset('road-scene','road-crosswalk/texture',Texture2D,(error:Error|null,texture:Texture2D)=>{
            if(error){console.warn('2D background unavailable',error);return;}
            texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);
            const sprite=this.backgroundNode.getComponent(Sprite)!;sprite.spriteFrame=this.makeFrame(texture,0,0,texture.width,texture.height);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.type=Sprite.Type.SIMPLE;
            this.applyModePresentation();
        });
        (['normal','hit','hiss'] as RoadCatExpression[]).forEach(expression=>{
            this.loadBundleAsset('road-cat','cat-road-'+expression+'/texture',Texture2D,(error:Error|null,texture:Texture2D)=>{
                if(error){console.warn(`Road cat ${expression} sprite unavailable`,error);return;}
                texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);
                this.roadCatFrames[expression]=this.makeFrame(texture,0,0,texture.width,texture.height);
                for(const cat of this.cats)this.setupCatSprite(cat);
            });
        });
        this.loadBundleAsset('road-cars','car-sprites/texture',Texture2D,(error:Error|null,texture:Texture2D)=>{
            if(error){console.warn('Car sprite sheet unavailable',error);return;}
            texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);this.carTexture=texture;this.carFrames=[];
            const frameWidth=texture.width/4,frameHeight=texture.height/2;
            for(let row=0;row<2;row++){const frames:SpriteFrame[]=[];for(let col=0;col<4;col++)frames.push(this.makeFrame(texture,col*frameWidth,texture.height-(row+1)*frameHeight,frameWidth,frameHeight));this.carFrames.push(frames);}
            for(const car of this.roadCars)this.setupCarSprite(car);
        });
        this.loadBundleAsset('road-cars','truck-sprites/texture',Texture2D,(error:Error|null,texture:Texture2D)=>{
            if(error){console.warn('Truck sprite sheet unavailable',error);return;}
            texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);this.truckTexture=texture;this.truckFrames=[];
            const frameWidth=texture.width/4,frameHeight=texture.height/2;
            for(let row=0;row<2;row++){const frames:SpriteFrame[]=[];for(let col=0;col<4;col++)frames.push(this.makeFrame(texture,col*frameWidth,texture.height-(row+1)*frameHeight,frameWidth,frameHeight));this.truckFrames.push(frames);}
            for(const car of this.roadCars)this.setupCarSprite(car);
        });
        this.loadBundleAsset('road-cat','honey-rush-item/texture',Texture2D,(error:Error|null,texture:Texture2D)=>{
            if(error){console.warn('Road rush item unavailable',error);return;}
            texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);this.roadRushItemFrame=this.makeFrame(texture,0,0,texture.width,texture.height);this.setupRoadRushItem();
        });
        this.loadBundleAsset('road-cat','haki-rush-run-approved/texture',Texture2D,(error:Error|null,texture:Texture2D)=>{
            if(error){console.warn('Road rush run sprites unavailable',error);return;}
            texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);this.roadRushRunFrames=[];const frameWidth=texture.width/3;for(let i=0;i<3;i++)this.roadRushRunFrames.push(this.makeFrame(texture,i*frameWidth,0,frameWidth,texture.height));
            for(const cat of this.cats)this.setupCatSprite(cat);
        });
        this.loadBundleAsset('menu-pack','main-cover-final/texture',Texture2D,(error:Error|null,texture:Texture2D)=>{
            if(error){console.warn('Final main cover unavailable',error);return;}
            texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);const sprite=this.coverNode.getComponent(Sprite)!;sprite.type=Sprite.Type.SIMPLE;sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=this.makeFrame(texture,0,0,texture.width,texture.height);this.setupMainCoverButtons();
        });
        this.loadBundleAsset('menu-pack','nav-back/texture',Texture2D,(error:Error|null,texture:Texture2D)=>{
            if(error){console.warn('Back navigation artwork unavailable',error);return;}
            texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);this.navigationBackSprite.spriteFrame=this.makeFrame(texture,0,0,texture.width,texture.height);
        });
        this.loadBundleAsset('menu-pack','nav-settings/texture',Texture2D,(error:Error|null,texture:Texture2D)=>{
            if(error){console.warn('Settings navigation artwork unavailable',error);return;}
            texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);this.navigationSettingsSprite.spriteFrame=this.makeFrame(texture,0,0,texture.width,texture.height);
        });
    }
    private applyMenuBackdrops(){}
    private setupMainCoverButtons(){
        for(const entry of this.mainCoverButtons){let art=entry.node.getChildByName('Cover button hit area');if(!art){art=new Node('Cover button hit area');art.layer=Layers.Enum.UI_2D;entry.node.addChild(art);art.addComponent(UITransform).setContentSize(456,112);const g=art.addComponent(Graphics);g.fillColor=new Color(0,0,0,1);g.rect(-228,-56,456,112);g.fill();art.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;entry.action();});art.on(Node.EventType.MOUSE_UP,(event:EventMouse)=>{event.propagationStopped=true;entry.action();});}}
    }
    private coverButton(x:number,y:number,action:()=>void){
        const label=this.button('',x,action,y,this.mainMenu,456,112);this.mainCoverButtons.push({node:label.node,action});this.setupMainCoverButtons();return label;
    }
    private setupCatSprite(cat:Cat){
        if(!this.spriteRoot)return;
        if(!cat.spriteNode){cat.spriteNode=new Node('Cat 2D sprite');cat.spriteNode.layer=Layers.Enum.UI_2D;this.spriteRoot.addChild(cat.spriteNode);cat.sprite=cat.spriteNode.addComponent(Sprite);cat.sprite.type=Sprite.Type.SIMPLE;cat.sprite.sizeMode=Sprite.SizeMode.CUSTOM;cat.spriteNode.getComponent(UITransform)!.setContentSize(116,116);}
        const frame=this.roadCatFrameFor(cat);
        if(frame)cat.sprite!.spriteFrame=frame;
        cat.spriteNode.active=this.mode==='Road';
    }
    private roadCatFrameFor(cat:Cat){
        if(cat.roadExpression==='hit')return this.roadCatFrames.hit;
        if(cat===this.roadPlayer&&this.roadRushActive&&this.roadRushRunFrames.length)return this.roadRushRunFrames[Math.floor(this.clock*7)%this.roadRushRunFrames.length];
        const hissing=cat.roadExpression==='hiss'||cat.state==='Hiss'||cat.state==='Threat';
        if(!hissing)return this.roadCatFrames.normal;
        // Hiss is an expression cycle: closed mouth, open mouth, closed mouth.
        // The two generated full-body frames stay aligned while the mouth visibly opens and closes.
        const phase=(this.clock*3.8)%1;
        return phase>0.24&&phase<0.76?this.roadCatFrames.hiss:this.roadCatFrames.normal;
    }
    private setupCarSprite(car:RoadCar){
        if(!this.spriteRoot)return;
        if(!car.spriteNode){car.spriteNode=new Node(car.vehicle==='truck'?'Truck 2D sprite':'Car 2D sprite');car.spriteNode.layer=Layers.Enum.UI_2D;this.spriteRoot.addChild(car.spriteNode);car.sprite=car.spriteNode.addComponent(Sprite);car.sprite.type=Sprite.Type.SIMPLE;car.sprite.sizeMode=Sprite.SizeMode.CUSTOM;car.spriteNode.getComponent(UITransform)!.setContentSize(car.vehicle==='truck'?116:94,car.vehicle==='truck'?150:124);}
        const frames=car.vehicle==='truck'?this.truckFrames:this.carFrames;
        if(frames.length){const row=car.speed>0?1:0;const frame=frames[row]?.[car.frameIndex];if(frame)car.sprite!.spriteFrame=frame;}
    }
    private setupRoadRushItem(){
        if(!this.roadRushItemNode||!this.roadRushItemFrame)return;
        const sprite=this.roadRushItemNode.getComponent(Sprite)!;sprite.spriteFrame=this.roadRushItemFrame;sprite.type=Sprite.Type.SIMPLE;sprite.sizeMode=Sprite.SizeMode.CUSTOM;this.roadRushItemNode.getComponent(UITransform)!.setContentSize(36,44);this.roadRushItemNode.active=this.mode==='Road';
    }
    private setupRoadAbsorbBanner(){
        if(!this.roadAbsorbBanner)return;
        const g=this.roadAbsorbBanner.addComponent(Graphics);g.fillColor=new Color(245,195,35,250);g.roundRect(-260,-48,520,96,18);g.fill();g.lineWidth=5;g.strokeColor=new Color(47,39,20,255);g.roundRect(-260,-48,520,96,18);g.stroke();
        const label=this.text(this.roadAbsorbBanner,'Absorb alert','⚠ 检测到轮胎  自动吸附 ⚠',0,34,false);label.color=new Color(36,34,26,255);label.outlineColor=new Color(255,246,183,255);label.outlineWidth=2;label.node.getComponent(UITransform)!.setContentSize(500,62);this.roadAbsorbBanner.active=false;
    }
    private worldToUi(world:Readonly<Vec3>,out=new Vec3()){
        const screen=this.camera.worldToScreen(world,out);const uiCamera=this.ui.getComponent(Canvas)!.cameraComponent!;return this.ui.getComponent(UITransform)!.convertToNodeSpaceAR(uiCamera.screenToWorld(new Vec3(screen.x,screen.y,0),out));
    }
    private updateCatSprites(){
        if(!this.spriteRoot)return;
        if(this.mode!=='Road'){for(const cat of this.cats)if(cat.spriteNode)cat.spriteNode.active=false;return;}
        for(const cat of this.cats){
            this.setupCatSprite(cat);if(!cat.spriteNode||!cat.sprite)continue;
            const frame=this.roadCatFrameFor(cat);if(frame)cat.sprite.spriteFrame=frame;
            const yaw=((cat.root.eulerAngles.y%360)+360)%360;const facingRight=yaw>0&&yaw<180;
            const pancake=cat===this.roadPlayer&&this.roadPancake,charging=cat===this.roadPlayer&&this.roadRushActive;
            const walking=cat.state==='Walk'&&!pancake&&!this.roadWon&&!this.roadFailed;
            const gait=walking?Math.sin(this.clock*16):0;
            const walkBob=walking?Math.abs(gait)*5:0;
            const walkScale=walking?1+Math.sin(this.clock*16+Math.PI)*0.025:1;
            const pulse=cat.roadExpression==='hiss'&&this.roadCatFrameFor(cat)===this.roadCatFrames.hiss?1+Math.sin(this.clock*18)*0.025:1;
            const spriteScale=walkScale*pulse;
            const displayScale=pancake?1.18:charging?1.18:spriteScale;
            const displayY=pancake?40:charging?94+walkBob:60+walkBob;
            const displayHeight=pancake?0.32:spriteScale;
            cat.spriteNode.getComponent(UITransform)!.setContentSize(charging?96:116,charging?180:116);
            const horizontalScale=charging?(facingRight?displayScale:-displayScale):(facingRight?-displayScale:displayScale);
            const p=this.worldToUi(cat.root.worldPosition);cat.spriteNode.setPosition(p.x,p.y+displayY,0);cat.spriteNode.setScale(horizontalScale,displayHeight,1);cat.spriteNode.setRotationFromEuler(0,0,walking?gait*2.4:0);cat.spriteNode.active=true;cat.spriteNode.setSiblingIndex(Math.max(0,this.spriteRoot.children.length-1));
        }
    }
    private updateCarSprites(dt=0){
        for(const car of this.roadCars){this.setupCarSprite(car);if(!car.spriteNode||!car.sprite)continue;const frames=car.vehicle==='truck'?this.truckFrames:this.carFrames;if(frames.length){const row=car.speed>0?1:0;const frame=frames[row]?.[car.frameIndex];if(frame&&car.sprite.spriteFrame!==frame)car.sprite.spriteFrame=frame;}if(car.knocked)car.crushTimer=Math.max(0,car.crushTimer-dt);const crushed=car.knocked&&car.crushTimer>0;const p=this.worldToUi(car.root.worldPosition);car.spriteNode.setPosition(p.x,p.y+48,0);car.spriteNode.setScale(crushed?1.38:1,crushed?0.32:1,1);car.spriteNode.active=this.mode==='Road'&&(!car.knocked||crushed);}
    }
    private material(hex:string){if(!this.mats.has(hex)){const m=new Material();m.initialize({effectName:'builtin-unlit'});m.setProperty('mainColor',new Color().fromHEX(hex));this.mats.set(hex,m);}return this.mats.get(hex)!;}
    private part(parent:Node,name:string,p:number[],s:number[],color:string,round=false){
        const n=new Node(name);parent.addChild(n);n.setPosition(p[0],p[1],p[2]);n.setScale(s[0],s[1],s[2]);
        const r=n.addComponent(MeshRenderer);r.mesh=round?this.sharedRound:this.sharedBox;r.setMaterial(this.material(color),0);return n;
    }
    private spawn(pos:Vec3,overrideBreed?:Breed,silent=false):Cat{
        if(this.cats.length>=48)return;
        const breedIndex=overrideBreed?BREEDS.indexOf(overrideBreed):Math.floor(Math.random()*BREEDS.length),breed=overrideBreed??BREEDS[breedIndex],root=new Node(breed.name);this.node.addChild(root);root.setPosition(pos);
        const seed=Math.floor(Math.random()*0xffffffff),bodyType=BODY_TYPES[Math.floor(Math.random()*BODY_TYPES.length)];
        const rig=createVoxelCat(root,(p,n,v,s,c,round)=>this.part(p,n,v,s,c,round),breed,{bodyType,seed});
        if(this.use2D)rig.body.active=this.mode!=='Road';
        const heal=this.makeHealEffect(root,rig.body);
        const healFx=heal.fx;
        const renderer=rig.torso.getComponent(MeshRenderer)!;
        const texture=new Texture2D();texture.reset({width:64,height:64,format:Texture2D.PixelFormat.RGBA8888});texture.uploadData(coatPixels(breed,seed));
        const coat=new Material();coat.initialize({effectName:'builtin-unlit',defines:{USE_TEXTURE:true}});coat.setProperty('mainTexture',texture);renderer.setMaterial(coat,0);
        rig.setArch=(amount:number)=>{amount=Math.round(amount/0.31*16)/16*0.31;if(!this.skins.has(amount))this.skins.set(amount,utils.createMesh(torsoGeometry(amount)));renderer.mesh=this.skins.get(amount)!;};rig.setArch(0);
        const cat={root,...rig,state:'Idle' as CatState,timer:1+Math.random()*2,threatCooldown:0,threatTarget:null,target:pos.clone(),breed:breedIndex,profile:breed,bodyType:bodyType.name,coat,texture,headYaw:0,bodyOffset:0,looking:false,fightRoll:1,fightStyle:0,tailRate:1.05+Math.random()*2.25,tailPhase:Math.random()*Math.PI*2,hissDistance:HISS_DISTANCE,health:100,maxHealth:100,healSitting:false,healFx,healPluses:heal.pluses,healPlusBases:heal.bases,roadExpression:'normal' as RoadCatExpression};this.cats.push(cat);this.setupCatSprite(cat);this.sound.setCatsPresent(true);if(!silent)this.sound.play('place');return cat;
    }
    private makeHealEffect(root:Node,body:Node){
        const fx=new Node('Green healing silhouette');body.addChild(fx);const green='#43F06B';
        const edge=(name:string,p:number[],s:number[])=>this.part(fx,name,p,s,green);
        // Short contour segments hug the actual torso, head and legs instead of forming a box.
        for(const x of [-0.16,0.16])for(const y of [-0.14,0.14])edge('Healing torso flank',[x,y,0],[0.018,0.018,0.78]);
        for(const y of [-0.14,0.14])for(const z of [-0.39,0.39])edge('Healing torso contour',[0,y,z],[0.30,0.018,0.018]);
        for(const x of [-0.23,0.23])edge('Healing head side',[x,0.01,0.45],[0.018,0.34,0.018]);
        for(const y of [-0.17,0.19])edge('Healing head contour',[0,y,0.45],[0.46,0.018,0.018]);
        for(const x of [-0.115,0.115])for(const z of [-0.27,0.27])edge('Healing leg contour',[x,-0.25,z],[0.018,0.42,0.018]);
        const pluses:Node[]=[];const bases:Vec3[]=[];
        for(const [x,y,z] of [[-0.28,0.28,0.42],[0.28,0.22,0.37],[-0.22,0.02,-0.40],[0.23,-0.05,-0.36],[0,0.34,0.05],[0.03,-0.31,0.20]]){
            const plus=new Node('Healing floating plus');fx.addChild(plus);plus.setPosition(x,y,z);pluses.push(plus);bases.push(plus.position.clone());
            this.part(plus,'Healing plus horizontal',[0,0,0],[0.10,0.022,0.022],green);
            this.part(plus,'Healing plus vertical',[0,0,0],[0.022,0.10,0.022],green);
        }
        fx.active=false;return {fx,pluses,bases};
    }
    private text(parent:Node,name:string,value:string,y:number,size:number,track=true){
        const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.setPosition(0,y,0);n.addComponent(UITransform).setContentSize(710,46);
        if(track&&this.buildingGallery&&parent===this.ui)this.galleryNodes.push(n);
        const l=n.addComponent(Label);l.string=value;l.fontSize=size;l.lineHeight=size+8;l.color=new Color(66,70,53);l.enableOutline=true;l.outlineColor=new Color(244,239,219);l.outlineWidth=2;return l;
    }
    private makeUI(){
        view.setDesignResolutionSize(this.uiWidth,this.uiHeight,2);this.ui=new Node('Garden UI');this.node.addChild(this.ui);this.ui.layer=Layers.Enum.UI_2D;this.ui.addComponent(UITransform).setContentSize(this.uiWidth,this.uiHeight);
        const canvas=this.ui.addComponent(Canvas),cn=new Node('UI Camera');this.ui.addChild(cn);cn.setPosition(0,0,1000);
        const c=cn.addComponent(Camera);c.projection=Camera.ProjectionType.ORTHO;c.orthoHeight=this.uiHeight;c.clearFlags=Camera.ClearFlag.DEPTH_ONLY;c.visibility=Layers.Enum.UI_2D;c.priority=10;c.far=2000;canvas.cameraComponent=c;
        this.backgroundNode=new Node('First level 2D road background');this.backgroundNode.layer=Layers.Enum.UI_2D;this.ui.addChild(this.backgroundNode);this.backgroundNode.addComponent(UITransform).setContentSize(this.uiWidth,this.uiHeight);this.backgroundNode.addComponent(Sprite);this.backgroundNode.active=false;this.backgroundNode.setSiblingIndex(0);
        this.spriteRoot=new Node('2D cat and traffic sprites');this.spriteRoot.layer=Layers.Enum.UI_2D;this.ui.addChild(this.spriteRoot);this.spriteRoot.setSiblingIndex(1);
        this.button('切换场地',-520,()=>{this.environment.toggle();this.environment.view(this.yaw);},-302);
        this.button('远距演示',-330,()=>this.farDemo(),-260);this.button('缠斗演示',-110,()=>this.fightDemo(),-260);this.button('口香糖演示',110,()=>this.healDemo(),-260);this.button('老吴撼地掌',330,()=>this.triggerThreat(),-260);
        this.status=this.text(this.ui,'Status','',-10,19);
        this.button('拉近',-120,()=>{this.closeup=false;this.zoom=Math.max(1.5,this.zoom-0.7);this.orbit();},-205);
        this.button('拉远',120,()=>{this.closeup=false;this.zoom=Math.min(9,this.zoom+0.7);this.orbit();},-205);
        this.buildingGallery=false;this.makeLevelUI();this.makeMainMenuUI();this.makeNavigationUI();
    }
    private button(title:string,x:number,action:()=>void,y:number,parent:Node=this.ui,width?:number,height?:number){
        const w=width??(parent===this.ui?170:220),h=height??(parent===this.ui?52:60),n=new Node(title);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.setPosition(x,y,0);n.addComponent(UITransform).setContentSize(w,h);
        const galleryButton=this.buildingGallery&&parent===this.ui;let l:Label;
        if(galleryButton){const art=new Node(`${title} button art`);art.layer=Layers.Enum.UI_2D;n.addChild(art);art.addComponent(UITransform).setContentSize(w,h);const g=art.addComponent(Graphics);g.fillColor=new Color(39,52,56,238);g.roundRect(-w/2,-h/2,w,h,15);g.fill();g.lineWidth=3;g.strokeColor=new Color(240,187,51,255);g.roundRect(-w/2,-h/2,w,h,15);g.stroke();g.lineWidth=1;g.strokeColor=new Color(255,244,205,190);g.moveTo(-w/2+18,h/2-6);g.lineTo(w/2-18,h/2-6);g.stroke();const textNode=new Node(`${title} button label`);textNode.layer=Layers.Enum.UI_2D;n.addChild(textNode);textNode.addComponent(UITransform).setContentSize(w,h);l=textNode.addComponent(Label);}
        else l=n.addComponent(Label);
        l.string=title;l.fontSize=parent===this.ui?18:20;l.lineHeight=l.fontSize+8;l.color=galleryButton?new Color(255,248,222):parent===this.ui?new Color(48,55,42):new Color(250,244,223);l.enableOutline=true;l.outlineColor=galleryButton?new Color(38,45,45,255):parent===this.ui?new Color(244,239,219):new Color(45,51,39);l.outlineWidth=2;
        if(this.buildingGallery&&parent===this.ui)this.galleryNodes.push(n);
        n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;this.pointer=null;action();});return l;
    }
    private menuCard(parent:Node,title:string,subtitle:string,y:number,action:()=>void){
        const button=this.button('',0,action,y,parent,390,86),node=button.node;
        const art=new Node(`${title} card background`);art.layer=Layers.Enum.UI_2D;node.addChild(art);art.addComponent(UITransform).setContentSize(390,86);const g=art.addComponent(Graphics);g.fillColor=new Color(28,48,52,242);g.roundRect(-195,-43,390,86,18);g.fill();g.lineWidth=4;g.strokeColor=new Color(240,187,51,255);g.roundRect(-195,-43,390,86,18);g.stroke();
        const titleNode=new Node(`${title} card label`);titleNode.layer=Layers.Enum.UI_2D;node.addChild(titleNode);titleNode.setPosition(0,subtitle?-9:0,0);titleNode.addComponent(UITransform).setContentSize(360,46);const label=titleNode.addComponent(Label);label.string=title;label.fontSize=31;label.lineHeight=38;label.color=new Color(255,248,222);label.enableOutline=true;label.outlineColor=new Color(38,45,45,255);label.outlineWidth=3;
        if(subtitle){const hint=new Node(`${title} hint`);hint.layer=Layers.Enum.UI_2D;node.addChild(hint);hint.setPosition(0,-27,0);hint.addComponent(UITransform).setContentSize(330,24);const hintLabel=hint.addComponent(Label);hintLabel.string=subtitle;hintLabel.fontSize=15;hintLabel.lineHeight=20;hintLabel.color=new Color(220,232,224);hintLabel.enableOutline=true;hintLabel.outlineColor=new Color(25,35,36);hintLabel.outlineWidth=2;}
        return label;
    }
    private makeNavigationButton(name:string,title:string,x:number,action:()=>void){
        const node=new Node(name);node.layer=Layers.Enum.UI_2D;this.navigationUi.addChild(node);node.setPosition(x,315,0);node.addComponent(UITransform).setContentSize(176,66);
        const art=new Node(`${name} artwork`);art.layer=Layers.Enum.UI_2D;node.addChild(art);art.addComponent(UITransform).setContentSize(176,66);const sprite=art.addComponent(Sprite);sprite.type=Sprite.Type.SIMPLE;sprite.sizeMode=Sprite.SizeMode.CUSTOM;
        if(title==='返回')this.navigationBackSprite=sprite;else this.navigationSettingsSprite=sprite;
        const textNode=new Node(`${name} text`);textNode.layer=Layers.Enum.UI_2D;node.addChild(textNode);textNode.setPosition(2,0,0);textNode.addComponent(UITransform).setContentSize(98,46);const label=textNode.addComponent(Label);label.string=title;label.fontSize=22;label.lineHeight=28;label.color=new Color(255,248,222);label.enableOutline=true;label.outlineColor=new Color(70,35,48,255);label.outlineWidth=2;
        node.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;this.pointer=null;action();});return node;
    }
    private makeNavigationUI(){
        this.navigationUi=new Node('Shared navigation');this.navigationUi.layer=Layers.Enum.UI_2D;this.ui.addChild(this.navigationUi);this.navigationUi.addComponent(UITransform).setContentSize(this.uiWidth,this.uiHeight);
        this.navigationBackButton=this.makeNavigationButton('Back navigation button','返回',-552,()=>this.navigateBack());
        this.navigationSettingsButton=this.makeNavigationButton('Settings navigation button','设置',552,()=>this.openSettings());
    }
    private navigateBack(){
        if(this.mode==='Settings'){this.mode=this.settingsReturnMode;this.showModeUI();this.updateSoundLabels();return;}
        if(this.mode==='OldWu'){this.openLevelMenu();return;}
        if(this.mode!=='MainMenu')this.openMainMenu();
    }
    private makeRoadJoystick(){
        this.roadJoystick=new Node('Road arcade joystick');this.roadJoystick.layer=Layers.Enum.UI_2D;this.roadUi.addChild(this.roadJoystick);this.roadJoystick.setPosition(-445,-235,0);this.roadJoystick.addComponent(UITransform).setContentSize(220,190);
        const base=this.roadJoystick.addComponent(Graphics);base.fillColor=new Color(20,28,31,220);base.circle(0,0,78);base.fill();base.lineWidth=4;base.strokeColor=new Color(238,226,190,210);base.circle(0,0,78);base.stroke();base.fillColor=new Color(58,70,70,230);base.roundRect(-54,-7,108,14,7);base.fill();
        this.roadJoystickKnob=new Node('Road joystick ball');this.roadJoystickKnob.layer=Layers.Enum.UI_2D;this.roadJoystick.addChild(this.roadJoystickKnob);this.roadJoystickKnob.addComponent(UITransform).setContentSize(72,72);const knob=this.roadJoystickKnob.addComponent(Graphics);knob.fillColor=new Color(230,82,58,255);knob.circle(0,0,34);knob.fill();knob.lineWidth=3;knob.strokeColor=new Color(255,239,198,255);knob.circle(0,0,34);knob.stroke();this.roadJoystickKnob.setPosition(0,0,0);
        const touchId=(e:EventTouch)=>((e as any).getID?.()??0);
        this.roadJoystick.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{e.propagationStopped=true;if(this.roadDialog?.active)return;if(this.roadWon||this.roadFailed){this.startRoadLevel();return;}this.roadJoystickPointerId=touchId(e);this.updateRoadJoystick(e.getLocation().x);});
        this.roadJoystick.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{e.propagationStopped=true;if(this.roadDialog?.active)return;if(this.roadJoystickPointerId===touchId(e))this.updateRoadJoystick(e.getLocation().x);});
        const releaseTouch=(e:EventTouch)=>{e.propagationStopped=true;if(this.roadJoystickPointerId===touchId(e))this.resetRoadJoystick();};
        this.roadJoystick.on(Node.EventType.TOUCH_END,releaseTouch);this.roadJoystick.on(Node.EventType.TOUCH_CANCEL,releaseTouch);
        this.roadJoystick.on(Node.EventType.MOUSE_DOWN,(e:EventMouse)=>{e.propagationStopped=true;if(this.roadDialog?.active)return;if(this.roadWon||this.roadFailed){this.startRoadLevel();return;}this.roadJoystickPointerId=-2;this.updateRoadJoystick(e.getLocation().x);});
        this.roadJoystick.on(Node.EventType.MOUSE_MOVE,(e:EventMouse)=>{e.propagationStopped=true;if(this.roadDialog?.active)return;if(this.roadJoystickPointerId===-2)this.updateRoadJoystick(e.getLocation().x);});
        this.roadJoystick.on(Node.EventType.MOUSE_UP,(e:EventMouse)=>{e.propagationStopped=true;if(this.roadJoystickPointerId===-2)this.resetRoadJoystick();});
    }
    private updateRoadJoystick(screenX:number){
        if(!this.roadJoystick||!this.roadJoystickKnob)return;
        const camera=this.ui.getComponent(Canvas)!.cameraComponent!,center=camera.worldToScreen(this.roadJoystick.worldPosition,new Vec3()),direction=Math.max(-1,Math.min(1,(screenX-center.x)/70));
        this.roadTouchDirection=direction;this.roadJoystickKnob.setPosition(direction*this.roadJoystickRange,0,0);
    }
    private resetRoadJoystick(){this.roadTouchDirection=0;this.roadJoystickPointerId=-1;if(this.roadJoystickKnob)this.roadJoystickKnob.setPosition(0,0,0);}
    private paintRoadHole(node:Node,filled:boolean){
        const g=node.getComponent(Graphics)!;g.clear();
        if(filled){g.fillColor=new Color(248,202,52,255);g.roundRect(-31,-22,62,44,7);g.fill();g.lineWidth=4;g.strokeColor=new Color(141,100,30,255);g.roundRect(-31,-22,62,44,7);g.stroke();return;}
        g.fillColor=new Color(33,27,28,235);g.circle(0,0,34);g.fill();g.lineWidth=4;g.strokeColor=new Color(119,83,57,230);g.circle(0,0,34);g.stroke();g.fillColor=new Color(13,17,22,245);g.circle(0,0,25);g.fill();
    }
    private makeRoadHoles(preserved?:boolean[]){
        const positions:Array<[number,number]>=[[-4.75,-2.65],[-2.65,2.45],[-0.35,-1.75],[3.85,2.85],[-3.75,0.75],[2.25,-0.35]];
        const shapes=[[1.00,0.52,-9],[1.24,0.44,13],[0.82,0.62,-18],[1.16,0.48,7],[0.94,0.70,21],[1.30,0.40,-5]];
        this.roadHoles=[];this.roadFilledHoles=0;
        positions.forEach(([x,z],i)=>{
            const node=new Node(`Road pothole ${i+1}`);node.layer=Layers.Enum.UI_2D;this.spriteRoot.addChild(node);node.addComponent(UITransform).setContentSize(88,52);
            node.addComponent(Graphics);const filled=Boolean(preserved?.[i]);this.paintRoadHole(node,filled);node.setScale(shapes[i][0],shapes[i][1],1);node.setRotationFromEuler(0,0,shapes[i][2]);
            this.roadHoles.push({node,x,z,filled});if(filled)this.roadFilledHoles++;
        });
    }
    private updateRoadHoles(){
        if(this.mode!=='Road')return;
        for(const hole of this.roadHoles){const p=this.worldToUi(new Vec3(hole.x,0,hole.z));hole.node.setPosition(p.x,p.y+18,0);hole.node.active=true;}
    }
    private chooseNearestRoadHole(cat:Cat){
        const p=cat.root.position;let target:RoadHole|null=null;let best=Number.POSITIVE_INFINITY;
        for(const hole of this.roadHoles){if(hole.filled)continue;const distance=Math.abs(hole.x-p.x)+Math.abs(hole.z-p.z)*0.35;if(distance<best){best=distance;target=hole;}}
        if(!target)return;
        this.roadPancakeTarget=target;
    }
    private panel(name:string){const n=new Node(name);n.layer=Layers.Enum.UI_2D;this.ui.addChild(n);n.addComponent(UITransform).setContentSize(this.uiWidth,this.uiHeight);n.active=false;return n;}
    private makeMainMenuUI(){
        this.mainMenu=this.panel('Main menu');
        this.coverNode=new Node('Game cover');this.coverNode.layer=Layers.Enum.UI_2D;this.mainMenu.addChild(this.coverNode);this.coverNode.addComponent(UITransform).setContentSize(this.uiWidth,this.uiHeight);this.coverNode.addComponent(Sprite);this.coverNode.setSiblingIndex(0);
        this.coverButton(296,67,()=>this.startRoadLevel());
        this.coverButton(296,-59,()=>this.showGallery());
        this.coverButton(296,-184,()=>this.openSettings());
        this.settingsUi=this.panel('Settings');
        this.settingsBackdrop=new Node('Settings backdrop');this.settingsBackdrop.layer=Layers.Enum.UI_2D;this.settingsUi.addChild(this.settingsBackdrop);this.settingsBackdrop.addComponent(UITransform).setContentSize(this.uiWidth,this.uiHeight);this.settingsBackdrop.setSiblingIndex(0);const settingsGraphics=this.settingsBackdrop.addComponent(Graphics);settingsGraphics.fillColor=new Color(18,31,41,255);settingsGraphics.rect(-640,-360,1280,720);settingsGraphics.fill();
        const settingsTitle=this.text(this.settingsUi,'Settings title','设置',238,42,false);settingsTitle.color=new Color(255,229,141);settingsTitle.outlineColor=new Color(30,42,43);settingsTitle.outlineWidth=4;
        const display=this.text(this.settingsUi,'Settings display','横屏 1280 × 720',178,18,false);display.color=new Color(216,233,221);display.outlineColor=new Color(29,39,40);display.outlineWidth=3;
        this.settingsAudioLabel=this.menuCard(this.settingsUi,'声音：关','',60,()=>this.toggleSound());
    }
    private toggleSound(){this.sound.toggle();this.updateSoundLabels();}
    private updateSoundLabels(){const value=this.sound.enabled?'声音：开':'声音：关';if(this.settingsAudioLabel)this.settingsAudioLabel.string=value;}
    private makeLevelUI(){
        this.levelMenu=this.panel('Level menu');
        const levelTitle=this.text(this.levelMenu,'Level title','后续关卡',265,40,false);levelTitle.color=new Color(255,229,141);levelTitle.outlineColor=new Color(30,42,43);levelTitle.outlineWidth=4;
        this.menuCard(this.levelMenu,'第二关','敬请期待',70,()=>{this.levelStatus.string='第二关开发中';});
        this.menuCard(this.levelMenu,'第三关','敬请期待',-45,()=>{this.levelStatus.string='第三关开发中';});
        this.levelStatus=this.text(this.levelMenu,'Level status','',-270,18,false);this.levelStatus.node.active=false;
        this.roadUi=this.panel('Road level UI');
        this.roadStatus=this.text(this.roadUi,'Road status','',280,18,false);
        this.makeRoadJoystick();
        this.roadRushButton=this.button('',574,()=>this.useRoadRushItem(),224,this.roadUi,64,64).node;
        this.roadRushItemNode=new Node('Honey rush item icon');this.roadRushItemNode.layer=Layers.Enum.UI_2D;this.roadRushButton.addChild(this.roadRushItemNode);this.roadRushItemNode.addComponent(UITransform).setContentSize(36,44);this.roadRushItemNode.addComponent(Sprite);this.roadRushItemNode.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;this.useRoadRushItem();});this.roadRushItemNode.on(Node.EventType.MOUSE_UP,(event:EventMouse)=>{event.propagationStopped=true;this.useRoadRushItem();});this.setupRoadRushItem();
        this.roadAbsorbBanner=new Node('Road auto absorb banner');this.roadAbsorbBanner.layer=Layers.Enum.UI_2D;this.roadUi.addChild(this.roadAbsorbBanner);this.roadAbsorbBanner.setPosition(0,210,0);this.roadAbsorbBanner.addComponent(UITransform).setContentSize(300,60);this.roadAbsorbBanner.addComponent(Sprite);this.setupRoadAbsorbBanner();
        this.roadDialog=new Node('Road result dialog');this.roadDialog.layer=Layers.Enum.UI_2D;this.roadUi.addChild(this.roadDialog);this.roadDialog.setPosition(0,0,0);this.roadDialog.addComponent(UITransform).setContentSize(this.uiWidth,this.uiHeight);
        const dim=this.roadDialog.addComponent(Graphics);dim.fillColor=new Color(0,0,0,205);dim.roundRect(-640,-360,1280,720,0);dim.fill();
        const card=new Node('Road dialog card');card.layer=Layers.Enum.UI_2D;this.roadDialog.addChild(card);card.addComponent(UITransform).setContentSize(820,270);const cardGraphics=card.addComponent(Graphics);cardGraphics.fillColor=new Color(37,45,43,255);cardGraphics.roundRect(-410,-135,820,270,24);cardGraphics.fill();cardGraphics.lineWidth=5;cardGraphics.strokeColor=new Color(255,235,179,255);cardGraphics.roundRect(-410,-135,820,270,24);cardGraphics.stroke();
        this.roadDialogTitle=this.text(this.roadDialog,'Road dialog title','',74,46,false);this.roadDialogTitle.node.getComponent(UITransform)!.setContentSize(820,70);this.roadDialogTitle.color=new Color(255,242,202);this.roadDialogPrimary=this.button('继续',-150,()=>this.roadDialogPrimaryAction(),-76,this.roadDialog,230,64);this.roadDialogSecondary=this.button('返回上一级',150,()=>this.roadDialogSecondaryAction(),-76,this.roadDialog,230,64);for(const label of [this.roadDialogPrimary,this.roadDialogSecondary]){label.fontSize=28;label.lineHeight=38;label.color=new Color(255,247,220);label.outlineColor=new Color(20,27,26,255);label.outlineWidth=3;}this.roadDialog.active=false;
        this.wuUi=this.panel('Old Wu level UI');
        this.text(this.wuUi,'Wu title','第二关 · 老吴的盲区',280,29,false);
        this.text(this.wuUi,'Wu hint','在银渐层老吴底下移动，趁它闭眼时哈气；睁眼时会立刻发现你',225,17,false);
        this.wuStatus=this.text(this.wuUi,'Wu status','',175,18,false);
        this.button('哈气',-300,()=>this.tryOldWuHiss(),-240,this.wuUi,180,62);
        this.button('上',-85,()=>this.moveWu(0,0.25),-240,this.wuUi,76,58);
        this.button('左',85,()=>this.moveWu(-0.25,0),-300,this.wuUi,76,58);
        this.button('下',255,()=>this.moveWu(0,-0.25),-300,this.wuUi,76,58);
        this.button('右',425,()=>this.moveWu(0.25,0),-240,this.wuUi,76,58);
        this.button('重新开始',-140,()=>this.startOldWuLevel(),-330,this.wuUi,180,58);
    }
    private showRoadDialog(title:string,primaryLabel:string,primaryAction:()=>void,secondaryLabel:string,secondaryAction:()=>void){
        this.roadDialogTitle.string=title;this.roadDialogPrimary.string=primaryLabel;this.roadDialogSecondary.string=secondaryLabel;this.roadDialogPrimaryAction=primaryAction;this.roadDialogSecondaryAction=secondaryAction;this.roadDialog.active=true;this.resetRoadJoystick();
    }
    private showModeUI(){
        const gallery=this.mode==='Gallery';this.galleryNodes.forEach(n=>n.active=gallery);
        if(this.status)this.status.node.active=false;
        if(this.mainMenu)this.mainMenu.active=this.mode==='MainMenu';
        if(this.settingsUi)this.settingsUi.active=this.mode==='Settings';
        if(this.levelMenu)this.levelMenu.active=this.mode==='LevelMenu';
        if(this.roadUi)this.roadUi.active=this.mode==='Road';
        if(this.roadDialog&&this.mode!=='Road'&&this.mode!=='Settings')this.roadDialog.active=false;
        if(this.wuUi)this.wuUi.active=this.mode==='OldWu';
        if(this.navigationUi)this.navigationUi.active=this.mode!=='MainMenu';
        if(this.navigationBackButton)this.navigationBackButton.active=this.mode!=='MainMenu';
        if(this.navigationSettingsButton)this.navigationSettingsButton.active=this.mode==='Gallery'||this.mode==='Road'||this.mode==='OldWu';
        this.applyModePresentation();
    }
    private applyModePresentation(){
        if(!this.environment||!this.backgroundNode)return;
        const road=this.mode==='Road',showWorld=this.mode==='Gallery'||this.mode==='LevelMenu'||this.mode==='OldWu';this.backgroundNode.active=road;this.environment.setWorldVisible(showWorld);this.camera.clearColor=this.mode==='Settings'?this.settingsCameraColor:this.defaultCameraColor;
        for(const cat of this.cats){cat.body.active=!road&&this.mode!=='Settings'&&this.mode!=='MainMenu';if(cat.spriteNode)cat.spriteNode.active=road;}
        for(const car of this.roadCars){car.root.active=!road&&this.mode!=='Settings';if(car.spriteNode)car.spriteNode.active=road;}
    }
    private openMainMenu(){this.clear();this.mode='MainMenu';this.showModeUI();this.updateSoundLabels();this.zoom=5.5;this.orbit();}
    private openSettings(){if(this.mode!=='Settings')this.settingsReturnMode=this.mode;this.mode='Settings';this.showModeUI();this.updateSoundLabels();}
    private openLevelMenu(){this.clear();this.mode='LevelMenu';this.showModeUI();this.levelStatus.string='请选择关卡';this.zoom=5.5;this.orbit();}
    private showGallery(){this.clear();this.mode='Gallery';this.showModeUI();this.zoom=5.5;this.elevation=0.98;this.orbit();this.spawn(new Vec3(-0.7,0,0));}
    private fillPendingRoadHole(){
        const target=this.roadPancakeTarget;if(!target)return false;
        target.filled=true;this.paintRoadHole(target.node,true);target.node.active=true;this.roadFilledHoles++;this.roadPancakeTarget=null;return true;
    }
    private showRoadCompletionDialog(){
        this.roadFailed=false;this.roadWon=true;this.roadRushActive=false;this.roadStatus.string='六个坑洞都已填满 · 本关通关';
        this.showRoadDialog('世界破破烂烂，基米缝缝补补','返回上一级',()=>this.openMainMenu(),'下一关',()=>this.openLevelMenu());
    }
    private resolveRoadHit(){
        if(!this.roadFailed||!this.roadPancakeTarget||this.roadDialog.active)return;
        if(this.roadFilledHoles+1>=this.roadHoles.length){this.fillPendingRoadHole();this.showRoadCompletionDialog();return;}
        this.showRoadDialog('哈基米被自动吸附了','继续',()=>this.continueRoadAfterAbsorption(),'返回上一级',()=>this.openMainMenu());
    }
    private continueRoadAfterAbsorption(){
        if(this.mode!=='Road'||!this.roadFailed)return;
        if(!this.fillPendingRoadHole())return;
        const preserved=this.roadHoles.map(hole=>hole.filled);
        if(this.roadFilledHoles>=this.roadHoles.length){
            this.showRoadCompletionDialog();
            return;
        }
        this.startRoadLevel(preserved);
    }
    private startRoadLevel(preservedHoles?:boolean[]){
        this.clear();this.mode='Road';this.showModeUI();this.roadDialog.active=false;this.roadWon=false;this.roadFailed=false;this.roadPancake=false;this.roadHitDelay=0;this.roadRushAvailable=true;this.roadRushActive=false;this.roadInstinctMoving=false;this.roadRushButton.getComponent(Label)!.string='';this.setupRoadRushItem();this.roadLeftHeld=false;this.roadRightHeld=false;this.resetRoadJoystick();this.roadInstinctStrength=0;this.roadInstinctTargetX=0;this.zoom=8.2;this.yaw=0.0;this.elevation=1.22;this.orbit();this.makeRoadHoles(preservedHoles);
        this.roadPlayer=this.spawn(new Vec3(-10.90,0,0),BREEDS[0],true);this.roadPlayer.root.setRotationFromEuler(0,90,0);
        const lanes=[-4.90,-2.45,0,2.45,4.90],colors=['#D86D45','#4C7392','#D4A33D','#657A5C','#A65A61'];
        lanes.forEach((lane,i)=>{for(let j=0;j<2;j++){const root=new Node('Vertical traffic car');this.node.addChild(root);const forward=i%2===0,offset=(i*0.83+j*4.85),start=forward?-5.4+offset:5.4-offset;root.setPosition(lane,0,start);const color=colors[(i+j)%colors.length];this.part(root,'Car body',[0,0.22,0],[0.48,0.25,0.88],color);this.part(root,'Car cabin',[0,0.43,-0.04],[0.32,0.16,0.42],i%2?'#DDE5E4':'#F0D6A4');this.part(root,'Car bumper',[0,0.13,0.46],[0.50,0.08,0.08],'#23292D');this.part(root,'Car light left',[-0.20,0.24,0.47],[0.07,0.05,0.035],'#F6E7A9');this.part(root,'Car light right',[0.20,0.24,0.47],[0.07,0.05,0.035],'#F6E7A9');const vehicle:'car'|'truck'=((i===0&&j===1)||(i===2&&j===1)||(i===4&&j===1))?'truck':'car';const speed=Math.abs(vehicle==='truck'?0.56+(i%2)*0.06:1.05+(i%3)*0.14+(j%2)*0.08);const car={root,speed:(forward?1:-1)*speed,length:vehicle==='truck'?1.35:0.9,lane,frameIndex:(i+j)%4,vehicle,knocked:false,crushTimer:0};if(this.use2D)root.active=false;this.roadCars.push(car);this.setupCarSprite(car);}});
        this.roadStatus.string=`本能拉力 0% · 坑洞 ${this.roadFilledHoles}/${this.roadHoles.length} · 向右通过斑马线`;
    }
    private startOldWuLevel(){
        this.clear();this.mode='OldWu';this.showModeUI();this.zoom=4.3;this.yaw=0.0;this.elevation=1.22;this.orbit();this.oldWuAwake=false;this.oldWuEyeTimer=2.2;this.oldWuMeter=0;this.oldWuPulse=0;this.oldWuWon=false;this.oldWuFailed=false;
        this.levelDecor.push(this.part(this.node,'Silver cage floor',[0,-0.10,0],[2.8,0.10,2.2],'#D3D8D8'));
        this.levelDecor.push(this.part(this.node,'Cage front rail',[0,0.35,1.12],[2.9,0.08,0.08],'#B5BEC0'));
        this.levelDecor.push(this.part(this.node,'Cage left rail',[-1.42,0.35,0],[0.08,0.08,2.25],'#B5BEC0'));
        this.wuPlayer=this.spawn(new Vec3(0,0,-0.85),BREEDS[0],true);this.wuPlayer.root.setRotationFromEuler(0,0,0);
        this.oldWu=this.spawn(new Vec3(0,0,0.35),this.oldWuBreed,true);this.oldWu.root.setScale(1.12,1.12,1.12);this.setOldWuEyes(false);
        this.wuStatus.string='老吴正在打盹 · 哈气值 0/100';
    }
    private makeCarStep(car:RoadCar,dt:number){if(car.knocked)return;let z=car.root.position.z+car.speed*dt;if(z>5.4&&car.speed>0){const closest=Math.min(...this.roadCars.filter(other=>other!==car&&other.lane===car.lane).map(other=>other.root.position.z));z=Math.min(-5.4,closest-3.2-Math.random()*1.1);}else if(z<-5.4&&car.speed<0){const closest=Math.max(...this.roadCars.filter(other=>other!==car&&other.lane===car.lane).map(other=>other.root.position.z));z=Math.max(5.4,closest+3.2+Math.random()*1.1);}car.root.setPosition(car.root.position.x,0,z);}
    private roadInputDirection(){
        if(this.roadTouchDirection!==0)return this.roadTouchDirection;
        if(this.roadLeftHeld===this.roadRightHeld)return 0;
        return this.roadLeftHeld?-1:1;
    }
    private updateRoadInstinct(cat:Cat){
        this.roadInstinctStrength=0;this.roadInstinctTargetX=cat.root.position.x;
        if(cat.root.position.x<=-6.20||cat.root.position.x>=6.20)return 0;
        let target:RoadCar|null=null,bestScore=Number.POSITIVE_INFINITY;
        for(const car of this.roadCars){
            const longitudinal=Math.abs(car.root.position.z),lateral=Math.abs(car.root.position.x-cat.root.position.x);if(longitudinal>this.roadInstinctRange)continue;
            const score=longitudinal+lateral*0.28;if(score<bestScore){bestScore=score;target=car;}
        }
        if(!target)return 0;
        this.roadInstinctTargetX=target.root.position.x;this.roadInstinctStrength=Math.max(0,1-Math.abs(target.root.position.z)/this.roadInstinctRange);return Math.sign(target.root.position.x-cat.root.position.x);
    }
    private moveRoad(dx:number){
        if(this.mode!=='Road'||!this.roadPlayer||this.roadWon||this.roadFailed||dx===0)return;
        const p=this.roadPlayer.root.position,nextX=Math.max(-10.90,Math.min(10.90,p.x+dx));
        if(nextX===p.x)return;
        this.roadPlayer.root.setPosition(nextX,0,0);this.roadPlayer.state='Walk';this.roadPlayer.timer=0.12;this.roadPlayer.root.setRotationFromEuler(0,dx>0?90:-90,0);
    }
    private useRoadRushItem(){
        if(this.mode!=='Road'||!this.roadPlayer||!this.roadRushAvailable||this.roadWon||this.roadFailed)return;
        this.roadRushAvailable=false;this.roadRushActive=true;this.roadInstinctStrength=0;this.roadPlayer.roadExpression='normal';this.roadPlayer.state='Walk';this.roadPlayer.timer=0.12;this.roadPlayer.root.setRotationFromEuler(0,90,0);this.roadRushButton.getComponent(Label)!.string='';this.roadRushItemNode.active=false;this.roadStatus.string='蜂蜜冲刺中 · 碰到车辆会将其撞飞';
    }
    private knockRoadCar(car:RoadCar){
        car.knocked=true;car.crushTimer=0.48;car.root.active=false;if(car.spriteNode)car.spriteNode.active=true;
    }
    private moveWu(dx:number,dz:number){
        if(this.mode!=='OldWu'||!this.wuPlayer||this.oldWuWon||this.oldWuFailed)return;const p=this.wuPlayer.root.position;this.wuPlayer.root.setPosition(Math.max(-1.25,Math.min(1.25,p.x+dx)),0,Math.max(-1.35,Math.min(-0.22,p.z+dz)));this.wuPlayer.state='Walk';this.wuPlayer.timer=0.22;
    }
    private tryOldWuHiss(){
        if(this.mode!=='OldWu'||!this.wuPlayer||this.oldWuWon||this.oldWuFailed)return;
        if(this.oldWuAwake){this.oldWuFailed=true;this.wuPlayer.state='Idle';this.wuStatus.string='被老吴发现了，按重新开始再试一次。';return;}
        this.oldWuPulse=0.35;this.wuPlayer.state='Hiss';this.wuPlayer.timer=0.35;this.oldWuMeter=Math.min(100,this.oldWuMeter+18);if(this.oldWuMeter>=100)this.oldWuWon=true;
    }
    private setOldWuEyes(awake:boolean){
        if(!this.oldWu)return;this.oldWu.head.children.forEach(n=>{if(n.name.indexOf('Pixel iris')>=0||n.name.indexOf('Pixel pupil')>=0||n.name==='Square catchlight')n.active=awake;});
    }
    private orbit(){this.camera.node.setPosition(Math.sin(this.yaw)*12,Math.tan(this.elevation)*12,Math.cos(this.yaw)*12);this.camera.node.lookAt(new Vec3(0,0.15,0));this.camera.orthoHeight=this.zoom;this.environment.view(this.yaw);}
    private clear(){this.closeup=false;this.roadLeftHeld=false;this.roadRightHeld=false;this.resetRoadJoystick();this.roadInstinctStrength=0;this.roadInstinctTargetX=0;this.roadPancake=false;this.roadPancakeTarget=null;this.roadHitDelay=0;this.roadRushAvailable=true;this.roadRushActive=false;this.orbit();for(const c of this.cats){c.root.destroy();c.spriteNode?.destroy();c.coat.destroy();c.texture.destroy();}for(const car of this.roadCars){car.root.destroy();car.spriteNode?.destroy();}for(const hole of this.roadHoles)hole.node.destroy();for(const n of this.levelDecor)n.destroy();this.cats=[];this.roadCars=[];this.roadHoles=[];this.roadFilledHoles=0;this.levelDecor=[];this.roadPlayer=null;this.wuPlayer=null;this.oldWu=null;this.sound.setCatsPresent(false);}
    private demo(count:number){this.clear();this.zoom=3.4;this.orbit();this.spawn(new Vec3(-0.75,0,0));this.spawn(new Vec3(0.75,0,0));if(count===3)this.spawn(new Vec3(0,0,1.3));}
    private farDemo(){this.clear();this.zoom=5.5;this.orbit();this.spawn(new Vec3(-3.2,0,0));this.spawn(new Vec3(3.2,0,0));}
    private fightDemo(){this.demo(2);const [a,b]=this.cats;this.enterFight(a,b,this.previewFightStyle);this.previewFightStyle=(this.previewFightStyle+1)%4;a.health=b.health=72;this.sound.play('fight');}
    private triggerThreat(){
        if(this.cats.length<2)this.demo(2);
        const [a,b]=this.cats;if(!a||!b||[a,b].some(c=>['Fight','Heal','Strut','Leap','Threat'].indexOf(c.state)>=0))return;
        if(Vec3.distance(a.root.position,b.root.position)>THREAT_TRIGGER_DISTANCE)return;
        const actor=Math.random()<0.5?a:b,passive=actor===a?b:a;this.enterThreat(actor,passive);
    }
    private healDemo(){this.demo(2);const [a,b]=this.cats;a.health=b.health=58;this.snapSpace(a,b,HISS_DISTANCE);this.enterHeal(a,b.root.position);this.enterHeal(b,a.root.position);}
    private isWorld(x:number,y:number){const c=this.ui.getComponent(Canvas)!.cameraComponent!,p=this.ui.getComponent(UITransform)!.convertToNodeSpaceAR(c.screenToWorld(new Vec3(x,y,0)));return p.y>-235&&p.y<225;}
    private begin(x:number,y:number){if(this.mode!=='Gallery')return;if(this.isWorld(x,y)&&!this.closeup)this.pointer={x,y,lastX:x,lastY:y,dragged:false};}
    private move(x:number,y:number){const p=this.pointer;if(!p)return;if(Math.abs(x-p.x)+Math.abs(y-p.y)>8)p.dragged=true;if(p.dragged){this.yaw-=(x-p.lastX)*0.006;this.elevation=Math.max(0.78,Math.min(1.12,this.elevation+(y-p.lastY)*0.003));this.orbit();}p.lastX=x;p.lastY=y;}
    private end(x:number,y:number){const p=this.pointer;this.pointer=null;if(p&&!p.dragged)this.place(x,y);}
    private cancel(){this.pointer=null;this.touchPoints.clear();this.pinchDistance=0;}
    private touchDistance(){const points=[...this.touchPoints.values()];if(points.length<2)return 0;const dx=points[0].x-points[1].x,dy=points[0].y-points[1].y;return Math.sqrt(dx*dx+dy*dy);}
    private touchStart(e:EventTouch){this.lastTouch=this.clock;const id=(e as any).getID?.()??0,p=e.getLocation();this.touchPoints.set(id,{x:p.x,y:p.y});if(this.touchPoints.size>=2){this.pointer=null;this.pinchDistance=this.touchDistance();return;}this.begin(p.x,p.y);}
    private touchMove(e:EventTouch){const id=(e as any).getID?.()??0,p=e.getLocation();if(this.touchPoints.has(id))this.touchPoints.set(id,{x:p.x,y:p.y});if(this.touchPoints.size>=2){const next=this.touchDistance();if(this.mode==='Gallery'&&this.pinchDistance>0&&next>0){this.zoom=Math.max(1.5,Math.min(9,this.zoom*this.pinchDistance/next));this.orbit();}this.pinchDistance=next;return;}this.move(p.x,p.y);}
    private touchEnd(e:EventTouch){this.lastTouch=this.clock;const id=(e as any).getID?.()??0,p=e.getLocation();this.touchPoints.delete(id);if(this.touchPoints.size>0){this.pinchDistance=0;this.pointer=null;return;}this.pinchDistance=0;this.end(p.x,p.y);}
    private mouseStart(e:EventMouse){if(e.getButton()!==0||this.clock-this.lastTouch<0.4)return;const p=e.getLocation();this.begin(p.x,p.y);}
    private mouseMove(e:EventMouse){if(this.clock-this.lastTouch<0.4)return;const p=e.getLocation();this.move(p.x,p.y);}
    private mouseEnd(e:EventMouse){if(e.getButton()!==0||this.clock-this.lastTouch<0.4)return;const p=e.getLocation();this.end(p.x,p.y);}
    private wheel(e:EventMouse){if(this.closeup||this.mode!=='Gallery')return;this.zoom=Math.max(1.5,Math.min(9,this.zoom-e.getScrollY()*0.004));this.orbit();}
    private place(x:number,y:number){
        if(this.mode!=='Gallery'||this.closeup||!this.isWorld(x,y))return;const ray=new geometry.Ray();this.camera.screenPointToRay(x,y,ray);const t=-ray.o.y/ray.d.y;if(t<=0)return;
        const p=new Vec3(ray.o.x+ray.d.x*t,0,ray.o.z+ray.d.z*t);if(Math.abs(p.x)>5.3||Math.abs(p.z)>4.3||this.cats.some(c=>Vec3.distance(c.root.position,p)<0.65))return;this.spawn(p);
    }
    private clamp(c:Cat){const p=c.root.position;c.root.setPosition(Math.max(-5.3,Math.min(5.3,p.x)),0,Math.max(-4.3,Math.min(4.3,p.z)));}
    private updateRoad(dt:number){
        if(this.zoom!==8.2){this.zoom=8.2;this.orbit();}
        for(const car of this.roadCars)this.makeCarStep(car,dt);
        const c=this.roadPlayer;if(!c)return;
        this.updateRoadHoles();
        if(this.roadHitDelay>0){this.roadHitDelay=Math.max(0,this.roadHitDelay-dt);if(this.roadHitDelay===0)this.resolveRoadHit();}
        if(!this.roadWon&&!this.roadFailed){
            const inputDirection=this.roadRushActive?1:this.roadInputDirection();
            const instinctDirection=this.roadRushActive?0:this.updateRoadInstinct(c),netSpeed=this.roadRushActive?this.roadRushSpeed:inputDirection*this.roadSpeed+instinctDirection*this.roadInstinctSpeed*this.roadInstinctStrength;this.roadInstinctMoving=!this.roadRushActive&&Math.abs(instinctDirection)>0.01;
            c.roadExpression=this.roadRushActive?'normal':this.roadInstinctStrength>0.62?'hiss':'normal';
            if(Math.abs(netSpeed)>0.01)this.moveRoad(netSpeed*dt);
            if(c.state==='Walk'&&inputDirection===0){c.timer-=dt;if(c.timer<=0)c.state='Idle';}
            const p=c.root.position;
            if(this.roadRushActive){
                for(const car of this.roadCars){if(car.knocked)continue;const q=car.root.position;const lateralReach=car.vehicle==='truck'?0.70:0.62;const longitudinalReach=car.vehicle==='truck'?0.94:0.82;if(Math.abs(p.x-q.x)<lateralReach&&Math.abs(p.z-q.z)<longitudinalReach)this.knockRoadCar(car);}
            }else if(!this.roadPancake){
                for(const car of this.roadCars){const q=car.root.position;const lateralReach=car.vehicle==='truck'?0.64:0.56;const longitudinalReach=car.vehicle==='truck'?0.84:0.72;if(Math.abs(p.x-q.x)<lateralReach&&Math.abs(p.z-q.z)<longitudinalReach){this.roadFailed=true;this.roadPancake=true;c.roadExpression='hit';c.state='Idle';this.roadLeftHeld=false;this.roadRightHeld=false;this.resetRoadJoystick();this.chooseNearestRoadHole(c);this.roadHitDelay=1;this.roadStatus.string='撞车 · 哈基米吸附中';break;}}
            }
            if(!this.roadFailed&&p.x>=10.60){this.roadWon=true;this.roadRushActive=false;c.roadExpression='normal';c.state='Idle';this.resetRoadJoystick();this.roadStatus.string=this.roadRushAvailable?'直接通过斑马线 · 本关通关':'起立冲刺成功 · 本关通关';if(!this.roadRushAvailable)this.showRoadDialog('冲刺通关','返回上一级',()=>this.openMainMenu(),'下一关',()=>this.openLevelMenu());}
        }
        if(this.roadAbsorbBanner)this.roadAbsorbBanner.active=this.roadHitDelay>0||(!this.roadWon&&!this.roadFailed&&this.roadInstinctMoving);
        poseVoxelCat(c,c.state,this.clock,dt,0,1,c.tailRate,false,0,c.tailPhase);this.updateCatSprites();this.updateCarSprites(dt);
        if(!this.roadWon&&!this.roadFailed)this.roadStatus.string=`本能拉力 ${Math.round(this.roadInstinctStrength*100)}% · 坑洞 ${this.roadFilledHoles}/${this.roadHoles.length} · 通过 ${Math.max(0,Math.round((c.root.position.x+10.90)/21.4*100))}%`;
    }
    private updateOldWu(dt:number){
        const player=this.wuPlayer,wu=this.oldWu;if(!player||!wu)return;
        if(!this.oldWuWon&&!this.oldWuFailed){
            this.oldWuEyeTimer-=dt;
            if(this.oldWuEyeTimer<=0){this.oldWuAwake=!this.oldWuAwake;this.oldWuEyeTimer=this.oldWuAwake?1.15:2.4;this.setOldWuEyes(this.oldWuAwake);}
            if(player.state==='Walk'){player.timer-=dt;if(player.timer<=0)player.state='Idle';}
            if(player.state==='Hiss'){player.timer-=dt;if(player.timer<=0)player.state='Idle';}
            if(this.oldWuAwake&&this.oldWuPulse>0){this.oldWuFailed=true;this.wuStatus.string='老吴睁眼发现了你，按重新开始再试一次。';}
        }
        this.oldWuPulse=Math.max(0,this.oldWuPulse-dt);
        poseVoxelCat(player,player.state,this.clock,dt,0,1,player.tailRate,false,0,player.tailPhase);
        poseVoxelCat(wu,'Idle',this.clock,dt,0,1,wu.tailRate,false,0,wu.tailPhase);
        this.updateCatSprites();this.updateCarSprites();
        if(!this.oldWuWon&&!this.oldWuFailed)this.wuStatus.string=`老吴${this.oldWuAwake?'睁眼中':'正在打盹'} · 哈气值 ${Math.round(this.oldWuMeter)}/100`;
        else if(this.oldWuWon)this.wuStatus.string='哈气值已满，成功完成第二关！';
    }
    private keyDown(e:EventKeyboard){
        if(e.keyCode===KeyCode.ESCAPE){this.navigateBack();return;}
        if(this.mode==='Road'){
            if(this.roadDialog?.active)return;
            if(e.keyCode===KeyCode.KEY_R&&this.roadWon){this.startRoadLevel();return;}
            if(e.keyCode===KeyCode.ARROW_LEFT||e.keyCode===KeyCode.KEY_A)this.roadLeftHeld=true;
            else if(e.keyCode===KeyCode.ARROW_RIGHT||e.keyCode===KeyCode.KEY_D)this.roadRightHeld=true;
        }else if(this.mode==='OldWu'){
            if(e.keyCode===KeyCode.SPACE)this.tryOldWuHiss();
            else if(e.keyCode===KeyCode.ARROW_UP||e.keyCode===KeyCode.KEY_W)this.moveWu(0,0.25);
            else if(e.keyCode===KeyCode.ARROW_DOWN||e.keyCode===KeyCode.KEY_S)this.moveWu(0,-0.25);
            else if(e.keyCode===KeyCode.ARROW_LEFT||e.keyCode===KeyCode.KEY_A)this.moveWu(-0.25,0);
            else if(e.keyCode===KeyCode.ARROW_RIGHT||e.keyCode===KeyCode.KEY_D)this.moveWu(0.25,0);
        }
    }
    private keyUp(e:EventKeyboard){
        if(this.mode!=='Road')return;
        if(e.keyCode===KeyCode.ARROW_LEFT||e.keyCode===KeyCode.KEY_A)this.roadLeftHeld=false;
        else if(e.keyCode===KeyCode.ARROW_RIGHT||e.keyCode===KeyCode.KEY_D)this.roadRightHeld=false;
    }
    update(dt:number){
        dt=Math.min(dt,0.05);this.clock+=dt;for(const c of this.cats)c.threatCooldown=Math.max(0,c.threatCooldown-dt);
        if(this.mode==='Road'){this.updateRoad(dt);return;}
        if(this.mode==='OldWu'){this.updateOldWu(dt);return;}
        if(this.mode==='LevelMenu'||this.mode==='MainMenu'||this.mode==='Settings')return;
        if(this.closeup&&this.cats.length){const c=this.cats[0];c.root.setRotationFromEuler(0,0,0);poseVoxelCat(c,'Idle',this.clock);const p=c.root.position;this.camera.node.setPosition(p.x+0.16,p.y+0.49,p.z+2);this.camera.node.lookAt(new Vec3(p.x,p.y+0.39,p.z+0.4));this.camera.orthoHeight=0.55;this.updateCatSprites();this.status.string=c.profile.name+' · 神态近景';return;}
        const groups=this.cats.length===2?[[0,1]]:proximityGroups(this.cats.map(c=>c.root.position),this.radius);
        for(const ids of groups){
            const group=ids.map(i=>this.cats[i]);
            if(group.length>=3){
                for(const c of group){if(c.state==='Threat'){const other=group.find(o=>o!==c);if(other)this.advanceToward(c,c.threatTarget??other.root.position,THREAT_STOP_DISTANCE,dt,THREAT_SPEED);c.timer-=dt;if(c.timer<=0){c.state='Idle';c.timer=1.5;c.threatCooldown=1.5;c.threatTarget=null;}continue;}const other=group.find(o=>o!==c)!;if(c.state!=='Hiss')this.enterHiss(c,other.root.position);c.timer-=dt;if(c.timer<=0)this.chooseLook(c);}
            }else if(group.length===2){
                const [a,b]=group;
                if(a.state==='Threat'||b.state==='Threat'){for(const c of [a,b])if(c.state==='Threat'){const other=c===a?b:a;this.advanceToward(c,c.threatTarget??other.root.position,THREAT_STOP_DISTANCE,dt,THREAT_SPEED);c.timer-=dt;if(c.timer<=0){c.state='Idle';c.timer=1.5;c.threatCooldown=1.5;c.threatTarget=null;}}continue;}
                const approachActor=[a,b].find(c=>c.state==='Strut'||c.state==='Leap');
                if(!approachActor&&a.threatCooldown<=0&&b.threatCooldown<=0&&(a.state!==b.state||['Hiss','Fight','Heal'].indexOf(a.state)<0)){
                    const distance=this.randomHissDistance();a.hissDistance=b.hissDistance=distance;
                    if(Vec3.distance(a.root.position,b.root.position)>distance+0.45)this.enterFarConfrontation(a,b);else{this.snapSpace(a,b,distance);this.enterHiss(a,b.root.position,distance);this.enterHiss(b,a.root.position,distance);}this.sound.playRandomConfrontation();
                }
                const active=[a,b].find(c=>c.state==='Strut'||c.state==='Leap');
                if(active){
                    const passive=active===a?b:a;this.updatePassiveApproach(passive,dt);
                    if(active.state==='Strut'){
                        this.advanceToward(active,passive.root.position,active.hissDistance,dt,10);this.face(active,passive.root.position);
                        if(Vec3.distance(active.root.position,passive.root.position)<=active.hissDistance+0.025){this.enterHiss(active,passive.root.position,active.hissDistance);this.enterHiss(passive,active.root.position,active.hissDistance);}
                    }else{
                        this.advanceToward(active,passive.root.position,active.hissDistance,dt,13);this.face(active,passive.root.position);active.timer-=dt;if(active.timer<=0||Vec3.distance(active.root.position,passive.root.position)<=active.hissDistance+0.025){this.snapSpace(active,passive,active.hissDistance);this.enterHiss(active,passive.root.position,active.hissDistance);this.enterHiss(passive,active.root.position,active.hissDistance);}
                    }
                }else if(a.state==='Hiss'){
                    a.timer-=dt;b.timer-=dt;if(a.timer<=0)this.chooseLook(a);if(b.timer<=0)this.chooseLook(b);
                    if(a.looking&&b.looking){a.health=Math.max(0,a.health-28);b.health=Math.max(0,b.health-28);this.enterFight(a,b);this.sound.play('fight');}
                }else if(a.state==='Fight'){
                    a.timer-=dt;b.timer=a.timer;
                    if(a.timer<=0){
                    const distance=this.randomHissDistance();a.hissDistance=b.hissDistance=distance;this.snapSpace(a,b,distance);this.enterHeal(a,b.root.position);this.enterHeal(b,a.root.position);
                    }
                }else if(a.state==='Heal'){
                    a.timer-=dt;b.timer=a.timer;
                    a.health=Math.min(a.maxHealth,a.health+dt*7);b.health=Math.min(b.maxHealth,b.health+dt*7);
                    if(a.timer<=0){const distance=this.randomHissDistance();a.hissDistance=b.hissDistance=distance;this.snapSpace(a,b,distance);this.enterHiss(a,b.root.position,distance);this.enterHiss(b,a.root.position,distance);this.sound.playRandomConfrontation();}
                }
            }else{
                const c=group[0];if(c.state==='Threat'){c.timer-=dt;if(c.timer<=0){c.state='Idle';c.timer=1.5;c.threatCooldown=1.5;c.threatTarget=null;}continue;}if(['Idle','Walk','Run','Crouch','Lie'].indexOf(c.state)<0){c.state='Idle';c.timer=1.5;}
                c.timer-=dt;
                if(c.timer<=0){const next=Math.random();c.state=next<0.40?'Idle':next<0.68?'Walk':next<0.84?'Run':next<0.93?'Crouch':'Lie';c.timer=c.state==='Crouch'?1.2+Math.random()*1.8:c.state==='Lie'?2+Math.random()*3:1.3+Math.random()*2.5;c.target.set((Math.random()-0.5)*10.2,0,(Math.random()-0.5)*8.2);}
                if(c.state==='Walk'||c.state==='Run'){this.face(c,c.target);const d=Vec3.subtract(new Vec3(),c.target,c.root.position);if(d.length()>0.08){d.normalize().multiplyScalar(dt*(c.state==='Run'?0.78:0.46));c.root.setPosition(Vec3.add(d,c.root.position,d));}else c.timer=0;}
            }
        }
        for(const c of this.cats){this.clamp(c);c.healFx.active=c.state==='Heal';if(c.healFx.active){const pulse=1+Math.sin(this.clock*4)*0.035;c.healFx.setScale(pulse,pulse,pulse);c.healPluses.forEach((plus,i)=>{const base=c.healPlusBases[i];plus.setPosition(base.x,base.y+Math.sin(this.clock*2.5+i*1.7)*0.06,base.z);});}poseVoxelCat(c,c.state,this.clock,dt,c.state==='Hiss'?c.headYaw:0,c.fightRoll,c.tailRate,c.healSitting,c.fightStyle,c.tailPhase);}
        this.updateCatSprites();
        const fighting=this.cats.some(c=>c.state==='Fight'),threatening=this.cats.some(c=>c.state==='Threat'),healing=this.cats.some(c=>c.state==='Heal'),approaching=this.cats.some(c=>c.state==='Strut'||c.state==='Leap'),hp=this.cats.length?Math.round(this.cats.reduce((sum,c)=>sum+c.health,0)/this.cats.length):0;this.status.string=`${this.environment.isCage?'白笼（近侧隐藏）':'大庭院'} · 猫咪随机生成 · ${this.cats.length}只 · 体型随机 · 平均血量${hp} · ${threatening?'老吴撼地掌':fighting?'贴近缠斗':healing?'嚼口香糖回血':approaching?(this.cats.some(c=>c.state==='Leap')?'瞬发飞扑':'人皇步接近'):this.cats.some(c=>c.state==='Hiss')?'保持距离对峙':'悠闲散步'}`;
    }
    private space(a:Cat,b:Cat,target:number,dt:number,speed=0.65){const p=pairSpacing(a.root.position,b.root.position,target,dt,speed);a.root.setPosition(p.a.x,0,p.a.z);b.root.setPosition(p.b.x,0,p.b.z);}
    private snapSpace(a:Cat,b:Cat,target:number){this.space(a,b,target,1,100);}
    private face(c:Cat,p:Readonly<Vec3>){const d=Vec3.subtract(new Vec3(),p,c.root.position);c.root.setRotationFromEuler(0,Math.atan2(d.x,d.z)*180/Math.PI,0);}
    private randomHissDistance(){return HISS_DISTANCE_MIN+Math.random()*(HISS_DISTANCE_MAX-HISS_DISTANCE_MIN);}
    private enterHiss(c:Cat,p:Readonly<Vec3>,distance=c.hissDistance||HISS_DISTANCE){
        c.hissDistance=distance;
        const bodyDirections=[-110,-80,-55,-35,-20,20,35,55,80,110];
        c.state='Hiss';c.healFx.active=false;c.hissArch=Math.random()<0.78?0.31:0;c.bodyOffset=bodyDirections[Math.floor(Math.random()*bodyDirections.length)];
        const d=Vec3.subtract(new Vec3(),p,c.root.position);c.root.setRotationFromEuler(0,Math.atan2(d.x,d.z)*180/Math.PI+c.bodyOffset,0);
        this.chooseLook(c);
    }
    private enterThreat(actor:Cat,passive:Cat){
        actor.state='Threat';actor.timer=THREAT_DURATION;actor.threatCooldown=1.5;actor.threatTarget=passive.root.position.clone();passive.threatCooldown=1.5;passive.state='Idle';passive.timer=1.5;this.face(actor,passive.root.position);
    }
    private chooseLook(c:Cat){
        const choices=[-145,-100,-70,-45,-22,22,45,70,100,145];
        c.looking=Math.random()<0.25;c.headYaw=c.looking?-c.bodyOffset:choices[Math.floor(Math.random()*choices.length)];
        c.timer=9+Math.random()*9;
    }
    private enterFight(a:Cat,b:Cat,forcedStyle?:number){
        const style=forcedStyle===undefined?Math.floor(Math.random()*4):forcedStyle;a.state=b.state='Fight';a.timer=b.timer=3;a.fightRoll=1;b.fightRoll=-1;a.fightStyle=b.fightStyle=style;
        this.snapSpace(a,b,style===1?1.16:style===2?1.12:style===3?0.58:FIGHT_DISTANCE);this.face(a,b.root.position);this.face(b,a.root.position);
        if(style===2){const skew=(Math.random()-0.5)*70;a.root.setRotationFromEuler(0,a.root.eulerAngles.y+skew,0);b.root.setRotationFromEuler(0,b.root.eulerAngles.y-skew*0.65,0);}
        if(style===3){
            // Turn both bodies along the same tangent so the side-lying
            // grapple is belly-to-belly rather than back-to-back.
            const heading=a.root.eulerAngles.y+90;
            a.root.setRotationFromEuler(0,heading+15,0);b.root.setRotationFromEuler(0,heading-15,0);
        }
    }
    private enterFarConfrontation(a:Cat,b:Cat){
        const actor=Math.random()<0.5?a:b,passive=actor===a?b:a;passive.state=Math.random()<0.5?'Idle':'Walk';passive.timer=2+Math.random()*3;passive.target.set(passive.root.position.x+(Math.random()-0.5)*1.4,0,passive.root.position.z+(Math.random()-0.5)*1.4);
        if(Math.random()<0.58){actor.state='Strut';actor.timer=8;actor.strutHeadYaw=-55+Math.random()*110;actor.strutArmPitches=[0,0,0,0];actor.strutArmSpreads=[0,0,0,0];for(const i of [1,3]){actor.strutArmPitches[i]=-34+Math.random()*25;actor.strutArmSpreads[i]=(i===1?-1:1)*(8+Math.random()*20);}this.face(actor,passive.root.position);}
        else{actor.state='Leap';actor.timer=0.42;this.face(actor,passive.root.position);}
    }
    private advanceToward(c:Cat,p:Readonly<Vec3>,stopDistance:number,dt:number,speed:number){const d=Vec3.subtract(new Vec3(),p,c.root.position),distance=d.length();if(distance<=stopDistance)return;d.normalize().multiplyScalar(Math.min(distance-stopDistance,dt*speed));c.root.setPosition(Vec3.add(d,c.root.position,d));}
    private updatePassiveApproach(c:Cat,dt:number){if(c.state!=='Walk')return;const d=Vec3.subtract(new Vec3(),c.target,c.root.position);if(d.length()>0.08){this.face(c,c.target);d.normalize().multiplyScalar(dt*0.18);c.root.setPosition(Vec3.add(d,c.root.position,d));}else c.state='Idle';}
    private enterHeal(c:Cat,p:Readonly<Vec3>){c.state='Heal';c.timer=4;c.healSitting=Math.random()<0.5;this.face(c,p);c.healFx.active=true;}
    onDestroy(){
        input.off(Input.EventType.TOUCH_START,this.touchStart,this);input.off(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.off(Input.EventType.TOUCH_END,this.touchEnd,this);input.off(Input.EventType.TOUCH_CANCEL,this.cancel,this);
        input.off(Input.EventType.MOUSE_DOWN,this.mouseStart,this);input.off(Input.EventType.MOUSE_MOVE,this.mouseMove,this);input.off(Input.EventType.MOUSE_UP,this.mouseEnd,this);input.off(Input.EventType.MOUSE_WHEEL,this.wheel,this);input.off(Input.EventType.KEY_DOWN,this.keyDown,this);input.off(Input.EventType.KEY_UP,this.keyUp,this);
        for(const c of this.cats){c.coat.destroy();c.texture.destroy();c.spriteNode?.destroy();}for(const car of this.roadCars)car.spriteNode?.destroy();for(const m of this.mats.values())m.destroy();for(const m of this.skins.values())m.destroy();this.sharedBox?.destroy();this.sharedRound?.destroy();
    }
}

