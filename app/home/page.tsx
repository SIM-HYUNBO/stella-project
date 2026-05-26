"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import HamburgerMenuWithDelete from "@/components/hamburger";
import TextAvatar from "@/components/TextAvatar";

type Friend = { uid: string; nickname: string; profileImage: string | null };

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setNickname(snap.data().nickname || "유저");
        setProfileImage(snap.data().profileImage || null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const fSnap = await getDocs(query(collection(db, "friends"), where("users", "array-contains", uid)));
      const list: Friend[] = [];
      for (const d of fSnap.docs) {
        const otherUid = d.data().users.find((u: string) => u !== uid);
        if (!otherUid) continue;
        const uSnap = await getDoc(doc(db, "users", otherUid));
        if (uSnap.exists()) {
          list.push({ uid: otherUid, nickname: uSnap.data().nickname, profileImage: uSnap.data().profileImage || null });
        }
      }
      setFriends(list);
    })();
  }, [uid]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #fff5ee 0%, #fff0f5 50%, #fffbf0 100%)",
      paddingBottom: 40,
    }}>
      <HamburgerMenuWithDelete />

      {/* 탑바 */}
      <div style={{ padding: "56px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 13, color: "#f4a261", fontWeight: 700, margin: 0, letterSpacing: 2 }}>WAGIE</p>
          <p style={{ fontSize: 26, fontWeight: 900, color: "#2d1a0e", margin: "2px 0 0", lineHeight: 1.2 }}>
            안녕,<br />{nickname ?? "..."}  👋
          </p>
        </div>
        <button onClick={() => router.push("/profile")} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            boxShadow: "0 4px 16px rgba(244,162,97,0.35)",
            overflow: "hidden",
          }}>
            <TextAvatar nickname={nickname || "?"} size={48} profileImage={profileImage} />
          </div>
        </button>
      </div>

      {/* 친구 버블 */}
      <div style={{ marginTop: 28, paddingLeft: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#f4a261", letterSpacing: 1, marginBottom: 12 }}>FRIENDS</p>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingRight: 24, paddingBottom: 4 }}>
          {friends.length === 0 && (
            <p style={{ fontSize: 13, color: "#ccc", margin: 0, padding: "8px 0" }}>친구를 추가해봐요</p>
          )}
          {friends.map((f) => (
            <button
              key={f.uid}
              onClick={() => router.push("/avatar")}
              style={{ border: "none", background: "none", padding: 0, cursor: "pointer", flexShrink: 0, textAlign: "center" }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                boxShadow: "0 4px 14px rgba(244,162,97,0.25)",
                overflow: "hidden", marginBottom: 6,
              }}>
                <TextAvatar nickname={f.nickname} size={52} profileImage={f.profileImage} />
              </div>
              <p style={{ fontSize: 11, color: "#7a5c4a", fontWeight: 600, margin: 0, maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.nickname}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 빠른 메뉴 */}
      <div style={{ margin: "28px 24px 0" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#f4a261", letterSpacing: 1, marginBottom: 12 }}>MENU</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { href: "/avatar",     icon: "💬", label: "1:1 채팅",   sub: "친구와 대화해요" },
            { href: "/groupchat",  icon: "👥", label: "단체 채팅",   sub: "여럿이 함께해요" },
            { href: "/diary",      icon: "📔", label: "미니 다이어리", sub: "오늘 하루를 기록해요" },
            { href: "/friendmenu", icon: "🤝", label: "친구 목록",   sub: "친구를 관리해요" },
          ].map(({ href, icon, label, sub }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                background: "#fff",
                borderRadius: 20, padding: "14px 18px",
                border: "none", cursor: "pointer", textAlign: "left",
                boxShadow: "0 2px 12px rgba(244,162,97,0.10)",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, #FFD580, #FF9A8B)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>{icon}</div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#2d1a0e", margin: 0 }}>{label}</p>
                <p style={{ fontSize: 12, color: "#c9a08a", margin: "2px 0 0", fontWeight: 500 }}>{sub}</p>
              </div>
              <div style={{
                marginLeft: "auto", width: 28, height: 28, borderRadius: "50%",
                background: "#fff5ee", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#f4a261", fontSize: 16, flexShrink: 0,
              }}>›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
