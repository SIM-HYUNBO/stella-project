const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

const lib = {};
runInNewContext(ts.transpileModule(readFileSync(join(__dirname, "../lib/spy-room.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: lib, require });

const empty = () => ({
  name: "스파이방", members: ["a", "b", "c"].map(uid => ({ uid, name: uid })),
  memberIds: ["a", "b", "c"], createdAt: 0, startedAt: null, presence: {}, messages: [],
});

test("all invited members must be present together, and reconnects do not start another round", () => {
  let room = lib.enterSpyRoom(empty(), "a", "a1", 1000);
  room = lib.enterSpyRoom(room, "b", "b1", 2000);
  room = lib.enterSpyRoom(room, "c", "c1", 16000);
  assert.equal(room.startedAt, null);
  room = lib.enterSpyRoom(room, "a", "a2", 16001);
  assert.equal(room.startedAt, 16001);
  assert.equal(lib.enterSpyRoom(room, "c", "c2", 50000).startedAt, 16001);
});

test("only one player receives a mission, and it stays the same on re-entry", () => {
  let room = empty();
  for (const uid of room.memberIds) room = lib.enterSpyRoom(room, uid, uid, 1000);
  const views = room.memberIds.map(uid => lib.spyView(room, "room", uid, 1000, "test-secret"));
  const spy = views.findIndex(view => view.role === "spy");
  assert.notEqual(spy, -1);
  assert.equal(views.filter(view => view.mission).length, 1);
  assert.ok(views.filter((_, i) => i !== spy).every(view => view.role === "member" && view.mission === null));
  assert.equal(lib.spyView(room, "room", room.memberIds[spy], 30000, "test-secret").mission, views[spy].mission);
  assert.equal(lib.spyView(empty(), "room", "a", 1000, "test-secret").role, null);
});
