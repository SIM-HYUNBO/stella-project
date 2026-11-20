"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase";
import { flushChatKingMessages } from "@/lib/event-chat-document";

export default function ChatKingSync() {
  useEffect(() => {
    const flush = () => { void flushChatKingMessages(); };
    const unsub = onAuthStateChanged(auth, flush);
    const timer = window.setInterval(flush, 60000);
    window.addEventListener("online", flush);
    window.addEventListener("focus", flush);
    return () => { unsub(); window.clearInterval(timer); window.removeEventListener("online", flush); window.removeEventListener("focus", flush); };
  }, []);
  return null;
}
