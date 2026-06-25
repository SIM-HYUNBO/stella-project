"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/app/firebase";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import PageContainer from "@/components/PageContainer";

type StockRoom = {
  id: string;
  name: string;
  type: "단체" | "회의" | "오픈";
  stockPrice?: number;
  priceHistory?: { p: number; t: number }[];
  stockLastAt?: any;
  members?: string[];
};

function getDisplayPrice(stockPrice?: number, stockLastAt?: any): number {
  if (!stockPrice) return 0;
  const lastMs = stockLastAt?.toMillis?.() ?? (stockLastAt?.seconds ? stockLastAt.seconds * 1000 : Date.now());
  const hoursSince = (Date.now() - lastMs) / (1000 * 60 * 60);
  return Math.max(100, Math.round(stockPrice * Math.pow(0.97, hoursSince)));
}

function getChangePercent(room: StockRoom): number {
  const current = getDisplayPrice(room.stockPrice, room.stockLastAt);
  const history = room.priceHistory || [];
  const prev = history.length >= 2 ? history[history.length - 2].p : (history[0]?.p ?? current);
  if (!prev) return 0;
  return parseFloat(((current - prev) / prev * 100).toFixed(1));
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return <div className="w-16 h-6" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64, h = 24;
  const pts = data.map((p, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((p - min) / range) * (h - 4) - 2,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const color = positive ? "#22c55e" : "#ef4444";
  return (
    <svg width={w} height={h} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PriceTag({ change }: { change: number }) {
  const pos = change >= 0;
  return (
    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${pos ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
      {pos ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

export default function StockPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [rooms, setRooms] = useState<StockRoom[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      const snap = await getDoc(doc(db, "users", u.uid));
      setNickname(snap.exists() ? snap.data().nickname : u.displayName || "유저");
    });
    return unsub;
  }, []);

  // 실시간 가격 decay 반영
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!nickname) return;
    const unsubs: (() => void)[] = [];

    let groupRooms: StockRoom[] = [];
    let meetingRooms: StockRoom[] = [];
    let openRooms: StockRoom[] = [];

    const merge = () => setRooms([...groupRooms, ...meetingRooms, ...openRooms]);

    unsubs.push(onSnapshot(
      query(collection(db, "group_rooms"), where("members", "array-contains", nickname)),
      (snap) => {
        groupRooms = snap.docs.map(d => ({ id: d.id, type: "단체", ...d.data() } as StockRoom));
        merge();
      }
    ));
    unsubs.push(onSnapshot(
      query(collection(db, "meeting_rooms"), where("members", "array-contains", nickname)),
      (snap) => {
        meetingRooms = snap.docs.map(d => ({ id: d.id, type: "회의", ...d.data() } as StockRoom));
        merge();
      }
    ));
    unsubs.push(onSnapshot(
      collection(db, "openRooms"),
      (snap) => {
        openRooms = snap.docs.map(d => ({ id: d.id, type: "오픈", ...d.data() } as StockRoom));
        merge();
      }
    ));

    return () => unsubs.forEach(u => u());
  }, [nickname]);

  const activeRooms = rooms
    .filter(r => r.stockPrice)
    .map(r => ({ ...r, displayPrice: getDisplayPrice(r.stockPrice, r.stockLastAt), change: getChangePercent(r) }))
    .sort((a, b) => b.displayPrice - a.displayPrice);

  const topGainer = [...activeRooms].sort((a, b) => b.change - a.change)[0];
  const topLoser = [...activeRooms].sort((a, b) => a.change - b.change)[0];
  const totalMarketCap = activeRooms.reduce((s, r) => s + r.displayPrice, 0);

  const TYPE_COLOR: Record<string, string> = {
    단체: "bg-sky-100 text-sky-600",
    회의: "bg-purple-100 text-purple-600",
    오픈: "bg-yellow-100 text-yellow-600",
  };

  return (
    <PageContainer>
      <div className="pb-6">

        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl font-black text-gray-900 tracking-tight">📈 STELLA STOCKS</span>
        </div>
        <p className="text-xs text-gray-400 mb-5">코스닥 스텔라 · 실시간 채팅 시세</p>

        {/* 시장 요약 */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-white rounded-2xl px-3 py-3 shadow-sm">
            <p className="text-[10px] text-gray-400 font-bold mb-1">시가총액</p>
            <p className="text-sm font-black text-gray-800">₩{totalMarketCap.toLocaleString()}</p>
          </div>
          {topGainer && (
            <div className="bg-green-50 rounded-2xl px-3 py-3 shadow-sm">
              <p className="text-[10px] text-green-500 font-bold mb-1">🔥 급등</p>
              <p className="text-xs font-black text-green-700 truncate">{topGainer.name}</p>
              <p className="text-[10px] text-green-500 font-bold">+{topGainer.change.toFixed(1)}%</p>
            </div>
          )}
          {topLoser && topLoser.id !== topGainer?.id && (
            <div className="bg-red-50 rounded-2xl px-3 py-3 shadow-sm">
              <p className="text-[10px] text-red-400 font-bold mb-1">💥 폭락</p>
              <p className="text-xs font-black text-red-600 truncate">{topLoser.name}</p>
              <p className="text-[10px] text-red-400 font-bold">{topLoser.change.toFixed(1)}%</p>
            </div>
          )}
        </div>

        {/* 종목 리스트 */}
        {activeRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">📉</span>
            <p className="text-sm font-bold text-gray-400">아직 시세 데이터가 없어</p>
            <p className="text-xs text-gray-300">채팅을 보내면 주가가 생겨!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeRooms.map((room, i) => {
              const history = (room.priceHistory || []).map(h => h.p);
              const isPos = room.change >= 0;
              return (
                <div key={room.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-black text-gray-300 w-5 shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${TYPE_COLOR[room.type]}`}>{room.type}</span>
                        <span className="text-sm font-black text-gray-800 truncate">{room.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-gray-900">₩{room.displayPrice.toLocaleString()}</span>
                        <PriceTag change={room.change} />
                      </div>
                    </div>
                  </div>
                  <Sparkline data={history.length >= 2 ? history : [room.displayPrice, room.displayPrice]} positive={isPos} />
                </div>
              );
            })}
          </div>
        )}

        {/* 비활성 방 */}
        {rooms.filter(r => !r.stockPrice).length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-wider mb-2">미상장 (아직 대화 없음)</p>
            <div className="flex flex-col gap-1.5">
              {rooms.filter(r => !r.stockPrice).map(r => (
                <div key={r.id} className="bg-white/60 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${TYPE_COLOR[r.type]}`}>{r.type}</span>
                    <span className="text-xs text-gray-400 font-bold">{r.name}</span>
                  </div>
                  <span className="text-xs text-gray-300 font-bold">-</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-200 mt-6">30초마다 자동 갱신 · 잠수하면 주가 폭락 📉</p>
      </div>
    </PageContainer>
  );
}
