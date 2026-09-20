const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, require) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, { exports, require });
  return exports;
}
const rules = load('lib/room.ts');
function fixture() {
  const store = new Map([
    ['users/sender', { nickname: 'Sender' }], ['users/receiver', { nickname: 'Receiver' }], ['users/stranger', { nickname: 'Stranger' }],
    ['friends/pair', { users: ['sender', 'receiver'] }],
  ]);
  let notifications = 0;
  const snapshot = key => ({ id: key.split('/').pop(), exists: store.has(key), data: () => store.get(key) });
  const ref = key => ({ key, get: async () => snapshot(key), set: async (data, options) => { store.set(key, options?.merge ? { ...store.get(key), ...data } : data); }, collection: name => collection(`${key}/${name}`) });
  const collection = key => ({ doc: id => ref(`${key}/${id}`), where: (field, op, value) => ({ get: async () => ({ docs: Array.from(store.keys()).filter(k => k.startsWith(key + '/') && k.split('/').length === key.split('/').length + 1).filter(k => op === 'array-contains' ? store.get(k)[field]?.includes(value) : store.get(k)[field] === value).map(snapshot) }) }) });
  const db = { collection, runTransaction: async callback => {
    const writes = [];
    const result = await callback({ get: r => r.get(), set: (r, data, options) => writes.push(() => r.set(data, options)), update: (r, data) => writes.push(() => r.set(data, { merge: true })) });
    for (const write of writes) await write();
    return result;
  } };
  const admin = { firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => 1 } }), auth: () => ({ verifyIdToken: async token => { if (!['sender', 'receiver', 'stranger'].includes(token)) throw Error('invalid'); return { uid: token }; } }), messaging: () => ({ send: async () => { notifications++; } }) };
  const api = load('app/api/room/route.ts', name => name === 'next/server' ? { NextResponse: { json: (body, options) => ({ body, status: options.status }) } } : name === '@/lib/firebaseAdmin' ? () => admin : rules);
  const req = (uid, body) => ({ headers: { get: () => uid ? `Bearer ${uid}` : null }, text: async () => JSON.stringify(body) });
  return { store, api, req, notifications: () => notifications };
}
test('API rejects anonymous and invalid-token reads', async () => {
  const { api, req } = fixture();
  assert.equal((await api.GET(req(''))).status, 401);
  assert.equal((await api.GET(req('invalid'))).status, 401);
});
test('send validates friendship and ignores forged sender identity; retry is idempotent', async () => {
  const f = fixture();
  const body = { action: 'send', id: 'letter-1', toUid: 'receiver', fromUid: 'stranger', fromName: 'forged', image: 'data:image/jpeg;base64,/9j/2Q==', text: 'Hello', unlockAt: Date.now() };
  assert.equal((await f.api.POST(f.req('stranger', body))).status, 403);
  assert.equal((await f.api.POST(f.req('sender', body))).status, 200);
  assert.equal(f.store.get('roomLetters/letter-1').fromUid, 'sender');
  assert.equal(f.store.get('roomLetters/letter-1').fromName, 'Sender');
  assert.equal((await f.api.POST(f.req('sender', body))).status, 200);
  assert.equal(Array.from(f.store.keys()).filter(k => k.startsWith('roomLetters/')).length, 1);
  assert.equal(f.notifications(), 0); // No device token: delivery still succeeds.
  assert.equal(f.store.has('notifications/Receiver/items/letter-1'), true);
});
test('locked content is absent from inbox and opens only for receiver after the deadline', async () => {
  const f = fixture();
  const letter = { toUid: 'receiver', fromUid: 'sender', fromName: 'Sender', toName: 'Receiver', image: 'secret-image', text: 'secret-text', createdAt: Date.now(), unlockAt: Date.now() + 60000, opened: false };
  f.store.set('roomLetters/locked', letter);
  const inbox = await f.api.GET(f.req('receiver'));
  assert.equal(inbox.body.mail[0].image, undefined);
  assert.equal(inbox.body.mail[0].text, undefined);
  assert.equal((await f.api.POST(f.req('receiver', { action: 'open', id: 'locked' }))).status, 403);
  assert.equal((await f.api.POST(f.req('sender', { action: 'open', id: 'locked' }))).status, 404);
  letter.unlockAt = Date.now() - 1;
  const opened = await f.api.POST(f.req('receiver', { action: 'open', id: 'locked' }));
  assert.equal(opened.status, 200);
  assert.equal(opened.body.letter.text, 'secret-text');
  assert.equal(f.store.get('roomLetters/locked').opened, true);
});
test('room cannot pin letters belonging to another account', async () => {
  const f = fixture();
  f.store.set('roomLetters/other', { toUid: 'receiver', opened: true, unlockAt: 0 });
  const body = { action: 'saveRoom', room: { ...rules.EMPTY_ROOM, pins: [{ id: 'other', x: 50, y: 50 }] } };
  assert.equal((await f.api.POST(f.req('sender', body))).status, 403);
  assert.equal(f.store.has('privateRooms/sender'), false);
});
