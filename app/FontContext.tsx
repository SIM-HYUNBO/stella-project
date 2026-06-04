"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const FontContext = createContext(null);
const STORAGE_KEY = "wagie-font";
const SIZE_KEY = "wagie-font-size";

const DEFAULT_FONT = "var(--font-geist)";
const DEFAULT_SIZE = 16;

export function FontProvider({ children }) {
  const [font, setFont] = useState(DEFAULT_FONT);
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedFont = localStorage.getItem(STORAGE_KEY);
    if (savedFont) setFont(savedFont);
    const savedSize = localStorage.getItem(SIZE_KEY);
    if (savedSize) setFontSize(Number(savedSize));
    setMounted(true);
  }, []);

  const changeFont = (value: string) => {
    setFont(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const changeFontSize = (value: number) => {
    setFontSize(value);
    localStorage.setItem(SIZE_KEY, String(value));
  };

  if (!mounted) return null;

  return (
    <FontContext.Provider value={{ font, changeFont, fontSize, changeFontSize }}>
      <div style={{ fontFamily: font, fontSize: `${fontSize}px`, minHeight: "100vh" }}>
        {children}
      </div>
    </FontContext.Provider>
  );
}

export function useFont() {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error("FontProvider 밖에서 useFont 사용");
  return ctx as { font: string; changeFont: (v: string) => void; fontSize: number; changeFontSize: (v: number) => void };
}
