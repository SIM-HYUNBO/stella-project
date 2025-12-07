"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState } from "react";

function CuteAvatar({
skin = "#ffe0bd",
hair = "#d2691e",
eyes = "#000",
mouth = "#ff6f91",
clothes = "#ffb6c1",
}) {
const head = new THREE.SphereGeometry(0.75, 32, 32);
const body = new THREE.CapsuleGeometry(0.3, 0.5, 4, 8);
const limb = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12);

const leftEyeRef = useRef();
const rightEyeRef = useRef();

const [blinkTimer, setBlinkTimer] = useState(0);

useFrame((state, delta) => {
setBlinkTimer((prev) => prev + delta);

// 눈 깜빡임 간격 2~5초 랜덤
if (blinkTimer > 2 + Math.random() * 3) {
  leftEyeRef.current.scale.y = 0.1;
  rightEyeRef.current.scale.y = 0.1;

  setTimeout(() => {
    leftEyeRef.current.scale.y = 1;
    rightEyeRef.current.scale.y = 1;
    setBlinkTimer(0);
  }, 150); // 깜빡임 지속시간 0.15초
}


});

return (
<group scale={1.5} position={[0, -0.2, 0]}>
{/* 머리 */}
<mesh geometry={head} position={[0, 1.4, 0]}> <meshStandardMaterial color={skin} /> </mesh>


  {/* 머리 위 헤어 */}
  <mesh position={[0, 1.65, 0]}>
    <sphereGeometry args={[0.5, 16, 16]} />
    <meshStandardMaterial color={hair} />
  </mesh>

  {/* 눈 */}
  <mesh ref={leftEyeRef} position={[-0.25, 1.45, 0.78]}>
    <sphereGeometry args={[0.09, 16, 16]} />
    <meshStandardMaterial color={eyes} />
  </mesh>
  <mesh ref={rightEyeRef} position={[0.25, 1.45, 0.78]}>
    <sphereGeometry args={[0.09, 16, 16]} />
    <meshStandardMaterial color={eyes} />
  </mesh>

  {/* 입 */}
  <mesh position={[0, 1.25, 0.78]}>
    <sphereGeometry args={[0.06, 16, 16]} />
    <meshStandardMaterial color={mouth} />
  </mesh>

  {/* 몸 */}
  <mesh geometry={body} position={[0, 0.5, 0]}>
    <meshStandardMaterial color={clothes} />
  </mesh>

  {/* 팔 */}
  <mesh geometry={limb} position={[-0.6, 0.5, 0]} rotation={[0, 0, 1.2]}>
    <meshStandardMaterial color={skin} />
  </mesh>
  <mesh geometry={limb} position={[0.6, 0.5, 0]} rotation={[0, 0, -1.2]}>
    <meshStandardMaterial color={skin} />
  </mesh>

  {/* 다리 */}
  <mesh geometry={limb} position={[-0.25, -0.3, 0]}>
    <meshStandardMaterial color="#a3c973" />
  </mesh>
  <mesh geometry={limb} position={[0.25, -0.3, 0]}>
    <meshStandardMaterial color="#a3c973" />
  </mesh>
</group>


);
}

export default function Avatar3D() {
return (
<Canvas camera={{ position: [0, 1.5, 5] }}> <ambientLight intensity={1.2} />
<directionalLight position={[3, 3, 3]} intensity={1} /> <CuteAvatar /> <OrbitControls enableZoom={false} /> </Canvas>
);
}
