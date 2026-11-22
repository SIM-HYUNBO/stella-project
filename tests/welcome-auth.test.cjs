const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function pageHarness(kind) {
 const hooks = []; let cursor = 0, tree;
 const calls = { signup: 0, login: 0, profile: [], routes: [], persistence: [] };
 const jsx = (type, props) => ({ type, ...props });
 const user = { uid: 'test-user', getIdToken: async () => 'test-only-token', delete: async () => {} };
 const react = {
  useState(initial) { const key = cursor++; if (!(key in hooks)) hooks[key] = initial; return [hooks[key], value => { hooks[key] = typeof value === 'function' ? value(hooks[key]) : value; }]; },
  useRef(initial) { const key = cursor++; if (!(key in hooks)) hooks[key] = { current: initial }; return hooks[key]; },
 };
 const subject = {};
 const code = ts.transpileModule(fs.readFileSync(`app/${kind}/page.tsx`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
 vm.runInNewContext(code, { exports: subject, navigator: {}, window: {}, alert() {}, fetch: async (url, options) => { calls.profile.push({ url, options }); return { ok: true }; }, require(name) {
  if (name === 'react') return react;
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
  if (name === 'next/link') return { __esModule: true, default: 'Link' };
  if (name === 'next/navigation') return { useRouter: () => ({ replace: path => calls.routes.push(path), push: path => calls.routes.push(path) }) };
  if (name === 'firebase/auth') return { browserLocalPersistence: 'local', browserSessionPersistence: 'session', setPersistence: async (_auth, value) => calls.persistence.push(value), signInWithEmailAndPassword: async () => { calls.login++; return { user }; }, createUserWithEmailAndPassword: async () => { calls.signup++; return { user }; } };
  if (name === 'firebase/firestore') return { collection() {}, query() {}, where() {}, doc() {}, getDoc: async () => ({ exists: () => false }), getDocs: async () => { await new Promise(setImmediate); return { empty: true }; } };
  if (name.includes('firebase')) return { auth: {}, db: {} };
  if (name.includes('usePushSubscription')) return { saveFCMToken: async () => {} };
  if (name.includes('AuthShell')) return { __esModule: true, default: 'AuthShell' };
  if (name.includes('AuthInput')) return { AuthInput: 'AuthInput', AuthPasswordInput: 'AuthPasswordInput' };
  if (name.endsWith('.css')) return { __esModule: true, default: {} };
  if (name === 'lucide-react') return {};
  throw Error(name);
 } });
 const render = () => { cursor = 0; tree = subject.default(); return tree; };
 function find(predicate, node = tree) { if (!node || typeof node !== 'object') return; if (predicate(node)) return node; for (const child of [node.children].flat(Infinity).filter(value => value != null)) { const found = find(predicate, child); if (found) return found; } }
 const change = (id, value) => { find(node => node.id === id).onChange({ target: { value } }); render(); };
 const submit = () => find(node => node.type === 'form').onSubmit({ preventDefault() {} });
 const settle = async () => { await new Promise(setImmediate); await new Promise(setImmediate); render(); };
 render(); return { render, find, change, submit, settle, calls };
}
test('signup goes basic → contact → agreement → signup with no empty fourth step or duplicate account', async () => {
 const h = pageHarness('signup');
 for (const [id,value] of [['signup-nickname','테스트'],['signup-email','sample@example.com'],['signup-password','sample123'],['signup-confirm-password','sample123']]) h.change(id,value);
 h.submit(); h.submit(); await h.settle();
 assert.ok(h.find(node => node.id === 'signup-birthdate')); assert.equal(h.calls.signup,0);
 h.change('signup-birthdate','2000-01-01'); h.change('signup-phone','010-1234-5678'); h.submit(); await h.settle();
 const checkbox=h.find(node=>node.type==='checkbox');
 // The JSX input type is the HTML tag; its type prop is checkbox.
 checkbox.onChange({target:{checked:true}}); h.render(); h.submit(); h.submit(); await h.settle();
 assert.equal(h.calls.signup,1); assert.equal(h.calls.profile.length,1); assert.equal(h.calls.profile[0].url,'/api/signup-profile'); assert.equal(JSON.parse(h.calls.profile[0].options.body).phone,'01012345678'); assert.deepEqual(h.calls.routes,['/home']);
});
test('signup rejects mismatched passwords before advancing', async()=>{
 const h=pageHarness('signup');for(const [id,value]of [['signup-nickname','테스트'],['signup-email','sample@example.com'],['signup-password','sample123'],['signup-confirm-password','different']])h.change(id,value);h.submit();await h.settle();assert.ok(h.find(node=>node.role==='alert'));assert.ok(h.find(node=>node.id==='signup-email'));assert.equal(h.calls.signup,0);
});
test('login keeps the selected persistence and only submits once',async()=>{
 const h=pageHarness('login');h.change('login-email','sample@example.com');h.change('login-password','sample123');h.find(node=>node.role==='switch').onClick();h.render();h.submit();h.submit();await h.settle();assert.equal(h.calls.login,1);assert.deepEqual(h.calls.persistence,['session']);assert.deepEqual(h.calls.routes,['/home']);
});
