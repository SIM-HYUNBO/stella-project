"use client";

import { useEffect, useRef, useState } from "react";
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * ✅ WebRTC LIVE (TS 오류 + signalingState 오류 수정 최종판)
 * - role 비교 TS2367 해결
 * - host / viewer 상태 안전 분기
 */

const ROOM_ID = "room1";

type Role = "host" | "viewer" | "idle";

export default function LiveStudyWebRTC() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [role, setRole] = useState<Role>("idle");

  /* ================= 공통 Peer ================= */
  const createPeer = () =>
    new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

  /* ================= 👑 HOST ================= */
  const startLive = async () => {
    if (role !== "idle") return;
    setRole("host");

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;

    const pc = createPeer();
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await setDoc(doc(db, "liveRooms", ROOM_ID, "webrtc", "offer"), {
      sdp: offer,
      createdAt: serverTimestamp(),
    });

    // answer 수신 (host 전용)
    onSnapshot(doc(db, "liveRooms", ROOM_ID, "webrtc", "answer"), async (snap) => {
      const data = snap.data();
      if (!data) return;
      if (pc.signalingState !== "have-local-offer") return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    });
  };

  /* ================= 👀 VIEWER ================= */
  useEffect(() => {
    if (role === "host") return;

    const unsub = onSnapshot(doc(db, "liveRooms", ROOM_ID, "webrtc", "offer"), async (snap) => {
      const data = snap.data();
      if (!data) return;
      if (role !== "idle") return;

      setRole("viewer");

      const pc = createPeer();
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (videoRef.current) videoRef.current.srcObject = e.streams[0];
      };

      if (pc.signalingState !== "stable") return;

      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await setDoc(doc(db, "liveRooms", ROOM_ID, "webrtc", "answer"), {
        sdp: answer,
        createdAt: serverTimestamp(),
      });
    });

    return () => unsub();
  }, [role]);

  /* ================= 정리 ================= */
  useEffect(() => {
    return () => {
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      deleteDoc(doc(db, "liveRooms", ROOM_ID, "webrtc", "offer"));
      deleteDoc(doc(db, "liveRooms", ROOM_ID, "webrtc", "answer"));
    };
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="relative w-72 h-72 rounded-full overflow-hidden shadow-[0_0_60px_rgba(99,102,241,0.6)]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={role === "host"}
          className="w-full h-full object-cover"
        />
        {role !== "idle" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600 text-xs rounded-full">
            LIVE
          </div>
        )}
      </div>

      {role === "idle" && (
        <button
          onClick={startLive}
          className="mt-8 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500"
        >
          🎥 라이브 시작
        </button>
      )}

      {role === "viewer" && (
        <div className="mt-6 text-sm text-neutral-400">라이브 시청 중 👀</div>
      )}
    </div>
  );
}
