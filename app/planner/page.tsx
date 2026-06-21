"use client";

import { useEffect, useState } from "react";
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
  const [newDuration, setNewDuration] = useState("60");

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
  }, [user, currentDate, type]);

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

  const addSession = async () => {
    if (!newSubject.trim()) return;
    const updated = [...sessions, {
      id: Date.now().toString(),
      subject: newSubject.trim(), goal: newGoal.trim(),
      duration: parseInt(newDuration) || 60, done: false,
    }];
    setSessions(updated);
    setNewSubject(""); setNewGoal(""); setNewDuration("60");
    await save(undefined, updated);
  };

  const toggleSession = async (id: string) => {
    const updated = sessions.map((s) => s.id === id ? { ...s, done: !s.done } : s);
    setSessions(updated); await save(undefined, updated);
  };

  const deleteSession = async (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated); await save(undefined, updated);
  };

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
            <div className="flex items-center gap-2">
              <div>
                <span className="text-xl font-black bg-yellow-200">PLANNER</span>
                <div className="text-xs text-gray-400 mt-0.5">플래너</div>
              </div>
              <button
                onClick={() => setType("daily")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition active:scale-90 text-xs font-bold ${
                  type === "daily" ? "bg-sky-200 text-white" : "bg-sky-50 hover:bg-sky-100 text-sky-600"
                }`}
              >
                daily
              </button>
              <button
                onClick={() => setType("study")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition active:scale-90 text-xs font-bold ${
                  type === "study" ? "bg-yellow-300 text-white" : "bg-yellow-50 hover:bg-yellow-100 text-yellow-600"
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
                {sessions.length > 0 && (
                  <div className="bg-white rounded-[18px] px-4 py-3">
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                      <span>완료 세션</span>
                      <span className="text-yellow-500">{doneSessions} / {sessions.length}</span>
                    </div>
                    <div className="w-full h-2 bg-yellow-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-300 rounded-full transition-all duration-500"
                        style={{ width: `${sessions.length ? (doneSessions / sessions.length) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-right text-[10px] text-yellow-500 font-bold mt-1.5">⏱ {totalStudyMin}분 완료</p>
                  </div>
                )}

                <div className="bg-white rounded-[18px] px-4 py-4 space-y-2">
                  <p className="text-xs font-black text-gray-400 tracking-wider mb-1">새 스터디 세션</p>
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
                      className="px-4 bg-yellow-300 text-white text-sm font-black rounded-[12px] disabled:opacity-40 active:scale-95 transition"
                    >
                      추가
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.id} className={`bg-white rounded-[18px] p-4 transition-all ${session.done ? "opacity-60" : ""}`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleSession(session.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all active:scale-90 ${
                            session.done ? "bg-yellow-300 border-yellow-300" : "border-yellow-400"
                          }`}
                        >
                          {session.done && <span className="text-white text-[10px] font-black">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black text-sm text-slate-800 ${session.done ? "line-through text-gray-400" : ""}`}>
                            {session.subject}
                          </p>
                          {session.goal && <p className="text-xs text-gray-500 mt-0.5">{session.goal}</p>}
                          <span className="inline-block mt-1.5 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                            ⏱ {session.duration}분
                          </span>
                        </div>
                        <button onClick={() => deleteSession(session.id)} className="text-gray-300 hover:text-red-400 transition text-sm shrink-0">✕</button>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-10">오늘 공부할 내용을 추가해봐요 📚</div>
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
