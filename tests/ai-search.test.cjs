const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
let payload;
const context={exports:{},require:()=>({NextResponse:{json:(body,options)=>Response.json(body,options)}}),Response,Date,process:{env:{GROQ_API_KEY:'test'}},fetch:async(_,options)=>{payload=JSON.parse(options.body);return new Response('data: [DONE]\n',{status:200});}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/ai/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
(async()=>{
 const run=body=>context.exports.POST({json:async()=>({messages:[{role:'user',content:'hello'}],...body})});
 await run({webSearch:true});assert.equal(payload.model,'openai/gpt-oss-120b');assert.equal(payload.tools[0].type,'browser_search');
 await run({mode:'study',webSearch:true});assert.equal(payload.tools[0].type,'browser_search');
 await run({webSearch:false});assert.equal(payload.tools,undefined);assert.equal(payload.model,'qwen/qwen3.8-27b');
 await run({webSearch:'true'});assert.equal(payload.tools,undefined);
 await run({mode:'profile',webSearch:true});assert.equal(payload.tools,undefined);
 console.log('AI search routing: 5 checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
