import { auth } from "@/app/firebase";

export async function apiFetch(url: string, options: RequestInit = {}) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw Error("로그인이 필요해. 다시 로그인해 줘.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...options, headers });
}

export function playSendSound() {
  if (localStorage.getItem("soundEnabled") === "false") return;
  new Audio("/sounds/alert1.mp3").play().catch(() => {});
}
