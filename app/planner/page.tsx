"use client";

import { useEffect, useRef, useState } from "react";
import PageContainer from "@/components/PageContainer";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type PlannerType = "daily" | "study";
type Task = { id: string; text: string; done: boolean };
type Session = { id: string; subject: string; goal: string; duration: number; done: boolean };

export default function PlannerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [type, setType] = useState<PlannerType>("daily");
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split("T")[0]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newDuration, setNewDuration] = useState("30");

  // 타이머 상태
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerValues, setTimerValues] = useState<Record<string, number>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) setNickname(snap.data().nickname || "");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadPlanner();
    // 날짜/탭 바뀌면 타이머 리셋
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setActiveTimerId(null);
    setTimerValues({});
  }, [user, currentDate, type]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const loadPlanner = async () => {
    const id = `${user.uid}_${currentDate}_${type}`;
    const snap = await getDoc(doc(db, "planners", id));
    if (snap.exists()) {
      const data = snap.data();
      if (type === "daily") setTasks(data.tasks || []);
      else setSessions(data.sessions || []);
    } else {
      if (type === "daily") setTasks([]);
      else setSessions([]);
    }
  };

  const save = async (updatedTasks?: Task[], updatedSessions?: Session[]) => {
    if (!user) return;
    const id = `${user.uid}_${currentDate}_${type}`;
    const base = { uid: user.uid, nickname, date: currentDate, type, updatedAt: Date.now() };
    const data = type === "daily"
      ? { ...base, tasks: updatedTasks ?? tasks }
      : { ...base, sessions: updatedSessions ?? sessions };
    await setDoc(doc(db, "planners", id), data);
  };

  // ── Daily ──
  const addTask = async () => {
    if (!newTask.trim()) return;
    const updated = [...tasks, { id: Date.now().toString(), text: newTask.trim(), done: false }];
    setTasks(updated); setNewTask("");
    await save(updated);
  };

  const toggleTask = async (id: string) => {
    const updated = tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated); await save(updated);
  };

  const deleteTask = async (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated); await save(updated);
  };

  // ── Study ──
  const addSession = async () => {
    if (!newSubject.trim()) return;
    const updated = [...sessions, {
      id: Date.now().toString(),
      subject: newSubject.trim(), goal: newGoal.trim(),
      duration: parseInt(newDuration) || 30, done: false,
    }];
    setSessions(updated);
    setNewSubject(""); setNewGoal(""); setNewDuration("30");
    await save(undefined, updated);
  };

  const toggleSession = async (id: string) => {
    if (activeTimerId === id) stopTimer();
    const updated = sessions.map((s) => s.id === id ? { ...s, done: !s.done } : s);
    setSessions(updated); await save(undefined, updated);
  };

  const deleteSession = async (id: string) => {
    if (activeTimerId === id) stopTimer();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    setTimerValues((prev) => { const n = { ...prev }; delete n[id]; return n; });
    await save(undefined, updated);
  };

  // ── 타이머 ──
  const startTimer = (sessionId: string, durationMin: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerValues((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId] !== undefined ? prev[sessionId] : durationMin * 60,
    }));
    setActiveTimerId(sessionId);
    setTimerRunning(true);

    timerRef.current = setInterval(() => {
      setTimerValues((prev) => {
        const current = prev[sessionId] !== undefined ? prev[sessionId] : durationMin * 60;
        if (current <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          setActiveTimerId(null);
          return { ...prev, [sessionId]: 0 };
        }
        return { ...prev, [sessionId]: current - 1 };
      });
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setActiveTimerId(null);
  };

  const resetTimer = (sessionId: string, durationMin: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setActiveTimerId(null);
    setTimerValues((prev) => ({ ...prev, [sessionId]: durationMin * 60 }));
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── 날짜 ──
  const navigateDate = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const today = new Date().toISOString().split("T")[0];
  const isToday = currentDate === today;
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  const doneTasks = tasks.filter((t) => t.done).length;
  const doneSessions = sessions.filter((s) => s.done).length;
  const totalStudyMin = sessions.reduce((acc, s) => acc + (s.done ? s.duration : 0), 0);

  return (
    <PageContainer>
      <main className="relative min-h-screen">
        <div className="fixed inset-0 bg-gray-50" />
        <div className="relative z-10">

          {/* 헤더 */}
          <div className="px-4 py-4">
            <span className="text-xl font-black bg-yellow-200">PLANNER</span>
            <div className="text-xs text-gray-400 mt-0.5">플래너</div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setType("daily")}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition active:scale-90 ${
                  type === "daily" ? "bg-sky-200 text-white" : "bg-sky-50 text-sky-600"
                }`}
              >
                daily
              </button>
              <button
                onClick={() => setType("study")}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition active:scale-90 ${
                  type === "study" ? "bg-yellow-300 text-white" : "bg-yellow-50 text-yellow-600"
                }`}
              >
                study
              </button>
            </div>
          </div>

          {/* 날짜 네비게이션 */}
          <div className="flex items-center justify-between mx-4 mb-4 bg-white rounded-[18px] px-4 py-3">
            <button
              onClick={() => navigateDate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-sky-50 text-sky-600 text-lg font-bold active:scale-90 transition"
            >‹</button>
            <div className="text-center">
              <p className="font-black text-slate-800 text-sm">{formatDate(currentDate)}</p>
              {isToday && <p className="text-[10px] text-sky-500 font-bold mt-0.5">오늘</p>}
            </div>
            <button
              onClick={() => navigateDate(1)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-sky-50 text-sky-600 text-lg font-bold active:scale-90 transition"
            >›</button>
          </div>

          <div className="px-4 pb-20 space-y-3">

            {/* ── DAILY ── */}
            {type === "daily" && (
              <>
                {tasks.length > 0 && (
                  <div className="bg-white rounded-[18px] px-4 py-3">
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                      <span>진행률</span>
                      <span className="text-sky-500">{doneTasks} / {tasks.length}</span>
                    </div>
                    <div className="w-full h-2 bg-sky-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-300 rounded-full transition-all duration-500"
                        style={{ width: `${tasks.length ? (doneTasks / tasks.length) * 100 : 0}%` }}
                      />
                    </div>
                    {doneTasks === tasks.length && tasks.length > 0 && (
                      <p className="text-center text-xs text-sky-500 font-black mt-2">🎉 모두 완료!</p>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-[18px] px-4 py-3 flex gap-2">
                  <input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="할 일 추가..."
                    className="flex-1 text-sm text-slate-800 bg-sky-50 rounded-[12px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 placeholder:text-gray-400"
                  />
                  <button
                    onClick={addTask}
                    disabled={!newTask.trim()}
                    className="px-4 bg-sky-200 text-white text-sm font-black rounded-[12px] disabled:opacity-40 active:scale-95 transition"
                  >
                    추가
                  </button>
                </div>

                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className={`flex items-center gap-3 bg-white rounded-[16px] px-4 py-3 transition-all ${task.done ? "opacity-60" : ""}`}>
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                          task.done ? "bg-sky-300 border-sky-300" : "border-sky-300"
                        }`}
                      >
                        {task.done && <span className="text-white text-[10px] font-black">✓</span>}
                      </button>
                      <span className={`flex-1 text-sm font-semibold text-slate-800 ${task.done ? "line-through text-gray-400" : ""}`}>
                        {task.text}
                      </span>
                      <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 transition text-sm">✕</button>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-10">오늘 할 일을 추가해봐요 ✏️</div>
                  )}
                </div>
              </>
            )}

            {/* ── STUDY ── */}
            {type === "study" && (
              <>
                {/* 통계 */}
                {sessions.length > 0 && (
                  <div className="bg-white rounded-[18px] px-4 py-3 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                        <span>완료 세션</span>
                        <span className="text-yellow-500">{doneSessions} / {sessions.length}</span>
                      </div>
                      <div className="w-full h-2 bg-yellow-50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-300 rounded-full transition-all duration-500"
                          style={{ width: `${sessions.length ? (doneSessions / sessions.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-lg font-black text-yellow-500">{totalStudyMin}</p>
                      <p className="text-[10px] text-gray-400 font-bold">분 완료</p>
                    </div>
                  </div>
                )}

                {/* 세션 추가 폼 */}
                <div className="bg-white rounded-[18px] px-4 py-4 space-y-2">
                  <p className="text-xs font-black text-gray-400 tracking-wider">새 스터디 세션</p>
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="과목 / 주제"
                    className="w-full text-sm text-slate-800 bg-yellow-50 rounded-[12px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-yellow-200 placeholder:text-gray-400"
                  />
                  <input
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="오늘의 목표 (선택)"
                    className="w-full text-sm text-slate-800 bg-yellow-50 rounded-[12px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-yellow-200 placeholder:text-gray-400"
                  />
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 flex-1 bg-yellow-50 rounded-[12px] px-3 py-2.5">
                      <span className="text-xs text-gray-400">⏱</span>
                      <input
                        type="number" min="1"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        className="flex-1 text-sm text-slate-800 bg-transparent outline-none w-12"
                      />
                      <span className="text-xs text-gray-400 font-bold">분</span>
                    </div>
                    <button
                      onClick={addSession}
                      disabled={!newSubject.trim()}
                      className="px-5 bg-yellow-300 text-white text-sm font-black rounded-[12px] disabled:opacity-40 active:scale-95 transition"
                    >
                      추가
                    </button>
                  </div>
                </div>

                {/* 세션 카드 */}
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const isActive = activeTimerId === session.id;
                    const secondsLeft = timerValues[session.id] !== undefined
                      ? timerValues[session.id]
                      : session.duration * 60;
                    const isFinished = secondsLeft === 0;
                    const progress = 1 - secondsLeft / (session.duration * 60);

                    return (
                      <div
                        key={session.id}
                        className={`bg-white rounded-[20px] p-4 transition-all ${session.done ? "opacity-60" : ""}`}
                      >
                        {/* 헤더 */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <p className={`font-black text-sm text-slate-800 ${session.done ? "line-through text-gray-400" : ""}`}>
                              {session.subject}
                            </p>
                            {session.goal && (
                              <p className="text-xs text-gray-500 mt-0.5">{session.goal}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full ml-2 shrink-0">
                            {session.duration}분
                          </span>
                        </div>

                        {/* 타이머 디스플레이 */}
                        <div className="text-center py-3 relative">
                          {/* 원형 진행 표시 */}
                          <svg className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="44" fill="none" stroke="#fef9c3" strokeWidth="6" />
                            <circle
                              cx="50" cy="50" r="44" fill="none"
                              stroke={isFinished ? "#fbbf24" : isActive ? "#fde68a" : "#fef08a"}
                              strokeWidth="6"
                              strokeDasharray={`${2 * Math.PI * 44}`}
                              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
                              strokeLinecap="round"
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <div className="relative z-10 py-8">
                            <p className={`text-3xl font-black tabular-nums tracking-tight ${
                              isFinished ? "text-yellow-400" : "text-slate-800"
                            }`}>
                              {formatTimer(secondsLeft)}
                            </p>
                            {isFinished && (
                              <p className="text-[10px] font-black text-yellow-400 mt-0.5">완료!</p>
                            )}
                          </div>
                        </div>

                        {/* 타이머 버튼 */}
                        <div className="flex gap-2 justify-center mt-1 mb-3">
                          {!isActive || !timerRunning ? (
                            <button
                              onClick={() => startTimer(session.id, session.duration)}
                              disabled={session.done || isFinished}
                              className="flex items-center gap-1 px-4 py-1.5 bg-yellow-300 text-white text-xs font-black rounded-xl active:scale-90 transition disabled:opacity-40"
                            >
                              ▶ {isActive ? "계속" : "시작"}
                            </button>
                          ) : (
                            <button
                              onClick={pauseTimer}
                              className="flex items-center gap-1 px-4 py-1.5 bg-sky-200 text-white text-xs font-black rounded-xl active:scale-90 transition"
                            >
                              ⏸ 일시정지
                            </button>
                          )}
                          <button
                            onClick={() => resetTimer(session.id, session.duration)}
                            disabled={session.done}
                            className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-black rounded-xl active:scale-90 transition disabled:opacity-40"
                          >
                            ↺
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-300 text-xs font-bold rounded-xl active:scale-90 transition"
                          >
                            삭제
                          </button>
                        </div>

                        {/* 완료 버튼 */}
                        <button
                          onClick={() => toggleSession(session.id)}
                          className={`w-full py-2 rounded-[12px] text-xs font-black transition active:scale-95 ${
                            session.done
                              ? "bg-yellow-300 text-white"
                              : "bg-yellow-50 text-yellow-600 border border-yellow-200"
                          }`}
                        >
                          {session.done ? "✓ 완료됨" : "완료로 표시"}
                        </button>
                      </div>
                    );
                  })}
                  {sessions.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-10">오늘 공부할 세션을 추가해봐요 📚</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </PageContainer>
  );
}
