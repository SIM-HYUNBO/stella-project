"use client";

import { useState, useEffect } from "react";
import AppPinScreen from "./AppPinScreen";

interface Props {
  onUnlock: () => void;
}

export default function AppLock({ onUnlock }: Props) {
  const [pin, setPin] = useState("");
  const [stored, setStored] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setStored(localStorage.getItem("appLockPin") || "");
  }, []);

  const press = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      setTimeout(() => {
        if (next === stored) {
          sessionStorage.setItem("appLockUnlocked", "true");
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => { setPin(""); }, 600);
        }
      }, 100);
    }
  };

  const del = () => { setPin((p) => p.slice(0, -1)); setError(false); };

  return <AppPinScreen title="앱 비밀번호" description="설정한 비밀번호 4자리를 입력해 줘." count={pin.length}
    error={error ? "비밀번호가 틀렸어. 다시 입력해 줘." : undefined} onDigit={press} onDelete={del} />;
}
