"use client";

import Image from "next/image";

interface Props {
  nickname: string;
  size?: number;
  profileImage?: string | null;
  fill?: boolean;
}

export default function TextAvatar({ nickname, size = 40, profileImage, fill = false }: Props) {
  const initials = nickname?.slice(0, 2) || "유저";

  if (fill) {
    return profileImage ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profileImage} alt="profile" className="w-full h-full object-cover rounded-full" />
    ) : (
      <div className="w-full h-full rounded-full bg-sky-500 text-white font-bold flex items-center justify-center text-sm">
        {initials}
      </div>
    );
  }

  const style = { width: size, height: size, fontSize: size * 0.45 };

  return profileImage ? (
    <Image src={profileImage} alt="profile" width={size} height={size} className="rounded-full object-cover" />
  ) : (
    <div className="rounded-full bg-sky-500 text-white font-bold flex items-center justify-center" style={style}>
      {initials}
    </div>
  );
}
