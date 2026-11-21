const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('worker reuses model and loads distinct female and male presets',async()=>{
 const paths=[],calls=[],replies=[];let modelLoads=0;
 const self={postMessage:message=>replies.push(message)};
 const source=fs.readFileSync('public/voice/supertonic-worker.js','utf8').replace(/^import[^\n]*\n/,'');
 vm.runInNewContext(source,{self,Map,Float32Array,loadTextToSpeech:async()=>{modelLoads++;return {textToSpeech:{sampleRate:44100,call:async(_text,_lang,style)=>{calls.push(style);return {wav:[0.1,0.2]}}}}},loadVoiceStyle:async pathsIn=>{paths.push(pathsIn[0]);return pathsIn[0]}});
 for(const [id,voiceId]of [[1,'F1'],[2,'M1'],[3,'F1']]){self.onmessage({data:{id,type:'speak',text:'안녕',voiceId}});await new Promise(setImmediate)}
 assert.equal(modelLoads,1);assert.equal(paths.length,2);assert.ok(paths[0].endsWith('/F1.json'));assert.ok(paths[1].endsWith('/M1.json'));assert.equal(calls[0],calls[2]);assert.notEqual(calls[0],calls[1]);assert.equal(replies.filter(x=>x.type==='audio').length,3);
 self.onmessage({data:{id:4,type:'speak',text:'안녕',voiceId:'../../other'}});await new Promise(setImmediate);assert.equal(replies.at(-1).type,'error');assert.equal(paths.length,2);
});
