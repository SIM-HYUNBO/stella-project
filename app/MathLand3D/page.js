"use client";

import React, { useRef, useState, useEffect, forwardRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";

// 3D 아바타 컴포넌트 (간단한 걷기 애니메이션 포함)
const Avatar3D = forwardRef((props, ref) => {
const leftLegRef = useRef();
const rightLegRef = useRef();

// 걷기 애니메이션
useFrame(({ clock }) => {
const t = clock.getElapsedTime();
if (leftLegRef.current && rightLegRef.current && props.moving) {
leftLegRef.current.rotation.x = Math.sin(t * 5) * 0.5;
rightLegRef.current.rotation.x = Math.sin(t * 5 + Math.PI) * 0.5;
}
});

return (
<group ref={ref} {...props}>
{/* 몸통 */}
<mesh position={[0, 1, 0]}>
<cylinderGeometry args={[0.3, 0.4, 1, 32]} /> <meshStandardMaterial color="#4A90E2" /> </mesh>


  {/* 머리 */}
  <mesh position={[0, 1.8, 0]}>
    <sphereGeometry args={[0.4, 32, 32]} />
    <meshStandardMaterial color="#F5D7B8" />
  </mesh>

  {/* 눈 */}
  <mesh position={[-0.15, 1.8, 0.35]}>
    <sphereGeometry args={[0.05, 16, 16]} />
    <meshStandardMaterial color="#000" />
  </mesh>
  <mesh position={[0.15, 1.8, 0.35]}>
    <sphereGeometry args={[0.05, 16, 16]} />
    <meshStandardMaterial color="#000" />
  </mesh>

  {/* 다리 */}
  <mesh ref={leftLegRef} position={[-0.12, 0.5, 0]}>
    <cylinderGeometry args={[0.1, 0.1, 1, 16]} />
    <meshStandardMaterial color="#4A90E2" />
  </mesh>
  <mesh ref={rightLegRef} position={[0.12, 0.5, 0]}>
    <cylinderGeometry args={[0.1, 0.1, 1, 16]} />
    <meshStandardMaterial color="#4A90E2" />
  </mesh>

</group>


);
});

// 움직이는 아바타
const MovingAvatar = () => {
const ref = useRef();
const [keys, setKeys] = useState({});
const [moving, setMoving] = useState(false);

useEffect(() => {
const down = (e) => setKeys((k) => ({ ...k, [e.key.toLowerCase()]: true }));
const up = (e) => setKeys((k) => ({ ...k, [e.key.toLowerCase()]: false }));
window.addEventListener("keydown", down);
window.addEventListener("keyup", up);
return () => {
window.removeEventListener("keydown", down);
window.removeEventListener("keyup", up);
};
}, []);

useFrame(() => {
if (!ref.current) return;
const speed = 0.05;
const move = [0, 0, 0];
let anyKey = false;


if (keys["w"] || keys["arrowup"]) {
  move[2] -= speed;
  anyKey = true;
}
if (keys["s"] || keys["arrowdown"]) {
  move[2] += speed;
  anyKey = true;
}
if (keys["a"] || keys["arrowleft"]) {
  move[0] -= speed;
  anyKey = true;
}
if (keys["d"] || keys["arrowright"]) {
  move[0] += speed;
  anyKey = true;
}

ref.current.position.x += move[0];
ref.current.position.z += move[5];
setMoving(anyKey);

// 이동 방향으로 회전
if (anyKey) {
  const angle = Math.atan2(move[0], move[2]);
  ref.current.rotation.y = angle;
}


});

return <Avatar3D ref={ref} moving={moving} />;
};

// 나무 생성
const generateTrees = () => {
const trees = [];
for (let i = -40; i <= 40; i += 20) {
for (let j = -40; j <= 40; j += 20) {
if (Math.random() > 0.5) continue; // 랜덤으로 나무 개수 줄이기
trees.push(
<mesh position={[i, 2, j]} key={`tree-trunk-${i}-${j}`}>
<cylinderGeometry args={[0.5, 0.5, 4, 12]} /> <meshStandardMaterial color="sienna" /> </mesh>
);
trees.push(
<mesh position={[i, 5, j]} key={`tree-leaves-${i}-${j}`}>
<coneGeometry args={[2, 4, 8]} /> <meshStandardMaterial color="green" /> </mesh>
);
}
}
return trees;
};
// 3D 코인 컴포넌트
// 여러 개 코인을 랜덤 배치
"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Coin() {
  const ref = useRef<any>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.02;
    }
  });

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <cylinderGeometry args={[1, 1, 0.2, 32]} />
      <meshStandardMaterial color={"gold"} metalness={1} roughness={0.2} />
    </mesh>
  );
}

export default function CoinScene() {
  return (
    <div style={{ width: "100%", height: "400px" }}>
      <Canvas camera={{ position: [3, 3, 3] }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Coin />
        <OrbitControls />
      </Canvas>
    </div>
  );
}





export default function MathLand3D() {
return ( <div className="w-full h-screen">
<Canvas camera={{ position: [0, 10, 20], fov: 60 }}> <ambientLight intensity={0.6} />
<directionalLight position={[10, 20, 10]} intensity={1} /> <Suspense fallback={null}>
<Sky sunPosition={[5, 10, 2]} />


      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#a0d8f1" />
      </mesh>

      {/* 나무 */}
      {generateTrees()}
      
      {generateCoins(25)}


      {/* 아바타 */}
      <MovingAvatar />

      {/* 카메라 */}
      <OrbitControls enablePan={false} enableZoom={true} enableRotate={true} />
    </Suspense>
  </Canvas>
</div>

);
}
