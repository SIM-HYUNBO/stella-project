"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, addDoc, doc, getDoc,
} from "firebase/firestore";

export default function AddFriendPage() {
  const params = useParams();
  const router = useRouter();
  const targetNickname = decodeURIComponent(params.nickname as string);

  const [myUid, setMyUid] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState("");
  const [target, setTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "already" | "self">("idle");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setMyUid(user.uid);

      const mySnap = await getDoc(doc(db, "users", user.uid));
      const myData = mySnap.data();
      setMyNickname(myData?.nickname ?? "");

      const q = query(collection(db, "users"), where("nickname", "==", targetNickname));
      const snap = await getDocs(q);
      if (snap.empty) { setTarget(null); setLoading(false); return; }
      const d = snap.docs[0];
      if (d.id === user.uid) { setStatus("self"); setTarget({ uid: d.id, ...d.data() }); setLoading(false); return; }

      const friendQ = query(collection(db, "friends"), where("users", "array-contains", user.uid));
      const friendSnap = await getDocs(friendQ);
      const isFriend = friendSnap.docs.some((fd) => fd.data().users.includes(d.id));
      if (isFriend) { setStatus("already"); }

      const reqQ = query(collection(db, "friend_requests"), where("from", "==", user.uid), where("to", "==", d.id), where("status", "==", "pending"));
      const reqSnap = await getDocs(reqQ);
      if (!reqSnap.empty) setStatus("already");

      setTarget({ uid: d.id, ...d.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [targetNickname, router]);

  const sendRequest = async () => {
    if (!myUid || !target || status !== "idle") return;
    setStatus("sending");
    await addDoc(collection(db, "friend_requests"), {
      from: myUid, fromNickname: myNickname,
      to: target.uid, toNickname: target.nickname,
      status: "pending", createdAt: Date.now(),
    });
    fetch("/api/fcm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toNicknames: target.nickname, fromNickname: myNickname, message: "친구 요청이 도착했어요! 👋" }),
    }).catch(() => {});
    setStatus("done");
  };

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f9ff" }}>
      <img src="/wag.png" alt="loading" style={{ width: 52, height: 52, animation: "bounce 0.9s infinite" }} />
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  );

  return (
    <div style={{
      minHeight: "100dvh", background: "linear-gradient(160deg, #e0f2fe 0%, #f0f9ff 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 24px",
    }}>
      <div style={{
        width: "100%", maxWidth: 360,
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)",
        borderRadius: 28, border: "1.5px solid rgba(255,255,255,0.95)",
        boxShadow: "0 12px 48px rgba(14,165,233,0.12)",
        padding: "36px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
      }}>
        {!target ? (
          <>
            <span style={{ fontSize: 56 }}>🔍</span>
            <p style={{ fontWeight: 900, fontSize: 18, color: "#0f172a", margin: 0 }}>유저를 찾을 수 없어요</p>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>&quot;{targetNickname}&quot; 닉네임의 유저가 없어요.</p>
            <button onClick={() => router.replace("/home")} style={{
              width: "100%", height: 48, borderRadius: 18,
              background: "#0ea5e9", color: "#fff", fontWeight: 900, fontSize: 14,
              border: "none", cursor: "pointer",
            }}>홈으로</button>
          </>
        ) : (
          <>
            <div style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "linear-gradient(135deg, #38bdf8, #818cf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, boxShadow: "0 8px 24px rgba(56,189,248,0.3)",
            }}>
              {target.profileImage
                ? <img src={target.profileImage} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                : (target.nickname?.[0] ?? "?")
              }
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 900, fontSize: 20, color: "#0f172a", margin: 0 }}>{target.nickname}</p>
              {target.status && <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>{target.status}</p>}
            </div>

            {status === "self" && (
              <p style={{ fontSize: 14, color: "#94a3b8", fontWeight: 700, textAlign: "center" }}>내 QR코드예요 😄</p>
            )}
            {status === "already" && (
              <p style={{ fontSize: 14, color: "#22c55e", fontWeight: 700, textAlign: "center" }}>이미 친구이거나 요청을 보냈어요 ✓</p>
            )}
            {status === "done" && (
              <p style={{ fontSize: 14, color: "#0ea5e9", fontWeight: 700, textAlign: "center" }}>친구 요청을 보냈어요! 🎉</p>
            )}

            {(status === "idle" || status === "sending") && (
              <button onClick={sendRequest} disabled={status === "sending"} style={{
                width: "100%", height: 52, borderRadius: 18,
                background: status === "sending" ? "#e0f2fe" : "linear-gradient(135deg, #38bdf8, #818cf8)",
                color: status === "sending" ? "#94a3b8" : "#fff",
                fontWeight: 900, fontSize: 15, border: "none", cursor: status === "sending" ? "default" : "pointer",
                boxShadow: status === "sending" ? "none" : "0 6px 20px rgba(56,189,248,0.35)",
                transition: "all 0.2s",
              }}>
                {status === "sending" ? "전송 중..." : "친구 요청 보내기 👋"}
              </button>
            )}

            <button onClick={() => router.replace("/home")} style={{
              width: "100%", height: 44, borderRadius: 16,
              background: "transparent", color: "#94a3b8",
              fontWeight: 700, fontSize: 13, border: "1.5px solid #e2e8f0", cursor: "pointer",
            }}>홈으로</button>
          </>
        )}
      </div>
    </div>
  );
}
