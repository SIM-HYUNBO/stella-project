import type { CSSProperties } from "react";

const CHARACTERS: Record<string, string> = {
  sky: "duck", violet: "cat", pink: "rabbit", mint: "frog", peach: "bear",
};

/** A non-interactive wallpaper painted behind messages, fixed within the scroll viewport. */
export default function chatCharacterBackground(theme: string, background: string): CSSProperties {
  const character = CHARACTERS[theme] || CHARACTERS.sky;
  return {
    backgroundColor: background,
    backgroundImage: `linear-gradient(${background}D9, ${background}D9), url("/chat-characters/${character}.png")`,
    backgroundSize: "100% 100%, min(72%, 340px) auto",
    backgroundPosition: "center, center 60%",
    backgroundRepeat: "no-repeat",
    backgroundBlendMode: "normal, multiply",
    backgroundAttachment: "scroll",
  };
}
