"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { db } from "@/app/firebase";
import { watchAuthState } from "../authService";

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  where,
} from "firebase/firestore";

type GroupRoom = {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt?: any;
  profileImage?: string;
};

type GroupMessage = {
  id: string;
  from: string;
  content: string;
  type?: "text" | "image";
  createdAt?: any;
  readBy?: string[];
};

type User = {
  id: string;
  nickname: string;
};

export default function GroupChat() {
  const [nickname, setNickname] = useState<string | null>(null);

  const [rooms, setRooms] = useState<GroupRoom[]>([]);

  const [currentRoom, setCurrentRoom] =
    useState<GroupRoom | null>(null);

  const [messages, setMessages] = useState<
    GroupMessage[]
  >([]);

  const [input, setInput] = useState("");

  const [showCreate, setShowCreate] =
    useState(false);

  const [newRoomName, setNewRoomName] =
    useState("");

  const [showInvite, setShowInvite] =
    useState(false);

  const [allUsers, setAllUsers] = useState<
    User[]
  >([]);

  const [inviting, setInviting] =
    useState(false);

  const [isMobile, setIsMobile] =
    useState(false);

  const [imgUploading, setImgUploading] =
    useState(false);

  const [profileUploading, setProfileUploading] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const imageInputRef =
    useRef<HTMLInputElement>(null);

  const profileInputRef =
    useRef<HTMLInputElement>(null);

  const router = useRouter();

  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < 768);

    check();

    window.addEventListener("resize", check);

    return () =>
      window.removeEventListener(
        "resize",
        check
      );
  }, []);

  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) {
        setNickname(
          user.displayName || "유저"
        );
      } else {
        router.replace("/login");
      }
    });

    return () => unsub();
  }, []);

  // 방 목록
  useEffect(() => {
    if (!nickname) return;

    const q = query(
      collection(db, "group_rooms"),
      where(
        "members",
        "array-contains",
        nickname
      )
    );

    return onSnapshot(q, (snap) => {
      const list: GroupRoom[] =
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<
            GroupRoom,
            "id"
          >),
        }));

      list.sort((a, b) => {
        const ta =
          a.createdAt
            ?.toDate?.()
            ?.getTime() ?? 0;

        const tb =
          b.createdAt
            ?.toDate?.()
            ?.getTime() ?? 0;

        return tb - ta;
      });

      setRooms(list);
    });
  }, [nickname]);

  // currentRoom 동기화
  useEffect(() => {
    if (!currentRoom) return;

    const updated = rooms.find(
      (r) => r.id === currentRoom.id
    );

    if (updated) {
      setCurrentRoom(updated);
    } else {
      setCurrentRoom(null);
    }
  }, [rooms]);

  // 메시지
  useEffect(() => {
    if (!currentRoom || !nickname) return;

    const q = query(
      collection(
        db,
        "group_rooms",
        currentRoom.id,
        "messages"
      ),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const msgs: GroupMessage[] = [];

        for (const d of snap.docs) {
          const data = d.data();

          const m: GroupMessage = {
            id: d.id,
            from: data.from,
            content: data.content,
            type: data.type || "text",
            createdAt: data.createdAt,
            readBy: data.readBy || [],
          };

          if (
            m.from !== nickname &&
            !m.readBy?.includes(nickname)
          ) {
            await updateDoc(
              doc(
                db,
                "group_rooms",
                currentRoom.id,
                "messages",
                m.id
              ),
              {
                readBy: arrayUnion(nickname),
              }
            );
          }

          msgs.push(m);
        }

        setMessages(msgs);

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView(
            {
              behavior: "smooth",
            }
          );
        }, 50);
      }
    );

    return () => unsub();
  }, [currentRoom?.id, nickname]);

  // 사용자 목록
  useEffect(() => {
    if (!nickname) return;

    return onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list: User[] = snap.docs
          .map((d) => ({
            id: d.id,
            nickname:
              d.data().nickname as string,
          }))
          .filter(
            (u) => u.nickname !== nickname
          );

        setAllUsers(list);
      }
    );
  }, [nickname]);

  const createRoom = async () => {
    if (!newRoomName.trim() || !nickname)
      return;

    await addDoc(
      collection(db, "group_rooms"),
      {
        name: newRoomName.trim(),
        members: [nickname],
        createdBy: nickname,
        createdAt: serverTimestamp(),
      }
    );

    setNewRoomName("");
    setShowCreate(false);
  };

  const sendMessage = async () => {
    if (
      !input.trim() ||
      !nickname ||
      !currentRoom
    )
      return;

    const text = input.trim();

    await addDoc(
      collection(
        db,
        "group_rooms",
        currentRoom.id,
        "messages"
      ),
      {
        from: nickname,
        content: text,
        type: "text",
        createdAt: serverTimestamp(),
        readBy: [nickname],
      }
    );

    const targets = currentRoom.members.filter((m) => m !== nickname);
    if (targets.length > 0) {
      fetch("/api/fcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toNicknames: targets,
          fromNickname: nickname,
          message: text.length > 60 ? text.slice(0, 60) + "…" : text,
          roomName: currentRoom.name,
        }),
      }).catch(() => {});
    }

    setInput("");
  };

  const compressToBase64 = (
    file: File,
    maxPx = 800
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();

      const url = URL.createObjectURL(file);

      img.onload = () => {
        const ratio = Math.min(
          maxPx / img.width,
          maxPx / img.height,
          1
        );

        const canvas =
          document.createElement("canvas");

        canvas.width = img.width * ratio;
        canvas.height =
          img.height * ratio;

        canvas
          .getContext("2d")
          ?.drawImage(
            img,
            0,
            0,
            canvas.width,
            canvas.height
          );

        URL.revokeObjectURL(url);

        resolve(
          canvas.toDataURL(
            "image/jpeg",
            0.8
          )
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);

        reject(
          new Error("이미지 로드 실패")
        );
      };

      img.src = url;
    });

  const sendImage = async (file: File) => {
    if (!nickname || !currentRoom) return;

    setImgUploading(true);

    try {
      const base64 =
        await compressToBase64(file);

      await addDoc(
        collection(
          db,
          "group_rooms",
          currentRoom.id,
          "messages"
        ),
        {
          from: nickname,
          content: base64,
          type: "image",
          createdAt: serverTimestamp(),
          readBy: [nickname],
        }
      );
    } finally {
      setImgUploading(false);
    }
  };

  const inviteUser = async (
    targetNickname: string
  ) => {
    if (!currentRoom || inviting) return;

    setInviting(true);

    try {
      await updateDoc(
        doc(
          db,
          "group_rooms",
          currentRoom.id
        ),
        {
          members: arrayUnion(
            targetNickname
          ),
        }
      );

      setShowInvite(false);
    } finally {
      setInviting(false);
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !nickname) return;

    if (
      !confirm(
        `"${currentRoom.name}" 방에서 나가시겠습니까?`
      )
    )
      return;

    await updateDoc(
      doc(
        db,
        "group_rooms",
        currentRoom.id
      ),
      {
        members: arrayRemove(nickname),
      }
    );

    setCurrentRoom(null);
  };

  const changeProfileImage = async (
    file: File
  ) => {
    if (!currentRoom) return;

    setProfileUploading(true);

    try {
      const base64 =
        await compressToBase64(file);

      await updateDoc(
        doc(
          db,
          "group_rooms",
          currentRoom.id
        ),
        {
          profileImage: base64,
        }
      );
    } finally {
      setProfileUploading(false);
    }
  };

  if (!nickname) {
    return (
      <div className="h-screen flex items-center justify-center">
        로딩중...
      </div>
    );
  }

  // 초대 모달
  const renderInviteModal = () => {
    if (!showInvite || !currentRoom)
      return null;

    const notInRoom = allUsers.filter(
      (u) =>
        !currentRoom.members.includes(
          u.nickname
        )
    );

    return (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={() =>
          setShowInvite(false)
        }
      >
        <div
          className="w-80 bg-white rounded-3xl shadow-2xl p-5"
          onClick={(e) =>
            e.stopPropagation()
          }
        >
          <div className="text-lg font-bold text-gray-800 mb-4">
            사용자 초대
          </div>

          <div className="max-h-[350px] overflow-y-auto flex flex-col gap-2">
            {notInRoom.map((u) => (
              <button
                key={u.id}
                disabled={inviting}
                onClick={() =>
                  inviteUser(u.nickname)
                }
                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-gray-50 transition text-left"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 text-white font-bold flex items-center justify-center shadow">
                  {u.nickname[0]}
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    {u.nickname}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              setShowInvite(false)
            }
            className="mt-4 w-full h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm"
          >
            닫기
          </button>
        </div>
      </div>
    );
  };

  // 채팅
  const renderRoom = () => (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-white to-gray-50">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={() =>
                setCurrentRoom(null)
              }
              className="text-gray-500"
            >
              ←
            </button>
          )}

          <div className="relative shrink-0 group">
            {currentRoom?.profileImage ? (
              <img
                src={
                  currentRoom.profileImage
                }
                alt="프로필"
                className="w-11 h-11 rounded-full object-cover shadow"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 text-white font-bold flex items-center justify-center shadow">
                {currentRoom?.name[0]}
              </div>
            )}

            <button
              disabled={profileUploading}
              onClick={() =>
                profileInputRef.current?.click()
              }
              className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition ${
                profileUploading
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              ✏️
            </button>

            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f =
                  e.target.files?.[0];

                if (f)
                  changeProfileImage(f);

                e.target.value = "";
              }}
            />
          </div>

          <div>
            <div className="font-bold text-gray-800">
              {currentRoom?.name}
            </div>

            <div className="text-xs text-gray-400">
              멤버{" "}
              {currentRoom?.members.length}
              명
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setShowInvite(true)
            }
            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm transition"
          >
            초대
          </button>

          <button
            onClick={leaveRoom}
            className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-sm transition"
          >
            나가기
          </button>
        </div>
      </div>

      {/* 멤버 */}
      <div className="px-4 py-2 border-b bg-white">
        <div className="text-xs text-gray-400 truncate">
          👥{" "}
          {currentRoom?.members.join(", ")}
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
        {messages.map((m, i) => {
          const isMine =
            m.from === nickname;

          const prev = messages[i - 1];

          const showUser =
            !prev || prev.from !== m.from;

          const currentDate =
            formatDateLabel(
              m.createdAt
            );

          const prevDate =
            i > 0
              ? formatDateLabel(
                  messages[i - 1]
                    .createdAt
                )
              : null;

          const showDate =
            currentDate !== prevDate;

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center justify-center text-xs text-gray-400 w-full my-2">
                  <div className="flex-1 border-t" />

                  <span className="px-2">
                    {currentDate}
                  </span>

                  <div className="flex-1 border-t" />
                </div>
              )}

              <div
                className={`flex ${
                  isMine
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div className="max-w-[80%]">
                  {!isMine &&
                    showUser && (
                      <div className="text-xs text-gray-400 mb-1 ml-1">
                        {m.from}
                      </div>
                    )}

                  <div
                    className={`px-4 py-3 rounded-3xl text-sm shadow-sm ${
                      isMine
                        ? "bg-gradient-to-r from-yellow-300 to-orange-300 text-white rounded-br-md"
                        : "bg-white border border-gray-100 rounded-bl-md"
                    }`}
                  >
                    {m.type ===
                    "image" ? (
                      <img
                        src={m.content}
                        alt="이미지"
                        className="max-w-[220px] max-h-[220px] rounded-2xl object-cover cursor-pointer"
                        onClick={() =>
                          window.open(
                            m.content,
                            "_blank"
                          )
                        }
                      />
                    ) : (
                      <span className="break-words whitespace-pre-wrap">
                        {m.content}
                      </span>
                    )}
                  </div>

                  <div
                    className={`mt-1 text-[10px] text-gray-400 flex ${
                      isMine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {formatTime(
                      m.createdAt
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="p-3 bg-white border-t flex items-center gap-2 shrink-0">
        <button
          onClick={() =>
            imageInputRef.current?.click()
          }
          disabled={imgUploading}
          className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg ${
            imgUploading
              ? "animate-pulse"
              : "hover:bg-gray-200"
          }`}
        >
          📷
        </button>

        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f =
              e.target.files?.[0];

            if (f) sendImage(f);

            e.target.value = "";
          }}
        />

        <input
          className="flex-1 h-11 rounded-full bg-gray-100 px-4 text-sm outline-none"
          placeholder="메시지 입력"
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              sendMessage();
            }
          }}
        />

        <button
          onClick={sendMessage}
          className="w-11 h-11 rounded-full bg-gradient-to-r from-yellow-300 to-orange-300 text-white shadow hover:scale-105 active:scale-95 transition"
        >
          ➤
        </button>
      </div>
    </div>
  );

  // 방 목록
  const renderRoomList = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-4 border-b">
        <div className="text-xl font-black bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
          WAGIE GROUP
        </div>

        <div className="text-xs text-gray-400 mt-0.5">
          단체 채팅
        </div>
      </div>

      <div className="px-3 py-3 border-b">
        {showCreate ? (
          <div className="flex flex-col gap-2">
            <input
              className="w-full h-11 rounded-2xl bg-gray-100 px-4 text-sm outline-none"
              placeholder="방 이름 입력"
              value={newRoomName}
              onChange={(e) =>
                setNewRoomName(
                  e.target.value
                )
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                createRoom()
              }
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={createRoom}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-300 text-white font-semibold shadow"
              >
                만들기
              </button>

              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewRoomName("");
                }}
                className="flex-1 h-11 rounded-2xl bg-gray-100 hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() =>
              setShowCreate(true)
            }
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-300 text-white font-semibold shadow"
          >
            + 방 만들기
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() =>
              setCurrentRoom(room)
            }
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-2 border shadow-sm transition text-left ${
              currentRoom?.id === room.id
                ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-100"
                : "bg-white hover:bg-gray-50 border-gray-100"
            }`}
          >
            {room.profileImage ? (
              <img
                src={room.profileImage}
                alt="프로필"
                className="w-11 h-11 rounded-full object-cover shadow"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 text-white font-bold flex items-center justify-center shadow">
                {room.name[0]}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 truncate">
                {room.name}
              </div>

              <div className="text-xs text-gray-400 truncate">
                멤버{" "}
                {room.members.length}명
              </div>
            </div>
          </button>
        ))}

        {rooms.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center text-gray-400 mt-16">
            <div className="text-6xl mb-4">
              💬
            </div>

            <div className="font-semibold">
              아직 채팅방이 없어요
            </div>

            <div className="text-sm mt-1">
              새 단체방을 만들어봐요
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <PageContainer>
        <div className="h-screen flex flex-col overflow-hidden">
          {!currentRoom
            ? renderRoomList()
            : renderRoom()}

          {renderInviteModal()}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="h-screen flex overflow-hidden bg-white rounded-none md:rounded-3xl shadow-xl">
        <div className="w-[320px] border-r">
          {renderRoomList()}
        </div>

        <div className="flex-1 flex flex-col">
          {currentRoom ? (
            renderRoom()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50">
              <div className="text-7xl mb-5">
                💬
              </div>

              <div className="text-2xl font-bold text-gray-700">
                단체 대화를 시작해봐요
              </div>

              <div className="text-gray-400 mt-2">
                왼쪽에서 채팅방을
                선택해주세요
              </div>
            </div>
          )}
        </div>
      </div>

      {renderInviteModal()}
    </PageContainer>
  );
}

const formatTime = (ts: any) => {
  if (!ts) return "";

  const d = ts?.toDate
    ? ts.toDate()
    : new Date(ts);

  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateLabel = (ts: any) => {
  if (!ts) return "";

  const d = ts?.toDate
    ? ts.toDate()
    : new Date(ts);

  return d.toLocaleDateString("ko-KR");
};