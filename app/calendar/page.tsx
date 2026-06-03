"use client";

import { useEffect, useState, useMemo } from "react";
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

type CalEvent = { id: string; date: string; title: string; color: string; userId: string; };

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayKey() {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
}

export default function CalendarPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(EVENT_COLORS[0]);
  const [adding, setAdding] = useState(false);

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

  // ────────────── 달력 계산 ──────────────
  const firstDay = new Date(year, month, 1).getDay(); // 0=일
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

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach((e) => { (map[e.date] ||= []).push(e); });
    return map;
  }, [events]);

  const selectedEvents = eventsByDate[selectedDate] || [];
  const selectedHoliday = HOLIDAYS[selectedDate];

  const tk = todayKey();

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDate(todayKey()); };

  const addEvent = async () => {
    if (!newTitle.trim() || !uid) return;
    setAdding(true);
    await addDoc(collection(db, "calendar_events"), {
      userId: uid, date: selectedDate, title: newTitle.trim(), color: newColor, createdAt: serverTimestamp(),
    });
    setNewTitle(""); setShowAdd(false); setAdding(false);
  };

  const deleteEvent = async (id: string) => {
    await deleteDoc(doc(db, "calendar_events", id));
  };

  // selected date parse
  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selDateObj = new Date(selY, selM - 1, selD);
  const selDayLabel = DAY_LABELS[selDateObj.getDay()];

  return (
    <PageContainer>
      <div className="flex flex-col min-h-[calc(100vh-48px)] bg-white -m-4">

        {/* ── 헤더 ── */}
        <div className="px-5 pt-4 pb-2 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-2xl font-black text-[#1c1c1e]">{month + 1}월</div>
              <div className="text-sm text-gray-400 font-semibold">{year}년</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goToday} className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-500 text-xs font-black">오늘</button>
              <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-90 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-90 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mt-2">
            {DAY_LABELS.map((d, i) => (
              <div key={d} className={`text-center text-xs font-black pb-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>{d}</div>
            ))}
          </div>
        </div>

        {/* ── 달력 그리드 ── */}
        <div className="grid grid-cols-7 bg-white px-1 pt-1">
          {cells.map((cell, i) => {
            const col = i % 7;
            const isToday = cell.key === tk;
            const isSelected = cell.key === selectedDate;
            const isHoliday = !!HOLIDAYS[cell.key];
            const dayEvents = eventsByDate[cell.key] || [];
            const isSun = col === 0;
            const isSat = col === 6;

            return (
              <button
                key={cell.key + i}
                onClick={() => setSelectedDate(cell.key)}
                className="flex flex-col items-center pb-2 pt-1 relative active:scale-95 transition"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition
                  ${isToday ? "bg-orange-500 text-white font-black shadow-md" :
                    isSelected ? "bg-orange-100 text-orange-600" :
                    isHoliday ? (isSun ? "text-red-500" : "text-red-400") :
                    isSun ? "text-red-400" : isSat ? "text-blue-400" :
                    cell.cur ? "text-[#1c1c1e]" : "text-gray-300"}`}
                >
                  {cell.day}
                </div>
                {/* 이벤트 도트 */}
                <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />
                  ))}
                  {dayEvents.length > 3 && <span className="text-[8px] text-gray-400">+</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 선택된 날 디테일 ── */}
        <div className="flex-1 border-t border-gray-100 bg-gray-50">

          {/* 날짜 타이틀 */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-[#1c1c1e]">{selY}년 {selM}월 {selD}일</span>
              <span className={`text-sm font-bold ${selDateObj.getDay() === 0 ? "text-red-400" : selDateObj.getDay() === 6 ? "text-blue-400" : "text-gray-400"}`}>{selDayLabel}요일</span>
              {selectedDate === tk && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">오늘</span>}
            </div>
            <button
              onClick={() => { setShowAdd(true); setNewTitle(""); setNewColor(EVENT_COLORS[0]); }}
              className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md active:scale-90 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          {/* 공휴일 */}
          {selectedHoliday && (
            <div className="mx-5 mb-2 flex items-center gap-2 px-4 py-2.5 bg-red-50 rounded-2xl border border-red-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span className="text-red-500 font-black text-sm">{selectedHoliday}</span>
            </div>
          )}

          {/* 일정 목록 */}
          <div className="px-5 space-y-2 pb-4">
            {selectedEvents.length === 0 && !selectedHoliday && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p className="text-sm font-semibold">일정이 없어요</p>
              </div>
            )}
            {selectedEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-50">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: e.color }} />
                <span className="flex-1 text-sm font-bold text-[#1c1c1e]">{e.title}</span>
                <button onClick={() => deleteEvent(e.id)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── 일정 추가 모달 ── */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
            <div className="w-full bg-white rounded-t-[28px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-[#1c1c1e]">일정 추가</span>
                <span className="text-sm text-gray-400">{selY}/{selM}/{selD} ({selDayLabel})</span>
              </div>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                placeholder="일정 제목 입력"
                autoFocus
                className="w-full h-12 rounded-2xl bg-gray-50 border border-gray-100 px-4 text-sm outline-none text-[#1c1c1e] placeholder:text-gray-300 focus:ring-2 focus:ring-orange-200"
              />
              <div>
                <p className="text-xs font-black text-gray-400 mb-2">색상</p>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`w-8 h-8 rounded-full transition active:scale-90 ${newColor === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <button onClick={addEvent} disabled={adding || !newTitle.trim()}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 text-white font-black shadow-md active:scale-95 transition disabled:opacity-50">
                추가
              </button>
            </div>
          </div>
        )}

      </div>
    </PageContainer>
  );
}
