import localFont from "next/font/local";
import { Do_Hyeon, Nanum_Brush_Script } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const doHyeon = Do_Hyeon({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dohyeon",
});

const nanumBrush = Nanum_Brush_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-nanum-brush",
});

export const metadata = {
  title: "WAGIE",
  description: "wagie",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${doHyeon.variable} ${nanumBrush.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"     // ⭐ 기본 다크모드
          enableSystem={false}    // 시스템 설정 무시
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}