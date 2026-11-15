const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let authenticate,cleanup;
const listeners=new Map(), calls=[], sources=new Map();
const firestore={
 doc:(_db,...parts)=>parts.join('/'),
 collection:(_db,...parts)=>({path:parts.join('/'),filters:[]}),
 where:(...args)=>args,
 query:(ref,...filters)=>({...ref,filters:[...ref.filters,...filters]}),
 onSnapshot:(ref,fn)=>{const key=ref.path||ref;listeners.set(key,fn);return ()=>listeners.delete(key);},
 getCountFromServer:async ref=>({data:()=>({count:(sources.get(ref.path)||[]).filter(row=>ref.filters.every(([key,op,value])=>op==='=='?row[key]===value:row[key]?.includes(value))).length})}),
};
const events=new Map();
const env={exports:{},navigator:{setAppBadge:async n=>calls.push(n),clearAppBadge:async()=>calls.push(0)},document:{hidden:false,addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key)},window:{addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key),setInterval:()=>1,clearInterval:()=>{},setTimeout:fn=>fn(),clearTimeout:()=>{}},require:name=>name==='react'?{useEffect:fn=>cleanup=fn()}:name==='firebase/auth'?{onAuthStateChanged:(_a,fn)=>{authenticate=fn;return ()=>{};}}:name==='firebase/firestore'?firestore:name==='@/components/HiddenFriends'?{useHiddenFriends:()=>({ready:true,names:new Set(['Hidden'])})}:{auth:{},db:{}}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/AppBadge.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,env);env.exports.default();
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const snap=(...ids)=>({docs:ids.map(id=>({id}))});
(async()=>{
 sources.set('group_rooms/g/messages',[{from:'Bob',readBy:[]},{from:'Hidden',readBy:[]},{from:'Alice',readBy:[]},{from:'Alice',readBy:['Alice']}]);
 sources.set('meeting_rooms/m/messages',[{from:'Bob',readBy:[]}]);
 authenticate({uid:'a'});listeners.get('users/a')({data:()=>({nickname:'Alice'})});
 listeners.get('group_rooms')(snap('g'));listeners.get('meeting_rooms')(snap('m'));await tick();
 assert.equal(calls.at(-1),2);
 assert.equal(listeners.has('group_rooms/g/messages'),false);
 listeners.get('group_rooms')(snap());await tick();assert.equal(calls.at(-1),1);
 sources.set('meeting_rooms/m/messages',[{from:'Bob',readBy:['Alice']}]);
 events.get('wagie:messages-read')();await tick();assert.equal(calls.at(-1),0);
 authenticate(null);assert.equal(listeners.size,0);assert.equal(calls.at(-1),0);cleanup();
 console.log('Badge: aggregate counts, own messages, room leave, read and logout passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
