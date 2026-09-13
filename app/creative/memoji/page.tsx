"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import * as THREE from "three";
import type { AvaturnSDK, ExportAvatarResult } from "@avaturn/sdk";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

type Shape = { categoryName: string; score: number };
const subdomain = process.env.NEXT_PUBLIC_AVATURN_SUBDOMAIN || "demo";

class ViewerBoundary extends React.Component<{ children: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Avatar({ url, shapes }: { url: string; shapes: React.MutableRefObject<Shape[]> }) {
  const { scene } = useGLTF(url);
  const meshes = useRef<THREE.Mesh[]>([]);
  useEffect(() => {
    meshes.current = [];
    scene.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) meshes.current.push(mesh);
    });
  }, [scene]);
  useFrame(() => {
    const values = new Map(shapes.current.map(s => [s.categoryName.toLowerCase(), s.score]));
    meshes.current.forEach(mesh => {
      Object.entries(mesh.morphTargetDictionary!).forEach(([name, index]) => {
        mesh.morphTargetInfluences![index] = THREE.MathUtils.lerp(mesh.morphTargetInfluences![index], values.get(name.toLowerCase()) || 0, 0.3);
      });
    });
  });
  return <Center><primitive object={scene} /></Center>;
}

function Creator({ onExport }: { onExport: (data: ExportAvatarResult) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onExport);
  callback.current = onExport;
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let sdk: AvaturnSDK | undefined;
    setError("");
    const timer = window.setTimeout(() => { if (!cancelled) setError("꾸미기 화면을 불러오는 데 시간이 걸려. 연결을 확인하고 다시 시도해 줘."); }, 45000);
    void (async () => {
      try {
        if (!/^[a-z0-9-]+$/.test(subdomain)) throw new Error("Invalid subdomain");
        const { AvaturnSDK } = await import("@avaturn/sdk");
        if (cancelled) return;
        sdk = new AvaturnSDK();
        await sdk.init(container.current, { url: `https://${subdomain}.avaturn.dev` });
        if (cancelled) return;
        window.clearTimeout(timer);
        setError("");
        sdk.on("export", data => { if (!cancelled) callback.current(data); });
      } catch { if (!cancelled) setError("아바타 꾸미기를 불러오지 못했어. 잠시 후 다시 시도해 줘."); }
    })();
    return () => { cancelled = true; window.clearTimeout(timer); sdk?.destroy(); };
  }, [attempt]);
  return <div className="relative h-full">
    <div ref={container} className="h-full w-full" />
    {error && <div role="alert" className="absolute inset-x-4 top-4 rounded-2xl bg-white p-4 text-sm text-slate-800 shadow-xl">{error}<button onClick={() => setAttempt(n => n + 1)} className="ml-3 text-violet-600">다시 시도</button></div>}
  </div>;
}

export default function MemojiPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [mode, setMode] = useState<"creator" | "avatar">("creator");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [supportsFace, setSupportsFace] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewerError, setViewerError] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [trackMessage, setTrackMessage] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const shapes = useRef<Shape[]>([]);
  const currentUid = useRef<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, user => {
    currentUid.current = user?.uid || null;
    setUid(user?.uid || null);
    setAvatarUrl(""); setMode("creator"); setTracking(false);
    if (!user) { router.replace("/login"); return; }
    void getDoc(doc(db, "users", user.uid)).then(snap => {
      if (currentUid.current !== user.uid) return;
      const data = snap.data();
      // Old RPM URLs remain stored, but the retired service is never loaded.
      if (data?.memojiProvider === "avaturn" && typeof data.memojiAvatarUrl === "string" && data.memojiAvatarUrl.startsWith("https://")) {
        setAvatarUrl(data.memojiAvatarUrl);
        setSupportsFace(data.memojiSupportsFace === true);
        setMode("avatar");
      }
    }).catch(() => setNotice("저장한 아바타를 불러오지 못했어. 새로 꾸미기는 사용할 수 있어."));
  }), [router]);

  const handleExport = async (data: ExportAvatarResult) => {
    if (!uid || currentUid.current !== uid) return;
    if (!(data.urlType === "httpURL" && data.url.startsWith("https://")) && !(data.urlType === "dataURL" && data.url.startsWith("data:"))) {
      setNotice("아바타 파일 주소가 올바르지 않아. 다시 내보내 줘."); return;
    }
    setAvatarUrl(data.url); setSupportsFace(data.avatarSupportsFaceAnimations);
    setViewerError(false); setTracking(false); setMode("avatar"); setNotice("");
    if (data.urlType === "dataURL") {
      setNotice("이 아바타는 이번 화면에서만 볼 수 있어. 다시 방문해도 불러오려면 Avaturn 프로젝트의 내보내기를 HTTP URL로 설정해야 해.");
      return;
    }
    try {
      await updateDoc(doc(db, "users", uid), { memojiProvider: "avaturn", memojiAvatarUrl: data.url, memojiAvatarId: data.avatarId, memojiSupportsFace: data.avatarSupportsFaceAnimations });
    } catch { setNotice("아바타는 만들었지만 계정에 저장하지 못했어. 아래 저장 버튼으로 다시 시도해 줘."); }
  };

  useEffect(() => {
    if (!tracking || mode !== "avatar" || !supportsFace) return;
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
  }, [tracking, mode, supportsFace]);

  return <div className="fixed inset-0 flex flex-col bg-slate-950 text-white">
    <header className="flex items-center justify-between gap-3 px-4 py-4">
      <button onClick={() => router.push("/creative")} aria-label="창작 홈으로" className="rounded-full bg-white/10 px-3 py-2">←</button>
      <div className="flex-1"><h1 className="font-bold">내 3D 아바타</h1><p className="text-xs text-white/60">Avaturn · 머리와 옷을 골라 꾸며 봐</p></div>
      {mode === "avatar" && <button onClick={() => { setTracking(false); setMode("creator"); }} className="rounded-xl bg-white/10 px-3 py-2 text-sm">다시 꾸미기</button>}
    </header>
    {subdomain === "demo" && <p className="bg-amber-100 px-4 py-2 text-xs text-amber-900">공식 데모로 연결 중이야. 데모에는 일부 기능 제한이 있어.</p>}
    {notice && <p role="status" className="bg-white/10 px-4 py-3 text-sm">{notice}</p>}
    <main className="relative min-h-0 flex-1">
      {mode === "creator" ? (uid ? <Creator onExport={handleExport} /> : <p className="p-6">계정을 확인하고 있어…</p>) : <>
        <ViewerBoundary key={avatarUrl} onError={() => setViewerError(true)}>
          <Canvas camera={{ position: [0, 0, 3], fov: 45 }}><ambientLight intensity={1.5} /><directionalLight position={[3, 4, 5]} intensity={2} /><Suspense fallback={null}><Avatar url={avatarUrl} shapes={shapes} /></Suspense><OrbitControls enablePan={false} minDistance={1} maxDistance={5} /></Canvas>
        </ViewerBoundary>
        {viewerError && <p role="alert" className="absolute inset-x-4 top-4 rounded-2xl bg-red-950 p-4">3D 모델을 불러오지 못했어. 다시 꾸미기를 눌러 내보내 줘.</p>}
        <div className="absolute inset-x-4 bottom-4 flex flex-col items-center gap-2 rounded-2xl bg-slate-900/90 p-3">
          {supportsFace && !viewerError ? <button onClick={() => setTracking(v => !v)} className="rounded-full bg-violet-500 px-5 py-2">{tracking ? "표정 인식 끄기" : "카메라로 표정 따라 하기"}</button> : <p className="text-sm">이 모델은 표정 인식을 지원하지 않을 수 있어.</p>}
          {tracking && <p className="text-xs">{trackMessage}</p>}
          {avatarUrl.startsWith("https://") && <button className="text-xs text-violet-200" onClick={() => void handleExport({ url: avatarUrl, urlType: "httpURL", avatarSupportsFaceAnimations: supportsFace, avatarId: "", bodyId: "", sessionId: "", gender: "male" })}>계정에 다시 저장</button>}
        </div>
      </>}
    </main>
    <video ref={video} className="pointer-events-none absolute h-px w-px opacity-0" playsInline muted />
  </div>;
}