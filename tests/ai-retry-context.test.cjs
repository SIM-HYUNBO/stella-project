const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/ai-retry-context.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: mod.exports });
const { aiRetryContext } = mod.exports;
test('retry uses the original question and attachment, excluding old answer and later turns', () => {
 const media = { kind: 'image', frames: ['image'] };
 const messages = [{ id:'q', role:'user', content:'describe', media }, { id:'a',role:'assistant',content:'old' }, { id:'q2',role:'user',content:'later' }];
 const result = aiRetryContext(messages, 'a');
 assert.equal(result.history.length, 1);
 assert.equal(result.history[0], messages[0]);
 assert.equal(result.history[0].media, media);
 assert.equal(result.target.content, 'old');
 assert.equal(messages.length, 3);
});
test('study answers supported; missing questions and user targets rejected', () => {
 assert.equal(aiRetryContext([{id:'a',role:'ai',content:'x'}], 'a'), null);
 assert.equal(aiRetryContext([{id:'q',role:'user',content:'x'}], 'q'), null);
 assert.equal(aiRetryContext([], 'missing'), null);
 assert.equal(aiRetryContext([{id:'q',role:'user',content:'x'},{id:'a',role:'ai',content:'y'}], 'a').prompt.id, 'q');
});
