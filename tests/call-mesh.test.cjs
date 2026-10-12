const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

test('three peers negotiate each pair once; a departure closes only that pair and never local tracks', async () => {
  const connections = [];
  class FakePeer {
    constructor() { this.connectionState = 'new'; this.remoteDescription = null; connections.push(this); }
    addTrack() {}
    async createOffer() { return { type: 'offer', sdp: 'offer' }; }
    async createAnswer() { return { type: 'answer', sdp: 'answer' }; }
    async setLocalDescription(d) { this.localDescription = { ...d, toJSON: () => d }; }
    async setRemoteDescription(d) { this.remoteDescription = d; }
    close() { this.connectionState = 'closed'; }
  }
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../lib/call-mesh.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, require: () => ({ waitForIce: async () => {} }), RTCPeerConnection: FakePeer, MediaStream: class {}, setTimeout, clearTimeout,
  });
  const call = { members: ['alice', 'bob', 'cara'].map(uid => ({ uid, state: 'joined' })), signals: [] };
  let writes = 0, stops = 0;
  const local = { getTracks: () => [{ stop: () => stops++ }] };
  const meshes = call.members.map(({ uid }) => new exports.CallMesh(uid, local, [], async (peerUid, type, description) => {
    writes++;
    const [fromUid, toUid] = [uid, peerUid].sort();
    let signal = call.signals.find(s => s.fromUid === fromUid && s.toUid === toUid);
    if (!signal) { signal = { fromUid, toUid }; call.signals.push(signal); }
    signal[type] = description;
  }, () => {}, () => {}, () => assert.fail('negotiation unexpectedly failed')));
  const tick = () => new Promise(resolve => setImmediate(resolve));
  try {
    for (let i = 0; i < 8; i++) { meshes.forEach(m => m.sync(call)); await tick(); }
    assert.equal(call.signals.length, 3);
    assert.equal(writes, 6);
    assert.ok(call.signals.every(s => s.offer && s.answer));
    assert.equal(connections.length, 6);
    call.members.find(m => m.uid === 'bob').state = 'left';
    meshes[0].sync(call); meshes[2].sync(call);
    assert.equal(connections.filter(c => c.connectionState === 'closed').length, 2);
    assert.equal(stops, 0);
    for (let i = 0; i < 3; i++) { meshes[0].sync(call); meshes[2].sync(call); await tick(); }
    assert.equal(writes, 6);
  } finally { meshes.forEach(m => m.close()); }
  assert.ok(connections.every(c => c.connectionState === 'closed'));
  assert.equal(stops, 0);
});
