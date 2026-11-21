const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('vm'),fs=require('fs'),ts=require('typescript');
const subject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/load-ai-membership.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:subject,setTimeout});
const {loadAIMembership}=subject;
const ok=()=>Response.json({plan:'premium',expiresAt:null,source:'membership'});
test('retries transient server failures and returns verified plan',async()=>{let calls=0;const r=await loadAIMembership(async()=>++calls<3?Response.json({error:'temporary'},{status:503}):ok(),async()=>{},async()=>{});assert.equal(r.plan,'premium');assert.equal(calls,3)});
test('refreshes expired auth once, without bypassing denial',async()=>{let calls=0,refreshes=0;await assert.rejects(loadAIMembership(async()=>{calls++;return Response.json({error:'login expired'},{status:401})},async()=>{refreshes++},async()=>{}),/login expired/);assert.equal(refreshes,1);assert.equal(calls,2)});
test('does not retry membership rejection or invent access',async()=>{let calls=0;await assert.rejects(loadAIMembership(async()=>{calls++;return Response.json({error:'denied'},{status:403})},async()=>{},async()=>{}),/denied/);assert.equal(calls,1)});
test('stops after bounded connectivity retries',async()=>{let calls=0;await assert.rejects(loadAIMembership(async()=>{calls++;throw Error('offline')},async()=>{},async()=>{}));assert.equal(calls,3)});
test('rejects invalid plan data',async()=>{await assert.rejects(loadAIMembership(async()=>Response.json({plan:'premium'}),async()=>{},async()=>{}))});
