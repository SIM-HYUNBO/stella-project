export const metadata = {
  title: "WAGIE",
  manifest: "/manifest.json",
  icons: {
    icon: "/app-icons/duck-cap-32.png",
    apple: "/app-icons/duck-cap-180.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: "no",
};

import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { FontProvider } from "./FontContext";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import FCMToken from "@/components/FCMToken";
import AppBadge from "@/components/AppBadge";
import BirthdayNotification from "@/components/BirthdayNotification";
import FriendRequestPopup from "@/components/FriendRequestPopup";
import RoomInvitePopup from "@/components/RoomInvitePopup";
import IncomingVideoCall from "@/components/IncomingVideoCall";

import "./globals.css";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
});

const noto = localFont({
  src: "./fonts/google/NotoSansKR-Variable.ttf", weight: "100 900", display: "swap", preload: false, variable: "--font-noto",
});
const mono = localFont({
  src: "./fonts/google/JetBrainsMono-Variable.ttf", weight: "100 800", display: "swap", preload: false, variable: "--font-mono",
});
const doHyeon = localFont({
  src: "./fonts/google/DoHyeon-Regular.ttf", weight: "400", display: "swap", preload: false, variable: "--font-dohyeon",
});
const brush = localFont({
  src: "./fonts/google/NanumBrushScript-Regular.ttf", weight: "400", display: "swap", preload: false, variable: "--font-brush",
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

            {/* 앱 아이콘 배지 */}
            <AppBadge />

            {/* 생일 알림 */}
            <BirthdayNotification />

            {/* 친구 요청 팝업 */}
            <FriendRequestPopup />

            {/* 채팅방 초대 팝업 */}
            <RoomInvitePopup />
            <IncomingVideoCall />

            {children}

          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
