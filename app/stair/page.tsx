"use client";

import React, { useEffect, useRef, useState } from "react";

const FullscreenFlashlightMazeMobile: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const map = [
    "####################",
    "#S       #        E#",
    "# ###### # ######  #",
    "#        #         #",
    "# ####### ####### ##",
    "#       #     #    #",
    "# ####### ##### ####",
    "#                  #",
    "####################"
  ];

  const rows = map.length;
  const cols = map[0].length;

  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [tileSize, setTileSize] = useState(40);
  const [showFullMap, setShowFullMap] = useState(false);
  const [escaped, setEscaped] = useState(false);

  const keys = useRef<{ [key: string]: boolean }>({});

  // 키보드 입력 (PC용)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 화면 크기 조정
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setTileSize(Math.min(canvas.width / cols, canvas.height / rows));
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const gameLoop = () => {
      update();
      draw(ctx);
      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
  }, [player, tileSize, showFullMap, escaped]);

  const update = () => {
    if (showFullMap || escaped) return;

    let newX = player.x;
    let newY = player.y;
    const speed = 0.15;

    if (keys.current["w"]) newY -= speed;
    if (keys.current["s"]) newY += speed;
    if (keys.current["a"]) newX -= speed;
    if (keys.current["d"]) newX += speed;

    if (!isWall(newX, player.y)) player.x = newX;
    if (!isWall(player.x, newY)) player.y = newY;

    setPlayer({ ...player });

    if (map[Math.floor(player.y)][Math.floor(player.x)] === "E") {
      setEscaped(true);
    }
  };

  const isWall = (x: number, y: number) => {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    return map[tileY][tileX] === "#";
  };

  const movePlayer = (dir: "up" | "down" | "left" | "right") => {
    switch (dir) {
      case "up": keys.current["w"] = true; break;
      case "down": keys.current["s"] = true; break;
      case "left": keys.current["a"] = true; break;
      case "right": keys.current["d"] = true; break;
    }
    setTimeout(() => { // 잠시 키 누른 효과
      switch (dir) {
        case "up": keys.current["w"] = false; break;
        case "down": keys.current["s"] = false; break;
        case "left": keys.current["a"] = false; break;
        case "right": keys.current["d"] = false; break;
      }
    }, 100);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = (x + 0.5) * tileSize - player.x * tileSize;
        const dy = (y + 0.5) * tileSize - player.y * tileSize;
        const dist = Math.sqrt(dx * dx + dy * dy) / tileSize;

        if (showFullMap || dist < 5) {
          if (map[y][x] === "#") ctx.fillStyle = "gray";
          else if (map[y][x] === "E") ctx.fillStyle = "gold";
          else ctx.fillStyle = "#222";
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    if (!showFullMap && !escaped) {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(player.x * tileSize + tileSize / 2, player.y * tileSize + tileSize / 2, tileSize / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const resetGame = () => {
    setPlayer({ x: 1, y: 1 });
    setEscaped(false);
    setShowFullMap(false);
  };

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "block" }} />

      {/* 항복 버튼 */}
      <button
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: "10px 20px",
          fontSize: "16px",
          zIndex: 10
        }}
        onClick={() => setShowFullMap(prev => !prev)}
      >
        {showFullMap ? "원래 보기" : "항복! 전체 미로 보기"}
      </button>

      {/* 탈출 성공 메시지 & 다시 하기 버튼 */}
      {escaped && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "30px 50px",
            textAlign: "center",
            borderRadius: "10px",
            zIndex: 20
          }}
        >
          <h1>탈출 성공!</h1>
          <button
            style={{ marginTop: "20px", padding: "10px 20px", fontSize: "16px" }}
            onClick={resetGame}
          >
            다시 하기
          </button>
        </div>
      )}

      {/* 모바일 방향 버튼 */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 10
        }}
      >
        <button style={{ padding: "15px 25px" }} onClick={() => movePlayer("up")}>▲</button>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          <button style={{ padding: "15px 25px" }} onClick={() => movePlayer("left")}>◀</button>
          <button style={{ padding: "15px 25px" }} onClick={() => movePlayer("down")}>▼</button>
          <button style={{ padding: "15px 25px" }} onClick={() => movePlayer("right")}>▶</button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenFlashlightMazeMobile;
