const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/room.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { validateRoom, validLetter, letterAccess, EMPTY_ROOM } = exportsObject;
test('letters are only accessible to their recipient after the unlock time', () => {
  const letter = { toUid: 'recipient', unlockAt: 10000 };
  assert.equal(letterAccess(letter, 'other-user', 20000), 'missing');
  assert.equal(letterAccess(letter, 'recipient', 9999), 'locked');
  assert.equal(letterAccess(letter, 'recipient', 10000), 'ready');
  assert.equal(letterAccess({ toUid: 'recipient', unlockAt: NaN }, 'recipient', 20000), 'locked');
  assert.equal(letterAccess(undefined, 'recipient', 20000), 'missing');
});
test('room enforces finite visible positions, known stickers and a combined 20-item limit', () => {
  assert.equal(validateRoom(EMPTY_ROOM), true);
  const decoration = { id: 'test', emoji: '🌼', x: 50, y: 50 };
  assert.equal(validateRoom({ ...EMPTY_ROOM, decorations: [decoration] }), true);
  for (const x of [NaN, Infinity, -1, 99]) assert.equal(validateRoom({ ...EMPTY_ROOM, decorations: [{ ...decoration, x }] }), false);
  assert.equal(validateRoom({ ...EMPTY_ROOM, decorations: [null] }), false);
  assert.equal(validateRoom({ ...EMPTY_ROOM, decorations: [decoration, decoration] }), false);
  assert.equal(validateRoom({ ...EMPTY_ROOM, decorations: [{ ...decoration, emoji: '<script>' }] }), false);
  const decorations = Array.from({ length: 20 }, (_, i) => ({ ...decoration, id: `decor-${i}` }));
  assert.equal(validateRoom({ ...EMPTY_ROOM, decorations }), true);
  assert.equal(validateRoom({ ...EMPTY_ROOM, decorations, pins: [{ id: 'mail', x: 50, y: 50 }] }), false);
});
test('letter payload excludes remote content and rejects oversized or invalid schedules', () => {
  const now = 1000000;
  const draft = { image: 'data:image/jpeg;base64,/9j/2Q==', text: 'hello', unlockAt: now };
  assert.equal(validLetter(draft, now), true);
  assert.equal(validLetter({ ...draft, image: 'https://example.com/tracker.jpg' }, now), false);
  assert.equal(validLetter({ ...draft, text: 'x'.repeat(1001) }, now), false);
  assert.equal(validLetter({ ...draft, image: 'data:image/jpeg;base64,' + 'a'.repeat(650000) }, now), false);
  assert.equal(validLetter({ ...draft, unlockAt: now + 31 * 86400000 }, now), false);
  assert.equal(validLetter({ ...draft, unlockAt: NaN }, now), false);
});
