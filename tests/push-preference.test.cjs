const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let profile={nickname:'Alice',pushEnabled:false},tokens=0,written,events=0;
const storage=new Map();const db={getDoc:async()=>({data:()=>profile}),updateDoc:async(_,data)=>Object.assign(profile,data),setDoc:async(_,data)=>written=data,doc:(_db,...parts)=>parts.join('/')};
const env={exports:{},require:name=>name==='react'?{}:name==='@/app/firebase'?{auth:{currentUser:{uid:'a'}},db:{},getFirebaseMessaging:async()=>({})}:name==='firebase/messaging'?{getToken:async()=>{tokens++;return 'test-device';}}:db,process:{env:{}},Notification:{permission:'granted'},navigator:{serviceWorker:{}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},window:{dispatchEvent:()=>events++},Event:class{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/hooks/usePushSubscription.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,env);
(async()=>{
 assert.equal(await env.exports.saveFCMToken('Alice'),false);assert.equal(tokens,0);
 await env.exports.setPushPreference(true);assert.equal(profile.pushEnabled,true);assert.equal(written.uid,'a');assert.equal(tokens,1);
 await env.exports.setPushPreference(false);assert.equal(profile.pushEnabled,false);assert.equal(storage.get('notificationsEnabled'),'false');
 assert.equal(await env.exports.saveFCMToken('Alice'),false);assert.equal(tokens,1);assert.equal(events,2);
 env.Notification.permission='denied';await assert.rejects(env.exports.setPushPreference(true),/알림을 허용/);assert.equal(profile.pushEnabled,false);
 console.log('Push preferences: opt-out persists across registration checks, opt-in registers only after permission and denied permission preserves opt-out passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
