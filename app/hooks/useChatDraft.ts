"use client";

import { useEffect, useRef, useState } from "react";

export function useChatDraft(kind: "dm" | "group" | "meeting" | "spy", uid?: string | null, roomId?: string | null) {
  const key = uid && roomId ? `wagie:draft:${JSON.stringify([uid, kind, roomId])}` : null;
  const cache = useRef(new Map<string, string>());
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const get = (id: string) => {
    const memory = cache.current.get(id);
    if (memory !== undefined) return memory;
    try { return localStorage.getItem(id) ?? ""; } catch { return ""; }
  };

  useEffect(() => {
    if (!key) return;
    const text = cache.current.get(key) ?? (() => {
      try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
    })();
    setDrafts(previous => ({ ...previous, [key]: text }));
  }, [key]);

  const setInput = (text: string) => {
    if (!key) return;
    cache.current.set(key, text);
    setDrafts(previous => ({ ...previous, [key]: text }));
    try {
      if (text) localStorage.setItem(key, text);
      else localStorage.removeItem(key);
    } catch { /* Keep editing possible if storage is unavailable. */ }
  };

  const clearSentDraft = (sentInput: string) => {
    if (key && get(key) === sentInput) setInput("");
  };

  return { input: key ? drafts[key] ?? "" : "", setInput, clearSentDraft };
}
