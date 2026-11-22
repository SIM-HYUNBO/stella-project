const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(file){const subject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:subject});return subject}
const avatar=load('lib/profile-avatar.ts'),activity=load('lib/profile-activity.ts');
test('avatar only accepts known options and cannot inject SVG markup',()=>{const value=avatar.normalizeAvatar({hair:'<script>alert(1)</script>',skin:'red" onload="evil',outfitColor:'#f5d579'});assert.equal(value.hair,avatar.DEFAULT_AVATAR.hair);assert.equal(value.skin,avatar.DEFAULT_AVATAR.skin);assert.equal(value.outfitColor,'#f5d579');assert.ok(!avatar.avatarSvg(value).includes('<script'));assert.ok(avatar.avatarDataUri(value).startsWith('data:image/svg+xml;'))});
test('hair, expressions, clothes and accessories all change the actual drawing',()=>{const base=avatar.avatarSvg(avatar.DEFAULT_AVATAR);for(const key of ['hair','expression','outfit','accessory']){const different=avatar.AVATAR_OPTIONS[key].find(value=>value!==avatar.DEFAULT_AVATAR[key]);assert.notEqual(avatar.avatarSvg({...avatar.DEFAULT_AVATAR,[key]:different}),base)}});
test('week includes exactly seven Korean calendar dates ending today',()=>{const week=activity.profileWeek(Date.parse('2026-11-21T16:00:00Z'));assert.equal(week.length,7);assert.equal(week[0].date,'2026-11-16');assert.equal(week[6].date,'2026-11-22');assert.equal(week[6].start,Date.parse('2026-11-21T15:00:00Z'));assert.equal(week[0].end,week[1].start)});
test('Korean midnight changes buckets and handles year boundaries',()=>{assert.equal(activity.profileWeek(Date.parse('2026-12-31T14:59:59Z'))[6].date,'2026-12-31');assert.equal(activity.profileWeek(Date.parse('2026-12-31T15:00:00Z'))[6].date,'2027-01-01')});
test('activity endpoint aggregates authenticated user only and never returns message contents',async()=>{
 const subject={}, seen=[];
 class ApiError extends Error {}
 const db={collectionGroup(name){
  assert.equal(name,'messages');
  return {
   where(field,op,value){seen.push({field,op,value});return this},
   count(){return {get:async()=>({data:()=>({count:4})})}}
  };
 }};
 const code=ts.transpileModule(fs.readFileSync('app/api/profile-activity/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{exports:subject,require(name){
  if(name==='next/server')return {NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};
  if(name==='firebase-admin/firestore')return {Timestamp:{fromMillis:value=>value}};
  if(name==='@/lib/profile-activity')return activity;
  if(name==='@/lib/api-user')return {ApiError,apiUser:async()=>({uid:'me',profile:{createdAt:{toMillis:()=>1234}},db})};
  throw Error(name);
 }});
 const result=await subject.GET({url:'https://wagie.net/api/profile-activity?uid=somebody-else'});
 assert.equal(result.status,200);assert.equal(result.body.days.length,7);assert.equal(result.body.days[0].count,4);
 assert.equal(seen.filter(x=>x.field==='fromUid'&&x.value==='me').length,7);
 assert.ok(!JSON.stringify(result.body).includes('content'));assert.equal(result.body.joinedAt,1234);
});
