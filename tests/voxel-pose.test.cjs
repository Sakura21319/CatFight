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
poseVoxelCat(rig,'Idle',0);
const normalBack=rig.arch,normalHead=rig.head.position[1];
poseVoxelCat(rig,'Hiss',0);
assert.ok(rig.arch-normalBack>=0.2,'Back must visibly rise');
assert.ok(rig.head.position[1]<normalHead-0.1,'Head must lower');

poseVoxelCat(rig,'Fight',1/28);
assert.equal(rig.body.rotation[2],90,'Full side lying');
assert.equal(rig.body.position[1],0.165,'Flank close to ground');
assert.equal(rig.legs.length,4);
const forward=rig.legs.map(n=>n.rotation[0]);
poseVoxelCat(rig,'Fight',3/28);
rig.legs.forEach((n,i)=>{assert.ok(Math.abs(n.rotation[0])>60);assert.ok(forward[i]*n.rotation[0]<0,'Every leg reverses fore/aft');});
poseVoxelCat(rig,'Idle',0);
assert.equal(rig.body.rotation[2],0);
assert.equal(rig.arch,0);
assert.equal(rig.head.position[1],normalHead);
console.log('PASS: arched spine, lowered head, grounded 90-degree roll, four reversing legs, idle reset');


