"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { DEFAULT_LOOK, type Look, type Shape } from "@/components/MemojiCharacter";
const Character = dynamic(() => import("@/components/MemojiCharacter"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-violet-500">캐릭터 준비 중…</div> });

const SKINS = ["#f5c9aa", "#ffe1c7", "#e5ad88", "#b97d5c", "#82533e"];
const COLORS = ["#3f2930", "#825238", "#dbb586", "#e7b1c6", "#aaa1d8", "#ededed"];
const OUTFITS = ["#b9a7ed", "#9ccfdf", "#f2b4c8", "#abcbb4", "#edcb8f", "#4d526d"];
const OPTIONS: Record<string, string[]> = { skin: SKINS, hair: ["none", "short", "bob", "buns"], hairColor: COLORS, eyes: ["round", "soft"], outfit: OUTFITS, accessory: ["none", "glasses", "bow"] };
const LABELS: Record<string, string> = { none: "없음", short: "짧은 머리", bob: "단발", buns: "양갈래 번", round: "동그란 눈", soft: "순한 눈", glasses: "동그란 안경", bow: "리본" };
const TABS: [keyof Look, string][] = [["skin", "피부"], ["hair", "머리"], ["eyes", "눈"], ["outfit", "옷"], ["accessory", "소품"]];
class PreviewBoundary extends React.Component<{children: React.ReactNode}, {failed: boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() { return this.state.failed ? <p className="p-8 text-center text-sm">3D 화면을 열지 못했어. WebGL을 지원하는 브라우저에서 다시 열어 줘.</p> : this.props.children; }
}
export default function MemojiPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [tab, setTab] = useState<keyof Look>("hair");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackMessage, setTrackMessage] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const shapes = useRef<Shape[]>([]);
  const currentUid = useRef<string | null>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      currentUid.current = user?.uid || null;
      setUid(user?.uid || null); setReady(false); setLook(DEFAULT_LOOK); setTracking(false);
      if (!user) { router.replace("/login"); return; }
      void getDoc(doc(db, "users", user.uid)).then(snap => {
        if (currentUid.current !== user.uid) return;
        const stored = snap.data()?.memojiLook;
        const next = {...DEFAULT_LOOK};
        (Object.keys(next) as (keyof Look)[]).forEach(key => { if (OPTIONS[key].includes(stored?.[key])) next[key] = stored[key]; });
        setLook(next); setReady(true);
      }).catch(() => { if (currentUid.current === user.uid) { setNotice("이전 꾸미기를 불러오지 못했어. 다시 들어와 줘."); } });
    });
    return () => { currentUid.current = null; unsubscribe(); };
  }, [router]);
  const choose = (key: keyof Look, value: string) => { setLook(old => ({...old, [key]:value})); setNotice(""); };
  const save = async () => {
    if (!uid || !ready || saving) return;
    setSaving(true);
    try { await setDoc(doc(db, "users", uid), { memojiLook: look, memojiProvider: "wagie" }, {merge:true}); if (currentUid.current === uid) setNotice("저장했어! 다음에도 이 모습으로 만날게."); }
    catch { setNotice("저장하지 못했어. 연결을 확인하고 다시 눌러 줘."); }
    finally { setSaving(false); }
  };
  useEffect(() => {
    if (!tracking) return;
    let cancelled = false;
    let frame = 0;
    let stream: MediaStream | undefined;
    let landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | undefined;
    setTrackMessage("표정 인식을 준비하고 있어…");
    void (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
        if (cancelled) return;
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
          outputFaceBlendshapes: true, runningMode: "VIDEO", numFaces: 1,
        });
        if (cancelled) { landmarker.close(); return; }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        if (!video.current) throw new Error("No video");
        video.current.srcObject = stream;
        await video.current.play();
        if (cancelled) return;
        let previous = -1;
        const detect = () => {
          if (cancelled || !video.current || !landmarker) return;
          try {
            if (video.current.readyState >= 2 && previous !== video.current.currentTime) {
              previous = video.current.currentTime;
              shapes.current = landmarker.detectForVideo(video.current, performance.now()).faceBlendshapes[0]?.categories || [];
              setTrackMessage(shapes.current.length ? "표정을 따라 하고 있어" : "카메라에 얼굴을 보여 줘");
            }
            frame = requestAnimationFrame(detect);
          } catch { setTrackMessage("표정 인식이 중단됐어. 껐다가 다시 켜 줘."); stream?.getTracks().forEach(t => t.stop()); }
        };
        detect();
      } catch {
        stream?.getTracks().forEach(t => t.stop());
        if (!cancelled) setTrackMessage("표정 인식을 시작하지 못했어. 카메라 권한과 인터넷 연결을 확인해 줘.");
      }
    })();
    return () => { cancelled = true; cancelAnimationFrame(frame); stream?.getTracks().forEach(t => t.stop()); landmarker?.close(); shapes.current = []; };
  }, [tracking]);

  return <div className="fixed inset-0 flex flex-col text-slate-700" style={{background:"radial-gradient(ellipse at 25% 15%,#fff8ed,transparent 55%),linear-gradient(155deg,#f5efff,#f2f7ff)"}}>
    <header className="flex shrink-0 items-center gap-3 px-5 py-4">
      <button aria-label="창작 홈으로" onClick={() => router.push("/creative")} className="h-10 w-10 rounded-full border border-white bg-white/70 text-xl shadow-sm">←</button>
      <div className="flex-1"><p className="text-[10px] font-bold tracking-[0.2em] text-violet-400">WAGIE LITTLE ME</p><h1 className="text-lg font-bold">나를 닮은 작은 친구</h1></div>
      <button onClick={save} disabled={!ready || saving} className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 disabled:opacity-40">{saving ? "저장 중…" : "저장"}</button>
    </header>
    <main className="relative min-h-[220px] flex-1">
      <PreviewBoundary><Character look={look} shapes={shapes} /></PreviewBoundary>
      <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-slate-400">손으로 돌려서 옆모습도 봐</span>
      <button onClick={() => setTracking(v => !v)} aria-pressed={tracking} className="absolute right-4 top-2 rounded-full border border-white bg-white/80 px-4 py-2 text-xs shadow-sm">{tracking ? "표정 따라 하기 끄기" : "☺ 표정 따라 하기"}</button>
    </main>
    <section className="max-h-[45dvh] shrink-0 overflow-y-auto rounded-t-[32px] border border-white bg-white/75 px-5 pb-5 pt-4 shadow-[0_-10px_45px_#b5a4d51a] backdrop-blur-xl" style={{paddingBottom:"max(20px,env(safe-area-inset-bottom))"}}>
      <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-200" />
      <div className="mx-auto max-w-lg">
        <div role="tablist" aria-label="꾸미기 종류" className="mb-4 flex gap-2">{TABS.map(([key,label]) => <button role="tab" aria-selected={tab===key} key={key} onClick={() => setTab(key)} className={`flex-1 rounded-2xl py-2.5 text-sm font-bold transition ${tab===key ? "bg-violet-100 text-violet-700" : "text-slate-400"}`}>{label}</button>)}</div>
        <div role="tabpanel" aria-label={TABS.find(t=>t[0]===tab)?.[1]} className="flex flex-wrap gap-3">
          {OPTIONS[tab].map(value => <button disabled={!ready || saving} key={value} onClick={() => choose(tab,value)} aria-pressed={look[tab]===value} aria-label={value.startsWith("#") ? `${tab=== "skin" ? "피부" : "옷"} 색상 ${OPTIONS[tab].indexOf(value)+1}` : LABELS[value]} className={`min-h-[52px] rounded-2xl border-2 p-3 text-xs font-semibold transition disabled:opacity-40 ${look[tab]===value ? "border-violet-400 bg-violet-50 shadow-sm" : "border-white bg-white"}`} style={value.startsWith("#") ? {background:value,width:52} : {minWidth:76}}>{!value.startsWith("#") ? LABELS[value] : look[tab]===value ? "✓" : ""}</button>)}
        </div>
        {tab==="hair" && <div className="mt-4 flex items-center gap-3"><span className="text-xs text-slate-400">머리색</span>{COLORS.map(color=><button key={color} disabled={!ready || saving} onClick={()=>choose("hairColor",color)} aria-label={`머리색 ${COLORS.indexOf(color)+1}`} aria-pressed={look.hairColor===color} className={`h-7 w-7 rounded-full border-2 ${look.hairColor===color ? "border-violet-400 ring-2 ring-violet-100" : "border-white"}`} style={{background:color}} />)}</div>}
        <p role="status" className="mt-4 min-h-4 text-center text-xs text-violet-500">{notice || (tracking ? trackMessage : "원하는 모습을 골라 줘. 바로 바뀔 거야.")}</p>
      </div>
    </section>
    <video ref={video} className="pointer-events-none absolute h-px w-px opacity-0" playsInline muted />
  </div>;
}
