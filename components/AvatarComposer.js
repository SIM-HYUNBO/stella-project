"use client";

import { useState } from "react";

export default function AvatarComposer() {
  const [hair, setHair] = useState("hair1.png");
  const [clothes, setClothes] = useState("cloth1.png");

  return (
    <div className="flex gap-10">
      {/* 아바타 화면 */}
      <div className="relative w-64 h-64 bg-gray-100 rounded-xl overflow-hidden">
        {/* Base */}
        <img
          src="/avatar/base.png"
          className="absolute top-0 left-0 w-full h-full object-contain"
        />

        {/* Hair */}
        <img
          src={`/avatar/hair/${hair}`}
          className="absolute top-0 left-0 w-full h-full object-contain"
        />

        {/* Clothes */}
        <img
          src={`/avatar/clothes/${clothes}`}
          className="absolute top-0 left-0 w-full h-full object-contain"
        />
      </div>

      {/* 선택 메뉴 */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold">헤어 선택</h3>
          <button onClick={() => setHair("hair1.png")}>헤어 1</button>
          <button onClick={() => setHair("hair2.png")}>헤어 2</button>
        </div>

        <div>
          <h3 className="font-bold">옷 선택</h3>
          <button onClick={() => setClothes("cloth1.png")}>옷 1</button>
          <button onClick={() => setClothes("cloth2.png")}>옷 2</button>
        </div>
      </div>
    </div>
  );
}
