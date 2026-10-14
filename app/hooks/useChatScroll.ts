"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

type ChatMessage = { id: string; from: string };

/** Follow new messages only while the reader is at the bottom. */
export default function useChatScroll(roomKey: string | undefined, messages: ChatMessage[], nickname: string | null, paused = false) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const initialized = useRef(false);
  const previousIds = useRef(new Set<string>());
  const pendingIds = useRef(new Set<string>());
  const [away, setAway] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const goToLatest = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    following.current = true;
    pendingIds.current.clear();
    setAway(false);
    setNewCount(0);
    viewport.scrollTop = viewport.scrollHeight;
  }, []);

  const onScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
    following.current = atBottom;
    setAway(!atBottom);
    if (atBottom) {
      pendingIds.current.clear();
      setNewCount(0);
    }
  }, []);

  useLayoutEffect(() => {
    following.current = true;
    initialized.current = false;
    previousIds.current.clear();
    pendingIds.current.clear();
    setAway(false);
    setNewCount(0);
  }, [roomKey]);

  useLayoutEffect(() => {
    if (!roomKey || paused) return;
    const ids = new Set(messages.map(message => message.id));
    const added = messages.filter(message => !previousIds.current.has(message.id));
    if (!initialized.current || following.current || added.some(message => message.from === nickname)) {
      goToLatest();
    } else {
      pendingIds.current.forEach(id => { if (!ids.has(id)) pendingIds.current.delete(id); });
      for (const message of added) pendingIds.current.add(message.id);
      setNewCount(pendingIds.current.size);
    }
    initialized.current = messages.length > 0;
    previousIds.current = ids;
  }, [roomKey, messages, nickname, paused, goToLatest]);

  useLayoutEffect(() => {
    if (!roomKey || paused || !viewportRef.current || !contentRef.current) return;
    // Images loading and typing indicators also change the content height.
    const observer = new ResizeObserver(() => {
      if (following.current) goToLatest();
    });
    observer.observe(viewportRef.current);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [roomKey, paused, goToLatest]);

  return { viewportRef, contentRef, onScroll, goToLatest, away, newCount };
}
