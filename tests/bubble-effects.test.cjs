const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const effects = { exports: {} };
vm.runInNewContext(compile(fs.readFileSync('lib/bubble-effects.ts', 'utf8')), effects);
for (const effect of ['none', 'fade', 'pop', 'shake']) assert.equal(effects.exports.bubbleEffect(effect), effect);
assert.equal(effects.exports.bubbleEffect('unknown'), 'none');
assert.equal(effects.exports.bubbleEffect(undefined), 'none');

(async () => {
  for (const path of ['app/avatar/page.tsx', 'app/groupchat/page.tsx', 'app/meetingroom/page.tsx']) {
    const source = fs.readFileSync(path, 'utf8'), ast = ts.createSourceFile(path, source, 99, true, 4);
    let send, animatedBubble = false;
    function walk(node) {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'sendMessage') send = node.initializer.getText(ast);
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'BubbleEntrance') {
        animatedBubble = node.children.some(child => ts.isJsxElement(child) && child.openingElement.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'onContextMenu'));
      }
      ts.forEachChild(node, walk);
    }
    walk(ast); assert.equal(animatedBubble, true, `${path}: animate the message, not just its reply quote`);
    let saved;
    const env = { nickname: 'me', uid: 'me-id', input: 'hello', spoilerMode: false, selectedEffect: 'pop', isSending: false, currentChatUser: { nickname: 'friend', id: 'friend' }, currentRoom: { id: 'room', members: ['me', 'friend'], name: 'room' }, replyTo: null, chosungGame: null, wordGame: null, game369: null, wordGameKey: null, db: {}, collection: (...args) => args, serverTimestamp: () => 'time', addDoc: async (_, data) => { saved = data; }, setIsSending: () => {}, setInput: () => {}, setReplyTo: () => {}, setSpoilerMode: () => {}, Audio: class { play() { return Promise.resolve(); } }, fetch: async () => ({}), alert: () => {}, updateTyping: () => {}, sendTyping: () => {} };
    env.setSelectedEffect = value => { env.selectedEffect = value; };
    env.apiFetch=env.fetch; env.playSendSound=()=>{}; vm.runInNewContext(compile('var send=' + send), env);
    await env.send(); assert.equal(saved.bubbleEffect, 'pop'); assert.equal(env.selectedEffect, 'none');
    await env.send(); assert.equal(saved.bubbleEffect, undefined);
    env.selectedEffect = 'shake'; await env.send('game answer'); assert.equal(saved.bubbleEffect, undefined);
    env.selectedEffect = 'fade'; env.addDoc = async () => { throw Error('offline'); };
    await env.send(); assert.equal(env.selectedEffect, 'fade');
  }
  console.log('Bubble effects: whitelist, correct bubble wrapper, all chat payloads, one-message reset, overrides and failed-send retention passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
