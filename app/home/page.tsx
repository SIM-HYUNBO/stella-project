"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, getDoc, getDocs,
  query, where, onSnapshot,
} from "firebase/firestore";
import HamburgerMenuWithDelete from "@/components/hamburger";
import TextAvatar from "@/components/TextAvatar";
import PageContainer from "@/components/PageContainer";

type Friend = { uid: string; nickname: string; profileImage: string | null };

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [dmUnread, setDmUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);

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

  /* 친구 목록 */
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

  /* 1:1 읽지 않은 메시지 실시간 */
  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "messages"), where("to", "==", nickname));
    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      snap.forEach((d) => {
        const data = d.data();
        if (data.from !== nickname && !data.readBy?.includes(nickname)) count++;
      });
      setDmUnread(count);
    });
    return () => unsub();
  }, [nickname]);

  /* 단체 채팅 읽지 않은 메시지 */
  useEffect(() => {
    if (!nickname) return;
    const q = query(collection(db, "group_rooms"), where("members", "array-contains", nickname));
    const unsub = onSnapshot(q, async (snap) => {
      let total = 0;
      for (const d of snap.docs) {
        const msgSnap = await getDocs(collection(db, "group_rooms", d.id, "messages"));
        msgSnap.forEach((m) => {
          const data = m.data();
          if (data.from !== nickname && !data.readBy?.includes(nickname)) total++;
        });
      }
      setGroupUnread(total);
    });
    return () => unsub();
  }, [nickname]);

  const MENUS = [
    { href: "/avatar",     icon: "💬", label: "1:1 채팅",    sub: "친구와 대화해요",    unread: dmUnread },
    { href: "/groupchat",  icon: "👥", label: "단체 채팅",    sub: "여럿이 함께해요",    unread: groupUnread },
    { href: "/diary",      icon: "📔", label: "미니 다이어리", sub: "오늘 하루를 기록해요", unread: 0 },
    { href: "/friendmenu", icon: "🤝", label: "친구 목록",    sub: "친구를 관리해요",    unread: 0 },
  ];

  return (
    <PageContainer>
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

        {/* 메뉴 */}
        <div style={{ margin: "28px 24px 0" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#f4a261", letterSpacing: 1, marginBottom: 12 }}>MENU</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {MENUS.map(({ href, icon, label, sub, unread }) => (
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
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#2d1a0e", margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 12, color: "#c9a08a", margin: "2px 0 0", fontWeight: 500 }}>{sub}</p>
                </div>
                {unread > 0 && (
                  <div style={{
                    minWidth: 22, height: 22, borderRadius: 999,
                    background: "linear-gradient(135deg, #FF9A8B, #f4a261)",
                    color: "#fff", fontSize: 11, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 6px", flexShrink: 0,
                  }}>
                    {unread > 99 ? "99+" : unread}
                  </div>
                )}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "#fff5ee", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#f4a261", fontSize: 16, flexShrink: 0,
                }}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
