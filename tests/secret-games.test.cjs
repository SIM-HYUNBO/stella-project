const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function compile(path) { return ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText; }
const games = {};
vm.runInNewContext(compile('lib/secret-games.ts'), { exports: games });
test('20 playable game types yield three distinct random choices and valid quiz answers', () => {
  assert.equal(games.SECRET_GAMES.length, 20);
  const seen = new Set();
  for (let i = 0; i < 150; i++) {
    const selection = games.pickSecretGames();
    assert.equal(new Set(selection.map(g => g.id)).size, 3);
    selection.forEach(g => seen.add(g.id));
    for (const game of games.SECRET_GAMES.slice(3)) {
      const q = games.makeSecretQuestion(game.id);
      assert.ok(q.choices.includes(q.answer), game.id);
      assert.equal(new Set(q.choices).size, q.choices.length);
      assert.ok(q.choices.length >= 2);
    }
  }
  assert.equal(seen.size, 20);
});

function screen(random) {
  let now = 0, index = 0, nextTimer = 0, dirty = false, tree;
  const slots = [], timers = new Map(), effects = [];
  const react = {
    useState(initial) { const i = index++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, v => { slots[i].value = typeof v === 'function' ? v(slots[i].value) : v; dirty = true; }]; },
    useRef(initial) { const i = index++; if (!slots[i]) slots[i] = { current: initial }; return slots[i]; },
    useEffect(fn, deps) { const i = index++, prior = slots[i]; if (!prior || deps.some((d, j) => d !== prior.deps[j])) { slots[i] = { deps, cleanup: prior?.cleanup }; effects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const jsx = (type, props) => ({ type, props });
  const subject = {};
  vm.runInNewContext(compile('app/locked/page.tsx'), {
    exports: subject, crypto: { getRandomValues(a) { a[0] = Math.floor(random * 4294967296); return a; } }, performance: { now: () => now },
    window: { setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, time: now + delay }); return id; }, clearTimeout: id => timers.delete(id) },
    require(name) { if (name === 'react') return react; if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }; if (name === 'next/navigation') return { useRouter: () => ({ back() {} }) }; if (name === '@/lib/secret-games') return games; if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key }); if (name.endsWith('.css')) return new Proxy({}, { get: (_, key) => String(key) }); throw Error(name); },
  });
  function render() { do { dirty = false; index = 0; tree = subject.default(); effects.splice(0).forEach(fn => fn()); } while (dirty); }
  render();
  return { tree: () => tree, advance(to) { while (true) { const next = [...timers].filter(([, t]) => t.time <= to).sort((a,b) => a[1].time - b[1].time)[0]; if (!next) break; now = next[1].time; timers.delete(next[0]); next[1].fn(); render(); } now = to; }, click(button) { button.props.onClick(); render(); } };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
test('successful entrance opens after greeting and expires after five seconds without restarting', () => {
  const app = screen(.199);
  app.advance(799); assert.ok(!JSON.stringify(app.tree()).includes('진입 성공'));
  app.advance(800); assert.ok(JSON.stringify(app.tree()).includes('진입 성공'));
  app.advance(1800); assert.equal(nodes(app.tree()).filter(n => n.type === 'button' && n.props.disabled === true).length, 3);
  app.advance(2400); assert.equal(nodes(app.tree()).filter(n => n.type === 'button' && n.props.disabled === false).length, 3);
  app.advance(7400); assert.equal(nodes(app.tree()).filter(n => n.type === 'button' && n.props.disabled === false).length, 0);
  app.advance(9000); assert.ok(!JSON.stringify(app.tree()).includes('게임 선택'));
  app.advance(20000); assert.ok(!JSON.stringify(app.tree()).includes('게임 선택'));
});
test('80-percent failure shows next-time message and never opens the game menu', () => {
  const app = screen(.201); app.advance(800);
  assert.ok(JSON.stringify(app.tree()).includes('다음 기회에...'));
  app.advance(3000); assert.equal(nodes(app.tree()).filter(n => n.type === 'button').length, 0);
});
test('choosing a game cancels the five-second disappearance', () => {
  const app = screen(.1); app.advance(2500);
  app.click(nodes(app.tree()).find(n => n.type === 'button' && n.props.disabled === false));
  app.advance(20000);
  assert.ok(nodes(app.tree()).some(n => typeof n.type === 'function' && n.props.game));
});
