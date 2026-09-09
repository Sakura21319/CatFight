const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require(process.env.COCOS_TYPESCRIPT||'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/CatSurface.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
for(const arch of [0,0.23]){
    const mesh=context.exports.torsoGeometry(arch),edges=new Map();
    for(let i=0;i<mesh.indices.length;i+=3){const t=mesh.indices.slice(i,i+3);for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)||0)+1);}}
    assert.ok([...edges.values()].every(n=>n===2),'Skin must be closed with no open seams');
    assert.equal(mesh.positions.length/3,72);
    const top=mesh.positions[4*8*3+3*3+1];assert.ok(Math.abs(top-(0.125+arch))<1e-6);
}
console.log('PASS: closed continuous low-poly torso in both poses');
