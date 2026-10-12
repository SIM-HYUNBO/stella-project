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
  const admin = { firestore: () => db, auth: () => ({ verifyIdToken: async token => { if (!['alice', 'bob', 'eve'].includes(token)) throw Error('invalid'); return { uid: token }; } }), messaging: () => ({ send: async () => { pushes++; } }) };
  const api = load('app/api/video-call/route.ts', name => name === 'next/server' ? { NextResponse: { json: (body, options) => ({ body, status: options.status }) } } : name === '@/lib/firebaseAdmin' ? () => admin : name === 'crypto' ? require('node:crypto') : rules, { process: { env: {} } });
  const req = (uid, body, search = '') => ({ headers: { get: () => uid ? `Bearer ${uid}` : null }, text: async () => JSON.stringify(body), nextUrl: new URL('https://example.test/api/video-call' + search) });
  const post = (uid, body) => api.POST(req(uid, body));
  const get = (uid, search = '') => api.GET(req(uid, undefined, search));
  const create = () => post('alice', { action: 'create', id: 'call-1', toUid: 'bob', fromUid: 'eve', fromName: 'forged' });
  return { store, post, get, create, pushes: () => pushes };
}
test('anonymous, invalid-token, non-friend and nonparticipant requests are blocked', async () => {
  const f = fixture();
  assert.equal((await f.get('')).status, 401);
  assert.equal((await f.get('invalid')).status, 401);
  assert.equal((await f.post('eve', { action: 'create', id: 'bad', toUid: 'bob' })).status, 403);
  await f.create();
  assert.equal((await f.get('eve', '?id=call-1')).status, 404);
  assert.equal((await f.post('eve', { action: 'end', id: 'call-1' })).status, 404);
});
test('identity is server-derived; retries are idempotent and busy calls cannot overlap', async () => {
  const f = fixture();
  assert.equal((await f.create()).status, 200);
  assert.equal((await f.create()).status, 200);
  assert.equal(f.store.get('videoCalls/call-1').fromUid, 'alice');
  assert.equal(f.store.get('videoCalls/call-1').fromName, 'Alice');
  assert.equal((await f.get('bob')).body.call.id, 'call-1');
  assert.equal((await f.post('bob', { action: 'create', id: 'other', toUid: 'alice' })).status, 409);
  assert.equal(f.pushes(), 0);
});
test('offer/answer roles, SDP validation and single-tab ownership are enforced', async () => {
  const f = fixture(); await f.create();
  const offer = { action: 'offer', id: 'call-1', client: 'tab-a', description: description('offer') };
  assert.equal((await f.post('bob', offer)).status, 403);
  assert.equal((await f.post('alice', { ...offer, description: { type: 'offer', sdp: 'bad' } })).status, 400);
  assert.equal((await f.post('alice', offer)).status, 200);
  assert.equal((await f.post('alice', offer)).status, 200);
  assert.equal((await f.post('alice', { ...offer, client: 'tab-b' })).status, 409);
  assert.equal((await f.post('alice', { action: 'end', id: 'call-1', client: 'tab-b' })).status, 409);
  const answer = { action: 'answer', id: 'call-1', client: 'tab-c', description: description('answer') };
  assert.equal((await f.post('alice', answer)).status, 403);
  assert.equal((await f.post('bob', answer)).status, 200);
  assert.equal((await f.get('alice', '?id=call-1')).body.call.status, 'accepted');
  assert.equal((await f.get('alice', '?id=call-1')).body.call.answer.type, 'answer');
});
test('decline, timeout and ended calls erase SDP and cannot be resurrected', async () => {
  const f = fixture(); await f.create();
  await f.post('alice', { action: 'offer', id: 'call-1', client: 'tab-a', description: description('offer') });
  assert.equal((await f.post('bob', { action: 'end', id: 'call-1' })).status, 200);
  const ended = (await f.get('alice', '?id=call-1')).body.call;
  assert.equal(ended.reason, 'declined'); assert.equal(ended.offer, null);
  assert.equal((await f.post('bob', { action: 'answer', id: 'call-1', client: 'tab-c', description: description('answer') })).status, 409);
  const g = fixture(); await g.create();
  g.store.get('videoCalls/call-1').createdAt = Date.now() - 91000;
  assert.equal((await g.get('bob')).body.call.status, 'ended');
  assert.equal(g.store.get('videoCalls/call-1').offer, null);
});
test('idle callers cannot stay busy forever; other tabs cannot refresh their media lease', async () => {
  const f = fixture(); await f.create();
  const c = f.store.get('videoCalls/call-1');
  Object.assign(c, { status: 'accepted', fromClient: 'tab-a', toClient: 'tab-c', fromSeen: Date.now() - 20000, toSeen: Date.now() });
  const before = c.fromSeen;
  await f.get('alice', '?id=call-1&client=tab-b');
  assert.equal(f.store.get('videoCalls/call-1').fromSeen, before);
  await f.get('alice', '?id=call-1&client=tab-a');
  assert.ok(f.store.get('videoCalls/call-1').fromSeen > before);
  f.store.get('videoCalls/call-1').toSeen = Date.now() - 61000;
  assert.equal((await f.get('alice', '?id=call-1&client=tab-a')).body.call.status, 'ended');
});
test('simultaneous opposite calls reserve only one session', async () => {
  const f = fixture();
  const results = await Promise.all([f.create(), f.post('bob', { action: 'create', id: 'opposite', toUid: 'alice' })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
});
