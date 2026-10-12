const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, require, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, { exports, require, ...globals });
  return exports;
}
const rules = load('lib/video-call.ts');
const description = type => ({ type, sdp: 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n' });
function fixture() {
  const store = new Map([
    ['users/alice', { nickname: 'Alice' }], ['users/bob', { nickname: 'Bob' }], ['users/eve', { nickname: 'Eve' }],
    ['friends/pair', { users: ['alice', 'bob'] }],
    ['users/cara', { nickname: 'Cara' }], ['users/dan', { nickname: 'Dan' }],
    ['friends/ac', { users: ['alice', 'cara'] }], ['friends/ad', { users: ['alice', 'dan'] }],
    ['friends/bc', { users: ['bob', 'cara'] }],
  ]);
  let pushes = 0;
  const snapshot = key => ({ id: key.split('/').pop(), exists: store.has(key), data: () => store.get(key) });
  const ref = key => ({ key, get: async () => snapshot(key), set: async (data, options) => store.set(key, options?.merge ? { ...store.get(key), ...data } : data) });
  const collection = key => ({ doc: id => ref(`${key}/${id}`), where: (field, op, value) => ({ get: async () => ({ docs: Array.from(store.keys()).filter(k => k.startsWith(key + '/') && store.get(k)[field]?.includes(value)).map(snapshot) }) }) });
  // Serialize mock transactions, like Firestore's retry/lock behavior for contending calls.
  let chain = Promise.resolve();
  const db = { collection, runTransaction: callback => {
    const run = chain.then(async () => {
      const writes = [];
      const result = await callback({ get: r => r.get(), set: (r, d, o) => writes.push(() => r.set(d, o)), update: (r, d) => writes.push(() => r.set(d, { merge: true })) });
      for (const write of writes) await write();
      return result;
    });
    chain = run.catch(() => {});
    return run;
  } };
  const admin = { firestore: () => db, auth: () => ({ verifyIdToken: async token => { if (!['alice', 'bob', 'eve', 'cara', 'dan'].includes(token)) throw Error('invalid'); return { uid: token }; } }), messaging: () => ({ send: async () => { pushes++; } }) };
  const api = load('app/api/video-call/route.ts', name => name === 'next/server' ? { NextResponse: { json: (body, options) => ({ body, status: options.status }) } } : name === '@/lib/firebaseAdmin' ? () => admin : name === 'crypto' ? require('node:crypto') : rules, { process: { env: {} } });
  const req = (uid, body, search = '') => ({ headers: { get: () => uid ? `Bearer ${uid}` : null }, text: async () => JSON.stringify(body), nextUrl: new URL('https://example.test/api/video-call' + search) });
  const post = (uid, body) => api.POST(req(uid, body));
  const get = (uid, search = '') => api.GET(req(uid, undefined, search));
  const create = () => post('alice', { action: 'create', id: 'call-1', toUid: 'bob', fromUid: 'eve', fromName: 'forged' });
  return { store, post, get, create, pushes: () => pushes };
}
const join = (f, who) => f.post(who, { action: 'join', id: 'call-1', client: `tab-${who}` });
const invite = (f, who, to) => {
  f.store.get(`videoCallUsers/${who}`).lastCalledAt = 0;
  return f.post(who, { action: 'invite', id: 'call-1', client: `tab-${who}`, toUid: to });
};
test('anonymous, invalid-token, non-friend and nonparticipant requests are blocked', async () => {
  const f = fixture();
  assert.equal((await f.get('')).status, 401);
  assert.equal((await f.get('invalid')).status, 401);
  assert.equal((await f.post('eve', { action: 'create', id: 'bad', toUid: 'bob' })).status, 403);
  await f.create();
  assert.equal((await f.get('eve', '?id=call-1')).status, 404);
  assert.equal((await f.post('eve', { action: 'join', id: 'call-1', client: 'eve-tab' })).status, 404);
});
test('identity and reservations are server-side; create retries cannot duplicate calls', async () => {
  const f = fixture(); await f.create();
  assert.equal((await f.create()).status, 200);
  assert.equal(f.store.get('videoCalls/call-1').fromName, 'Alice');
  assert.equal((await f.post('bob', { action: 'create', id: 'other', toUid: 'alice' })).status, 409);
});
test('a joined participant can invite a friend, but invitees must accept before signaling', async () => {
  const f = fixture(); await f.create();
  assert.equal((await invite(f, 'alice', 'cara')).status, 403);
  await join(f, 'alice'); await join(f, 'bob');
  assert.equal((await invite(f, 'alice', 'cara')).status, 200);
  assert.equal((await f.get('cara')).body.call.members.find(m => m.uid === 'cara').state, 'invited');
  const offer = { action: 'offer', id: 'call-1', client: 'tab-alice', peerUid: 'cara', description: description('offer') };
  assert.equal((await f.post('alice', offer)).status, 403);
  await join(f, 'cara');
  assert.equal((await f.post('alice', offer)).status, 200);
  assert.equal((await f.get('bob', '?id=call-1')).body.call.signals.length, 0);
  assert.equal((await f.get('cara', '?id=call-1')).body.call.signals.length, 1);
  assert.equal((await f.post('cara', { action: 'answer', id: 'call-1', client: 'tab-cara', peerUid: 'alice', description: description('answer') })).status, 200);
});
test('single-tab ownership, SDP and deterministic pair roles are enforced', async () => {
  const f = fixture(); await f.create(); await join(f, 'alice'); await join(f, 'bob');
  assert.equal((await f.post('alice', { action: 'join', id: 'call-1', client: 'other-tab' })).status, 409);
  assert.equal((await f.post('alice', { action: 'end', id: 'call-1', client: 'other-tab' })).status, 409);
  assert.equal((await f.post('bob', { action: 'offer', id: 'call-1', client: 'tab-bob', peerUid: 'alice', description: description('offer') })).status, 403);
  assert.equal((await f.post('alice', { action: 'offer', id: 'call-1', client: 'tab-alice', peerUid: 'bob', description: { type: 'offer', sdp: 'bad' } })).status, 400);
});
test('one guest declining or leaving does not terminate the remaining group', async () => {
  const f = fixture(); await f.create(); await join(f, 'alice'); await join(f, 'bob'); await invite(f, 'alice', 'cara');
  assert.equal((await f.post('cara', { action: 'end', id: 'call-1' })).status, 200);
  assert.equal((await f.get('alice', '?id=call-1')).body.call.status, 'accepted');
  await invite(f, 'alice', 'dan'); await join(f, 'dan');
  await f.post('alice', { action: 'end', id: 'call-1', client: 'tab-alice' });
  assert.equal((await f.get('bob', '?id=call-1')).body.call.status, 'accepted');
  await f.post('dan', { action: 'end', id: 'call-1', client: 'tab-dan' });
  assert.equal((await f.get('bob', '?id=call-1')).body.call.status, 'ended');
});
test('invitations are idempotent and max four is enforced server-side', async () => {
  const f = fixture(); await f.create(); await join(f, 'alice'); await join(f, 'bob');
  await invite(f, 'alice', 'cara'); await invite(f, 'alice', 'cara'); await invite(f, 'alice', 'dan');
  assert.equal(f.store.get('videoCalls/call-1').members.length, 4);
  f.store.set('friends/ae', { users: ['alice', 'eve'] });
  assert.equal((await invite(f, 'alice', 'eve')).status, 409);
});
test('expired guests leave without killing the healthy group; stale tabs cannot extend leases', async () => {
  const f = fixture(); await f.create(); await join(f, 'alice'); await join(f, 'bob'); await invite(f, 'alice', 'cara');
  f.store.get('videoCalls/call-1').members.find(m => m.uid === 'cara').invitedAt = Date.now() - 91000;
  const c = (await f.get('alice', '?id=call-1&client=tab-alice')).body.call;
  assert.equal(c.status, 'accepted'); assert.equal(c.members.find(m => m.uid === 'cara').state, 'left');
  f.store.get('videoCalls/call-1').members.find(m => m.uid === 'bob').seenAt = Date.now() - 61000;
  assert.equal((await f.get('bob', '?id=call-1&client=tab-bob')).body.call.status, 'ended');
});
test('simultaneous opposite calls reserve only one room', async () => {
  const f = fixture();
  const results = await Promise.all([f.create(), f.post('bob', { action: 'create', id: 'opposite', toUid: 'alice' })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
});
