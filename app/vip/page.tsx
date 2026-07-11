"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/app/firebase";

const FEATURES = [
  { label: "1:1 채팅", basic: true, vip: true },
  { label: "그룹 채팅", basic: true, vip: true },
  { label: "개인 AI 챗봇", basic: true, vip: true },
  { label: "친구 & 오픈채팅", basic: true, vip: true },
  { label: "회의방", basic: true, vip: true },
  { label: "학습용 AI 🎓", basic: false, vip: true },
  { label: "AI 프로필 생성기 🎨", basic: false, vip: true },
  { label: "VIP 왕관 뱃지 👑", basic: false, vip: true },
];

export default function VIPPage() {
  const router = useRouter();
  const [isVIP, setIsVIP] = useState<boolean | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      setIsVIP(snap.data()?.isVIP === true);
    });
    return () => unsub();
  }, [router]);

  const subscribe = async () => {
    if (!uid || loading) return;
    setLoading(true);
    await updateDoc(doc(db, "users", uid), { isVIP: true });
    setIsVIP(true);
    setDone(true);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #fffbea 0%, #fff9d6 40%, #fffde7 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "0 0 48px",
    }}>
      {/* 헤더 */}
      <div style={{
        width: "100%",
        background: "linear-gradient(135deg, #f5c842 0%, #e8a000 100%)",
        padding: "52px 24px 32px",
        display: "flex", flexDirection: "column", alignItems: "center",
        position: "relative",
      }}>
        <button onClick={() => router.back()} style={{
          position: "absolute", top: 16, left: 16,
          width: 38, height: 38, borderRadius: 13,
          background: "rgba(255,255,255,0.3)",
          border: "1.5px solid rgba(255,255,255,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 17, color: "#fff",
        }}>←</button>

        <div style={{ fontSize: 52, marginBottom: 10 }}>👑</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0, textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          WAGIE VIP
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 6, fontWeight: 600 }}>
          더 많은 기능을 즐겨봐요
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px" }}>
        {/* 이미 VIP인 경우 */}
        {isVIP === true && (
          <div style={{
            marginTop: 28,
            background: "linear-gradient(135deg, #fff9e0, #fff3cc)",
            border: "2px solid #f5c842",
            borderRadius: 20, padding: "20px 24px",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontSize: 32 }}>👑</span>
            <div>
              <p style={{ fontWeight: 900, color: "#b8860b", fontSize: 16, margin: 0 }}>현재 VIP 구독 중이에요!</p>
              <p style={{ color: "#c9a000", fontSize: 13, marginTop: 4, margin: 0 }}>모든 기능을 자유롭게 사용할 수 있어요</p>
            </div>
          </div>
        )}

        {/* 기능 비교표 */}
        <div style={{ marginTop: 28 }}>
          <div style={{
            background: "#fff",
            borderRadius: 24,
            border: "1.5px solid #f0e8c8",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}>
            {/* 컬럼 헤더 */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 80px 80px",
              padding: "14px 20px",
              background: "#fafafa",
              borderBottom: "1.5px solid #f0e8c8",
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#aaa" }}>기능</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#aaa", textAlign: "center" }}>Basic</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#b8860b", textAlign: "center" }}>👑 VIP</span>
            </div>

            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 80px 80px",
                padding: "13px 20px",
                borderBottom: i < FEATURES.length - 1 ? "1px solid #f5f0e0" : "none",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{f.label}</span>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {f.basic
                    ? <span style={{ color: "#4caf50", fontSize: 18, fontWeight: 900 }}>✓</span>
                    : <span style={{ color: "#ddd", fontSize: 18 }}>—</span>
                  }
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{ color: "#f5a623", fontSize: 18, fontWeight: 900 }}>✓</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 구독 버튼 */}
        {isVIP === false && (
          <div style={{ marginTop: 28 }}>
            {done ? (
              <div style={{
                textAlign: "center", padding: "24px",
                background: "linear-gradient(135deg, #fff9e0, #fff3cc)",
                borderRadius: 20, border: "2px solid #f5c842",
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                <p style={{ fontWeight: 900, color: "#b8860b", fontSize: 17, margin: 0 }}>VIP가 됐어요!</p>
                <p style={{ color: "#c9a000", fontSize: 13, marginTop: 6 }}>이제 모든 기능을 사용할 수 있어요</p>
                <button
                  onClick={() => router.back()}
                  style={{
                    marginTop: 16, padding: "12px 32px",
                    background: "linear-gradient(135deg, #f5c842, #e8a000)",
                    border: "none", borderRadius: 14,
                    color: "#fff", fontWeight: 900, fontSize: 15,
                    cursor: "pointer",
                  }}
                >돌아가기</button>
              </div>
            ) : (
              <button
                onClick={subscribe}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "18px",
                  background: loading ? "#e0d080" : "linear-gradient(135deg, #f5c842 0%, #e8a000 100%)",
                  border: "none", borderRadius: 20,
                  color: "#fff", fontWeight: 900, fontSize: 18,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 28px rgba(245,200,66,0.40)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "transform 0.1s",
                }}
              >
                {loading ? "처리 중..." : (
                  <>
                    <span>👑</span>
                    <span>₩2,900 / 월 구독하기</span>
                  </>
                )}
              </button>
            )}
            <p style={{
              textAlign: "center", fontSize: 11, color: "#bbb",
              marginTop: 12, lineHeight: 1.5,
            }}>
              언제든지 해지 가능 · 자동 결제
            </p>
          </div>
        )}

        {isVIP === true && !done && (
          <button
            onClick={() => router.back()}
            style={{
              marginTop: 24, width: "100%", padding: "16px",
              background: "linear-gradient(135deg, #f5c842, #e8a000)",
              border: "none", borderRadius: 18,
              color: "#fff", fontWeight: 900, fontSize: 16,
              cursor: "pointer",
            }}
          >돌아가기</button>
        )}
      </div>
    </div>
  );
}
