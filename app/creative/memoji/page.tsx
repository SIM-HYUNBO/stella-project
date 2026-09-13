/// <reference types="@react-three/fiber" />
"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type Blendshape = { categoryName: string; score: number };

// ─── ErrorBoundary ────────────────────────────────────────────────
class R3FErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) {
    console.error("[Memoji] GLB 로드 실패:", err);
    this.props.onError?.();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── 3D 아바타 ────────────────────────────────────────────────────
function Avatar({
  url,
  blendshapesRef,
}: {
  url: string;
  blendshapesRef: React.MutableRefObject<Blendshape[]>;
}) {
  const { scene } = useGLTF(url);
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  const headRef = useRef<THREE.SkinnedMesh | null>(null);

  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh && mesh.morphTargetDictionary) {
        const name = obj.name.toLowerCase();
        if (name.includes("head") || name.includes("wolf3d_head")) {
          headRef.current = mesh;
        }
        if (!meshRef.current) meshRef.current = mesh;
      }
    });
  }, [scene]);

  useFrame(() => {
    const shapes = blendshapesRef.current;
    if (!shapes.length) return;
    const target = headRef.current ?? meshRef.current;
    if (!target?.morphTargetDictionary || !target.morphTargetInfluences) return;
    shapes.forEach(({ categoryName, score }) => {
      const idx = target.morphTargetDictionary![categoryName];
      if (idx !== undefined) {
        target.morphTargetInfluences![idx] = THREE.MathUtils.lerp(
          target.morphTargetInfluences![idx], score, 0.3
        );
      }
    });
  });

  return <primitive object={scene} scale={1.6} position={[0, -1.55, 0]} />;
}

function AvatarScene({
  url,
  blendshapesRef,
  onGlbError,
}: {
  url: string;
  blendshapesRef: React.MutableRefObject<Blendshape[]>;
  onGlbError: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 3]} intensity={1.2} castShadow />
      <directionalLight position={[-2, 2, -2]} intensity={0.4} color="#a0c8ff" />
      <R3FErrorBoundary onError={onGlbError}>
        <Suspense fallback={null}>
          <Avatar url={url} blendshapesRef={blendshapesRef} />
          <ContactShadows position={[0, -1.8, 0]} opacity={0.4} blur={2} />
          <Environment preset="city" />
        </Suspense>
      </R3FErrorBoundary>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
      />
    </>
  );
}

// ─── RPM 커스터마이저 iframe ───────────────────────────────────────
function RpmCreator({ onExport }: { onExport: (url: string) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.source !== "readyplayerme") return;

        if (data.eventName === "v1.frame.ready") {
          // 구독 요청
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ target: "readyplayerme", type: "subscribe", eventName: "v1.**" }),
            "*"
          );
        }
        if (data.eventName === "v1.avatar.exported") {
          let url: string = data.data?.url ?? "";
          if (!url.includes("morphTargets=ARKit")) {
            url += (url.includes("?") ? "&" : "?") + "morphTargets=ARKit&textureAtlas=1024";
          }
          onExport(url);
        }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onExport]);

  return (
    <iframe
      ref={iframeRef}
      src="https://readyplayer.me/avatar?frameApi"
      allow="camera *; microphone *"
      className="w-full h-full border-0"
      title="Ready Player Me 아바타 커스터마이저"
    />
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────
export default function MemojiPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const blendshapesRef = useRef<Blendshape[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  const [uid, setUid] = useState<string | null>(null);
  // "creator" = RPM 커스터마이즈, "avatar" = 3D + 표정인식
  const [mode, setMode] = useState<"creator" | "avatar">("creator");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [trackStatus, setTrackStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadMsg, setLoadMsg] = useState("");
  const [hasFace, setHasFace] = useState(false);
  const [glbFailed, setGlbFailed] = useState(false);

  // 유저 저장된 아바타 URL 불러오기
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      const saved: string | undefined = snap.data()?.memojiAvatarUrl;
      if (saved) {
        setAvatarUrl(saved);
        setMode("avatar");
      }
    });
    return () => unsub();
  }, []);

  // 아바타 URL 확정 → Firestore 저장 + 모드 전환
  const handleExport = async (url: string) => {
    setAvatarUrl(url);
    setGlbFailed(false);
    setMode("avatar");
    if (uid) {
      try { await updateDoc(doc(db, "users", uid), { memojiAvatarUrl: url }); } catch {}
    }
  };

  // avatar 모드 진입 시 MediaPipe 초기화
  useEffect(() => {
    if (mode !== "avatar" || !avatarUrl) return;
    let cancelled = false;

    const init = async () => {
      setTrackStatus("loading");
      try {
        setLoadMsg("MediaPipe 로딩 중...");
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        setLoadMsg("얼굴 인식 AI 준비 중...");
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        });
        landmarkerRef.current = landmarker;

        setLoadMsg("카메라 연결 중...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setTrackStatus("ready");

        let lastTs = -1;
        const detect = () => {
          if (cancelled || !videoRef.current || !landmarkerRef.current) return;
          const now = performance.now();
          if (now !== lastTs) {
            lastTs = now;
            try {
              const res = landmarkerRef.current.detectForVideo(videoRef.current, now);
              if (res.faceBlendshapes?.[0]?.categories?.length) {
                setHasFace(true);
                blendshapesRef.current = res.faceBlendshapes[0].categories.map(
                  (c: any) => ({ categoryName: c.categoryName, score: c.score })
                );
              } else {
                setHasFace(false);
                blendshapesRef.current = [];
              }
            } catch {}
          }
          rafRef.current = requestAnimationFrame(detect);
        };
        detect();
      } catch (e) {
        if (!cancelled) { console.error(e); setTrackStatus("error"); }
      }
    };

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [mode, avatarUrl]);

  // ─── UI ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "linear-gradient(160deg,#0d1117,#1a0a2e)" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xl active:scale-90 transition-transform"
          >
            ‹
          </button>
          <div>
            <p className="text-white font-black text-base">3D 미모지 ✨</p>
            <p className="text-white/40 text-xs">
              {mode === "creator"
                ? "아바타를 만들어봐요"
                : trackStatus === "loading"
                ? loadMsg
                : hasFace
                ? "얼굴 인식됨 🟢"
                : "얼굴을 보여주세요"}
            </p>
          </div>
        </div>
        {mode === "avatar" && (
          <button
            onClick={() => setMode("creator")}
            className="px-3 py-1.5 rounded-xl bg-white/10 text-white/70 text-xs font-bold active:scale-95 transition-transform"
          >
            🪄 다시 꾸미기
          </button>
        )}
      </div>

      {/* ── 크리에이터 모드: RPM iframe ─────────────────────────── */}
      {mode === "creator" && (
        <div className="flex-1 relative overflow-hidden rounded-t-[24px]">
          {/* 안내 배너 */}
          <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-3 pb-2 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(13,17,23,0.85), transparent)" }}>
            <p className="text-white/60 text-[11px] text-center">
              아바타를 꾸미고 오른쪽 아래 <span className="text-purple-300 font-black">Next →</span> 눌러서 저장해요
            </p>
          </div>
          <RpmCreator onExport={handleExport} />
        </div>
      )}

      {/* ── 아바타 모드: 3D + 표정 인식 ─────────────────────────── */}
      {mode === "avatar" && (
        <div className="flex-1 relative">
          {avatarUrl && (
            <Canvas
              camera={{ position: [0, 0.2, 2.2], fov: 35 }}
              gl={{ antialias: true, alpha: true }}
              style={{ background: "transparent" }}
            >
              <AvatarScene
                url={avatarUrl}
                blendshapesRef={blendshapesRef}
                onGlbError={() => setGlbFailed(true)}
              />
            </Canvas>
          )}

          {/* GLB 로드 실패 */}
          {glbFailed && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-3xl px-6 py-5 text-center border border-white/10 mx-8 pointer-events-auto">
                <div className="text-4xl mb-3">⚠️</div>
                <p className="text-white font-black text-sm mb-1">아바타 로드 실패</p>
                <p className="text-white/40 text-xs mb-3">다시 만들어줘</p>
                <button
                  className="px-5 py-2 rounded-2xl bg-purple-500 text-white text-xs font-black active:scale-95 transition-transform"
                  onClick={() => { setGlbFailed(false); setMode("creator"); }}
                >
                  다시 꾸미기
                </button>
              </div>
            </div>
          )}

          {/* MediaPipe 로딩 */}
          {trackStatus === "loading" && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2 border border-white/10">
                <div className="text-xl" style={{ animation: "spin 1s linear infinite" }}>⚙️</div>
                <p className="text-white text-xs font-bold">{loadMsg}</p>
              </div>
            </div>
          )}

          {/* MediaPipe 에러 */}
          {trackStatus === "error" && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <div className="bg-red-900/60 backdrop-blur-sm rounded-2xl px-5 py-3 border border-red-500/30">
                <p className="text-white text-xs font-bold">⚠️ 카메라 권한 또는 인터넷 필요</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 숨겨진 카메라 */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* 하단 표정 힌트 */}
      {mode === "avatar" && trackStatus === "ready" && !glbFailed && (
        <div className="px-5 pb-8 pt-3 shrink-0">
          <div className="flex justify-center gap-4 flex-wrap">
            {[["😄","웃어봐"],["😮","입 벌려봐"],["😠","눈썹 찌푸려봐"],["😉","윙크해봐"]].map(([e,t]) => (
              <div key={t} className="flex items-center gap-1.5 bg-white/6 rounded-xl px-3 py-1.5">
                <span className="text-lg">{e}</span>
                <span className="text-white/40 text-xs">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
