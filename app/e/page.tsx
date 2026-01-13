"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Song = {
  id: string;
  title: string;
  singer: string;
  url?: string;
  comments?: { user: string; msg: string }[];
};

// ---------------- Firebase 초기화 ----------------
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ---------------- 페이지 ----------------
export default function HomePage() {
  const router = useRouter();
  const user = auth.currentUser;
  const nickname = user?.displayName || "Anonymous";

  const [songs, setSongs] = useState<Song[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);

  useEffect(() => {
    const q = query(collection(db, "songs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Song[] = [];
      snap.forEach((doc) => list.push({ ...doc.data(), id: doc.id } as Song));
      setSongs(list);
    });
    return () => unsub();
  }, []);

  const uploadSong = async () => {
    if (!newTitle || !newFile) return;
    const fileRef = ref(storage, `songs/${Date.now()}_${newFile.name}`);
    await uploadBytes(fileRef, newFile);
    const url = await getDownloadURL(fileRef);

    await addDoc(collection(db, "songs"), {
      title: newTitle,
      singer: nickname,
      url,
      comments: [],
      createdAt: serverTimestamp(),
    });

    setNewTitle("");
    setNewFile(null);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>🎵 추천 노래 & 업로드</h1>

      <div style={styles.upload}>
        <input
          placeholder="노래 제목"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={styles.input}
        />
        <input
          type="file"
          onChange={(e) => setNewFile(e.target.files?.[0] || null)}
        />
        <button style={styles.button} onClick={uploadSong}>
          업로드
        </button>
      </div>

      <div style={styles.songList}>
        {songs.map((song) => (
          <div key={song.id} style={styles.card}>
            <h3>{song.title}</h3>
            <p>부른 사람: {song.singer}</p>
            {song.url && <audio src={song.url} controls style={{ width: "100%" }} />}
            {/* 댓글은 나중에 Firestore 서브컬렉션 연결 */}
          </div>
        ))}
      </div>

      <button style={styles.gameBtn} onClick={() => router.push("/game")}>
        게임하기
      </button>
    </div>
  );
}

const styles: any = {
  page: { padding: 30, background: "#fff", minHeight: "100vh", color: "#222", fontFamily: "sans-serif" },
  title: { fontSize: 36, marginBottom: 20 },
  upload: { display: "flex", gap: 10, marginBottom: 20, alignItems: "center" },
  input: { padding: 8, fontSize: 16, flex: 1, borderRadius: 6, border: "1px solid #ccc" },
  button: { padding: "8px 16px", background: "#ff4081", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" },
  songList: { display: "flex", flexDirection: "column", gap: 20 },
  card: { padding: 16, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", background: "#f9f9f9" },
  gameBtn: { marginTop: 40, fontSize: 24, padding: "15px 30px", borderRadius: 12, background: "#ff4081", color: "#fff", border: "none", cursor: "pointer" },
};
