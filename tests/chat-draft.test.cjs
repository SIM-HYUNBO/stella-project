const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(readFileSync("app/hooks/useChatDraft.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function mount(storage) {
  let state = {}, ref, previousKey, effect;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    require: () => ({
      useState: () => [state, update => { state = update(state); }],
      useRef: initial => ref ??= { current: initial },
      useEffect: (run, [key]) => { if (key !== previousKey) { previousKey = key; effect = run; } },
    }),
  });
  return (kind, uid, room) => {
    let view = exports.useChatDraft(kind, uid, room);
    if (effect) { const run = effect; effect = null; run(); view = exports.useChatDraft(kind, uid, room); }
    return view;
  };
}

test("drafts restore after reload and are isolated by account, room and chat type", () => {
  const storage = new Map();
  const render = mount(storage);
  render("dm", "me", "one").setInput("hello");
  render("group", "me", "one").setInput("group hello");
  assert.equal(render("dm", "me", "two").input, "");
  assert.equal(render("dm", "other", "one").input, "");
  const reload = mount(storage);
  assert.equal(reload("dm", "me", "one").input, "hello");
  assert.equal(reload("group", "me", "one").input, "group hello");
});

test("a late send clears only the original sent text, not newer edits or another room", () => {
  const storage = new Map();
  const render = mount(storage);
  const first = render("dm", "me", "one");
  first.setInput("sending");
  render("dm", "me", "two").setInput("keep this");
  first.clearSentDraft("sending");
  assert.equal(render("dm", "me", "two").input, "keep this");
  assert.equal(render("dm", "me", "one").input, "");
  first.setInput("newer text");
  first.clearSentDraft("older text");
  assert.equal(mount(storage)("dm", "me", "one").input, "newer text");
});
