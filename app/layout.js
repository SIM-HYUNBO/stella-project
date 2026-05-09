// app/layout.js

import "./globals.css";

import {
  Jua,
  Dongle,
  Do_Hyeon,
  Gaegu,
  Gowun_Dodum,
  Hi_Melody,
  Poor_Story,
  Black_Han_Sans,
} from "next/font/google";

const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-jua",
});

const dongle = Dongle({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-dongle",
});

const dohyeon = Do_Hyeon({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dohyeon",
});

const gaegu = Gaegu({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-gaegu",
});

const gowun = Gowun_Dodum({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gowun",
});

const himelody = Hi_Melody({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-himelody",
});

const poorstory = Poor_Story({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-poorstory",
});

const blackhan = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-blackhan",
});

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`
        ${jua.variable}
        ${dongle.variable}
        ${dohyeon.variable}
        ${gaegu.variable}
        ${gowun.variable}
        ${himelody.variable}
        ${poorstory.variable}
        ${blackhan.variable}
      `}
    >
      <body>{children}</body>
    </html>
  );
}