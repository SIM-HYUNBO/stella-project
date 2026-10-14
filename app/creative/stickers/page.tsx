"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StickerStudio from "@/components/StickerStudio";

export default function StickersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <StickerStudio onClose={() => router.push("/creative")} /> : null;
}
