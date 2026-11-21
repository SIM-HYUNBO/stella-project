const {test}=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),vm=require('vm'),fs=require('fs');
const subject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/ai-request-error.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:subject});
const {aiRequestFailure}=subject;
test('keeps actual HTTP and provider code for diagnosis',()=>{const text=aiRequestFailure(400,{error:'Request too large',code:'context_length_exceeded'});assert.ok(text.includes('HTTP 400'));assert.ok(text.includes('context_length_exceeded'));assert.ok(text.includes('Request too large'))});
test('redacts credentials in provider errors',()=>{const text=aiRequestFailure(401,{error:'invalid gsk_exampleSECRET Bearer private-token'});assert.ok(!text.includes('exampleSECRET'));assert.ok(!text.includes('private-token'))});
test('rate-limit messages remain available for wait parsing',()=>{assert.equal(aiRequestFailure(429,{error:'try again in 2m3s'}),'try again in 2m3s')});

test('database quota is distinguished from provider token limits',()=>{assert.ok(aiRequestFailure(503,{code:'FIRESTORE_QUOTA'}).includes('데이터베이스'))});
