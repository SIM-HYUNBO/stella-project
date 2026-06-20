"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type SeasonName = "default" | "spring" | "summer" | "autumn" | "winter";

interface SeasonContextType {
  season: SeasonName;
  changeSeason: (s: SeasonName) => void;
}

const SeasonContext = createContext<SeasonContextType | null>(null);
const STORAGE_KEY = "wagie-season";

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<SeasonName>("default");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as SeasonName | null;
    const initial = saved ?? "default";
    setSeason(initial);
    document.documentElement.setAttribute("data-season", initial);
  }, []);

  const changeSeason = (s: SeasonName) => {
    setSeason(s);
    localStorage.setItem(STORAGE_KEY, s);
    document.documentElement.setAttribute("data-season", s);
  };

  return (
    <SeasonContext.Provider value={{ season, changeSeason }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error("SeasonProvider 밖에서 useSeason 사용");
  return ctx;
}
