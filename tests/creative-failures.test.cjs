const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function fn(file,name){const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,99,true,4);let found;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)found=n.initializer.getText(ast);ts.forEachChild(n,walk);}walk(ast);return ts.transpileModule(`var action=${found}`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;}
(async()=>{
 for(const kind of ['draw','story']){
  let requesting,alerts=0;const env={nickname:'Alice',outgoing:null,requesting:null,setRequesting:v=>requesting=v,db:{},collection:()=>{},serverTimestamp:()=>0,addDoc:async()=>{throw Error('offline');},alert:()=>alerts++};
  vm.runInNewContext(fn(`app/creative/${kind}/page.tsx`,'sendRequest'),env);await env.action({nickname:'Bob'});assert.equal(requesting,null);assert.equal(alerts,1);
 }
 let sending,input='keep my sentence',alerts=0;const env={input,nickname:'Alice',isMyTurn:true,sending:false,setSending:v=>sending=v,setInput:v=>input=v,db:{},sessionId:'story',collection:()=>{},serverTimestamp:()=>0,addDoc:async()=>{throw Error('offline');},alert:()=>alerts++};
 vm.runInNewContext(fn('app/creative/story/[sessionId]/page.tsx','sendLine'),env);await env.action();assert.equal(sending,false);assert.equal(input,'keep my sentence');assert.equal(alerts,1);
 console.log('Creative failures: both request buttons unlock, story input survives failed writes and sending resets passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
