"use client";

import React, { useState } from 'react';

export default function ThreeDTownPage() {
  const [charPos, setCharPos] = useState({ x: 50, y: 60 });

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      position: "relative",
      backgroundColor: "#87CEEB",
      overflow: "hidden"
    }}>
      
      {/* 1. 타운 맵 배경 */}
      <div style={{
        position: "absolute",
        bottom: 0,
        width: "100%",
        height: "50%",
        backgroundColor: "#7CFC00",
        transform: "perspective(500px) rotateX(60deg)",
        transformOrigin: "top", // 기준점을 위로 잡아야 바닥이 제대로 눕습니다
        boxShadow: "inset 0 0 100px rgba(0,0,0,0.1)"
      }} />

      {/* 2. 삭발 귀요미 캐릭터 (iframe) */}
      <div style={{
        position: "absolute",
        left: `${charPos.x}%`,
        top: `${charPos.y}%`,
        transform: "translate(-50%, -80%)", // 발 위치를 조금 더 자연스럽게 조정
        width: "600px",  // 원본 코드의 캔버스 크기(620px)에 맞춰 키워줍니다
        height: "600px", 
        zIndex: 10,
        // pointerEvents: "none"을 일단 삭제했습니다. (이게 있으면 로딩 안 될 때가 있음)
      }}>
        <iframe
          src="/playmobil_v1.html"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "transparent"
          }}
          // iframe 투명도 허용 속성 추가
          allowTransparency={true}
        />
      </div>

      {/* 3. 타운 UI */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        padding: "10px 20px",
        background: "white",
        borderRadius: "20px",
        fontWeight: "bold",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
      }}>
        📍 삭발 귀요미의 3D 타운
      </div>
    </div>
  );
}