"use client";

import { useEffect, useRef } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

type Props = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
      display: "flex", justifyContent: "center",
      animation: "slideUp 0.2s ease",
    }}>
      <Picker
        data={data}
        locale="ko"
        onEmojiSelect={(e: any) => onSelect(e.native)}
        theme="light"
        previewPosition="none"
        skinTonePosition="none"
        set="apple"
        perLine={8}
        emojiSize={28}
        emojiButtonSize={40}
      />
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        em-emoji-picker { width: 100% !important; max-width: 100% !important; border-radius: 20px 20px 0 0 !important; box-shadow: 0 -4px 24px rgba(0,0,0,0.12) !important; }
      `}</style>
    </div>
  );
}
