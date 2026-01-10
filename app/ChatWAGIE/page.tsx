"use client";

import { useEffect, useState, useRef } from "react";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

type Message = {
  id: string;
  sender: string;
  text: string;
  reactions: Record<string, number>;
  time: string;
};

type Friend = {
  uid: string;
  nickname: string;
  profilePic?: string;
};

type Room = {
  id: string;
  friend?: Friend;
  messages: Message[];
};

const now = () => new Date().toLocaleString();
const getRoomId = (uid1: string, uid2: string) => [uid1, uid2].sort().join("_");

export default function WagieChatPage() {
  const [myUid, setMyUid] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [searchNick, setSearchNick] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const GLOBAL_ROOM_ID = "wagie_global_room";

  // =====================
  // 초기 유저 + 친구 + 글로벌 방 로드
  // =====================
  useEffect(() => {
    const fetchData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      setMyUid(user.uid);
      setMyNickname(user.displayName ?? "익명");

      // 전체 유저 로드
      const snapshot = await getDocs(collection(db, "users"));
      const users: Friend[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.uid !== user.uid) {
          users.push({
            uid: data.uid,
            nickname: data.nickname,
            profilePic: data.profilePic,
          });
        }
      });
      setAllUsers(users);

      // 친구 목록 로드
      await loadFriends(user.uid, users);

      // 글로벌 톡방 생성 및 로드
      await createGlobalRoom(user.uid);
    };
    fetchData();
  }, []);

  // =====================
  // 친구 목록 로드
  // =====================
  const loadFriends = async (uid: string, users: Friend[]) => {
    const friendSnap = await getDoc(doc(db, "friends", uid));
    if (friendSnap.exists()) {
      const data = friendSnap.data();
      const friendUids: string[] = data.friendUids || [];
      const friendList = users.filter((u) => friendUids.includes(u.uid));
      setFriends(friendList);

      // 기존 방 로드
      friendList.forEach((f) => {
        const roomId = getRoomId(uid, f.uid);
        loadRoomById(roomId, f);
      });
    } else {
      setFriends([]);
    }
  };

  // =====================
  // 글로벌 톡방 생성
  // =====================
  const createGlobalRoom = async (uid: string) => {
    const roomRef = doc(db, "chats", GLOBAL_ROOM_ID);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      await setDoc(roomRef, { messages: [] });
    }
    loadRoomById(GLOBAL_ROOM_ID);
    setCurrentRoomId(GLOBAL_ROOM_ID);
  };

  // =====================
  // 방 로드 통합 함수
  // =====================
  const loadRoomById = (roomId: string, friend?: Friend) => {
    const roomRef = doc(db, "chats", roomId);

    setRooms((prev) => {
      if (!prev.find((r) => r.id === roomId)) {
        return [...prev, { id: roomId, friend, messages: [] }];
      }
      return prev;
    });

    onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      const messages: Message[] = data?.messages || [];
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, messages, friend: friend || r.friend } : r))
      );
    });
  };

  // =====================
  // 친구 추가 + 채팅 시작
  // =====================
  const handleSelectFriend = async (friend: Friend) => {
    if (!myUid) return;
    const roomId = getRoomId(myUid, friend.uid);

    const roomRef = doc(db, "chats", roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) await setDoc(roomRef, { messages: [] });

    loadRoomById(roomId, friend);
    setCurrentRoomId(roomId);

    if (!friends.find((f) => f.uid === friend.uid)) setFriends((prev) => [...prev, friend]);

    const friendRef = doc(db, "friends", myUid);
    const friendSnap = await getDoc(friendRef);
    if (friendSnap.exists()) {
      await updateDoc(friendRef, { friendUids: arrayUnion(friend.uid) });
    } else {
      await setDoc(friendRef, { friendUids: [friend.uid] });
    }

    setSearchNick("");
    setSearchResults([]);
    searchInputRef.current?.blur();
  };

  // =====================
  // 검색 필터링
  // =====================
  useEffect(() => {
    if (!searchNick) return setSearchResults([]);
    const results = allUsers.filter((u) =>
      u.nickname.toLowerCase().startsWith(searchNick.toLowerCase())
    );
    setSearchResults(results);
  }, [searchNick, allUsers]);

  // =====================
  // 메시지 전송
  // =====================
  const sendMessage = async () => {
    if (!input.trim() || !myUid || !myNickname || !currentRoomId) return;

    const roomRef = doc(db, "chats", currentRoomId);
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: myNickname,
      text: input,
      reactions: {},
      time: now(),
    };

    try {
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const messages = roomSnap.data()?.messages || [];
        await updateDoc(roomRef, { messages: [...messages, newMessage] });
      } else {
        await setDoc(roomRef, { messages: [newMessage] });
      }
      setInput("");
    } catch (err) {
      console.error("메시지 전송 실패:", err);
    }
  };

  // =====================
  // 메시지 반응
  // =====================
  const react = async (msgId: string, emoji: string) => {
    if (!currentRoomId) return;
    const roomRef = doc(db, "chats", currentRoomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const messages: Message[] = roomSnap.data()?.messages || [];
    const updated = messages.map((m) =>
      m.id === msgId
        ? { ...m, reactions: { ...m.reactions, [emoji]: (m.reactions[emoji] || 0) + 1 } }
        : m
    );
    try {
      await updateDoc(roomRef, { messages: updated });
    } catch (err) {
      console.error("리액션 업데이트 실패:", err);
    }
  };

  // =====================
  // 메시지 삭제
  // =====================
  const handleDeleteMessage = async (msgId: string) => {
    if (!currentRoomId) return;
    const roomRef = doc(db, "chats", currentRoomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const messages: Message[] = roomSnap.data()?.messages || [];
    const updated = messages.filter((m) => m.id !== msgId);
    try {
      await updateDoc(roomRef, { messages: updated });
    } catch (err) {
      console.error("메시지 삭제 실패:", err);
    }
  };

  // =====================
  // 메시지 수정
  // =====================
  const handleEditMessage = async (msgId: string) => {
    if (!currentRoomId) return;
    const newText = prompt("메시지를 수정하세요");
    if (!newText) return;
    const roomRef = doc(db, "chats", currentRoomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const messages: Message[] = roomSnap.data()?.messages || [];
    const updated = messages.map((m) => (m.id === msgId ? { ...m, text: newText } : m));
    try {
      await updateDoc(roomRef, { messages: updated });
    } catch (err) {
      console.error("메시지 수정 실패:", err);
    }
  };

  const currentRoom = rooms.find((r) => r.id === currentRoomId);

  return (
    <div className="min-h-screen bg-pink-100 flex">
      {/* 사이드바 */}
      <div className="w-72 bg-pink-200 p-4 rounded-r-3xl relative">
        <h1 className="text-xl font-bold text-brown-700 mb-3">🧸 친구 목록</h1>

        {/* 검색창 + 버튼 */}
        <div className="flex gap-2 mb-2 relative">
          <input
            ref={searchInputRef}
            className="flex-1 p-2 rounded-xl"
            placeholder="닉네임 검색"
            value={searchNick}
            onChange={(e) => setSearchNick(e.target.value)}
          />
          <button
            className="bg-orange-400 text-white px-3 rounded-xl font-bold disabled:opacity-50"
            onClick={() => searchResults[0] && handleSelectFriend(searchResults[0])}
            disabled={!myUid}
          >
            ➕
          </button>

          {searchResults.length > 0 && (
            <div className="absolute top-10 left-0 w-full bg-white rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
              {searchResults.map((f) => (
                <div
                  key={f.uid}
                  className="flex items-center gap-2 p-2 hover:bg-orange-200 cursor-pointer"
                  onClick={() => handleSelectFriend(f)}
                >
                  {f.profilePic && <img src={f.profilePic} className="w-6 h-6 rounded-full" />}
                  <span>{f.nickname}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 친구 + 글로벌 방 목록 */}
        <div className="mt-2">
          <div
            className={`p-2 rounded-xl mb-2 cursor-pointer ${
              currentRoomId === GLOBAL_ROOM_ID ? "bg-orange-300" : "bg-white"
            }`}
            onClick={() => {
              setCurrentRoomId(GLOBAL_ROOM_ID);
              loadRoomById(GLOBAL_ROOM_ID);
            }}
          >
            🌐 전체 톡방
          </div>

          {friends.map((f) => (
            <div
              key={f.uid}
              className={`p-2 rounded-xl mb-2 cursor-pointer ${
                currentRoomId === getRoomId(myUid!, f.uid) ? "bg-orange-300" : "bg-white"
              }`}
              onClick={() => {
                const roomId = getRoomId(myUid!, f.uid);
                setCurrentRoomId(roomId);
                loadRoomById(roomId, f);
              }}
            >
              💬 {f.nickname}
            </div>
          ))}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 p-4">
        {!currentRoom ? (
          <div className="text-center text-gray-500 mt-20">친구를 선택하세요 🙂</div>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-2">
              {currentRoom.friend ? `💬 ${currentRoom.friend.nickname}` : "🌐 전체 톡방"}
              {currentRoom.friend?.profilePic && (
                <img
                  src={currentRoom.friend.profilePic}
                  className="inline-block w-6 h-6 rounded-full ml-2"
                />
              )}
            </h2>

            <div className="h-[70vh] overflow-y-auto bg-white rounded-3xl p-4 mb-3">
              {currentRoom.messages.map((m) => (
                <div key={m.id} className={`mb-3 ${m.sender === myNickname ? "text-right" : ""}`}>
                  <div className="inline-block bg-yellow-100 rounded-2xl px-3 py-2 relative">
                    <div className="text-xs text-gray-500">
                      {m.sender} · {m.time}
                    </div>
                    <div>{m.text}</div>
                    <div className="flex gap-1 mt-1">
                      {["👍", "👏", "🌟", "😆"].map((e) => (
                        <span key={e} className="cursor-pointer" onClick={() => react(m.id, e)}>
                          {e}
                          {m.reactions[e] ? m.reactions[e] : ""}
                        </span>
                      ))}
                    </div>

                    {m.sender === myNickname && (
                      <div className="absolute top-1 right-1 flex gap-1 text-xs">
                        <button
                          className="bg-red-400 text-white px-1 rounded"
                          onClick={() => handleDeleteMessage(m.id)}
                        >
                          삭제
                        </button>
                        <button
                          className="bg-blue-400 text-white px-1 rounded"
                          onClick={() => handleEditMessage(m.id)}
                        >
                          수정
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
<div className="flex gap-2">
  <input
    className="flex-1 p-3 rounded-2xl"
    placeholder="메시지 입력..."
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    }}
  />
  <button
    className="bg-orange-400 px-4 rounded-2xl text-white"
    onClick={sendMessage}
    disabled={!myUid || !currentRoomId || !input.trim()}
  >
    전송
  </button>
</div>

          </>
        )}
      </div>
    </div>
  );
}
