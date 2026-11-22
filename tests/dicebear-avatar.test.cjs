const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');

async function loadAvatar() {
  let source = fs.readFileSync('lib/dicebear-avatar.ts', 'utf8');
  for (const name of ['@dicebear/core', '@dicebear/collection']) {
    source = source.replace(name, pathToFileURL(require.resolve(name)).href);
  }
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('DiceBear normalizes stored values and renders every selectable variant locally', async () => {
  const { DICE_OPTIONS, DEFAULT_DICE_AVATAR, normalizeDiceAvatar, diceAvatarUri } = await loadAvatar();
  assert.deepEqual(normalizeDiceAvatar({ hair: '<script>', background: 'url(evil)' }), DEFAULT_DICE_AVATAR);
  assert.equal(diceAvatarUri(null), diceAvatarUri(DEFAULT_DICE_AVATAR));
  for (const [key, values] of Object.entries(DICE_OPTIONS)) {
    const images = values.map(value => {
      const uri = diceAvatarUri({ ...DEFAULT_DICE_AVATAR, [key]: value });
      assert.match(uri, /^data:image\/svg\+xml/);
      return uri;
    });
    assert.ok(new Set(images).size > 1, `${key} changes the avatar`);
  }
});
