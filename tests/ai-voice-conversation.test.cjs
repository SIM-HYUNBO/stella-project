const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness(onSend) {
 const hooks=[]; let cursor=0, rec, spoken=[];
 const useState = initial => { const i=cursor++; if (!(i in hooks)) hooks[i]=initial; return [hooks[i], next=>{ hooks[i]=typeof next==='function'?next(hooks[i]):next; }]; };
 const useRef = initial => { const i=cursor++; if (!(i in hooks)) hooks[i]={current:initial}; return hooks[i]; };
 const element = (type, props)=>({type,...props});
 const speech = { cancel(){}, getVoices(){return []}, speak(value){spoken.push(value)} };
 const window = { speechSynthesis:speech, SpeechRecognition:class { constructor(){rec=this} start(){} abort(){this.onend?.()} } };
 const mod={exports:{}};
 const source=ts.transpileModule(fs.readFileSync('components/AIVoiceConversation.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(source,{exports:mod.exports, window, document:{body:{}}, SpeechSynthesisUtterance:class { constructor(text){this.text=text} }, require(name){ if(name==='react')return {useState,useRef,useEffect(){}}; if(name==='react/jsx-runtime')return {jsx:element,jsxs:element,Fragment:'fragment'}; if(name==='react-dom')return {createPortal:x=>x}; if(name==='lucide-react')return {}; throw Error(name); }});
 let tree;
 const render=()=>{cursor=0;tree=mod.exports.default({disabled:false,name:'AI',onSend});return tree};
 function find(label,node=tree) { if(!node||typeof node!=='object')return; if(node['aria-label']===label || (node.type==='button' && node.children?.includes?.(label)))return node; for(const child of [node.children].flat(Infinity).filter(child=>child != null)){ const match=find(label,child);if(match)return match; } }
 render();find('음성 대화').onClick();render();find('말하기').onClick();render();
 return { render, find, rec:()=>rec, spoken, result(text){rec.onresult({results:[Object.assign([{transcript:text}],{isFinal:true})]})} };
}
test('finalized speech sends once and speaks the answer',async()=>{
 const calls=[];const h=harness(async text=>{calls.push(text);return '**안녕**'});
 h.result('안녕');assert.equal(calls.length,0);await h.rec().onend();
 assert.deepEqual(calls,['안녕']);assert.equal(h.spoken.length,1);assert.equal(h.spoken[0].text.includes('*'),false);
});
test('closing while waiting never speaks a late answer',async()=>{
 let resolve;const h=harness(()=>new Promise(done=>{resolve=done}));h.result('질문');const pending=h.rec().onend();
 h.render();h.find('음성 대화 닫기').onClick();resolve('늦은 답변');await pending;assert.equal(h.spoken.length,0);
});
test('empty recognition never sends a request',async()=>{
 let calls=0;const h=harness(async()=>{calls++;return '답'});await h.rec().onend();assert.equal(calls,0);assert.equal(h.spoken.length,0);
});
