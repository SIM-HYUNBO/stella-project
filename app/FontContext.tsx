"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const FontContext = createContext(null);
const STORAGE_KEY = "wagie-font";

const DEFAULT = "var(--font-geist)";

export function FontProvider({ children }) {
  const [font, setFont] = useState(DEFAULT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setFont(saved);
    setMounted(true);
  }, []);

  const changeFont = (value) => {
    setFont(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  if (!mounted) return null;

  return (
    <FontContext.Provider value={{ font, changeFont }}>
      <div style={{ fontFamily: font, minHeight: "100vh" }}>
        {children}
      </div>
    </FontContext.Provider>
  );
}

export function useFont() {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error("FontProvider 밖에서 useFont 사용");
  return ctx;
}