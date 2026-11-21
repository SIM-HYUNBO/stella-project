const { test }=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const subject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/ai-voice-session.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:subject,Error,setTimeout,clearTimeout});
function harness(send=async()=> '답변'){
 const timers=new Map(),recs=[],speeches=[],states=[];let seq=0,busy=false;
 const deps={createRecognition(){const rec={start(){},abort(){this.aborted=true},onresult:null,onend:null,onerror:null};recs.push(rec);return rec},busy:()=>busy,send,speak(text,started,ended,failed){const speech={text,ended,failed,cancelled:false};speeches.push(speech);started();return()=>{speech.cancelled=true}},state:s=>states.push(s),schedule(fn,ms){timers.set(++seq,{fn,ms});return seq},cancel(id){timers.delete(id)}};
 const session=new subject.AIVoiceSession(deps);
 const flush=async()=>{await Promise.resolve();await Promise.resolve()};
 const advance=async ms=>{for(const [id,timer]of [...timers])if(timer.ms===ms){timers.delete(id);timer.fn()}await flush()};
 const result=(text,final=true)=>recs.at(-1).onresult({results:[Object.assign([{transcript:text}],{isFinal:final})]});
 return {session,recs,speeches,states,timers,deps,result,advance,flush,busy(value){busy=value}};
}
test('automatically completes two turns, listening again only after playback ends',async()=>{
 const calls=[];const h=harness(async text=>{calls.push(text);return '답변'});h.session.start();
 h.result('첫 질문');h.recs.at(-1).onend();await h.flush();assert.equal(h.recs.length,1);assert.equal(h.recs[0].aborted,true);assert.equal(h.states.at(-1).phase,'speaking');
 h.speeches[0].ended();await h.advance(500);assert.equal(h.recs.length,2);assert.equal(h.states.at(-1).phase,'listening');
 h.result('두 번째 질문');h.recs.at(-1).onend();await h.flush();assert.deepEqual(calls,['첫 질문','두 번째 질문']);assert.equal(h.speeches.length,2);
});
test('interim transcript is submitted automatically after silence, once',async()=>{
 let calls=0;const h=harness(async()=>{calls++;return '답'});h.session.start();h.result('아직 최종 아님',false);const end=h.recs[0].onend;await h.advance(1800);end();await h.flush();assert.equal(calls,1);
});
test('silence restarts listening without sending empty prompts',async()=>{
 let calls=0;const h=harness(async()=>{calls++});h.session.start();h.recs[0].onerror({error:'no-speech'});await h.advance(700);assert.equal(h.recs.length,2);assert.equal(calls,0);
});
test('closing while awaiting AI never starts speech or restarts mic',async()=>{
 let resolve;const h=harness(()=>new Promise(done=>{resolve=done}));h.session.start();h.result('질문');h.recs[0].onend();h.session.stop();resolve('늦은 답');await h.flush();assert.equal(h.speeches.length,0);assert.equal(h.timers.size,0);
});
test('pause stops playback; resume starts a new microphone session',async()=>{
 const h=harness();h.session.start();h.result('질문');h.recs[0].onend();await h.flush();h.session.pause();assert.equal(h.speeches[0].cancelled,true);h.speeches[0].ended();assert.equal(h.timers.size,0);h.session.start();assert.equal(h.recs.length,2);
});
test('permission and request errors stop automatic retries',async()=>{
 const h=harness();h.session.start();h.recs[0].onerror({error:'not-allowed'});assert.equal(h.states.at(-1).phase,'error');assert.equal(h.timers.size,0);
 const other=harness(async()=>{throw Error('database quota')});other.session.start();other.result('질문');other.recs[0].onend();await other.flush();assert.equal(other.states.at(-1).error,'database quota');assert.equal(other.timers.size,0);
});
test('next turn uses latest callback and waits for outstanding parent request',async()=>{
 const h=harness();h.session.start();h.result('첫 질문');h.recs[0].onend();await h.flush();h.busy(true);h.speeches[0].ended();await h.advance(500);assert.equal(h.recs.length,1);h.busy(false);let latest=false;h.deps.send=async()=>{latest=true;return '새 답'};await h.advance(300);h.result('다음');h.recs[1].onend();await h.flush();assert.equal(latest,true);
});
test('voice entry remains outside the name editing conditional',()=>{
 const src=ts.createSourceFile('page.tsx',fs.readFileSync('app/robot/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let count=0;
 function visit(node){if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(src)==='AIVoiceConversation'){count++;for(let p=node.parent;p;p=p.parent)assert.equal(ts.isConditionalExpression(p),false)}ts.forEachChild(node,visit)}visit(src);assert.equal(count,1);
});
test('prepares natural voice before opening microphone, cancellation stays stopped',async()=>{
 const h=harness();let resolve;h.deps.prepare=()=>new Promise(done=>{resolve=done});h.session.start();assert.equal(h.recs.length,0);assert.equal(h.states.at(-1).phase,'loading');h.session.stop();resolve();await h.flush();assert.equal(h.recs.length,0);
});
