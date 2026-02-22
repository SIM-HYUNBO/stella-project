"use client";
import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import Peer from "simple-peer";
import { io } from "socket.io-client";

// 🔹 Firebase 설정
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function StudyRoomClient() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [newGoal, setNewGoal] = useState("");
  const [studyTime, setStudyTime] = useState(0);
  const [timerOn, setTimerOn] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<any[]>([]);
  const socketRef = useRef<any>(null);

  // 방 참여 / WebRTC 연결
  const joinRoom = async () => {
    if (!username || !room) return;

    // Firestore 방 생성/불러오기
    const roomRef = doc(db, "rooms", room);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) await setDoc(roomRef, { checklist: [], messages: [], timer: 0 });
    else {
      const data = roomSnap.data();
      setChecklist(data.checklist || []);
      setMessages(data.messages || []);
      setStudyTime(data.timer || 0);
    }

    // Firestore 실시간 구독
    onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      setChecklist(data.checklist || []);
      setMessages(data.messages || []);
      setStudyTime(data.timer || 0);
    });

    // WebRTC + signaling
    socketRef.current = io("http://localhost:3001");

    // 브라우저 API는 useEffect 안에서
    useEffect(() => {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        socketRef.current.emit("join-room", room, socketRef.current.id);

        socketRef.current.on("user-connected", (userId: string) => {
          const peer = new Peer({ initiator: true, trickle: false, stream });
          peer.on("signal", (signal) => socketRef.current.emit("signal", { target: userId, signal }));
          peer.on("stream", (remoteStream) => {
            const videoEl = document.createElement("video");
            videoEl.srcObject = remoteStream;
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            document.getElementById("remote-videos")?.appendChild(videoEl);
          });
          peersRef.current.push({ peer, id: userId });
        });

        socketRef.current.on("signal", ({ signal, sender }: any) => {
          const item = peersRef.current.find((p) => p.id === sender);
          if (item) item.peer.signal(signal);
          else {
            const peer = new Peer({ initiator: false, trickle: false, stream });
            peer.on("signal", (s) => socketRef.current.emit("signal", { target: sender, signal: s }));
            peer.on("stream", (remoteStream) => {
              const videoEl = document.createElement("video");
              videoEl.srcObject = remoteStream;
              videoEl.autoplay = true;
              videoEl.playsInline = true;
              document.getElementById("remote-videos")?.appendChild(videoEl);
            });
            peer.signal(signal);
            peersRef.current.push({ peer, id: sender });
          }
        });
      });
    }, []);

    setJoined(true);
  };

  // 메시지 보내기
  const sendMessage = async () => {
    if (!message) return;
    const roomRef = doc(db, "rooms", room);
    await updateDoc(roomRef, { messages: arrayUnion({ user: username, text: message }) });
    setMessage("");
  };

  // 체크리스트 토글
  const toggleChecklist = async (idx: number) => {
    const newList = [...checklist];
    newList[idx] = newList[idx].includes("✅") ? newList[idx].replace("✅ ", "") : "✅ " + newList[idx];
    setChecklist(newList);
    const roomRef = doc(db, "rooms", room);
    await updateDoc(roomRef, { checklist: newList });
  };

  // 새 목표 추가
  const addGoal = async () => {
    if (!newGoal) return;
    const updatedList = [...checklist, newGoal];
    setChecklist(updatedList);
    setNewGoal("");
    const roomRef = doc(db, "rooms", room);
    await updateDoc(roomRef, { checklist: updatedList });
  };

  // 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerOn && joined) {
      interval = setInterval(async () => {
        setStudyTime((prev) => {
          const newTime = prev + 1;
          const roomRef = doc(db, "rooms", room);
          updateDoc(roomRef, { timer: newTime });
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerOn, joined, room]);

  return (
    <div className="p-4 max-w-xl mx-auto flex flex-col gap-4 font-sans">
      {!joined ? (
        <div className="flex flex-col gap-2">
          <input className="border p-2 rounded" placeholder="이름" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="border p-2 rounded" placeholder="방 이름" value={room} onChange={(e) => setRoom(e.target.value)} />
          <button className="bg-blue-500 text-white p-2 rounded" onClick={joinRoom}>참여</button>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold text-center">방: {room}</h2>

          {/* 영상 영역 */}
          <div className="flex gap-2 overflow-x-scroll">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-40 h-32 rounded" />
            <div id="remote-videos" className="flex gap-2"></div>
          </div>

          {/* 체크리스트 */}
          <div className="border rounded p-2 shadow-sm">
            <h3 className="font-semibold mb-2 text-center">오늘 목표</h3>
            <div className="flex gap-2 mb-2">
              <input className="border p-1 rounded flex-1" placeholder="새 목표" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGoal()} />
              <button className="bg-green-500 text-white p-1 rounded" onClick={addGoal}>추가</button>
            </div>
            <ul className="list-disc ml-4">
              {checklist.map((item, idx) => (
                <li key={idx} onClick={() => toggleChecklist(idx)} className="cursor-pointer select-none">{item}</li>
              ))}
            </ul>
          </div>

          {/* 채팅 */}
          <div className="border rounded p-2 shadow-sm flex flex-col gap-2">
            <h3 className="font-semibold text-center">채팅</h3>
            <div className="overflow-y-scroll h-40 border rounded p-2">
              {messages.map((m, idx) => (<div key={idx}><b>{m.user}:</b> {m.text}</div>))}
            </div>
            <div className="flex gap-2">
              <input className="border p-1 rounded flex-1" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="메시지 입력" />
              <button className="bg-green-500 text-white p-1 rounded" onClick={sendMessage}>보내기</button>
            </div>
          </div>

          {/* 타이머 */}
          <div className="flex flex-col items-center border rounded p-2 shadow-sm">
            <h3 className="font-semibold mb-2">공부 시간</h3>
            <div className="text-3xl mb-2">{Math.floor(studyTime/60)}:{studyTime%60<10?'0':''}{studyTime%60}</div>
            <button className="bg-blue-500 text-white p-2 mb-1 rounded" onClick={() => setTimerOn(!timerOn)}>{timerOn?'일시정지':'시작'}</button>
            <button className="bg-gray-500 text-white p-2 rounded" onClick={() => setStudyTime(0)}>초기화</button>
          </div>
        </>
      )}
    </div>
  );
}