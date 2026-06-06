"use client";

import Image from "next/image";

interface Props {
  nickname: string;
  size?: number;
  profileImage?: string | null;
}

export default function TextAvatar({ nickname, size = 40, profileImage }: Props) {
  const initials = nickname?.slice(0, 2) || "유저";
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.45,
  };

  return profileImage ? (
    <Image
      src={profileImage}
      alt="profile"
      width={size}
      height={size}
      className="rounded-full object-cover"
    />
  ) : (
    <div
      className="rounded-full bg-orange-400 text-white font-bold flex items-center justify-center"
      style={style}
    >
      {initials}
    </div>
  );
}
