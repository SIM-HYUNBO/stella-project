"use client";
import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw, CalendarDays } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import type { ProfileActivity } from "@/lib/profile-activity";
import styles from "@/app/profile/profile.module.css";
export default function ProfileActivityChart({ uid }: { uid: string }) {
  const [data, setData] = useState<ProfileActivity | null>(null), [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false; setData(null); setError("");
    const controller = new AbortController();
    void apiFetch("/api/profile-activity", { cache: "no-store", signal: controller.signal }).then(async response => { const body = await response.json(); if (!response.ok) throw Error(body.error || "채팅량을 불러오지 못했어."); if (!cancelled) setData(body); }).catch(error => { if (!controller.signal.aborted && !cancelled) setError(error instanceof Error ? error.message : "채팅량을 불러오지 못했어."); });
    return () => { cancelled = true; controller.abort(); };
  }, [uid, retry]);
  const total = data?.days.reduce((sum, day) => sum + day.count, 0) || 0;
  const max = Math.max(1, ...(data?.days.map(day => day.count) || []));
  const joinedDays = data?.joinedAt ? Math.max(1, Math.floor((Date.now() - data.joinedAt) / 86400000) + 1) : null;
  return <section className={styles.activity} aria-label="내 최근 7일 채팅량"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>LITTLE TALKS, BIG DAYS</span><h2>최근 7일 채팅</h2></div><MessageCircle size={20} strokeWidth={1.6} /></div>
    {error ? <div className={styles.activityError}><p role="alert">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={14} />다시 불러오기</button></div> : !data ? <div className={styles.chartLoading} role="status">내 이야기를 모으는 중…</div> : <><div className={styles.activityNumbers}><div><span>오늘 보낸 메시지</span><strong>{data.days[6]?.count.toLocaleString()}<small>개</small></strong></div><div className={styles.weekTotal}><span>최근 7일 합계</span><b>{total.toLocaleString()}개</b></div></div>
      <div className={styles.chart} role="img" aria-label={data.days.map(day => `${day.date} ${day.count}개`).join(", ")}>{data.days.map((day, index) => <div className={styles.barColumn} key={day.date}><span className={styles.barValue}>{day.count}</span><div className={styles.barTrack}><div className={`${styles.bar} ${index === 6 ? styles.todayBar : ""}`} style={{ height: day.count ? `${Math.max(5, day.count / max * 100)}%` : "3px" }} /></div><span className={index === 6 ? styles.todayLabel : styles.dayLabel}>{index === 6 ? "오늘" : `${Number(day.date.slice(8))}일`}</span></div>)}</div>
      <div className={styles.activityFoot}><span>1:1 · 단체 · 회의방 기준 · 한국시간</span>{joinedDays !== null && <span><CalendarDays size={13} />함께한 지 {joinedDays.toLocaleString()}일</span>}</div></>}
  </section>;
}
