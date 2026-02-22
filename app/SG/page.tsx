"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/* ---------------- TYPES ---------------- */

type User = {
  id: string;
  username: string;
};

type OfferPayload = {
  from: string;
  offer: RTCSessionDescriptionInit;
};

type AnswerPayload = {
  from: string;
  answer: RTCSessionDescriptionInit;
};

type IcePayload = {
  from: string;
  candidate: RTCIceCandidateInit;
};

/* ---------------- SOCKET ---------------- */

const socket: Socket = io("http://localhost:3001");

/* ---------------- COMPONENT ---------------- */

export default function LivePage() {
  const [username, setUsername] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");

  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState<string>("");

  const [micOn, setMicOn] = useState<boolean>(true);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [screenOn, setScreenOn] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});

  /* ---------------- INIT MEDIA ---------------- */

  const initMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;
    cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  /* ---------------- JOIN ROOM ---------------- */

  const joinRoom = async () => {
    if (!username || !roomId) return;

    await initMedia();
    socket.emit("join", { roomId, username });
  };

  /* ---------------- CREATE PEER ---------------- */

  const createPeer = (userId: string) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current!);
      });
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: userId,
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = (event) => {
      let video = document.getElementById(
        `remote-${userId}`
      ) as HTMLVideoElement | null;

      if (!video) {
        video = document.createElement("video");
        video.id = `remote-${userId}`;
        video.autoplay = true;
        video.playsInline = true;
        video.className = "w-40 rounded shadow";
        document
          .getElementById("remote-container")
          ?.appendChild(video);
      }

      video.srcObject = event.streams[0];
    };

    peersRef.current[userId] = peer;
    return peer;
  };

  /* ---------------- SCREEN SHARE ---------------- */

  const replaceVideoTrack = (newTrack: MediaStreamTrack) => {
    Object.values(peersRef.current).forEach((peer) => {
      const sender = peer
        .getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        sender.replaceTrack(newTrack);
      }
    });
  };

  const toggleScreenShare = async () => {
    if (!screenOn) {
      const screenStream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenTrackRef.current = screenTrack;

      replaceVideoTrack(screenTrack);

      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = new MediaStream([
          screenTrack,
          ...localStreamRef.current.getAudioTracks(),
        ]);
      }

      screenTrack.onended = () => {
        restoreCamera();
      };

      setScreenOn(true);
    } else {
      restoreCamera();
    }
  };

  const restoreCamera = () => {
    if (!cameraTrackRef.current) return;

    replaceVideoTrack(cameraTrackRef.current);

    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    setScreenOn(false);
  };

  /* ---------------- MIC / CAM ---------------- */

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicOn((prev) => !prev);
  };

  const toggleCam = () => {
    if (!cameraTrackRef.current) return;
    cameraTrackRef.current.enabled =
      !cameraTrackRef.current.enabled;
    setCamOn((prev) => !prev);
  };

  /* ---------------- CHAT ---------------- */

  useEffect(() => {
    const saved = localStorage.getItem("chatMessages");
    if (saved) {
      setMessages(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "chatMessages",
      JSON.stringify(messages)
    );
  }, [messages]);

  const sendMessage = () => {
    if (!input) return;

    const msg = `${username}: ${input}`;
    socket.emit("chat", msg);
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  /* ---------------- SOCKET EVENTS ---------------- */

  useEffect(() => {
    socket.on("users", async (userList: User[]) => {
      setUsers(userList);

      for (const user of userList) {
        if (user.id === socket.id) continue;

        if (!peersRef.current[user.id]) {
          const peer = createPeer(user.id);

          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);

          socket.emit("offer", {
            to: user.id,
            offer,
          });
        }
      }
    });

    socket.on("offer", async (payload: OfferPayload) => {
      const peer = createPeer(payload.from);

      await peer.setRemoteDescription(payload.offer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", {
        to: payload.from,
        answer,
      });
    });

    socket.on("answer", async (payload: AnswerPayload) => {
      const peer = peersRef.current[payload.from];
      if (!peer) return;

      await peer.setRemoteDescription(payload.answer);
    });

    socket.on("ice-candidate", async (payload: IcePayload) => {
      const peer = peersRef.current[payload.from];
      if (!peer) return;

      await peer.addIceCandidate(payload.candidate);
    });

    socket.on("chat", (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("users");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("chat");
    };
  }, []);

  /* ---------------- UI ---------------- */

  if (!roomId) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-white/10 p-8 rounded-xl flex flex-col gap-4 w-80">
          <input
            placeholder="닉네임"
            className="p-2 text-black rounded"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="방 ID"
            className="p-2 text-black rounded"
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button
            onClick={joinRoom}
            className="bg-blue-600 p-2 rounded"
          >
            입장
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white">

      {/* 영상 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-2/3 rounded-2xl shadow-2xl"
        />

        <div
          id="remote-container"
          className="flex gap-4 mt-6 flex-wrap justify-center"
        />

        <div className="flex gap-6 mt-6">
          <button onClick={toggleMic}>
            🎤 {micOn ? "ON" : "OFF"}
          </button>
          <button onClick={toggleCam}>
            🎥 {camOn ? "ON" : "OFF"}
          </button>
          <button onClick={toggleScreenShare}>
            🖥 {screenOn ? "중지" : "공유"}
          </button>
        </div>
      </div>

      {/* 채팅 사이드바 */}
      <div className="w-80 bg-gray-900 flex flex-col border-l border-gray-700">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className="bg-gray-800 p-2 rounded text-sm"
            >
              {m}
            </div>
          ))}
        </div>

        <div className="p-3 flex gap-2 border-t border-gray-700">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && sendMessage()
            }
            className="flex-1 p-2 text-black rounded"
            placeholder="메시지 입력"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 px-3 rounded"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}