const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
function fixture({ key = 'test-only', status = 200, subscriptions = [], subscriptionStatus = 200 } = {}) {
  const store = new Map(); let calls = 0; let payload;
  const ref = path => ({ path, get: async () => ({ exists: store.has(path), data: () => store.get(path) }), update: async data => store.set(path, { ...store.get(path), ...data }), collection: name => col(`${path}/${name}`) });
  const col = path => ({ doc: id => ref(`${path}/${id}`) });
  const db = { collection: col, runTransaction: async cb => cb({ get: r => r.get(), set: (r, data) => store.set(r.path, data) }), batch: () => { const writes = []; return { set: (r, data) => writes.push([r.path, data]), commit: async () => writes.forEach(([p, d]) => store.set(p, d)) }; } };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('app/api/ai-image/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { Response, Buffer, AbortSignal, process: { env: { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: key, OPENAI_API_KEY: 'must-never-be-used' } }, fetch: async (url, options) => {
    assert.ok(url.startsWith('https://api.cloudflare.com/'));
    if (url.endsWith('/subscriptions')) return Response.json({ success: subscriptionStatus === 200, result: subscriptions }, { status: subscriptionStatus });
    calls++; payload = JSON.parse(options.body);
    return Response.json(status === 200 ? { success: true, result: { image: Buffer.from([255,216,255,1,2,3]).toString('base64') } } : { errors: [] }, { status });
  } };
  const helpers = { ApiError, apiRateLimit: async () => {}, apiUser: async req => { if (!req.uid) throw new ApiError(401, 'login'); return { uid: req.uid, db, admin: { firestore: { FieldValue: { serverTimestamp: () => 1 } } } }; } };
  const provider = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/free-image-provider.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { ...context, exports: provider, require: () => helpers });
  vm.runInNewContext(code, { ...context, exports, require: name => name === 'node:crypto' ? require(name) : name === 'next/server' ? { NextResponse: { json: (data, options) => Response.json(data, options) } } : name === '@/lib/free-image-provider' ? provider : helpers });
  const req = (uid = 'owner', body = { prompt: 'a duck', sessionId: 'chat', requestId: 'one' }) => ({ uid, json: async () => body, nextUrl: new URL('https://test/api/ai-image?id=one') });
  return { api: exports, req, store, calls: () => calls, payload: () => payload };
}
test('anonymous and unconfigured requests never call the provider', async () => {
  const f = fixture(); assert.equal((await f.api.POST(f.req(''))).status, 401); assert.equal(f.calls(), 0);
  const missing = fixture({ key: '' }); assert.equal((await missing.api.POST(missing.req())).status, 503); assert.equal(missing.calls(), 0);
});
test('one generation persists messages and image; retries never generate twice', async () => {
  const f = fixture(); assert.equal((await f.api.POST(f.req())).status, 200);
  assert.equal(f.payload().steps, 4); assert.equal(f.payload().prompt, 'a duck');
  assert.equal(f.store.get('robotChats/owner/messages/image_one_result').generatedImage.id, 'one');
  assert.equal((await f.api.POST(f.req())).status, 200); assert.equal(f.calls(), 1);
  assert.equal((await f.api.GET(f.req())).status, 200);
  assert.equal((await f.api.GET(f.req('stranger'))).status, 404);
  assert.equal((await f.api.POST(f.req('owner', { prompt: 'different', sessionId: 'chat', requestId: 'one' }))).status, 409);
});
test('provider failure is safe and the same failed request cannot consume allowance again', async () => {
  const f = fixture({ status: 429 }); assert.equal((await f.api.POST(f.req())).status, 429);
  assert.equal((await f.api.POST(f.req())).status, 409); assert.equal(f.calls(), 1);
  assert.equal(f.store.has('robotChats/owner/messages/image_one_result'), false);
});

test('paid, unknown and unreadable billing plans cannot start generation', async () => {
  for (const options of [{ subscriptions: [{ price: 5, rate_plan: { id: 'pro' } }] }, { subscriptions: [{ price: 0, rate_plan: { id: 'pro' } }] }, { subscriptions: [{}] }, { subscriptionStatus: 403 }]) {
    const f = fixture(options); assert.equal((await f.api.POST(f.req())).status, 503); assert.equal(f.calls(), 0);
    assert.equal(f.store.size, 0);
  }
});
