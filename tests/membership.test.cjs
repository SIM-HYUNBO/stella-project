const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const subject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/membership.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: subject });
const { resolveMembership, canUseAI } = subject;
const now = 1800000000000;

test('free accounts cannot use either AI and request fields cannot grant a plan', () => {
  for (const subscription of [undefined, {}, { plan: 'free' }, { plan: 'vip' }, { isVIP: true }]) {
    const membership = resolveMembership(subscription, undefined, now);
    assert.equal(membership.plan, 'free');
    assert.equal(canUseAI(membership), false);
    assert.equal(canUseAI(membership, true), false);
  }
});
test('Light includes personal AI while Premium also includes study AI', () => {
  const light = resolveMembership({ plan: 'light' }, undefined, now);
  assert.equal(canUseAI(light), true);
  assert.equal(canUseAI(light, true), false);
  const premium = resolveMembership({ plan: 'premium', expiresAt: { toMillis: () => now + 1 } }, undefined, now);
  assert.equal(canUseAI(premium), true);
  assert.equal(canUseAI(premium, true), true);
});
test('expired subscriptions and trials lose access at the exact expiry', () => {
  for (const plan of ['light', 'premium']) assert.equal(resolveMembership({ plan, expiresAt: now }, undefined, now).plan, 'free');
  assert.equal(resolveMembership(undefined, { trialEndsAt: now + 1 }, now).plan, 'light');
  assert.equal(resolveMembership(undefined, { trialEndsAt: now }, now).plan, 'free');
  assert.equal(resolveMembership({ plan: 'premium', expiresAt: now }, { trialEndsAt: now + 100 }, now).plan, 'light');
  assert.equal(canUseAI(resolveMembership(undefined, { trialEndsAt: now + 100 }, now), true), false);
});
test('Premium takes precedence over Light trials and invalid dates never grant access', () => {
  assert.equal(resolveMembership({ plan: 'premium' }, { trialEndsAt: now + 100 }, now).plan, 'premium');
  assert.equal(resolveMembership({ plan: 'light', expiresAt: now + 1 }, { trialEndsAt: now + 100 }, now).expiresAt, now + 100);
  for (const expiresAt of ['2099-01-01', null, NaN, Infinity, { toMillis: () => Infinity }]) assert.equal(resolveMembership({ plan: 'premium', expiresAt }, undefined, now).plan, 'free');
  assert.equal(resolveMembership(undefined, { trialEndsAt: Infinity }, now).plan, 'free');
});

test('main AI endpoint denies free accounts and Light study requests before contacting the provider', async () => {
  class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
  let plan = 'free';
  let providerCalls = 0;
  let limitCalls = 0;
  const route = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/api/ai/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: route,
    fetch: () => { providerCalls++; throw Error('Provider must not be contacted'); },
    require: name => {
      if (name === '@/lib/ai-voice-text') return { VOICE_RESPONSE_STYLE: 'voice conversation' };
      if (name === '@/lib/ai-retry-delay') return { aiRetrySeconds: () => null };
      if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options.status }) } };
      if (name === '@/lib/api-user') return { ApiError, apiUser: async () => ({ db: {}, uid: 'user' }), apiRateLimit: async () => { limitCalls++; } };
      if (name === '@/lib/membership-server') return { requireAIMembership: async (_db, _uid, study) => {
        if (!canUseAI(resolveMembership({ plan }, undefined, now), study)) throw new ApiError(403, '멤버십이 필요해.');
      } };
      throw Error(`Unexpected dependency ${name}`);
    },
  });
  const request = mode => ({ json: async () => ({ messages: [{ role: 'user', content: 'hello' }], mode, plan: 'premium' }) });
  assert.equal((await route.POST(request(undefined))).status, 403);
  plan = 'light';
  assert.equal((await route.POST(request('study'))).status, 403);
  assert.equal(providerCalls, 0);
  assert.equal(limitCalls, 0);
});
