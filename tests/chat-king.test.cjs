const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
const subject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/chat-king.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: subject });
const { CHAT_KING, chatKingPhase, chatKingStatus, nextChatKingProgress, chatKingMessagePath } = subject;

test('event uses Korean midnight and includes the entire final day', () => {
  assert.equal(chatKingPhase(Date.parse('2026-11-30T14:59:59.999Z')), 'upcoming');
  assert.equal(chatKingPhase(Date.parse('2026-11-30T15:00:00Z')), 'active');
  assert.equal(chatKingPhase(Date.parse('2026-12-10T14:59:59.999Z')), 'active');
  assert.equal(chatKingPhase(Date.parse('2026-12-10T15:00:00Z')), 'ended');
});
test('millionth message starts exactly twenty days of trial', () => {
  const before = nextChatKingProgress({ count: 999998 }, CHAT_KING.start);
  assert.equal(before.trialEndsAt, undefined);
  const achieved = nextChatKingProgress(before, CHAT_KING.start + 1000);
  assert.equal(achieved.count, 1000000);
  assert.equal(achieved.trialEndsAt, CHAT_KING.start + 1000 + 20 * 86400000);
  assert.equal(chatKingStatus(achieved, achieved.trialEndsAt - 1).trialActive, true);
  assert.equal(chatKingStatus(achieved, achieved.trialEndsAt).trialActive, false);
  assert.equal(nextChatKingProgress(achieved, achieved.trialEndsAt + 1).trialEndsAt, achieved.trialEndsAt);
});
test('only supported chat message paths can be submitted', () => {
  for (const value of ['messages/a', 'group_rooms/a/messages/b', 'meeting_rooms/a/messages/b']) assert.equal(chatKingMessagePath(value), true);
  for (const value of ['users/a', 'messages/a/extra', 'group_rooms/a', 'events/a/messages/b', null]) assert.equal(chatKingMessagePath(value), false);
});

test('server verifies sender and timestamp, deduplicates retries and grants a single trial', async () => {
  const now = CHAT_KING.start + 60000;
  const records = new Map();
  const reference = key => ({ path: key, collection: name => reference(`${key}/${name}`), doc: id => reference(`${key}/${id}`), get: async () => snapshot(key) });
  const snapshot = key => ({ exists: records.has(key), data: () => records.get(key) });
  let tail = Promise.resolve();
  const db = {
    doc: reference, collection: reference,
    runTransaction: callback => {
      const operation = tail.then(() => callback({
        get: async ref => snapshot(ref.path),
        create: (ref, data) => { assert.equal(records.has(ref.path), false); records.set(ref.path, data); },
        set: (ref, data) => records.set(ref.path, { ...records.get(ref.path), ...data }),
      }));
      tail = operation.catch(() => {});
      return operation;
    },
  };
  class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const route = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/api/events/chat-king/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, {
    exports: route,
    Date: class extends Date { static now() { return now; } },
    require: name => {
      if (name === 'crypto') return require('node:crypto');
      if (name === 'next/server') return { NextResponse: { json: (data, options = {}) => ({ status: options.status || 200, data }) } };
      if (name === '@/lib/api-user') return { ApiError, apiUser: async () => ({ db, uid: 'me' }) };
      if (name === '@/lib/chat-king') return subject;
      throw Error(`Unexpected dependency ${name}`);
    },
  });
  const send = path => route.POST({ text: async () => JSON.stringify({ path }) });
  const message = (fromUid, sentAt) => ({ fromUid, type: 'text', createdAt: { toMillis: () => sentAt } });
  records.set('messages/other', message('other', now));
  assert.equal((await send('messages/other')).status, 403);
  records.set('messages/early', message('me', CHAT_KING.start - 1));
  assert.equal((await send('messages/early')).data.count, 0);
  records.set('messages/future', message('me', now + 1));
  assert.equal((await send('messages/future')).data.count, 0);
  records.set('messages/valid', message('me', now));
  const responses = await Promise.all([send('messages/valid'), send('messages/valid')]);
  assert.equal(responses[0].data.count, 1);
  assert.equal(responses[1].data.count, 1);
  const participantPath = `events/${CHAT_KING.id}/participants/me`;
  records.set(participantPath, { count: 999999 });
  records.set('messages/millionth', message('me', now));
  const reward = (await send('messages/millionth')).data;
  assert.equal(reward.trialActive, true);
  assert.equal(reward.trialEndsAt, now + 20 * 86400000);
  assert.equal((await send('messages/millionth')).data.count, 1000000);
  assert.equal((await send('messages/millionth')).data.trialEndsAt, reward.trialEndsAt);
});
