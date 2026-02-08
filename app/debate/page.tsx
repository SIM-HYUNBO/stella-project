"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

interface Peer {
  connection: RTCPeerConnection;
  nickname: string;
  streamEl: HTMLVideoElement;
}

const socket = io("http://localhost:3001");

export default function RealtimeDebate() {
  const [roomId, setRoomId] = useState("room1");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [side, setSide] = useState<"찬성" | "반대">("찬성");
  const [peers, setPeers] = useState<{ [id: string]: Peer }>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!joined) return;

    navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((stream) => {
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit("joinRoom", { roomId, nickname });

      socket.on("allUsers", (users: { id: string; nickname: string }[]) => {
        users.forEach((user) => createPeer(user.id, user.nickname, stream, true));
      });

      socket.on("newUser", ({ id, nickname }: { id: string; nickname: string }) => {
        createPeer(id, nickname, stream, false);
      });

      socket.on("offer", async ({ sdp, caller }) => {
        await handleOffer(sdp, caller, stream);
      });

      socket.on("answer", ({ sdp, caller }) => {
        peers[caller]?.connection.setRemoteDescription(new RTCSessionDescription(sdp));
      });

      socket.on("ice-candidate", ({ candidate, from }) => {
        peers[from]?.connection.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on("updateComments", (comment) => {
        setComments((prev) => [...prev, comment]);
      });

      socket.on("userLeft", ({ id }) => {
        const el = peers[id]?.streamEl;
        if (el?.parentElement) el.parentElement.remove();
        const newPeers = { ...peers };
        delete newPeers[id];
        setPeers(newPeers);
      });
    });
  }, [joined]);

  const createPeer = (id: string, nickname: string, stream: MediaStream, initiator: boolean) => {
    const pc = new RTCPeerConnection();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const videoEl = document.createElement("video");
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.width = 220;
    videoEl.height = 160;
    videoEl.style.borderRadius = "16px";
    videoEl.style.margin = "8px";
    videoEl.style.objectFit = "cover";
    videoEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
    videoEl.title = nickname;

    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.display = "inline-block";
    container.appendChild(videoEl);

    const label = document.createElement("div");
    label.innerText = nickname;
    label.style.position = "absolute";
    label.style.bottom = "6px";
    label.style.left = "6px";
    label.style.padding = "2px 6px";
    label.style.backgroundColor = "rgba(0,0,0,0.65)";
    label.style.color = "white";
    label.style.borderRadius = "6px";
    label.style.fontSize = "0.85rem";
    label.style.fontWeight = "bold";
    container.appendChild(label);

    document.getElementById("video-container")?.appendChild(container);

    pc.ontrack = (e) => {
      videoEl.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { candidate: e.candidate, target: id, from: socket.id });
    };

    if (initiator) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer).then(() => {
          socket.emit("offer", { sdp: offer, target: id, caller: socket.id });
        });
      });
    }

    setPeers((prev) => ({ ...prev, [id]: { connection: pc, nickname, streamEl: videoEl } }));
  };

  const handleOffer = async (sdp: RTCSessionDescriptionInit, caller: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const videoEl = document.createElement("video");
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.width = 220;
    videoEl.height = 160;
    videoEl.style.borderRadius = "16px";
    videoEl.style.margin = "8px";
    videoEl.style.objectFit = "cover";
    videoEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";

    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.display = "inline-block";
    container.appendChild(videoEl);

    const label = document.createElement("div");
    label.innerText = "참가자";
    label.style.position = "absolute";
    label.style.bottom = "6px";
    label.style.left = "6px";
    label.style.padding = "2px 6px";
    label.style.backgroundColor = "rgba(0,0,0,0.65)";
    label.style.color = "white";
    label.style.borderRadius = "6px";
    label.style.fontSize = "0.85rem";
    label.style.fontWeight = "bold";
    container.appendChild(label);

    document.getElementById("video-container")?.appendChild(container);

    pc.ontrack = (e) => (videoEl.srcObject = e.streams[0]);
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { candidate: e.candidate, target: caller, from: socket.id });
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", { sdp: answer, target: caller, caller: socket.id });

    setPeers((prev) => ({ ...prev, [caller]: { connection: pc, nickname: "참가자", streamEl: videoEl } }));
  };

  const sendComment = () => {
    if (!input.trim()) return;
    const comment = { text: input, side, nickname };
    socket.emit("newComment", { roomId, comment });
    setInput("");
  };

  return (
    <div className="p-4 min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex flex-col items-center">
      {!joined ? (
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-fade-in">
          <input
            placeholder="닉네임 입력"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="border px-3 py-2 rounded-lg w-60 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={() => nickname && setJoined(true)}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-transform"
          >
            참가
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-purple-700 mb-4">실시간 영상 토론</h2>

          <div
            id="video-container"
            className="flex flex-wrap justify-center mb-4"
          >
            <div className="relative inline-block m-2">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                width={220}
                height={160}
                className="rounded-2xl object-cover shadow-lg"
              />
              <div className="absolute bottom-2 left-2 bg-purple-700 bg-opacity-70 text-white px-2 py-0.5 rounded font-semibold text-sm">
                {nickname} (나)
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSide("찬성")}
              className={`px-4 py-2 rounded-xl font-semibold transition ${
                side === "찬성"
                  ? "bg-green-500 text-white shadow-lg"
                  : "bg-gray-200 hover:bg-green-200"
              }`}
            >
              찬성
            </button>
            <button
              onClick={() => setSide("반대")}
              className={`px-4 py-2 rounded-xl font-semibold transition ${
                side === "반대"
                  ? "bg-red-500 text-white shadow-lg"
                  : "bg-gray-200 hover:bg-red-200"
              }`}
            >
              반대
            </button>
          </div>

     
        </>
      )}
    </div>
  );
}