const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load() {
  const subject = {}, revoked = [], canvases = [];
  class Image {
    width = 1200; height = 900;
    set src(url) { this.url = url; queueMicrotask(() => url === 'bad' ? this.onerror() : this.onload()); }
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/photo-album.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: subject, Image, TextEncoder,
    URL: { createObjectURL: file => file.name, revokeObjectURL: url => revoked.push(url) },
    document: { createElement() { const canvas = { width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage(image) { canvas.name = image.url; } }), toDataURL() { return `data:image/jpeg;base64,${this.name}:` + 'x'.repeat(this.width * 200); } }; canvases.push(canvas); return canvas; } },
  });
  return { ...subject, revoked, canvases };
}
test('nine photos stay in selection order and are compressed to fit one Firestore message', async () => {
  const s = load(), files = Array.from({ length: 9 }, (_, i) => ({ name: `photo${i}` }));
  const result = await s.preparePhotoAlbum(files);
  assert.equal(result.length, 9);
  result.forEach((uri, i) => assert.ok(uri.startsWith(`data:image/jpeg;base64,photo${i}:`)));
  assert.ok(new TextEncoder().encode(JSON.stringify(result) + result[0]).length < 850000);
  assert.equal(s.revoked.length, 9);
  assert.ok(s.canvases.some(c => c.width === 320));
});
test('empty or over-nine selections and unreadable photos are rejected', async () => {
  const s = load();
  await assert.rejects(s.preparePhotoAlbum([]));
  await assert.rejects(s.preparePhotoAlbum(Array(10).fill({ name: 'photo' })));
  await assert.rejects(s.preparePhotoAlbum([{ name: 'bad' }]));
  assert.ok(s.revoked.includes('bad'));
});
