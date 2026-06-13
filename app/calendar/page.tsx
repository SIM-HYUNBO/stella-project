"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, where, serverTimestamp,
} from "firebase/firestore";

// ────────────── 공휴일 ──────────────
const HOLIDAYS: Record<string, string> = {
  "2024-01-01":"신정","2024-02-09":"설날 연휴","2024-02-10":"설날","2024-02-11":"설날 연휴","2024-02-12":"대체공휴일",
  "2024-03-01":"삼일절","2024-05-05":"어린이날","2024-05-15":"부처님오신날","2024-06-06":"현충일","2024-08-15":"광복절",
  "2024-09-16":"추석 연휴","2024-09-17":"추석","2024-09-18":"추석 연휴","2024-09-23":"대체공휴일",
  "2024-10-03":"개천절","2024-10-09":"한글날","2024-12-25":"크리스마스",
  "2025-01-01":"신정","2025-01-28":"설날 연휴","2025-01-29":"설날","2025-01-30":"설날 연휴",
  "2025-03-01":"삼일절","2025-05-05":"어린이날","2025-05-06":"부처님오신날 대체","2025-06-06":"현충일","2025-08-15":"광복절",
  "2025-10-03":"개천절","2025-10-05":"추석 연휴","2025-10-06":"추석","2025-10-07":"추석 연휴","2025-10-08":"대체공휴일",
  "2025-10-09":"한글날","2025-12-25":"크리스마스",
  "2026-01-01":"신정","2026-02-17":"설날 연휴","2026-02-18":"설날","2026-02-19":"설날 연휴",
  "2026-03-01":"삼일절","2026-05-05":"어린이날","2026-05-24":"부처님오신날","2026-06-06":"현충일","2026-08-15":"광복절",
  "2026-09-24":"추석 연휴","2026-09-25":"추석","2026-09-26":"추석 연휴",
  "2026-10-03":"개천절","2026-10-09":"한글날","2026-12-25":"크리스마스",
};

const EVENT_COLORS = ["#f97316","#3b82f6","#10b981","#8b5cf6","#ef4444","#f59e0b","#06b6d4","#ec4899"];
const DAY_LABELS = ["일","월","화","수","목","금","토"];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0~23
const HOUR_HEIGHT = 64; // px per hour

type CalEvent = {
  id: string; date: string; title: string; color: string; userId: string;
  startTime?: string; endTime?: string; allDay?: boolean;
  repeat?: "none" | "daily" | "weekly" | "monthly" | "yearly";
};

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayKey() {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
}
function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minToPercent(min: number) {
  return (min / (24 * 60)) * 100;
}

export default function CalendarPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [viewMode, setViewMode] = useState<"month" | "day">("month");

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(EVENT_COLORS[0]);
  const [newAllDay, setNewAllDay] = useState(false);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newRepeat, setNewRepeat] = useState<"none"|"daily"|"weekly"|"monthly"|"yearly">("none");
  const [adding, setAdding] = useState(false);

  const [nowMin, setNowMin] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return watchAuthState((user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "calendar_events"), where("userId", "==", uid));
    return onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalEvent)));
    });
  }, [uid]);

  // 현재 시각 선
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  // 시간표 뷰 열릴 때 현재 시각으로 스크롤
  useEffect(() => {
    if (viewMode === "day" && timelineRef.current) {
      const scrollTo = Math.max(0, (nowMin / 60 - 2) * HOUR_HEIGHT);
      setTimeout(() => timelineRef.current?.scrollTo({ top: scrollTo, behavior: "smooth" }), 100);
    }
  }, [viewMode, selectedDate]);

  // 달력 계산
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells = useMemo(() => {
    const arr: { key: string; day: number; cur: boolean }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const offset = i - firstDay;
      if (offset < 0) {
        const d = daysInPrev + offset + 1;
        arr.push({ key: toKey(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d), day: d, cur: false });
      } else if (offset < daysInMonth) {
        arr.push({ key: toKey(year, month, offset + 1), day: offset + 1, cur: true });
      } else {
        const d = offset - daysInMonth + 1;
        arr.push({ key: toKey(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, d), day: d, cur: false });
      }
    }
    return arr;
  }, [year, month, firstDay, daysInMonth, daysInPrev, totalCells]);

  const eventAppliesToDate = (e: CalEvent, key: string): boolean => {
    if (key < e.date) return false;
    if (!e.repeat || e.repeat === "none") return e.date === key;
    const [ty, tm, td] = key.split("-").map(Number);
    const [, em, ed] = e.date.split("-").map(Number);
    const target = new Date(ty, tm - 1, td);
    const start = new Date(e.date);
    switch (e.repeat) {
      case "daily":   return true;
      case "weekly":  return target.getDay() === start.getDay();
      case "monthly": return td === ed;
      case "yearly":  return tm === em && td === ed;
      default: return e.date === key;
    }
  };

  const getEventsForDate = (key: string) =>
    events.filter((e) => eventAppliesToDate(e, key));

  const selectedEvents = getEventsForDate(selectedDate).sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return (a.startTime || "00:00").localeCompare(b.startTime || "00:00");
  });
  const selectedHoliday = HOLIDAYS[selectedDate];
  const tk = todayKey();

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDate(todayKey()); };

  const prevDay = () => {
    const d = new Date(selDateObj); d.setDate(d.getDate() - 1);
    setSelectedDate(toKey(d.getFullYear(), d.getMonth(), d.getDate()));
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };
  const nextDay = () => {
    const d = new Date(selDateObj); d.setDate(d.getDate() + 1);
    setSelectedDate(toKey(d.getFullYear(), d.getMonth(), d.getDate()));
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };

  const addEvent = async () => {
    if (!newTitle.trim() || !uid) return;
    setAdding(true);
    await addDoc(collection(db, "calendar_events"), {
      userId: uid, date: selectedDate, title: newTitle.trim(), color: newColor,
      allDay: newAllDay, startTime: newAllDay ? null : newStart, endTime: newAllDay ? null : newEnd,
      repeat: newRepeat, createdAt: serverTimestamp(),
    });
    setNewTitle(""); setShowAdd(false); setAdding(false); setNewRepeat("none");
  };

  const deleteEvent = async (id: string) => {
    await deleteDoc(doc(db, "calendar_events", id));
  };

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selDateObj = new Date(selY, selM - 1, selD);
  const selDayLabel = DAY_LABELS[selDateObj.getDay()];
  const isSelToday = selectedDate === tk;
  const isSelSun = selDateObj.getDay() === 0;
  const isSelSat = selDateObj.getDay() === 6;

  // 시간별 이벤트 (allDay 제외)
  const timedEvents = selectedEvents.filter((e) => !e.allDay && e.startTime);
  const allDayEvents = selectedEvents.filter((e) => e.allDay || !e.startTime);

  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-48px)] bg-white -m-4 overflow-hidden">

        {/* ── 상단 헤더 ── */}
        <div className="shrink-0 px-4 pt-3 pb-0 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#1c1c1e]">{month + 1}월</span>
              <span className="text-sm text-gray-400 font-semibold">{year}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={goToday} className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-600 text-xs font-black">오늘</button>
              {/* 월/일 뷰 토글 */}
              <div className="flex rounded-xl overflow-hidden">
                <button onClick={() => setViewMode("month")}
                  className={`px-3 py-1.5 text-xs font-black transition ${viewMode === "month" ? "bg-sky-600 text-white" : "bg-white text-gray-400"}`}>월</button>
                <button onClick={() => setViewMode("day")}
                  className={`px-3 py-1.5 text-xs font-black transition ${viewMode === "day" ? "bg-sky-600 text-white" : "bg-white text-gray-400"}`}>일</button>
              </div>
              {viewMode === "month" && <>
                <button onClick={prevMonth} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button onClick={nextMonth} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </>}
            </div>
          </div>

          {/* 요일 헤더 (월 뷰 전용) */}
          {viewMode === "month" && (
            <div className="grid grid-cols-7">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className={`text-center text-[11px] font-black pb-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>{d}</div>
              ))}
            </div>
          )}
        </div>

        {/* ── 월 뷰 ── */}
        {viewMode === "month" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="grid grid-cols-7 bg-white px-1 pt-1 shrink-0">
              {cells.map((cell, i) => {
                const col = i % 7;
                const isToday = cell.key === tk;
                const isSelected = cell.key === selectedDate;
                const isHoliday = !!HOLIDAYS[cell.key];
                const dayEvts = getEventsForDate(cell.key);
                const isSun = col === 0; const isSat = col === 6;
                return (
                  <button key={cell.key + i} onClick={() => setSelectedDate(cell.key)}
                    className="flex flex-col items-center pb-1.5 pt-1 active:scale-95 transition">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition
                      ${isToday ? "bg-sky-600 text-white font-black" :
                        isSelected ? "bg-sky-200 text-sky-700" :
                        isHoliday ? "text-red-400" :
                        isSun ? "text-red-400" : isSat ? "text-blue-400" :
                        cell.cur ? "text-[#1c1c1e]" : "text-gray-300"}`}>
                      {cell.day}
                    </div>
                    <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                      {dayEvts.slice(0, 3).map((e) => (
                        <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />
                      ))}
                      {dayEvts.length > 3 && <span className="text-[8px] text-gray-400">+</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 선택된 날 목록 */}
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-black text-[#1c1c1e]">{selM}월 {selD}일</span>
                  <span className={`text-sm font-bold ${isSelSun ? "text-red-400" : isSelSat ? "text-blue-400" : "text-gray-400"}`}>{selDayLabel}</span>
                  {isSelToday && <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.5 rounded-full font-black">오늘</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setViewMode("day")}
                    className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-500 text-xs font-black">시간표</button>
                  <button onClick={() => { setShowAdd(true); setNewTitle(""); setNewColor(EVENT_COLORS[0]); setNewAllDay(false); setNewStart("09:00"); setNewEnd("10:00"); setNewRepeat("none"); }}
                    className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center active:scale-90 transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>
              </div>
              {selectedHoliday && (
                <div className="mx-5 mb-2 flex items-center gap-2 px-4 py-2.5 bg-red-50 rounded-2xl border border-red-100">
                  <span className="text-red-500 font-black text-sm">🎌 {selectedHoliday}</span>
                </div>
              )}
              <div className="px-5 space-y-2 pb-6">
                {selectedEvents.length === 0 && !selectedHoliday && (
                  <div className="flex flex-col items-center py-8 text-gray-300">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <p className="text-sm font-semibold">일정 없음</p>
                  </div>
                )}
                {selectedEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: e.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#1c1c1e] truncate">{e.title}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <span>{e.allDay || !e.startTime ? "종일" : `${e.startTime}${e.endTime ? ` ~ ${e.endTime}` : ""}`}</span>
                        {e.repeat && e.repeat !== "none" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-500 font-bold">
                            {e.repeat === "daily" ? "매일" : e.repeat === "weekly" ? "매주" : e.repeat === "monthly" ? "매월" : "매년"}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteEvent(e.id)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 일/시간표 뷰 ── */}
        {viewMode === "day" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 날짜 네비 */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white">
              <button onClick={prevDay} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="flex items-baseline gap-2">
                <span className={`text-lg font-black ${isSelSun ? "text-red-400" : isSelSat ? "text-blue-400" : "text-[#1c1c1e]"}`}>{selM}월 {selD}일</span>
                <span className={`text-sm font-bold ${isSelSun ? "text-red-400" : isSelSat ? "text-blue-400" : "text-gray-400"}`}>{selDayLabel}요일</span>
                {isSelToday && <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.5 rounded-full font-black">오늘</span>}
              </div>
              <button onClick={nextDay} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>

            {/* 공휴일 + 종일 이벤트 */}
            {(selectedHoliday || allDayEvents.length > 0) && (
              <div className="shrink-0 px-4 py-2 bg-white space-y-1.5">
                {selectedHoliday && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-xl">
                    <span className="text-xs font-black text-red-500">🎌 {selectedHoliday}</span>
                  </div>
                )}
                {allDayEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: e.color + "22" }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="text-xs font-bold flex-1" style={{ color: e.color }}>{e.title}</span>
                    <button onClick={() => deleteEvent(e.id)} className="w-4 h-4 rounded-full bg-white/60 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 시간 타임라인 */}
            <div ref={timelineRef} className="flex-1 overflow-y-auto relative">
              <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
                {/* 시간 눈금 */}
                {HOURS.map((h) => (
                  <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: h * HOUR_HEIGHT }}>
                    <span className="w-14 text-right pr-3 text-[10px] text-gray-400 font-semibold shrink-0 -mt-2">
                      {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                    </span>
                    <div className="flex-1" />
                  </div>
                ))}
                {/* 30분 보조선 */}
                {HOURS.map((h) => (
                  <div key={`half-${h}`} className="absolute left-14 right-0 border-t border-gray-50" style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                ))}

                {/* 현재 시각 선 (오늘만) */}
                {isSelToday && (
                  <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: (nowMin / 60) * HOUR_HEIGHT }}>
                    <span className="w-14 text-right pr-2 text-[9px] text-sky-600 font-black shrink-0">
                      {String(Math.floor(nowMin / 60)).padStart(2,"0")}:{String(nowMin % 60).padStart(2,"0")}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-sky-600 shrink-0 -ml-1" />
                    <div className="flex-1 border-t-2 border-sky-600" />
                  </div>
                )}

                {/* 이벤트 블록 */}
                {timedEvents.map((e) => {
                  const startMin = timeToMin(e.startTime!);
                  const endMin = e.endTime ? timeToMin(e.endTime) : startMin + 60;
                  const top = (startMin / 60) * HOUR_HEIGHT;
                  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 28);
                  return (
                    <div key={e.id}
                      className="absolute left-16 right-3 rounded-xl px-2.5 py-1.5 z-20 overflow-hidden"
                      style={{ top, height, background: e.color + "66" }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="text-white font-black text-xs truncate">{e.title}</div>
                          <div className="text-white/80 text-[10px]">
                            {e.startTime}{e.endTime ? ` ~ ${e.endTime}` : ""}
                          </div>
                        </div>
                        <button onClick={() => deleteEvent(e.id)}
                          className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center shrink-0 mt-0.5 active:scale-90">
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 추가 버튼 */}
            <button
              onClick={() => { setShowAdd(true); setNewTitle(""); setNewColor(EVENT_COLORS[0]); setNewAllDay(false); setNewStart("09:00"); setNewEnd("10:00"); setNewRepeat("none"); }}
              className="absolute bottom-20 right-5 w-12 h-12 rounded-full bg-sky-600 text-white flex items-center justify-center active:scale-90 transition z-30"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── 일정 추가 모달 ── */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
            <div className="w-full bg-white rounded-t-[28px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-[#1c1c1e]">일정 추가</span>
                <span className={`text-sm font-bold ${isSelSun ? "text-red-400" : isSelSat ? "text-blue-400" : "text-gray-400"}`}>
                  {selY}.{selM}.{selD} ({selDayLabel})
                  {selectedHoliday && <span className="ml-1 text-red-400">· {selectedHoliday}</span>}
                </span>
              </div>

              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                placeholder="일정 제목" autoFocus
                className="w-full h-12 rounded-2xl bg-white border border-gray-200 px-4 text-sm outline-none text-[#1c1c1e] placeholder:text-gray-300 focus:ring-2 focus:ring-orange-200"/>

              {/* 종일 토글 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600">종일</span>
                <button onClick={() => setNewAllDay(!newAllDay)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${newAllDay ? "bg-sky-500" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newAllDay ? "translate-x-[24px]" : "translate-x-0"}`}/>
                </button>
              </div>

              {/* 시간 설정 */}
              {!newAllDay && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-bold mb-1">시작</p>
                    <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)}
                      className="w-full h-10 rounded-xl bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-bold mb-1">종료</p>
                    <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)}
                      className="w-full h-10 rounded-xl bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"/>
                  </div>
                </div>
              )}

              {/* 반복 */}
              <div>
                <p className="text-xs font-black text-gray-400 mb-2">반복</p>
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    { v: "none", l: "없음" },
                    { v: "daily", l: "매일" },
                    { v: "weekly", l: "매주" },
                    { v: "monthly", l: "매월" },
                    { v: "yearly", l: "매년" },
                  ] as const).map(({ v, l }) => (
                    <button key={v} onClick={() => setNewRepeat(v)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${newRepeat === v ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* 색상 */}
              <div>
                <p className="text-xs font-black text-gray-400 mb-2">색상</p>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`w-8 h-8 rounded-full transition active:scale-90 ${newColor === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                      style={{ background: c }}/>
                  ))}
                </div>
              </div>

              <button onClick={addEvent} disabled={adding || !newTitle.trim()}
                className="w-full h-12 rounded-2xl bg-sky-200 text-white font-black active:scale-95 transition disabled:opacity-50">
                추가
              </button>
            </div>
          </div>
        )}

      </div>
    </PageContainer>
  );
}
