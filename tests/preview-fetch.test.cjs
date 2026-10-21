const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{EventEmitter}=require('node:events');
function fixture(replies,addresses=[{address:'8.8.8.8',family:4}]){
 const calls=[];let dns=0;
 function request(url,options,callback){calls.push(url.href);const req=new EventEmitter();req.destroy=e=>{req.emit('error',e);req.emit('close');};req.end=()=>queueMicrotask(()=>{
  options.lookup(url.hostname,{all:true},(error,result)=>{assert.equal(error,null);assert.equal(result[0].address,'8.8.8.8');});
  const reply=replies.shift(),res=new EventEmitter();res.statusCode=reply.status||200;res.headers={'content-type':'text/html',...reply.headers};res.resume=()=>{};callback(res);
  if(res.statusCode===200){res.emit('data',Buffer.from(reply.body||'<title>Hello</title>'));res.emit('end');}req.emit('close');
 });return req;}
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/preview-fetch.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>name==='node:dns/promises'?{lookup:async()=>{dns++;return addresses;}}:name==='node:http'||name==='node:https'?{request}:require(name),URL,Buffer,setTimeout,clearTimeout});
 return {api:exports,calls,dns:()=>dns};
}
(async()=>{
 let f=fixture([{body:'<title>Public page</title>'}]);assert.equal((await f.api.previewHTML('https://example.test/path')).html,'<title>Public page</title>');assert.equal(f.dns(),1);assert.equal(f.calls.length,1);
 f=fixture([{status:302,headers:{location:'http://127.0.0.1/private'}}]);await assert.rejects(f.api.previewHTML('https://example.test'),/private_address/);assert.equal(f.calls.length,1);
 f=fixture([{body:'x'.repeat(512001)}]);await assert.rejects(f.api.previewHTML('https://example.test'),/too_large/);
 f=fixture([{status:302,headers:{location:'http://['}}]);await assert.rejects(f.api.previewHTML('https://example.test'),/invalid_redirect/);
 f=fixture(Array.from({length:4},()=>({status:302,headers:{location:'/again'}})));await assert.rejects(f.api.previewHTML('https://example.test'),/invalid_url/);assert.equal(f.calls.length,4);
 f=fixture([],[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]);await assert.rejects(f.api.previewHTML('https://example.test'),/private_address/);assert.equal(f.calls.length,0);
 console.log('Link previews: validated DNS pinning, private redirect rejection, body limit, redirect limit and mixed DNS rejection passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
