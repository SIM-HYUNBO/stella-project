"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where, onSnapshot, setDoc, updateDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PageContainer from "@/components/PageContainer";
import TextAvatar from "@/components/TextAvatar";

const TITLE_MAP: Record<string, { icon: string; name: string }> = {
  newcomer:    { icon: "🌱", name: "새싹" },
  talker:      { icon: "💬", name: "수다쟁이" },
  chatterer:   { icon: "🗣️", name: "채팅왕" },
  talkmaster:  { icon: "👑", name: "말왕" },
  talkgod:     { icon: "⚡", name: "말신" },
  friendly:    { icon: "🤝", name: "친화력 갑" },
  richfriend:  { icon: "💎", name: "친구부자" },
  popular:     { icon: "😎", name: "인싸" },
  partyperson: { icon: "🎉", name: "파티피플" },
  groupmaster: { icon: "🎪", name: "방장" },
  nightowl:    { icon: "🦉", name: "야행성" },
  legend:      { icon: "🌟", name: "레전드" },
};

type Friend = { uid: string; nickname: string; profileImage: string | null };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return "밤이 깊었어요 🌙";
  if (h < 12) return "좋은 아침이에요 🌅";
  if (h < 18) return "좋은 오후예요 ☀️";
  return "좋은 저녁이에요 🌆";
}

function getTodayQuote() {
  const quotes = [
    "오늘도 빛나는 하루예요 🌟",
    "작은 대화가 큰 힘이 돼요 💬",
    "친구가 있어 든든해요 🤝",
    "오늘 하루도 수고했어요 🧡",
    "좋은 사람과 함께라면 충분해요 ✨",
  ];
  return quotes[new Date().getDay() % quotes.length];
}

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [dmUnread, setDmUnread] = useState<Record<string, number>>({});
  const [groupUnread, setGroupUnread] = useState(0);
  const [title, setTitle] = useState<string | null>(null);

  // 어드민 상태
  const [adminMode, setAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState<"stats" | "notice" | "users" | "qna">("stats");
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  const [qnaItems, setQnaItems] = useState<any[]>([]);
  const [qnaAnswerInputs, setQnaAnswerInputs] = useState<Record<string, string>>({});
  const [qnaAnsweringId, setQnaAnsweringId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [noticeUserSearch, setNoticeUserSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [mouseTrail, setMouseTrail] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "유저");
        setProfileImage(snap.data().profileImage || null);
        setTitle(snap.data().title || null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setAdminMode(localStorage.getItem("stellaAdminMode") === "true");
  }, []);

  // Q&A 구독 (어드민)
  useEffect(() => {
    if (!adminMode || nickname !== "Stella") return;
    const q = query(collection(db, "qna"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setQnaItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [adminMode, nickname]);

  // 어드민 데이터 로딩
  useEffect(() => {
    if (!adminMode || nickname !== "Stella") return;
    (async () => {
      const [usersSnap, configSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDoc(doc(db, "config", "app")),
      ]);

      const userList: any[] = [];
      usersSnap.forEach((d) => userList.push({ uid: d.id, ...d.data() }));
      userList.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setAllUsers(userList);

      if (configSnap.exists()) setMaintenanceMode(configSnap.data()?.maintenance ?? false);
    })();
  }, [adminMode, nickname]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const fSnap = await getDocs(query(collection(db, "friends"), where("users", "array-contains", uid)));
      const list: Friend[] = [];
      for (const d of fSnap.docs) {
        const otherUid = d.data().users.find((u: string) => u !== uid);
        if (!otherUid) continue;
        const uSnap = await getDoc(doc(db, "users", otherUid));
        if (uSnap.exists()) list.push({ uid: otherUid, nickname: uSnap.data().nickname, profileImage: uSnap.data().profileImage || null });
      }
      list.sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko"));
      setFriends(list);
    })();
  }, [uid]);

  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "messages"), where("to", "==", nickname));
    return onSnapshot(q, (snap) => {
      const counts: Record<string, number> = {};
      snap.forEach((d) => {
        const data = d.data();
        if (data.from !== nickname && !data.readBy?.includes(nickname)) {
          counts[data.from] = (counts[data.from] || 0) + 1;
        }
      });
      setDmUnread(counts);
    });
  }, [nickname]);

  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "group_rooms"), where("members", "array-contains", nickname));
    return onSnapshot(q, async (snap) => {
      let total = 0;
      for (const d of snap.docs) {
        const msgSnap = await getDocs(collection(db, "group_rooms", d.id, "messages"));
        msgSnap.forEach((m) => { const data = m.data(); if (data.from !== nickname && !data.readBy?.includes(nickname)) total++; });
      }
      setGroupUnread(total);
    });
  }, [nickname]);

  // ── 어드민 커서 ──
  useEffect(() => {
    if (!adminMode || nickname !== "Stella") return;
    const move = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      setTimeout(() => setMouseTrail({ x: e.clientX, y: e.clientY }), 80);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [adminMode, nickname]);

  // ── 어드민 핸들러 ──
  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) { setMigrateResult("❌ 로그인 필요"); return; }
      const res = await fetch("/api/migrate-nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, from: "관리자", to: "Stella" }),
      });
      const data = await res.json();
      setMigrateResult(data.ok ? `✅ ${data.updated}개 완료` : `❌ ${data.error}`);
    } finally {
      setMigrating(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim() || selectedRecipients.length === 0) return;
    setBroadcastSending(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, title: broadcastTitle || "📢 공지", message: broadcastMsg, targetNicknames: selectedRecipients }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`${data.sent}명에게 발송 완료!`);
        setBroadcastTitle("");
        setBroadcastMsg("");
        setSelectedRecipients([]);
        setNoticeUserSearch("");
      } else {
        alert("오류: " + (data.error || "알 수 없음"));
      }
    } catch (e: any) {
      alert("오류: " + e.message);
    }
    setBroadcastSending(false);
  };

  const handleMaintenance = async (on: boolean) => {
    setMaintenanceMode(on);
    await setDoc(doc(db, "config", "app"), { maintenance: on }, { merge: true });
  };

  // ── 어드민 계산값 ──
  const chartData = (() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const count = allUsers.filter((u) => {
        if (!u.createdAt?.seconds) return false;
        const ud = new Date(u.createdAt.seconds * 1000);
        return ud.getDate() === d.getDate() && ud.getMonth() === d.getMonth() && ud.getFullYear() === d.getFullYear();
      }).length;
      days.push({ date: label, count });
    }
    return days;
  })();

  const filteredUsers = allUsers.filter(
    (u) => !userSearch || u.nickname?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!nickname) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fefce8]">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-[6px] border-sky-300" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[6px] border-transparent border-t-orange-400 animate-spin" />
        </div>
      </div>
    );
  }

  // ── 관리자 대시보드 ──
  if (nickname === "Stella" && adminMode) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex flex-col overflow-hidden no-cursor">
        {/* 커스텀 커서 */}
        <div className="fixed pointer-events-none z-[9999]" style={{ left: mousePos.x, top: mousePos.y, transform: "translate(-50%, -50%)" }}>
          <div className="w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_8px_3px_rgba(168,85,247,0.8)]" />
        </div>
        <div className="fixed pointer-events-none z-[9998] transition-[left,top] ease-out duration-[80ms]" style={{ left: mouseTrail.x, top: mouseTrail.y, transform: "translate(-50%, -50%)" }}>
          <div className="w-7 h-7 rounded-full border border-purple-400/50 shadow-[0_0_12px_2px_rgba(168,85,247,0.3)]" />
        </div>
        {/* 고정 헤더 + 탭바 */}
        <div className="shrink-0 bg-slate-950 border-b border-white/10 safe-area-top">
          <div className="px-5 pt-12 pb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-purple-400 tracking-[0.2em] uppercase">Wagie Admin Console</p>
              <h1 className="text-xl font-black text-white mt-0.5">🔑 관리자</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="px-3 py-1.5 bg-orange-500/80 rounded-xl text-xs font-bold text-white hover:bg-orange-500 active:bg-orange-600 transition disabled:opacity-40"
              >
                {migrating ? "복구중..." : migrateResult ?? "닉네임 복구"}
              </button>
              <button
                onClick={() => router.push("/tools")}
                className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-bold text-white/70 hover:bg-white/20 active:bg-white/30 transition"
              >
                설정 →
              </button>
            </div>
          </div>
          <div className="flex border-t border-white/5">
            {(["stats", "notice", "users", "qna"] as const).map((t) => {
              const labels: Record<string, string> = { stats: "📊 통계", notice: "📢 공지", users: "👥 유저", qna: "💬 Q&A" };
              return (
                <button
                  key={t}
                  onClick={() => setAdminTab(t)}
                  className={`flex-1 py-3 text-xs font-black transition border-b-2 ${
                    adminTab === t ? "border-purple-500 text-purple-400" : "border-transparent text-white/30 hover:text-white/60"
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 스크롤 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">

          {/* ── 통계 탭 ── */}
          {adminTab === "stats" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "전체 유저", value: allUsers.length, cls: "bg-purple-500/20 border-purple-500/30 text-purple-300" },
                  {
                    label: "이번 주 가입",
                    value: allUsers.filter((u) => u.createdAt?.seconds && Date.now() - u.createdAt.seconds * 1000 < 7 * 24 * 3600 * 1000).length,
                    cls: "bg-sky-500/20 border-sky-500/30 text-sky-300",
                  },
                  { label: "내 친구", value: friends.length, cls: "bg-green-500/20 border-green-500/30 text-green-300" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={`rounded-2xl border ${cls} p-4 text-center`}>
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-[10px] text-white/40 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-[10px] font-black text-white/30 mb-4 uppercase tracking-wider">📈 일별 신규 가입 (7일)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} barSize={22}>
                    <XAxis dataKey="date" tick={{ fill: "#ffffff40", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      contentStyle={{ background: "#1e1b4b", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 10, fontSize: 12, color: "#fff" }}
                      formatter={(v: any) => [`${v}명`, "가입"]}
                    />
                    <Bar dataKey="count" fill="#a855f7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-black">🚧 점검 모드</p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {maintenanceMode ? "🔴 점검 중 — 일반 유저 접근 제한됨" : "🟢 정상 운영 중"}
                  </p>
                </div>
                <button
                  onClick={() => handleMaintenance(!maintenanceMode)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${maintenanceMode ? "bg-red-500" : "bg-white/20"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${maintenanceMode ? "translate-x-[24px]" : "translate-x-0"}`} />
                </button>
              </div>
            </>
          )}

          {/* ── 공지 탭 ── */}
          {adminTab === "notice" && (
            <div className="space-y-3">
              {/* 받는 사람 선택 */}
              <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <p className="text-[10px] font-black text-white/40 uppercase">받는 사람 {selectedRecipients.length > 0 ? `(${selectedRecipients.length}명 선택)` : ""}</p>
                  <button
                    onClick={() => {
                      const visible = allUsers.filter((u) => !noticeUserSearch || u.nickname?.toLowerCase().includes(noticeUserSearch.toLowerCase()));
                      const allSelected = visible.every((u) => selectedRecipients.includes(u.nickname));
                      if (allSelected) setSelectedRecipients((prev) => prev.filter((n) => !visible.some((u) => u.nickname === n)));
                      else setSelectedRecipients((prev) => Array.from(new Set([...prev, ...visible.map((u) => u.nickname)])));
                    }}
                    className="text-[10px] text-purple-400 font-black"
                  >
                    {allUsers.filter((u) => !noticeUserSearch || u.nickname?.toLowerCase().includes(noticeUserSearch.toLowerCase())).every((u) => selectedRecipients.includes(u.nickname)) ? "전체 해제" : "전체 선택"}
                  </button>
                </div>
                <div className="px-3 py-2 border-b border-white/5">
                  <input
                    value={noticeUserSearch}
                    onChange={(e) => setNoticeUserSearch(e.target.value)}
                    placeholder="닉네임 검색"
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-white/5">
                  {allUsers
                    .filter((u) => !noticeUserSearch || u.nickname?.toLowerCase().includes(noticeUserSearch.toLowerCase()))
                    .map((u) => {
                      const checked = selectedRecipients.includes(u.nickname);
                      return (
                        <button
                          key={u.uid}
                          onClick={() => setSelectedRecipients((prev) => checked ? prev.filter((n) => n !== u.nickname) : [...prev, u.nickname])}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 active:bg-white/10 transition text-left"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${checked ? "bg-purple-500 border-purple-500" : "border-white/20"}`}>
                            {checked && <span className="text-white text-[9px] font-black">✓</span>}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-black text-purple-300 shrink-0">
                            {u.nickname?.[0] ?? "?"}
                          </div>
                          <p className="text-sm text-white">{u.nickname}</p>
                        </button>
                      );
                    })}
                </div>
              </div>

              <input
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="제목 (기본: 📢 공지)"
                className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <textarea
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="내용을 입력하세요..."
                rows={5}
                className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <button
                onClick={handleBroadcast}
                disabled={!broadcastMsg.trim() || broadcastSending || selectedRecipients.length === 0}
                className="w-full py-4 rounded-2xl bg-purple-600 font-black text-white disabled:opacity-40 active:scale-[0.98] transition"
              >
                {broadcastSending ? "발송 중..." : selectedRecipients.length === 0 ? "받는 사람을 선택하세요" : `📢 발송 (${selectedRecipients.length}명)`}
              </button>
            </div>
          )}

          {/* ── 유저 탭 ── */}
          {adminTab === "users" && (
            <div className="space-y-3">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="닉네임 / 이메일 검색"
                className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[10px] text-white/30 font-black px-1">{filteredUsers.length}명</p>
              <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5 overflow-hidden">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-white/30 text-sm py-8">검색 결과 없음</p>
                ) : (
                  filteredUsers.map((u) => (
                    <div key={u.uid} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-black shrink-0 text-purple-300">
                        {u.nickname?.[0] ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">{u.nickname}</p>
                        <p className="text-[11px] text-white/30 truncate">{u.email}</p>
                      </div>
                      <p className="text-[10px] text-white/20 shrink-0">
                        {u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString("ko") : "—"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Q&A 탭 ── */}
          {adminTab === "qna" && (
            <div className="space-y-4">
              {qnaItems.length === 0 && (
                <div className="text-center py-16 text-white/30 text-sm">아직 질문이 없어요</div>
              )}
              {qnaItems.map((item) => {
                const formatDate = (ts: any) => {
                  if (!ts) return "";
                  const d = ts?.toDate ? ts.toDate() : new Date(ts);
                  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                };
                return (
                  <div key={item.id} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
                    {/* 질문 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-purple-400">{item.askerName}</span>
                        <span className="text-[10px] text-white/20">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="text-sm text-white leading-relaxed">Q. {item.question}</p>
                    </div>

                    {/* 답변 있을 때 */}
                    {item.answer && (
                      <div className="bg-white/5 rounded-xl p-3">
                        <span className="text-[10px] font-black text-sky-400 block mb-1">A. Stella</span>
                        <p className="text-sm text-white/80">{item.answer}</p>
                      </div>
                    )}

                    {/* 미답변 */}
                    {!item.answer && (
                      qnaAnsweringId === item.id ? (
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="답변 입력..."
                            value={qnaAnswerInputs[item.id] || ""}
                            onChange={(e) => setQnaAnswerInputs((p) => ({ ...p, [item.id]: e.target.value }))}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                const ans = qnaAnswerInputs[item.id]?.trim();
                                if (!ans) return;
                                await updateDoc(doc(db, "qna", item.id), { answer: ans, answeredAt: serverTimestamp() });
                                setQnaAnswerInputs((p) => ({ ...p, [item.id]: "" }));
                                setQnaAnsweringId(null);
                              }
                            }}
                          />
                          <button
                            onClick={async () => {
                              const ans = qnaAnswerInputs[item.id]?.trim();
                              if (!ans) return;
                              await updateDoc(doc(db, "qna", item.id), { answer: ans, answeredAt: serverTimestamp() });
                              setQnaAnswerInputs((p) => ({ ...p, [item.id]: "" }));
                              setQnaAnsweringId(null);
                            }}
                            className="px-4 rounded-xl bg-purple-600 text-white text-xs font-black active:scale-95 transition"
                          >등록</button>
                          <button onClick={() => setQnaAnsweringId(null)}
                            className="px-3 rounded-xl bg-white/10 text-white/50 text-xs">취소</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setQnaAnsweringId(item.id)}
                          className="text-xs font-black text-purple-400 border border-purple-500/30 bg-purple-500/10 rounded-full px-4 py-1.5 active:scale-95 transition"
                        >
                          + 답변하기
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="relative min-h-screen overflow-hidden -m-4">

        {/* ── 배경 ── */}
        <div className="fixed inset-0 -z-10" style={{ background: "linear-gradient(to right, #fefce8, #e0f2fe)" }} />

        {/* ── 떠다니는 파티클 ── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <span className="absolute top-[10%] left-[6%]  text-2xl opacity-15 animate-[floatA_8s_ease-in-out_infinite_alternate]">💬</span>
          <span className="absolute top-[22%] right-[8%] text-xl  opacity-15 animate-[floatB_10s_ease-in-out_infinite_alternate]">✨</span>
          <span className="absolute top-[45%] left-[3%] text-lg  opacity-10 animate-[floatC_12s_ease-in-out_infinite_alternate]">🧡</span>
          <span className="absolute top-[58%] right-[5%] text-2xl opacity-15 animate-[floatD_9s_ease-in-out_infinite_alternate]">🌸</span>
          <span className="absolute top-[75%] left-[7%] text-xl  opacity-10 animate-[floatE_11s_ease-in-out_infinite_alternate]">⭐</span>
          <span className="absolute top-[88%] right-[10%] text-lg opacity-15 animate-[floatA_13s_ease-in-out_infinite_alternate]">🌙</span>
          <span className="absolute top-[32%] right-[18%] text-sm opacity-15 animate-[floatB_7s_ease-in-out_infinite_alternate]">💫</span>
        </div>

        <div className="px-5 pt-4 pb-24 space-y-6">

          {/* ── 히어로 ── */}
          <div className="relative rounded-[32px] overflow-hidden">
            <div className="p-6 relative" style={{ background: "linear-gradient(135deg, #7dd3fc, #bae6fd)" }}>
              <div className="absolute top-0 right-0 w-52 h-52 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
              <div className="absolute top-4 left-1/2 w-20 h-20 rounded-full bg-white/5 -translate-x-1/2" />
              <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />

              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-semibold mb-1">{getGreeting()}</p>
                  <h1 className="text-4xl font-black text-white leading-tight">
                    안녕,<br />{nickname} 👋
                  </h1>
                  {title && TITLE_MAP[title] && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 backdrop-blur-sm">
                      <span className="text-sm">{TITLE_MAP[title].icon}</span>
                      <span className="text-white text-xs font-black">{TITLE_MAP[title].name}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => router.push("/profile")} className="shrink-0">
                  <div className="relative w-[80px] h-[80px] flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-white/40 animate-[spinSlow_6s_linear_infinite]" />
                    <div className="absolute w-[68px] h-[68px] rounded-full border-2 border-white/25 animate-[spinSlow_4s_linear_infinite_reverse]" />
                    <div className="w-[64px] h-[64px] rounded-full overflow-hidden/60 relative z-10">
                      <TextAvatar nickname={nickname} size={64} profileImage={profileImage} />
                    </div>
                  </div>
                </button>
              </div>

              <div className="relative mt-5 flex gap-3">
                {[
                  { val: Object.values(dmUnread).reduce((a, b) => a + b, 0), label: "안 읽은 DM",  icon: "💬" },
                  { val: groupUnread || 0,   label: "단체 미확인", icon: "👥" },
                  { val: friends.length,     label: "친구",        icon: "🤝" },
                ].map(({ val, label, icon }) => (
                  <div key={label} className="flex-1 bg-white/25 backdrop-blur-sm rounded-2xl px-3 py-3 text-center">
                    <p className="text-lg mb-0.5">{icon}</p>
                    <p className="text-white font-black text-xl leading-none">{val}</p>
                    <p className="text-white/80 text-[10px] font-semibold mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm px-5 py-3 flex items-center gap-2">
              <span className="text-base">💡</span>
              <p className="text-sky-800 text-xs font-semibold">{getTodayQuote()}</p>
            </div>
          </div>

          {/* ── 친구 버블 ── */}
          {friends.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="font-black text-slate-800 text-base">친구들 👫</p>
                <button onClick={() => router.push("/friendmenu")} className="text-xs text-sky-600 font-bold">전체보기 →</button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {friends.map((f) => {
                  const unread = dmUnread[f.nickname] || 0;
                  return (
                    <button key={f.uid} onClick={() => router.push("/avatar")}
                      className="flex-shrink-0 text-center bg-transparent border-none p-0 cursor-pointer">
                      <div className="relative mx-auto w-14 h-14">
                        <div className="absolute inset-0 rounded-full bg- blur-[6px] opacity-50" />
                        <div className="relative w-14 h-14 rounded-full overflow-hidden ring-[3px] ring-orange-200">
                          <TextAvatar nickname={f.nickname} size={56} profileImage={f.profileImage} />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1 shadow">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#a07060] mt-1.5 w-14 truncate font-semibold">{f.nickname}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 메뉴 ── */}
          <div>
            <p className="font-black text-slate-800 text-base mb-3 px-1">메뉴 ✨</p>
            <div className="space-y-3">

              <button onClick={() => router.push("/avatar")}
                className="group relative w-full rounded-[26px] overflow-hidden active:scale-[0.98] transition-transform">
                <div className="px-6 py-5 flex items-center gap-4 relative shadow-lg" style={{ background: "linear-gradient(to right, #7dd3fc, #bae6fd)" }}>
                  <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-[shimmer_4s_infinite]" />
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                  <div className="relative w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center text-3xl shrink-0">💬</div>
                  <div className="relative text-left flex-1">
                    <p className="text-white font-black text-xl drop-shadow">1:1 채팅</p>
                    <p className="text-white/80 text-sm">친구와 나만의 대화</p>
                  </div>
                  {Object.values(dmUnread).reduce((a, b) => a + b, 0) > 0 && (
                    <span className="relative bg-white text-sky-600 font-black text-sm rounded-full min-w-[32px] h-8 flex items-center justify-center px-2 animate-[pulse_2s_infinite]">
                      {Object.values(dmUnread).reduce((a, b) => a + b, 0) > 99 ? "99+" : Object.values(dmUnread).reduce((a, b) => a + b, 0)}
                    </span>
                  )}
                </div>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => router.push("/groupchat")}
                  className="relative rounded-[24px] overflow-hidden active:scale-[0.97] transition-transform">
                  <div className="px-5 py-5 relative shadow-md" style={{ background: "linear-gradient(to bottom right, #fde68a, #fcd34d)" }}>
                    <div className="absolute top-[-16px] right-[-16px] w-20 h-20 rounded-full bg-white/15" />
                    <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center text-2xl mb-3">👥</div>
                    <p className="text-white font-black text-base drop-shadow">단체채팅</p>
                    <p className="text-white/80 text-xs mt-0.5">같이 얘기해요</p>
                    {groupUnread > 0 && (
                      <span className="absolute top-3 right-3 bg-white text-yellow-700 font-black text-xs rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 shadow animate-[pulse_2s_infinite]">
                        {groupUnread > 99 ? "99+" : groupUnread}
                      </span>
                    )}
                  </div>
                </button>

                <button onClick={() => router.push("/diary")}
                  className="rounded-[24px] overflow-hidden active:scale-[0.97] transition-transform relative">
                  <div className="px-5 py-5 relative shadow-md" style={{ background: "linear-gradient(to bottom right, #38bdf8, #7dd3fc)" }}>
                    <div className="absolute top-[-16px] right-[-16px] w-20 h-20 rounded-full bg-white/15" />
                    <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center text-2xl mb-3">📔</div>
                    <p className="text-white font-black text-base drop-shadow">다이어리</p>
                    <p className="text-white/80 text-xs mt-0.5">오늘을 기록해요</p>
                  </div>
                </button>
              </div>

              <button onClick={() => router.push("/friendmenu")}
                className="w-full rounded-[24px] overflow-hidden active:scale-[0.98] transition-transform">
                <div className="bg-white/90 backdrop-blur-sm px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-200 flex items-center justify-center text-2xl shadow">🤝</div>
                  <div className="text-left flex-1">
                    <p className="text-slate-800 font-black text-base">친구 목록</p>
                    <p className="text-sky-600 text-sm">친구 {friends.length}명과 함께해요</p>
                  </div>
                  <span className="text-orange-300 text-2xl">›</span>
                </div>
              </button>

              <button onClick={() => router.push("/meetingroom")}
                className="w-full rounded-[24px] overflow-hidden active:scale-[0.98] transition-transform">
                <div className="bg-white/90 backdrop-blur-sm border border-red-100 px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-200 flex items-center justify-center text-2xl shadow">📋</div>
                  <div className="text-left flex-1">
                    <p className="text-slate-800 font-black text-base">회의방</p>
                    <p className="text-sky-600 text-sm">주제 고정 · 긴급회의 알림</p>
                  </div>
                  <span className="text-red-300 text-2xl">›</span>
                </div>
              </button>

              <button onClick={() => router.push("/tools/contact")}
                className="w-full rounded-[24px] overflow-hidden active:scale-[0.98] transition-transform">
                <div className="bg-white/90 backdrop-blur-sm border px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-200 flex items-center justify-center text-2xl shadow">🎧</div>
                  <div className="text-left flex-1">
                    <p className="text-slate-800 font-black text-base">Q&A방</p>
                    <p className="text-sky-600 text-sm">궁금한 점을 남겨보세요</p>
                  </div>
                  <span className="text-sky-400 text-2xl">›</span>
                </div>
              </button>

            </div>
          </div>

          <div className="text-center py-4">
            <p className="text-[#d4a57a] text-sm font-medium">✦ 따뜻한 대화가 시작되는 곳 ✦</p>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes floatA { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(-30px,40px) rotate(10deg)} }
        @keyframes floatB { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(40px,-30px) rotate(-8deg)} }
        @keyframes floatC { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(-20px,25px) rotate(5deg)} }
        @keyframes floatD { 0%{transform:translate(0,0)} 100%{transform:translate(-25px,-35px)} }
        @keyframes floatE { 0%{transform:translate(0,0)} 100%{transform:translate(20px,30px)} }
        @keyframes spinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes spinSlowReverse { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </PageContainer>
  );
}
