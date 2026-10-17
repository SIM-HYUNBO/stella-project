const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const lib={exports:{}};vm.runInNewContext(compile(fs.readFileSync('lib/custom-stickers.ts','utf8')),lib);
function mount(getUserMedia){
 const slots=[];let cursor=0,effects=[],now=0,output,recorder;
 const react={useRef:v=>{const i=cursor++;return slots[i]??=( {current:v});},useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=v;return [slots[i],n=>slots[i]=n];},useCallback:fn=>{cursor++;return fn;},useEffect:fn=>{const i=cursor++;if(!(i in slots)){slots[i]={};effects.push(()=>slots[i].cleanup=fn());}}};
 const timeouts=new Map(),intervals=new Map();let seq=0;
 class Recorder {static isTypeSupported(){return true;}constructor(){recorder=this;this.state='inactive';this.mimeType='audio/webm;codecs=opus';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['test'])});this.onstop?.();}}
 class Reader{readAsDataURL(){this.result='data:audio/webm;codecs=opus;base64,AA==';this.onload?.();}abort(){}}
 const doc={hidden:false,addEventListener(){},removeEventListener(){}};
 const env={exports:{},require:k=>k==='react'?react:lib.exports,navigator:{mediaDevices:{getUserMedia}},MediaRecorder:Recorder,FileReader:Reader,Blob,DOMException,performance:{now:()=>now},document:doc,window:{dispatchEvent(){}},CustomEvent:class{},setTimeout:fn=>{timeouts.set(++seq,fn);return seq;},clearTimeout:id=>timeouts.delete(id),setInterval:fn=>{intervals.set(++seq,fn);return seq;},clearInterval:id=>intervals.delete(id)};
 vm.runInNewContext(compile(fs.readFileSync('app/hooks/useStickerVoice.ts','utf8')),env);
 const render=()=>{cursor=0;effects=[];const state=env.exports.default(v=>output=v);effects.forEach(fn=>fn());return state;};
 return {render,advance:ms=>now+=ms,output:()=>output,unmount:()=>slots.forEach(v=>v?.cleanup?.()),timeouts,intervals,recorder:()=>recorder};
}
(async()=>{
 let stops=0;const stream={getTracks:()=>[{stop(){stops++;}}]};
 let test=mount(async()=>stream);await test.render().start();assert.equal(test.render().phase,'recording');test.advance(2000);test.render().stop();
 assert.equal(test.render().phase,'idle');assert.equal(test.output().duration,2);assert.ok(stops>0);assert.equal(test.timeouts.size,0);assert.equal(test.intervals.size,0);test.unmount();
 test=mount(async()=>{throw new DOMException('denied','NotAllowedError');});await test.render().start();assert.equal(test.render().phase,'idle');assert.match(test.render().error,/권한/);test.unmount();
 let resolve;test=mount(()=>new Promise(r=>resolve=r));const pending=test.render().start();test.unmount();stops=0;resolve(stream);await pending;assert.equal(stops,1);assert.equal(test.output(),undefined);
 test=mount(async()=>stream);await test.render().start();test.advance(6000);[...test.timeouts.values()][0]();assert.equal(test.output().duration,6);assert.equal(test.render().busy,false);test.unmount();
 console.log('Sticker voice: successful recording, permission denial, late permission cleanup, auto-stop and track/timer release passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
