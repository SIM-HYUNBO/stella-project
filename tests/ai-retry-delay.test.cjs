const { test }=require('node:test'),assert=require('node:assert/strict'),vm=require('vm'),ts=require('typescript'),fs=require('fs');
const subject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/ai-retry-delay.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:subject});
const {aiRetrySeconds}=subject;
test('provider minute and fractional-second waits are rounded up',()=>{assert.equal(aiRetrySeconds(null,'Please try again in 11m20.832s.'),681);assert.equal(aiRetrySeconds(null,'try again in 1h2m3.5s'),3724)});
test('numeric Retry-After takes precedence, including zero',()=>{assert.equal(aiRetrySeconds('42.1','try again in 9m'),43);assert.equal(aiRetrySeconds('0'),0)});
test('HTTP date and past dates handled',()=>{const now=Date.parse('2026-11-21T00:00:00Z');assert.equal(aiRetrySeconds('Sat, 21 Nov 2026 00:02:00 GMT','',now),120);assert.equal(aiRetrySeconds('Fri, 20 Nov 2026 00:00:00 GMT','',now),0)});
test('unknown waits never invent a countdown',()=>{assert.equal(aiRetrySeconds(null,'rate limit exceeded'),null);assert.equal(aiRetrySeconds('invalid','try again in 500ms'),1)});
