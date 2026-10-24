const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
const loaded = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/push-delivery.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: loaded });
function store(initial) {
  let value = { ...initial };
  const ref = { get: async () => ({ data: () => ({ ...value }) }) };
  return { db: { collection: () => ({ doc: () => ref }), runTransaction: async fn => fn({ get: ref.get, set: (_, next) => { value = next; } }) }, read: () => value };
}
test('delivers once to each browser/native token with the native sound channel', async () => {
  const { db } = store({ token: 'browser', androidToken: 'native' });
  const sent = [];
  assert.equal(await loaded.sendUserPush(db, { send: async payload => { sent.push(payload); } }, 'friend', { data: { url: '/avatar' } }), 'sent');
  assert.equal(sent.length, 2);
  assert.equal(sent[1].android.notification.channelId, 'wagie_messages_v1');
  assert.equal(sent[1].data.url, '/avatar');
});
test('an expired browser token does not delete the native registration', async () => {
  const { db, read } = store({ uid: 'user', token: 'expired', androidToken: 'working' });
  const sender = { send: async ({ token }) => { if (token === 'expired') throw { code: 'messaging/registration-token-not-registered' }; } };
  assert.equal(await loaded.sendUserPush(db, sender, 'friend', {}), 'sent');
  assert.equal(read().token, undefined);
  assert.equal(read().androidToken, 'working');
  assert.equal(read().uid, 'user');
});
test('missing registrations are reported and duplicate tokens are sent only once', async () => {
  let count = 0;
  const sender = { send: async () => { count++; } };
  assert.equal(await loaded.sendUserPush(store({}).db, sender, 'friend', {}), 'no_token');
  assert.equal(await loaded.sendUserPush(store({ token: 'same', androidToken: 'same' }).db, sender, 'friend', {}), 'sent');
  assert.equal(count, 1);
});
