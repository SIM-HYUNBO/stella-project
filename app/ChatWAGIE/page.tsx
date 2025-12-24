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
  friend?: Friend; // 친구톡이면 friend 있음, 글로벌 톡방이면 undefined
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
  // 유저 + 친구 로딩
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
      createGlobalRoom(user.uid, users);
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
      friendList.forEach((f) => loadRoom(f));
    } else {
      setFriends([]);
    }
  };

  // =====================
  // 글로벌 톡방 생성
  // =====================
  const createGlobalRoom = async (uid: string, users: Friend[]) => {
    const roomRef = doc(db, "chats", GLOBAL_ROOM_ID);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      await setDoc(roomRef, { messages: [] });
    }

    loadGlobalRoom(GLOBAL_ROOM_ID);
    setCurrentRoomId(GLOBAL_ROOM_ID);
  };

  const loadGlobalRoom = (roomId: string) => {
    const roomRef = doc(db, "chats", roomId);
    onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      const messages: Message[] = data?.messages || [];
      setRooms((prev) => {
        const exists = prev.find((r) => r.id === roomId);
        if (exists) return prev.map((r) => (r.id === roomId ? { ...r, messages } : r));
        else return [...prev, { id: roomId, messages }];
      });
    });
  };

  // =====================
  // 친구 추가 + 채팅 시작
  // =====================
  const handleSelectFriend = async (friend: Friend) => {
    if (!myUid) return;

    // 친구 추가
    const friendRef = doc(db, "friends", myUid);
    const friendSnap = await getDoc(friendRef);
    if (friendSnap.exists()) {
      await updateDoc(friendRef, { friendUids: arrayUnion(friend.uid) });
    } else {
      await setDoc(friendRef, { friendUids: [friend.uid] });
    }

    if (!friends.find((f) => f.uid === friend.uid)) setFriends((prev) => [...prev, friend]);

    // 채팅방 시작
    const roomId = getRoomId(myUid, friend.uid);
    setCurrentRoomId(roomId);
    loadRoom(friend);

    setSearchNick("");
    setSearchResults([]);
    searchInputRef.current?.blur();
  };

  // =====================
  // 친구 채팅방 로드
  // =====================
  const loadRoom = (friend: Friend) => {
    if (!myUid) return;
    const roomId = getRoomId(myUid, friend.uid);
    const roomRef = doc(db, "chats", roomId);
    onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      const messages: Message[] = data?.messages || [];
      setRooms((prev) => {
        const exists = prev.find((r) => r.id === roomId);
        if (exists) return prev.map((r) => (r.id === roomId ? { ...r, messages } : r));
        else return [...prev, { id: roomId, friend, messages }];
      });
    });
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
  // 플러스 버튼 클릭
  // =====================
  const handleAddFriendClick = () => {
    if (searchResults.length === 0) {
      alert(`닉네임 "${searchNick}"을(를) 가진 사용자가 없습니다.`);
      return;
    }
    handleSelectFriend(searchResults[0]);
  };

  // =====================
  // 메시지 전송
  // =====================
  const sendMessage = async () => {
    if (!input.trim() || !myUid || !currentRoomId || !myNickname) return;
    const roomRef = doc(db, "chats", currentRoomId);
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: myNickname,
      text: input,
      reactions: {},
      time: now(),
    };
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      const messages = roomSnap.data()?.messages || [];
      await updateDoc(roomRef, { messages: [...messages, newMessage] });
    } else {
      await setDoc(roomRef, { messages: [newMessage] });
    }
    setInput("");
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
    await updateDoc(roomRef, { messages: updated });
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
            onClick={handleAddFriendClick}
            disabled={!myUid}
          >
            ➕
          </button>

          {/* 검색 미리보기 */}
          {searchResults.length > 0 && (
            <div className="absolute top-10 left-0 w-full bg-white rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
              {searchResults.map((f) => (
                <div
                  key={f.uid}
                  className="flex items-center gap-2 p-2 hover:bg-orange-200 cursor-pointer"
                  onClick={() => handleSelectFriend(f)}
                >
                  {f.profilePic && (
                    <img src={f.profilePic} className="w-6 h-6 rounded-full" />
                  )}
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
              onClick={() => handleSelectFriend(f)}
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
                <div
                  key={m.id}
                  className={`mb-3 ${m.sender === myNickname ? "text-right" : ""}`}
                >
                  <div className="inline-block bg-yellow-100 rounded-2xl px-3 py-2">
                    <div className="text-xs text-gray-500">
                      {m.sender} · {m.time}
                    </div>
                    <div>{m.text}</div>
                    <div className="flex gap-1 mt-1">
                      {["👍", "👏", "🌟", "😆"].map((e) => (
                        <span
                          key={e}
                          className="cursor-pointer"
                          onClick={() => react(m.id, e)}
                        >
                          {e}
                          {m.reactions[e] ? m.reactions[e] : ""}
                        </span>
                      ))}
                    </div>
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
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                className="bg-orange-400 px-4 rounded-2xl text-white"
                onClick={sendMessage}
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
