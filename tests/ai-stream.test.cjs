const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const output = ts.transpileModule(fs.readFileSync('lib/ai-stream.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const context = { exports: {}, TextDecoder };
vm.runInNewContext(output, context);
const stream = text => new ReadableStream({ start(controller) { for (const byte of new TextEncoder().encode(text)) controller.enqueue(Uint8Array.of(byte)); controller.close(); } });
(async () => {
  let latest = '';
  const result = await context.exports.readAIStream(stream('data: {"choices":[{"delta":{"content":"안녕"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"!"}}]}\n\ndata: [DONE]\n'), text => latest = text);
  assert.equal(result, '안녕!'); assert.equal(latest, result);
  await assert.rejects(context.exports.readAIStream(stream('data: [DONE]\n'), () => {}), /empty response/);
  await assert.rejects(context.exports.readAIStream(stream('data: {"error":{"message":"rate limit"}}\n'), () => {}), /rate limit/);
  assert.equal(await context.exports.readAIStream(stream('data: {"choices":[{"delta":{"content":"끝"}}]}'), () => {}), '끝');
  console.log('AI stream: 4 checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
