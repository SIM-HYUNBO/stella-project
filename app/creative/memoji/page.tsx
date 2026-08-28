/// <reference types="@react-three/fiber" />
"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

type Blendshape = { categoryName: string; score: number };

// R3F 내부 GLB 로드 실패를 잡는 에러 바운더리
class R3FErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) {
    console.error("[Memoji] 3D 모델 로드 실패:", err);
    this.props.onError?.();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── 3D 아바타 컴포넌트 ───────────────────────────────────────────
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
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = obj as THREE.SkinnedMesh;
        if (mesh.morphTargetDictionary) {
          if (obj.name.toLowerCase().includes("head") || obj.name.toLowerCase().includes("wolf3d_head")) {
            headRef.current = mesh;
          }
          if (!meshRef.current) meshRef.current = mesh;
        }
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

  return (
    <primitive
      object={scene}
      scale={1.6}
      position={[0, -1.55, 0]}
      rotation={[0, 0, 0]}
    />
  );
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

// ─── 메인 페이지 ─────────────────────────────────────────────────
const DEFAULT_AVATAR = "https://models.readyplayer.me/6449e6eadede63dbb3ad7c7f.glb?morphTargets=ARKit&textureAtlas=1024";

export default function MemojiPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const blendshapesRef = useRef<Blendshape[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadMsg, setLoadMsg] = useState("MediaPipe 로딩 중...");
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [inputUrl, setInputUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [glbFailed, setGlbFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
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

        setStatus("ready");

        let lastTs = -1;
        const detect = () => {
          if (cancelled || !videoRef.current || !landmarkerRef.current) return;
          const now = performance.now();
          if (now !== lastTs) {
            lastTs = now;
            try {
              const result = landmarkerRef.current.detectForVideo(videoRef.current, now);
              if (result.faceBlendshapes?.[0]?.categories?.length) {
                setHasFace(true);
                blendshapesRef.current = result.faceBlendshapes[0].categories.map(
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
        if (!cancelled) { console.error(e); setStatus("error"); }
      }
    };

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  const applyCustomUrl = () => {
    let url = inputUrl.trim();
    if (!url) return;
    if (!url.includes("morphTargets=ARKit")) {
      url += (url.includes("?") ? "&" : "?") + "morphTargets=ARKit&textureAtlas=1024";
    }
    setGlbFailed(false);
    setAvatarUrl(url);
    setShowUrlInput(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "linear-gradient(160deg,#0d1117,#1a0a2e)" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xl active:scale-90 transition-transform">
            ‹
          </button>
          <div>
            <p className="text-white font-black text-base">3D 미모지 ✨</p>
            <p className="text-white/40 text-xs">
              {status === "loading" ? loadMsg : hasFace ? "얼굴 인식됨 🟢" : "얼굴을 보여주세요"}
            </p>
          </div>
        </div>
        <button onClick={() => setShowUrlInput(v => !v)}
          className="px-3 py-1.5 rounded-xl bg-white/10 text-white/70 text-xs font-bold active:scale-95 transition-transform">
          🔗 아바타 변경
        </button>
      </div>

      {/* URL 입력창 */}
      {showUrlInput && (
        <div className="px-4 pb-3 shrink-0">
          <div className="bg-white/8 rounded-2xl p-4 border border-white/10">
            <p className="text-white/60 text-xs mb-2 font-bold">
              readyplayer.me에서 아바타 만들고 URL 붙여넣기
            </p>
            <div className="flex gap-2">
              <input
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="https://models.readyplayer.me/..."
                className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none placeholder:text-white/30"
              />
              <button onClick={applyCustomUrl}
                className="px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-black active:scale-95 transition-transform">
                적용
              </button>
            </div>
            <p className="text-white/30 text-[10px] mt-2">
              💡 readyplayer.me → 아바타 생성 → Share → Copy URL
            </p>
          </div>
        </div>
      )}

      {/* 3D 캔버스 */}
      <div className="flex-1 relative">
        {status === "ready" && (
          <>
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

            {/* GLB 로드 실패 시 안내 */}
            {glbFailed && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur-sm rounded-3xl px-6 py-5 text-center border border-white/10 mx-8">
                  <div className="text-4xl mb-3">🪆</div>
                  <p className="text-white font-black text-sm mb-1">아바타 로드 실패</p>
                  <p className="text-white/40 text-xs mb-3">
                    readyplayer.me에서 본인 아바타를 만들고<br />URL을 붙여넣어 주세요
                  </p>
                  <button
                    className="pointer-events-auto px-5 py-2 rounded-2xl bg-purple-500 text-white text-xs font-black active:scale-95 transition-transform"
                    onClick={() => setShowUrlInput(true)}
                  >
                    🔗 아바타 URL 입력
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="text-6xl" style={{ animation: "bounce 1s ease-in-out infinite" }}>🤖</div>
            <div className="bg-white/8 rounded-3xl px-8 py-5 text-center border border-white/10">
              <p className="text-white font-black text-sm mb-1">{loadMsg}</p>
              <p className="text-white/30 text-xs">처음엔 조금 걸려요</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <div className="bg-white/8 rounded-3xl px-8 py-7 text-center border border-white/10 w-full">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-white font-black mb-1">로드 실패</p>
              <p className="text-white/40 text-xs mb-4">카메라 권한 또는 인터넷 연결 확인</p>
              <button onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-2xl bg-purple-500 text-white text-sm font-black active:scale-95 transition-transform">
                다시 시도
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 숨겨진 카메라 */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* 하단 안내 */}
      {status === "ready" && !glbFailed && (
        <div className="px-5 pb-10 pt-3 shrink-0">
          <div className="flex justify-center gap-5 flex-wrap">
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
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
      `}</style>
    </div>
  );
}
