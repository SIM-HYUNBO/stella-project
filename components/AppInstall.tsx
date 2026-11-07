"use client";

import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Download } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

const AppInstallContext = createContext<{
  visible: boolean;
  prompt: InstallPromptEvent | null;
  clearPrompt: () => void;
}>({ visible: false, prompt: null, clearPrompt: () => {} });

export function AppInstallProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const standalone = window.matchMedia("(display-mode: standalone), (display-mode: window-controls-overlay)");
    const updateVisibility = () => {
      const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
      setVisible(!standalone.matches && !iosStandalone);
    };
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setVisible(false);
      setPrompt(null);
    };

    updateVisibility();
    standalone.addEventListener("change", updateVisibility);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      standalone.removeEventListener("change", updateVisibility);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  return (
    <AppInstallContext.Provider value={{ visible, prompt, clearPrompt: () => setPrompt(null) }}>
      {children}
    </AppInstallContext.Provider>
  );
}

function getInstallInstructions() {
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "Safari에서 이 페이지를 열고 공유 → 홈 화면에 추가 → 추가를 눌러 주세요. ‘웹 앱으로 열기’가 보이면 켜 주세요.";
  }
  if (/Android/i.test(navigator.userAgent)) {
    return "브라우저 메뉴(⋮)에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요.";
  }
  if (/Macintosh.*Version\/.*Safari\//.test(navigator.userAgent)) {
    return "Safari의 공유 메뉴에서 ‘Dock에 추가’를 선택해 주세요.";
  }
  return "주소창의 설치 아이콘이나 브라우저 메뉴에서 ‘WAGIE 설치’ 또는 ‘앱 설치’를 선택해 주세요.";
}

export function AppInstallButton() {
  const { visible, prompt, clearPrompt } = useContext(AppInstallContext);
  const [instructions, setInstructions] = useState("");
  const [pending, setPending] = useState(false);
  const instructionsId = useId();

  if (!visible) return null;

  async function handleInstall() {
    if (!prompt) {
      setInstructions(instructions ? "" : getInstallInstructions());
      return;
    }

    setInstructions("");
    setPending(true);
    clearPrompt();
    try {
      await prompt.prompt();
    } catch {
      setInstructions(getInstallInstructions());
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleInstall}
        disabled={pending}
        aria-expanded={prompt ? undefined : Boolean(instructions)}
        aria-controls={instructionsId}
        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-50 disabled:opacity-60"
      >
        <Download size={18} aria-hidden="true" />
        홈 화면에 추가
      </button>
      <p id={instructionsId} role="status" className={instructions ? "mt-2 rounded-xl bg-white p-3 text-sm text-slate-700" : "sr-only"}>
        {instructions}
      </p>
    </div>
  );
}
