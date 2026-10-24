const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
function load(plugin) {
  const exported = {};
  const requireMock = name => name === '@capacitor/core'
    ? { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }
    : { PushNotifications: plugin };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/native-push.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exported, require: requireMock, setTimeout, clearTimeout });
  return exported;
}
test('retained registration events cannot leak listeners or skip native registration', async () => {
  const removed = [];
  let registered = false;
  const native = load({
    checkPermissions: async () => ({ receive: 'granted' }),
    createChannel: async () => {},
    addListener: async (event, callback) => {
      if (event === 'registration') callback({ value: 'native-token' });
      return { remove: async () => { removed.push(event); } };
    },
    register: async () => { registered = true; },
  });
  assert.equal(await native.nativePushToken(), 'native-token');
  assert.equal(registered, true);
  assert.deepEqual(removed.sort(), ['registration', 'registrationError']);
});
test('notification taps accept internal paths and reject external navigation', () => {
  const { notificationPath } = load({});
  assert.equal(notificationPath('/avatar?open=friend'), '/avatar?open=friend');
  for (const unsafe of ['https://example.com', '//example.com', '/\\example.com', '/\nexample.com', undefined]) assert.equal(notificationPath(unsafe), null);
});
