const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compile(fs.readFileSync('lib/custom-stickers.ts', 'utf8')), context);
const sticker = { id: 'one', name: '내 그림', image: 'data:image/png;base64,AA==', motion: 'bounce' };
assert.equal(context.exports.isCustomSticker(sticker), true);
const voice = { data: 'data:audio/webm;codecs=opus;base64,AA==', duration: 2 };
const face = { duration: 4, eyes: [{x:.35,y:.4},{x:.65,y:.4}], frames: [{t:0,x:0,y:0,roll:0,left:1,right:1},{t:1,x:.2,y:.1,roll:15,left:0,right:0}] };
assert.equal(context.exports.isCustomSticker({...sticker,voice,face}), true);
for (const change of [{duration:7},{duration:NaN},{data:'javascript:bad'},{data:'data:audio/webm;base64,'+'A'.repeat(160001)}]) assert.equal(context.exports.isStickerVoice({...voice,...change}),false);
for (const change of [{duration:7},{eyes:[{x:-1,y:0},face.eyes[1]]},{frames:[face.frames[0]]},{frames:[face.frames[1],face.frames[0]]},{frames:[face.frames[0],{...face.frames[1],left:NaN}]}]) assert.equal(context.exports.isStickerFace({...face,...change}),false);
for (const change of [{ motion: 'unknown' }, { image: 'javascript:alert(1)' }, { image: 'data:image/svg+xml;base64,AA==' }, { image: 'data:image/png;base64,' + 'A'.repeat(32000) }, { name: 'x'.repeat(25) }]) {
  assert.equal(context.exports.isCustomSticker({ ...sticker, ...change }), false);
}
(async () => {
  for (const path of ['app/avatar/page.tsx', 'app/groupchat/page.tsx', 'app/meetingroom/page.tsx']) {
    const source = fs.readFileSync(path, 'utf8'), ast = ts.createSourceFile(path, source, 99, true, 4);
    let sender; function walk(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'sendSticker') sender = node.initializer.getText(ast); ts.forEachChild(node, walk); } walk(ast);
    let written, closed = false;
    const env = { nickname: 'me', currentChatUser: { nickname: 'friend' }, currentRoom: { id: 'room', name: 'room', members: ['me', 'friend'] }, db: {}, collection: (...args) => args.slice(1), serverTimestamp: () => 'timestamp', addDoc: async (_, data) => { written = data; }, setShowStickerStudio: value => { closed = !value; }, fetch: async () => ({}) };
    vm.runInNewContext(compile('var send = ' + sender), env);
    await env.send(sticker);
    assert.equal(written.type, 'sticker'); assert.equal(written.content, sticker.image);
    assert.equal(written.stickerMotion, 'bounce'); assert.equal(written.stickerName, sticker.name); assert.equal(closed, true);
    assert.equal('stickerVoice' in written, false); assert.equal('stickerFace' in written, false);
    await env.send({...sticker,voice,face});
    assert.equal(written.stickerVoice,voice); assert.equal(written.stickerFace,face);
    closed = false; env.addDoc = async () => { throw Error('offline'); };
    await assert.rejects(env.send(sticker), /offline/); assert.equal(closed, false);
  }
  console.log('Custom stickers: validation, all three chat payloads and failed-send retention passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
