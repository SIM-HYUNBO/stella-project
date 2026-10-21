const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/dm-query.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject,require:()=>({where:(field,_op,value)=>({field,value}),and:(...nodes)=>({and:nodes}),or:(...nodes)=>({or:nodes})})});
const q=exportsObject.dmConstraint('a','Alice','b','Bob');
const match=(c,m)=>c.or?c.or.some(n=>match(n,m)):c.and?c.and.every(n=>match(n,m)):m[c.field]===c.value;
for(const message of [{from:'Alice',to:'Bob'},{from:'Bob',to:'Alice'},{fromUid:'a',toUid:'b',from:'OldAlice',to:'OldBob'},{fromUid:'b',to:'Alice'},{from:'Alice',toUid:'b'}])assert.equal(match(q,message),true);
for(const message of [{from:'Stranger',to:'Bob'},{fromUid:'c',toUid:'d'},{from:'Alice',to:'Stranger'}])assert.equal(match(q,message),false);
assert.equal(exportsObject.messageTimestamp(100,999),100);assert.equal(exportsObject.messageTimestamp({seconds:2},999),2000);assert.equal(exportsObject.messageTimestamp({toMillis:()=>123},999),123);assert.equal(exportsObject.messageTimestamp(null,999),999);
console.log('DM query: both directions, legacy/UID/hybrid messages, unrelated chat exclusion and timestamp formats passed');
