"use client";

import { useState, useRef, useEffect } from "react";

export default function LiveSing() {
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:3001");

    wsRef.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (!pcRef.current) return;

      switch (data.type) {
        case "host-offer":
          // 청취자 입장
          const pc = new RTCPeerConnection();
          pcRef.current = pc;

          pc.ontrack = (event) => {
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              wsRef.current?.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsRef.current?.send(JSON.stringify({ type: "client-answer", sdp: answer }));
          setConnected(true);
          break;

        case "client-answer":
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
          setConnected(true);
          break;

        case "ice-candidate":
          try {
            await pcRef.current.addIceCandidate(data.candidate);
          } catch (err) {
            console.warn("ICE candidate error", err);
          }
          break;
      }
    };
  }, []);

  const startHosting = async () => {
    setIsHost(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setConnected(true);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsRef.current?.send(JSON.stringify({ type: "host-offer", sdp: offer }));
  };

  const stopHosting = () => {
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current = null;
    localStreamRef.current = null;
    setIsHost(false);
    setConnected(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">실시간 노래 라이브</h1>

      {!isHost ? (
        <button
          className="px-6 py-2 text-white text-3xl rounded mb-2"
          onClick={startHosting}
        >
          🎤
        </button>
      ) : (
        <button
          className="px-6 py-2 text-white text-3xl rounded mb-2"
          onClick={stopHosting}
        >
          ❌
        </button>
      )}

      <div className="mt-4">
        <audio ref={remoteAudioRef} autoPlay controls />
      </div>

      {connected && <p className="mt-2 text-green-600">연결 완료!</p>}
    </div>
  );
}
