import localFont from "next/font/local";
import {
  Noto_Sans_KR,
  JetBrains_Mono,
  Do_Hyeon,
  Nanum_Brush_Script,
} from "next/font/google";

import { ThemeProvider } from "next-themes";
import { FontProvider } from "./FontContext";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import FCMToken from "@/components/FCMToken";
import BirthdayNotification from "@/components/BirthdayNotification";

import "./globals.css";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
});

const noto = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

const doHyeon = Do_Hyeon({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dohyeon",
});

const brush = Nanum_Brush_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-brush",
});

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`
          ${geist.variable}
          ${noto.variable}
          ${mono.variable}
          ${doHyeon.variable}
          ${brush.variable}
          antialiased
        `}
      >
        <ThemeProvider attribute="class" enableSystem={false}>
          <FontProvider>

            {/* 서비스 워커 */}
            <ServiceWorkerRegister />

            {/* FCM 초기화 */}
            <FCMToken />

            {/* 생일 알림 */}
            <BirthdayNotification />

            {children}

          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}