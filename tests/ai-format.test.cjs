const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const {renderToStaticMarkup}=require('react-dom/server');const React=require('react');
const ctx={exports:{},require};vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/AITextLinks.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,ctx);
const render=text=>renderToStaticMarkup(React.createElement(ctx.exports.default,{text}));
assert.match(render('핵심 **중요** 내용'),/<strong[^>]*>.*중요.*<\/strong>/);
assert.match(render('**[출처](https://example.com)**'),/<strong[^>]*><a href="https:\/\/example.com"/);
assert.ok(!render('<script>alert(1)</script>').includes('<script>'));
assert.ok(!render('[나쁨](javascript:alert(1))').includes('<a'));
assert.ok(render('**아직 작성 중').includes('**아직 작성 중'));
console.log('AI formatting: 5 checks passed');
