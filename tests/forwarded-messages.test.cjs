const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const subject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/forwarded-messages.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: subject, TextEncoder });

test('forwarded snapshots keep conversation order, original sender, image and spoiler without recipient metadata', () => {
  const messages = [
    { id: '1', from: 'a', content: 'hello', toUid: 'private', createdAt: { toMillis: () => 100 } },
    { id: '2', from: 'b', content: 'data:image/png;base64,abc', type: 'image', spoiler: true },
    { id: '3', from: 'a', content: 'audio', type: 'audio' },
  ];
  const result = subject.bundleItems(messages, new Set(['2', '1', '3']));
  assert.equal(result.length, 2);
  assert.equal(result[0].content, 'hello');
  assert.equal(result[0].sentAt, 100);
  assert.equal(result[0].toUid, undefined);
  assert.equal(result[1].content, messages[1].content);
  assert.equal(result[1].spoiler, true);
  messages[0].content = 'edited later';
  assert.equal(result[0].content, 'hello');
});
test('empty selections, more than 30 messages and oversized image bundles are rejected before writing', () => {
  assert.throws(() => subject.bundleItems([], new Set()));
  const messages = Array.from({ length: 31 }, (_, i) => ({ id: String(i), from: 'a', content: 'hello' }));
  assert.throws(() => subject.bundleItems(messages, new Set(messages.map(m => m.id))));
  assert.throws(() => subject.bundleItems([{ id: '1', from: 'a', content: 'x'.repeat(850001), type: 'image' }], new Set(['1'])));
});
test('malformed nested bundles cannot render recursively', () => {
  assert.equal(subject.readBundle(null).length, 0);
  assert.equal(subject.readBundle([{ type: 'bundle', from: 'a', content: 'nested' }, { type: 'text', from: 'b', content: 'ok' }]).length, 1);
});
