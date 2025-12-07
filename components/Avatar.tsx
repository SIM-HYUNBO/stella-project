"use client";

import React from "react";

export type AvatarProps = {
  skin?: string;
  hair?: string;
  eyes?: string;
  clothes?: string;
  accessory?: string;
  width?: number;
};

const defaultSkin = "#F5D7B8";
const defaultHair = "#3B2F2F";
const defaultEyes = "#000000";
const defaultClothes = "#4A90E2";
const defaultAccessory = "none";

export const Avatar: React.FC<AvatarProps> = ({
  skin = defaultSkin,
  hair = defaultHair,
  eyes = defaultEyes,
  clothes = defaultClothes,
  accessory = defaultAccessory,
  width = 200
}) => {
  return (
    <svg
      width={width}
      viewBox="0 0 200 300"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 얼굴 */}
      <circle cx="100" cy="90" r="50" fill={skin} />

      {/* 눈 */}
      <circle cx="80" cy="85" r="5" fill={eyes} />
      <circle cx="120" cy="85" r="5" fill={eyes} />

      {/* 머리 */}
      <path d="M50 70 Q100 10 150 70" fill={hair} />

      {/* 몸 (옷) */}
      <rect x="60" y="140" width="80" height="120" rx="15" fill={clothes} />

      {/* 액세서리 */}
      {accessory === "glasses" && (
        <>
          <circle cx="80" cy="85" r="12" fill="none" stroke="#333" strokeWidth="3" />
          <circle cx="120" cy="85" r="12" fill="none" stroke="#333" strokeWidth="3" />
          <line x1="92" y1="85" x2="108" y2="85" stroke="#333" strokeWidth="3" />
        </>
      )}
      {accessory === "ribbon" && (
        <polygon points="100,45 85,65 115,65" fill="pink" />
      )}
    </svg>
  );
};

export default Avatar;