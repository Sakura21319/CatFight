const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ts=require(process.env.COCOS_TYPESCRIPT||'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript');
class Node {
    constructor(name){this.name=name;this.position=[0,0,0];this.rotation=[0,0,0];this.children=[];}
    addChild(node){this.children.push(node);}
    setPosition(...v){this.position=v;}
    setRotationFromEuler(...v){this.rotation=v;}
    setScale(...v){this.scale=v;}
}
const breedModule={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/CatBreeds.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,breedModule);
const context={exports:{},require(name){if(name==='cc')return {Node};if(name==='./CatBreeds')return breedModule.exports;throw Error(name);}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/VoxelCat.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {createVoxelCat,poseVoxelCat}=context.exports;
const rig=createVoxelCat(new Node('root'),(p,name,pos,size)=>{const n=new Node(name);n.setPosition(...pos);n.setScale(...size);p.addChild(n);return n;},breedModule.exports.BREEDS[0]);
assert.equal(rig.tailSegments.length,7,'Tail is built from independently poseable segments');
assert.equal(rig.claws.length,12,'Each paw has three visible pixel claws');
assert.ok(rig.mouthScale>=0.88&&rig.mouthScale<=1.12,'Mouth size is varied within a readable range');
const eyeNode=rig.head.children.find(n=>n.name==='Pixel eye socket centre');assert.ok(eyeNode.scale[0]>0.08&&eyeNode.scale[0]<0.11,'Eye width is varied within a readable range');
assert.ok(rig.head.children.filter(n=>n.name==='Top head marking').length>0,'Every cat head must have a visible crown marking');
for(const breed of breedModule.exports.BREEDS){
    const variant=createVoxelCat(new Node('root'),(p,name,pos,size)=>{const n=new Node(name);n.setPosition(...pos);n.setScale(...size);p.addChild(n);return n;},breed);
    assert.ok(variant.head.children.some(n=>n.name==='Top head marking'),breed.name+' must have a crown marking');
}
poseVoxelCat(rig,'Idle',0);
const normalBack=rig.arch,normalHead=rig.head.position[1];
poseVoxelCat(rig,'Hiss',0);
assert.ok(rig.arch-normalBack>=0.2,'Back must visibly rise');
assert.ok(rig.head.position[1]<normalHead-0.1,'Head must lower');
poseVoxelCat(rig,'Hiss',0,1,52);
assert.equal(rig.head.rotation[1],52,'Head yaw must be independent from body yaw');
assert.equal(rig.body.rotation[0],0,'Confrontation torso must stay still');
assert.equal(rig.body.rotation[2],0,'Confrontation torso must not sway');
const frozenHiss=rig.legs.map(n=>n.rotation[0]);
poseVoxelCat(rig,'Hiss',2,1,52);
assert.deepEqual(rig.legs.map(n=>n.rotation[0]),frozenHiss,'Confrontation legs must stay still');
assert.ok(rig.legs[1].rotation[2]<-20&&rig.legs[3].rotation[2]>20,'Confrontation forepaws must fan outward with claws open');
assert.equal(rig.head.rotation[1],52,'Confrontation head direction must stay fixed until rerolled');
poseVoxelCat(rig,'Hiss',0.5,1,52,1,1.4);
const tailAtFirstBeat=rig.tail.rotation[1];
poseVoxelCat(rig,'Hiss',1.2,1,52,1,1.4);
assert.notEqual(rig.tail.rotation[1],tailAtFirstBeat,'Confrontation tail must sway at its assigned natural rate');

poseVoxelCat(rig,'Fight',1/28);
assert.equal(rig.body.rotation[2],90,'Full side lying');
assert.equal(rig.body.position[1],0.15,'Flank close to ground');
assert.equal(rig.legs.length,4);
const forward=rig.legs.map(n=>n.rotation[0]);
poseVoxelCat(rig,'Fight',3/28);
rig.legs.forEach((n,i)=>{
    if(i%2===1){assert.ok(n.rotation[0]<-40,'Front legs must wrap around the opponent');assert.equal(Math.abs(n.rotation[2]),32,'Front legs must angle inward to hug');}
    else{assert.ok(Math.abs(n.rotation[0])>60);assert.ok(forward[i]*n.rotation[0]<0,'Rear legs must reverse for rapid kicking');}
});
poseVoxelCat(rig,'Fight',3/28,1,0,-1);
assert.equal(rig.body.rotation[2],-90,'Second cat must roll toward the opposite flank');
poseVoxelCat(rig,'Heal',0.2,1,0,1,1,true);
const firstChew=rig.mouth.scale[1];
poseVoxelCat(rig,'Heal',0.7,1,0,1,1,true);
assert.notEqual(rig.mouth.scale[1],firstChew,'Healing mouth must visibly chew');
assert.equal(rig.body.position[1],0.31,'Backward sitting heal pose must lower the rear body');
assert.equal(rig.body.position[2],-0.18,'Backward sitting heal pose must shift the hips rearward');
assert.equal(rig.body.rotation[0],-28,'Backward sitting heal pose must lift the chest and head');
assert.ok(rig.legs.some(n=>n.rotation[0]===-62),'Sitting heal pose must stretch the rear legs forward');
poseVoxelCat(rig,'Fight',0.25,1,0,1,1,false,1);
assert.equal(rig.body.rotation[2],0,'Second fight style keeps the bodies upright and face to face');
assert.equal(rig.body.position[1],0.42,'Second fight style stays standing');
poseVoxelCat(rig,'Fight',1/24,1,0,1,1,false,2);
assert.equal(rig.body.rotation[2],90,'Third fight style lies on its side');
assert.ok(rig.legs.every(n=>Math.abs(n.rotation[0])>70),'Third fight style kicks with all four legs');
poseVoxelCat(rig,'Fight',0.18,1,0,1,1,false,3);
assert.equal(rig.body.rotation[2],-82,'Fourth fight style turns the belly toward the other cat');
assert.equal(rig.body.position[1],0.27,'Fourth fight style keeps the bodies low and interlocked');
assert.equal(rig.head.rotation[1],38,'Fourth fight style offsets the head instead of facing the opponent');
assert.ok(rig.legs[1].rotation[0]<-35&&rig.legs[3].rotation[0]<-35,'Fourth fight style wraps both forelegs around the bodies');
poseVoxelCat(rig,'Fight',0.18,1,0,-1,1,false,3);
assert.equal(rig.body.rotation[2],82,'Fourth fight style mirrors the belly roll for the second cat');
poseVoxelCat(rig,'Threat',0.2);
assert.equal(rig.body.rotation[0],-18,'Ground-paw threat leans into the pounce');
assert.equal(rig.body.rotation[2],0,'Ground-paw threat stays upright');
assert.equal(rig.legs[1].rotation[0],-76,'Ground-paw threat throws the first front paw forward at a lower angle');
assert.equal(rig.legs[3].rotation[0],-76,'Ground-paw threat throws the second front paw forward at a lower angle');
assert.ok(rig.legs[1].rotation[2]<-20&&rig.legs[3].rotation[2]>20,'Ground-paw threat spreads the paws outward');
assert.equal(rig.legs[0].rotation[0],0,'Ground-paw threat keeps the rear legs still');
assert.equal(rig.legs[2].rotation[0],0,'Ground-paw threat keeps both rear legs still');
const threatPose=rig.legs.map(n=>n.rotation.slice());poseVoxelCat(rig,'Threat',1.1);
assert.deepEqual(rig.legs.map(n=>n.rotation),threatPose,'Ground-paw threat keeps every leg fixed during the one-shot pose');
assert.equal(rig.legs[0].children[0].scale[1],0.38,'Legs use the extended length');
rig.strutHeadYaw=37;rig.strutArmPitches=[0,-21,0,-29];rig.strutArmSpreads=[0,-14,0,19];poseVoxelCat(rig,'Strut',0.4);
assert.ok(rig.body.rotation[0]<-50,'Human-emperor step must lift the torso upright');
assert.equal(rig.body.position[1],0.57,'Human-emperor step must stand tall on the rear legs');
assert.equal(rig.body.rotation[2],0,'Human-emperor step torso must not sway');
const strutHead=rig.head.rotation[1],strutArms=[rig.legs[1].rotation.slice(),rig.legs[3].rotation.slice()];poseVoxelCat(rig,'Strut',1.4,1,0,1,1.7);
assert.equal(rig.head.rotation[1],strutHead,'Human-emperor step head direction must lock when triggered');
assert.deepEqual([rig.legs[1].rotation,rig.legs[3].rotation],strutArms,'Human-emperor step front paws must stay fixed');
poseVoxelCat(rig,'Leap',0.4);
assert.equal(rig.body.position[1],0.72,'Instant leap must visibly leave the ground');
poseVoxelCat(rig,'Run',0.1);
const runLegs=rig.legs.map(n=>n.rotation[0]);
assert.ok(runLegs.some(v=>Math.abs(v)>30),'Run pose uses a wider stride');
poseVoxelCat(rig,'Crouch',0);
assert.equal(rig.body.position[1],0.29,'Crouch pose lowers the body');
poseVoxelCat(rig,'Lie',0);
assert.equal(rig.body.position[1],0.16,'Lie pose rests the body near the ground');
poseVoxelCat(rig,'Idle',0);
assert.equal(rig.body.rotation[2],0);
assert.equal(rig.arch,0);
assert.equal(rig.head.position[1],normalHead);
console.log('PASS: arched spine, independent averted head, mirrored belly roll, four reversing legs, idle reset');


