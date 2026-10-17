const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const drawing = { exports: {} };
vm.runInNewContext(compile(fs.readFileSync('lib/drawing-replay.ts', 'utf8')), drawing);
const strokes = [{ color: '#263244', width: 7, points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] }, { color: '#ffffff', width: 28, points: [{ x: 30, y: 40 }] }];
assert.equal(drawing.exports.validDrawing(strokes), true);
assert.equal(drawing.exports.validDrawing([{ ...strokes[0], points: [{ x: Infinity, y: 0 }] }]), false);
const packed = drawing.exports.packDrawing([{ ...strokes[0], points: Array.from({ length: 10000 }, (_, i) => ({ x: i % 900, y: i % 600 })) }]);
assert.equal(drawing.exports.validDrawing(packed), true); assert.equal(packed[0].points[0].x, 0); assert.equal(packed[0].points.at(-1).x, 9999 % 900);
const calls = []; const context2d = new Proxy({}, { get: (_, key) => (...args) => calls.push([key, ...args]), set: (_, key, value) => { calls.push([key, value]); return true; } });
drawing.exports.paintDrawingPoint(context2d, strokes[0], 0); drawing.exports.paintDrawingPoint(context2d, strokes[0], 1); drawing.exports.paintDrawingPoint(context2d, strokes[1], 0);
assert.ok(calls.some(c => c[0] === 'arc')); assert.ok(calls.some(c => c[0] === 'lineTo' && c[1] === 30)); assert.ok(calls.some(c => c[0] === 'fillStyle' && c[1] === '#ffffff'));
const spoiler = { exports: {}, require };
vm.runInNewContext(compile(fs.readFileSync('components/SpoilerMessage.tsx', 'utf8')), spoiler);
const hidden = renderToStaticMarkup(React.createElement(spoiler.exports.default, { content: 'hidden-secret' }, 'hidden-secret'));
assert.equal(hidden.includes('hidden-secret'), false); assert.ok(hidden.includes('aria-expanded="false"'));

function initializer(path, name) {
  const text = fs.readFileSync(path, 'utf8'), ast = ts.createSourceFile(path, text, 99, true, 4); let found;
  function walk(n) { if (ts.isVariableDeclaration(n) && n.name.getText(ast) === name) found = n.initializer.getText(ast); ts.forEachChild(n, walk); } walk(ast); return found;
}
(async () => {
  for (const path of ['app/avatar/page.tsx', 'app/groupchat/page.tsx', 'app/meetingroom/page.tsx']) {
    let saved, notification, mode = true;
    const env = { nickname: 'me', uid: 'me-id', input: 'secret answer', spoilerMode: true, selectedEffect: 'none', setSelectedEffect: () => {}, isSending: false, currentChatUser: { nickname: 'friend', id: 'friend-id' }, currentRoom: { id: 'room', members: ['me', 'friend'], name: 'room' }, replyTo: null, chosungGame: null, wordGame: null, game369: null, wordGameKey: null, db: {}, collection: (...args) => args, serverTimestamp: () => 'time', addDoc: async (_, data) => { saved = data; }, setIsSending: () => {}, setInput: () => {}, setReplyTo: () => {}, setSpoilerMode: value => { mode = value; }, Audio: class { play() { return Promise.resolve(); } }, fetch: async (_, options) => { notification = JSON.parse(options.body); }, alert: () => {}, updateTyping: async () => {}, sendTyping: async () => {} };
    vm.runInNewContext(compile('var send=' + initializer(path, 'sendMessage')), env);
    await env.send(); assert.equal(saved.spoiler, true); assert.equal(saved.content, 'secret answer'); assert.equal(mode, false);
    if (notification) assert.equal(notification.message.includes('secret answer'), false);
    env.spoilerMode = false; await env.send(); assert.equal(saved.spoiler, undefined);
    env.spoilerMode = true; mode = true; env.addDoc = async () => { throw Error('offline'); }; await env.send(); assert.equal(mode, true);
    env.addDoc = async (_, data) => { saved = data; }; env.compressToBase64 = async () => 'data:image/jpeg;base64,AA=='; env.validDrawing = drawing.exports.validDrawing;
    vm.runInNewContext(compile('var image=' + initializer(path, 'sendImage')), env);
    await env.image({}, strokes); assert.equal(saved.drawingStrokes, strokes); assert.equal(saved.type, 'image');
    await env.image({}); assert.equal(saved.drawingStrokes, undefined);
  }
  console.log('Spoilers: hidden markup, masked notifications, mode reset/failure; handwriting: stroke validation, compression, eraser and all three payloads passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
