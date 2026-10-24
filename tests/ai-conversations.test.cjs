const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/ai-conversations.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsForTest });
const { buildConversations, conversationDay } = exportsForTest;
test('calendar buckets use midnight boundaries across months rather than elapsed 24 hours', () => {
  const now = new Date(2026, 10, 1, 0, 5);
  assert.equal(conversationDay(+new Date(2026, 10, 1, 0, 0), now), '오늘');
  assert.equal(conversationDay(+new Date(2026, 9, 31, 23, 59), now), '어제');
  assert.equal(conversationDay(+new Date(2026, 9, 30, 23, 59), now), '이전');
  assert.equal(conversationDay(0, now), '이전');
});
test('saved titles override automatic titles; latest activity controls order and legacy stays accessible', () => {
  const msg = (id, sessionId, content, time) => ({ id, sessionId, content, createdAt: { toMillis: () => time } });
  const chats = buildConversations([msg('1', 'a', 'Original', 100), msg('2', 'b', 'Other', 200), msg('3', 'a', 'Newest answer', 300), msg('4', undefined, 'Old', 50)], { a: 'My custom name' });
  assert.equal(chats[0].id, 'a'); assert.equal(chats[0].title, 'My custom name');
  assert.equal(chats[0].preview, 'Newest answer'); assert.equal(chats[1].title, 'Other');
  assert.equal(chats[2].id, 'legacy');
});
test('unresolved timestamps are stable rather than moving old chats into today', () => {
  const chats = buildConversations([{ id: 'one', content: 'First' }, { id: 'two', content: 'Next' }], {});
  assert.equal(chats.length, 1); assert.equal(chats[0].time, 0); assert.equal(chats[0].title, 'First');
});
