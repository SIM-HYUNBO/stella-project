const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Run the hook through render/effect cycles with a measurable scroll viewport.
const slots = [];
let cursor = 0, effects = [], dirty = false, resize;
const same = (a, b) => a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const react = {
  useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
  useState(value) {
    const i = cursor++; if (!(i in slots)) slots[i] = value;
    return [slots[i], next => { if (!Object.is(slots[i], next)) { slots[i] = next; dirty = true; } }];
  },
  useCallback(fn, deps) {
    const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { fn, deps };
    return slots[i].fn;
  },
  useLayoutEffect(fn, deps) {
    const i = cursor++;
    if (!same(slots[i]?.deps, deps)) {
      const previous = slots[i]; slots[i] = { deps };
      effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
    }
  },
};
const context = {
  exports: {}, require: () => react,
  ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() {} },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/hooks/useChatScroll.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const viewport = { scrollHeight: 1200, clientHeight: 400, scrollTop: 0 };
let room = 'one', messages = [{ id: 'a', from: 'friend' }], paused = false, state;
function render() {
  for (let n = 0; n < 10; n++) {
    cursor = 0; effects = []; dirty = false;
    state = context.exports.default(room, messages, 'me', paused);
    state.viewportRef.current = viewport; state.contentRef.current = {};
    effects.forEach(effect => effect());
    if (!dirty) return state;
  }
  throw Error('Render loop');
}
render(); assert.equal(viewport.scrollTop, 1200);
viewport.scrollTop = 200; state.onScroll(); render(); assert.equal(state.away, true);
messages = [...messages, { id: 'b', from: 'friend' }]; viewport.scrollHeight = 1300;
render(); assert.equal(viewport.scrollTop, 200); assert.equal(state.newCount, 1);
messages = messages.map(m => ({ ...m })); render(); assert.equal(state.newCount, 1);
resize(); render(); assert.equal(viewport.scrollTop, 200);
messages = messages.filter(m => m.id !== 'b'); render(); assert.equal(state.newCount, 0);
state.goToLatest(); render(); assert.equal(state.away, false); assert.equal(viewport.scrollTop, 1300);
viewport.scrollTop = 200; state.onScroll(); render();
messages = [...messages, { id: 'mine', from: 'me' }]; render(); assert.equal(state.away, false);
viewport.scrollTop = 200; state.onScroll(); render(); paused = true; render();
messages = [...messages, { id: 'c', from: 'friend' }]; render(); assert.equal(viewport.scrollTop, 200);
paused = false; render(); assert.equal(state.newCount, 1);
room = 'two'; messages = [{ id: 'other-room', from: 'friend' }]; render();
assert.equal(state.newCount, 0); assert.equal(state.away, false); assert.equal(viewport.scrollTop, 1300);
console.log('Chat scrolling: history position, new counts, duplicate snapshots, resize, own send, search and room reset passed');
