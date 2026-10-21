const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,require,extra={}){const context={exports:{},require,Response,Request,Headers,Date,Buffer,URL,process:{env:{}},console,...extra};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,context);return context.exports;}
const next={NextResponse:{json:(data,options)=>Response.json(data,options)}};
function fixture(){
 const data=new Map([['users/a',{nickname:'Alice'}],['users/b',{nickname:'Bob'}],['users/c',{nickname:'Stranger'}],['friends/ab',{users:['a','b']}],['fcm_tokens/Bob',{token:'bob-token'}]]);
 let count=0,authDeleted=[];
 const snapshot=key=>({id:key.split('/').pop(),exists:data.has(key),data:()=>data.get(key),ref:ref(key)});
 const change=(key,values)=>{const current={...data.get(key)};for(const [k,v]of Object.entries(values))current[k]=v?.remove!==undefined?(current[k]||[]).filter(x=>x!==v.remove):v;data.set(key,current);};
 function ref(key){return {key,id:key.split('/').pop(),get:async()=>snapshot(key),set:async(v,o)=>o?.merge?change(key,v):data.set(key,v),update:async v=>change(key,v),delete:async()=>data.delete(key),collection:name=>collection(`${key}/${name}`)};}
 function collection(key,filters=[],maximum=Infinity){return {key,doc:id=>ref(`${key}/${id||'auto'+(++count)}`),where:(f,op,v)=>collection(key,[...filters,[f,op,v]],maximum),limit:n=>collection(key,filters,n),get:async()=>{const docs=[...data.keys()].filter(k=>k.startsWith(key+'/')&&k.split('/').length===key.split('/').length+1).filter(k=>filters.every(([f,op,v])=>op==='array-contains'?data.get(k)[f]?.includes(v):data.get(k)[f]===v)).slice(0,maximum).map(snapshot);return {docs,empty:!docs.length};},add:async value=>{const r=ref(`${key}/auto${++count}`);await r.set(value);return r;}};}
 const db={collection,collectionGroup:()=>({where:()=>({get:async()=>({docs:[]})})}),doc:ref,runTransaction:async fn=>{const writes=[];const out=await fn({get:r=>r.get(),set:(r,v,o)=>writes.push(()=>r.set(v,o)),update:(r,v)=>writes.push(()=>r.update(v)),delete:r=>writes.push(()=>r.delete())});for(const w of writes)await w();return out;},recursiveDelete:async r=>{for(const key of [...data.keys()])if(key===r.key||key.startsWith(r.key+'/'))data.delete(key);}};
 const sends=[];const admin={firestore:Object.assign(()=>db,{FieldValue:{serverTimestamp:()=>123,arrayRemove:v=>({remove:v})}}),auth:()=>({verifyIdToken:async token=>{if(!['a','b','c'].includes(token))throw Error('invalid');return {uid:token};},deleteUser:async uid=>authDeleted.push(uid)}),messaging:()=>({send:async message=>sends.push(message)})};
 const user=load('lib/api-user.ts',()=>()=>admin);
 const api=file=>load(file,name=>name==='next/server'?next:name==='@/lib/api-user'?user:()=>admin);
 const req=(uid,body)=>({headers:new Headers(uid?{Authorization:`Bearer ${uid}`} : {}),json:async()=>body});
 return {data,db,admin,user,api,req,sends,authDeleted};
}
(async()=>{
 let f=fixture(),push=f.api('app/api/fcm/route.ts');
 assert.equal((await f.api('app/api/ai/route.ts').POST(f.req(null,{messages:[]}))).status,401);
 assert.equal((await push.POST(f.req(null,{}))).status,401);
 assert.equal((await push.POST(f.req('invalid',{}))).status,401);
 assert.equal((await push.POST(f.req('a',{toNicknames:['Stranger'],message:'spam'}))).status,403);assert.equal(f.sends.length,0);
 let res=await push.POST(f.req('a',{toNicknames:['Bob'],fromNickname:'forged',message:'hello'}));assert.equal(res.status,200);assert.match(f.sends[0].data.title,/Alice/);assert.ok(!f.sends[0].data.title.includes('forged'));
 f.data.get('users/b').pushEnabled=false;await push.POST(f.req('a',{toNicknames:['Bob'],message:'quiet'}));assert.equal(f.sends.length,1);assert.ok([...f.data.values()].some(v=>v.message==='quiet'));
 f.data.delete('fcm_tokens/Bob');delete f.data.get('users/b').pushEnabled;await push.POST(f.req('a',{toNicknames:['Bob'],message:'inbox only'}));assert.ok([...f.data.values()].some(v=>v.message==='inbox only'));
 f=fixture();await f.user.apiRateLimit(f.db,'a','ai',1);await assert.rejects(f.user.apiRateLimit(f.db,'a','ai',1),e=>e.status===429);
 f=fixture();f.data.set('group_rooms/g',{members:['Alice','Bob']});f.data.set('meeting_rooms/m',{members:['Alice','Bob']});
 const deletion=f.api('app/api/delete-account/route.ts');res=await deletion.POST(f.req('a',{idToken:'a',nickname:'Bob'}));assert.equal(res.status,200);assert.ok(f.data.has('users/b'));assert.ok(f.data.has('fcm_tokens/Bob'));assert.equal(f.data.get('group_rooms/g').members.includes('Alice'),false);assert.equal(f.data.get('meeting_rooms/m').members.includes('Alice'),false);assert.deepEqual(f.authDeleted,['a']);
 f=fixture();f.data.set('messages/msg',{from:'Alice',to:'Bob',readBy:['Alice']});f.data.set('group_rooms/g',{members:['Alice','Bob']});f.data.set('group_rooms/g/messages/other',{from:'Bob',readBy:['Alice']});
 const rename=f.api('app/api/migrate-nickname/route.ts');res=await rename.POST(f.req('a',{idToken:'a',from:'Alice',to:'Alicia'}));assert.equal(res.status,200);assert.equal(f.data.get('users/a').nickname,'Alicia');assert.equal(f.data.get('messages/msg').from,'Alicia');assert.equal(f.data.get('messages/msg').fromUid,'a');assert.equal(f.data.get('group_rooms/g/messages/other').readBy[0],'Alicia');assert.equal((await rename.POST(f.req('a',{idToken:'a',from:'Alice',to:'Alicia'}))).status,200);
 res=await rename.POST(f.req('c',{idToken:'c',from:'Bob',to:'Taken'}));assert.equal(res.status,403);
 f=fixture();f.data.set('draw_requests/r',{from:'Alice',to:'Bob',status:'accepted',sessionId:'draw_one'});f.data.set('draw_sessions/draw_one/strokes/s',{points:[1]});const session=f.api('app/api/creative-session/route.ts');assert.equal((await session.POST(f.req('c',{kind:'draw',id:'r'}))).status,403);
 const stroke={kind:'draw',id:'r',action:'stroke',strokeId:'new',stroke:{color:'#112233',size:7,points:[{x:10,y:10},{x:20,y:20}]}};
 assert.equal((await session.POST(f.req('a',stroke))).status,200);assert.equal(f.data.get('draw_sessions/draw_one/strokes/new').by,'Alice');
 assert.equal((await session.POST(f.req('a',{kind:'draw',id:'r'}))).status,200);assert.equal(f.data.get('draw_requests/r').status,'ended');assert.equal(f.data.has('draw_sessions/draw_one/strokes/s'),false);
 assert.equal((await session.POST(f.req('a',stroke))).status,409);assert.equal(f.data.has('draw_sessions/draw_one/strokes/new'),false);
 const preview=load('lib/preview-fetch.ts',name=>name==='node:dns/promises'?{lookup:async()=>[{address:'127.0.0.1',family:4}]}:require(name),{setTimeout,clearTimeout});
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.0.1','100.64.0.1','::1','0.0.0.0'])assert.equal(preview.publicIPv4(ip),false);assert.equal(preview.publicIPv4('8.8.8.8'),true);
 await assert.rejects(preview.previewHTML('http://example.test'),/private_address/);await assert.rejects(preview.previewHTML('file:///etc/passwd'),/invalid_url/);
 console.log('Review fixes: auth, sender identity, push preferences/inbox, shared rate limit, safe account deletion, nickname migration/retry, creative cleanup and SSRF rejection passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
