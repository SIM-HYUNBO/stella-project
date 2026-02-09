"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3001");

type Side = "찬성" | "반대";

interface Peer {
  pc: RTCPeerConnection;
  video: HTMLVideoElement;
  nickname: string;
  side: Side;
}

export default function RealtimeDebate() {
  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState("");
  const [side, setSide] = useState<Side>("찬성");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const peersRef = useRef<Record<string, Peer>>({});

  const proRef = useRef<HTMLDivElement>(null);
  const conRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!joined) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        socket.emit("joinRoom", {
          roomId: "room1",
          nickname,
          side,
        });

        socket.on("allUsers", (users) => {
          users.forEach((u) =>
            createPeer(u.id, u.nickname, u.side, true)
          );
        });

        socket.on("newUser", (u) => {
          createPeer(u.id, u.nickname, u.side, false);
        });

        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("ice-candidate", handleIce);
        socket.on("userLeft", handleLeave);
      });
  }, [joined]);

  const createPeer = (
    id: string,
    name: string,
    peerSide: Side,
    initiator: boolean
  ) => {
    if (peersRef.current[id]) return;

    const pc = new RTCPeerConnection();

    localStreamRef.current!
      .getTracks()
      .forEach((t) => pc.addTrack(t, localStreamRef.current!));

    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.width = 220;
    video.height = 160;
    video.className = "rounded-xl shadow object-cover";

    const wrapper = document.createElement("div");
    wrapper.className = "relative m-2";
    wrapper.appendChild(video);

    const label = document.createElement("div");
    label.innerText = `${name} · ${peerSide}`;
    label.className =
      "absolute bottom-1 left-1 text-white text-xs px-2 rounded " +
      (peerSide === "찬성" ? "bg-green-600" : "bg-red-600");
    wrapper.appendChild(label);

    (peerSide === "찬성" ? proRef.current : conRef.current)
      ?.appendChild(wrapper);

    pc.ontrack = (e) => {
      video.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", {
          target: id,
          from: socket.id,
          candidate: e.candidate,
        });
      }
    };

    peersRef.current[id] = {
      pc,
      video,
      nickname: name,
      side: peerSide,
    };

    if (initiator) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socket.emit("offer", {
          sdp: offer,
          target: id,
          caller: socket.id,
        });
      });
    }
  };

  const handleOffer = async ({ sdp, caller, nickname, side }) => {
    createPeer(caller, nickname, side, false);

    const peer = peersRef.current[caller];
    await peer.pc.setRemoteDescription(
      new RTCSessionDescription(sdp)
    );

    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);

    socket.emit("answer", {
      sdp: answer,
      target: caller,
      caller: socket.id,
    });
  };

  const handleAnswer = ({ sdp, caller }) => {
    peersRef.current[caller]?.pc.setRemoteDescription(
      new RTCSessionDescription(sdp)
    );
  };

  const handleIce = ({ candidate, from }) => {
    peersRef.current[from]?.pc.addIceCandidate(
      new RTCIceCandidate(candidate)
    );
  };

  const handleLeave = ({ id }) => {
    const peer = peersRef.current[id];
    if (!peer) return;
    peer.video.parentElement?.remove();
    peer.pc.close();
    delete peersRef.current[id];
  };

  if (!joined) {
    return (
      <div className="p-10 flex flex-col gap-4 items-center">
        <input
          className="border px-3 py-2 rounded"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />

        <select
          value={side}
          onChange={(e) => setSide(e.target.value as Side)}
          className="border px-3 py-2 rounded"
        >
          <option value="찬성">찬성</option>
          <option value="반대">반대</option>
        </select>

        <button
          onClick={() => setJoined(true)}
          className="px-6 py-2 bg-purple-600 text-white rounded"
        >
          토론 입장
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-2 gap-6">
      <div>
        <h2 className="font-bold mb-2 text-green-600">찬성</h2>
        <div ref={proRef} className="flex flex-wrap">
          {side === "찬성" && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-[220px] h-[160px] m-2 rounded-xl"
            />
          )}
        </div>
      </div>

      <div>
        <h2 className="font-bold mb-2 text-red-600">반대</h2>
        <div ref={conRef} className="flex flex-wrap">
          {side === "반대" && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-[220px] h-[160px] m-2 rounded-xl"
            />
          )}
        </div>
      </div>
    </div>
  );
}