"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { db, auth } from "@/app/firebase";
import PageContainer from "../../components/PageContainer";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { User } from "firebase/auth";

/* ================= 타입 ================= */
interface Face {
  id: string;
  src: string;
  likedBy: string[];
  userId: string;
}

interface Chat {
  id: string;
  message: string;
  userId: string;
  nickname: string;
  likedBy: string[];
  parentId: string | null;
}

/* ================= 컴포넌트 ================= */
export default function FaceGeniusPage() {
  const [user, setUser] = useState<User | null>(null);
  const [faces, setFaces] = useState<Face[]>([]);
  const [chatMessages, setChatMessages] = useState<Chat[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  /* ================= 로그인 ================= */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  /* ================= 얼굴 불러오기 ================= */
  const loadFaces = async () => {
    const q = query(collection(db, "faces"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    setFaces(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          src: data.src,
          likedBy: data.likedBy ?? [],
          userId: data.userId,
        };
      })
    );
  };

  /* ================= 채팅 불러오기 ================= */
  const loadChats = async () => {
    const q = query(collection(db, "faceChats"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);

    setChatMessages(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          message: data.message,
          userId: data.userId,
          nickname: data.nickname,
          likedBy: data.likedBy ?? [],
          parentId: data.parentId ?? null,
        };
      })
    );
  };

  useEffect(() => {
    loadFaces();
    loadChats();
  }, []);

  /* ================= 파일 ================= */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  /* ================= 이미지 업로드 ================= */
  const handleAddImage = async () => {
    if (!selectedFile || !user) return;

    const base64 = await fileToBase64(selectedFile);

    await addDoc(collection(db, "faces"), {
      src: base64,
      likedBy: [],
      userId: user.uid,
      createdAt: new Date(),
    });

    setSelectedFile(null);
    loadFaces();
  };

  /* ================= 얼굴 좋아요 ================= */
  const toggleFaceLike = async (face: Face) => {
    if (!user) return;

    const liked = face.likedBy.includes(user.uid);

    await updateDoc(doc(db, "faces", face.id), {
      likedBy: liked
        ? arrayRemove(user.uid)
        : arrayUnion(user.uid),
    });

    loadFaces();
  };

  /* ================= 얼굴 삭제 ================= */
  const deleteFace = async (id: string) => {
    await deleteDoc(doc(db, "faces", id));
    loadFaces();
  };

  /* ================= 채팅 ================= */
  const handleSendChat = async () => {
    if (!chatInput.trim() || !user) return;

    await addDoc(collection(db, "faceChats"), {
      message: chatInput,
      likedBy: [],
      userId: user.uid,
      nickname: user.displayName || "익명",
      parentId: null,
      createdAt: new Date(),
    });

    setChatInput("");
    loadChats();
  };

  const toggleChatLike = async (chat: Chat) => {
    if (!user) return;

    const liked = chat.likedBy.includes(user.uid);

    await updateDoc(doc(db, "faceChats", chat.id), {
      likedBy: liked
        ? arrayRemove(user.uid)
        : arrayUnion(user.uid),
    });

    loadChats();
  };

  const deleteChat = async (id: string) => {
    await deleteDoc(doc(db, "faceChats", id));
    loadChats();
  };

  /* ================= UI ================= */
  return (
    <PageContainer>
      <div className="flex flex-col w-full min-h-screen p-8 gap-12 bg-white">

        <h1 className="text-4xl text-orange-400 text-center">
            내 얼굴이 좀 생겼다? 당장 업로드!
        </h1>

        {/* 업로드 */}
        {user && (
          <div className="p-6 rounded-2xl shadow bg-white/70 max-w-xl mx-auto flex gap-2">
            <input type="file" onChange={handleFileChange} />
            <button
              onClick={handleAddImage}
              className="px-4 py-2 bg-orange-300 text-white rounded-lg"
            >
              업로드
            </button>
          </div>
        )}

        {/* 얼굴 카드 */}
        <div className="flex gap-6 overflow-x-auto">
          {faces.map((face) => (
            <div
              key={face.id}
              className="p-4 rounded-2xl shadow bg-white/70 w-64 flex-shrink-0"
            >
              <img src={face.src} className="rounded-xl mb-3" />

              <div className="flex justify-between items-center">
                <button
                  onClick={() => toggleFaceLike(face)}
                  className={`px-3 py-1 rounded-lg ${
                    face.likedBy.includes(user?.uid ?? "")
                      ? "bg-red-500 text-white"
                      : "bg-orange-100 text-orange-900"
                  }`}
                >
                  ❤️ {face.likedBy.length}
                </button>

                {user?.uid === face.userId && (
                  <button
                    onClick={() => deleteFace(face.id)}
                    className="text-sm text-red-600"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 채팅 */}
        <div className="p-6 rounded-2xl shadow bg-white/70 max-w-xl mx-auto">
          <h3 className="text-xl font-bold text-orange-600 mb-4">
            💬 얼굴 토크방
          </h3>

          <div className="max-h-64 overflow-y-auto bg-orange-50 rounded-lg p-3 mb-3">
            {chatMessages.map((chat) => (
              <div key={chat.id} className="mb-3 p-2 bg-white/80 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-orange-700">
                    {chat.nickname}
                  </span>
                  <button
                    onClick={() => toggleChatLike(chat)}
                    className={`px-2 rounded ${
                      chat.likedBy.includes(user?.uid ?? "")
                        ? "bg-red-500 text-white"
                        : "bg-orange-100"
                    }`}
                  >
                    ❤️ {chat.likedBy.length}
                  </button>
                </div>

                <p className="text-orange-900 whitespace-pre-wrap">
                  {chat.message}
                </p>

                {user?.uid === chat.userId && (
                  <button
                    onClick={() => deleteChat(chat.id)}
                    className="text-xs text-red-500 mt-1"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>

          {user && (
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 p-3 rounded-lg bg-orange-50 border"
                placeholder="메시지를 입력하세요"
              />
              <button
                onClick={handleSendChat}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg"
              >
                전송
              </button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
