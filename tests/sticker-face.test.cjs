const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const env = {exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/sticker-face.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,env);
const {landmarkPose,paintStickerFace}=env.exports;
const eye=(x,open=1)=>[{x,y:50},{x:x+4,y:50-3*open},{x:x+8,y:50-3*open},{x:x+12,y:50},{x:x+8,y:50+3*open},{x:x+4,y:50+3*open}];
let pose=landmarkPose(eye(20),eye(80),{x:56,y:85},0);
assert.equal(pose.left,1);assert.equal(pose.right,1);assert.ok(Math.abs(pose.roll)<0.001);
pose=landmarkPose(eye(20,0),eye(80,0),{x:56,y:85},1);
assert.equal(pose.left,0);assert.equal(pose.right,0);
assert.equal(landmarkPose([],[],{x:0,y:0},0),null);
assert.equal(landmarkPose(eye(20),eye(80),{x:NaN,y:0},0),null);
const calls=[];const ctx=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});
paintStickerFace({width:384,height:384,getContext:()=>ctx},{naturalWidth:384,naturalHeight:384},pose,[{x:.35,y:.4},{x:.65,y:.4}]);
assert.equal(calls.filter(c=>c[0]==='drawImage').length,3);
assert.equal(calls.find(c=>c[0]==='clip')[1],'evenodd');
const eyes=calls.filter(c=>c[0]==='drawImage').slice(1);
assert.ok(eyes.every(c=>c.at(-1)<5),'closed eye patches should compress');
assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
for(const model of ['tiny_face_detector_model','face_landmark_68_tiny_model']){
 const manifest=JSON.parse(fs.readFileSync(`public/sticker-face-models/${model}-weights_manifest.json`,'utf8'));
 for(const group of manifest)for(const file of group.paths)assert.ok(fs.existsSync(`public/sticker-face-models/${file}`));
}
console.log('Sticker face: blink/head mapping, invalid landmarks, eye-only redraw and local model files passed');
