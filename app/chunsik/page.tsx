"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Sphere } from "@react-three/drei";
import * as THREE from "three";

const YELLOW = "#F5D04A";
const YELLOW_DARK = "#E8B800";
const PINK = "#FFB3C1";
const BROWN = "#5C3A1E";
const WHITE = "#FFFFFF";
const BLACK = "#1A1A1A";

function Chunsik() {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 1.2) * 0.06;
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.15;
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 3) * 0.4 + 0.3;
    }
  });

  return (
    <group ref={groupRef} scale={hovered ? 1.05 : 1}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}>

      {/* 몸통 */}
      <RoundedBox args={[1.4, 1.6, 1.2]} radius={0.35} position={[0, 0, 0]}>
        <meshStandardMaterial color={YELLOW} roughness={0.6} />
      </RoundedBox>

      {/* 배 */}
      <Sphere args={[0.52, 32, 32]} position={[0, -0.1, 0.52]}>
        <meshStandardMaterial color="#FFF0A0" roughness={0.7} />
      </Sphere>

      {/* 머리 */}
      <Sphere args={[0.72, 32, 32]} position={[0, 1.05, 0]}>
        <meshStandardMaterial color={YELLOW} roughness={0.6} />
      </Sphere>

      {/* 귀 왼쪽 */}
      <mesh position={[-0.42, 1.65, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.22, 0.42, 3]} />
        <meshStandardMaterial color={YELLOW_DARK} roughness={0.6} />
      </mesh>
      {/* 귀 안쪽 왼쪽 */}
      <mesh position={[-0.42, 1.65, 0.06]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.12, 0.28, 3]} />
        <meshStandardMaterial color={PINK} roughness={0.8} />
      </mesh>

      {/* 귀 오른쪽 */}
      <mesh position={[0.42, 1.65, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.22, 0.42, 3]} />
        <meshStandardMaterial color={YELLOW_DARK} roughness={0.6} />
      </mesh>
      {/* 귀 안쪽 오른쪽 */}
      <mesh position={[0.42, 1.65, 0.06]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.12, 0.28, 3]} />
        <meshStandardMaterial color={PINK} roughness={0.8} />
      </mesh>

      {/* 눈 왼쪽 */}
      <Sphere args={[0.08, 16, 16]} position={[-0.22, 1.12, 0.66]}>
        <meshStandardMaterial color={BLACK} roughness={0.2} metalness={0.2} />
      </Sphere>
      {/* 눈 광택 */}
      <Sphere args={[0.03, 8, 8]} position={[-0.18, 1.15, 0.73]}>
        <meshStandardMaterial color={WHITE} roughness={0.1} />
      </Sphere>

      {/* 눈 오른쪽 */}
      <Sphere args={[0.08, 16, 16]} position={[0.22, 1.12, 0.66]}>
        <meshStandardMaterial color={BLACK} roughness={0.2} metalness={0.2} />
      </Sphere>
      <Sphere args={[0.03, 8, 8]} position={[0.26, 1.15, 0.73]}>
        <meshStandardMaterial color={WHITE} roughness={0.1} />
      </Sphere>

      {/* 코 */}
      <Sphere args={[0.045, 16, 16]} position={[0, 0.98, 0.7]}>
        <meshStandardMaterial color={BROWN} roughness={0.5} />
      </Sphere>

      {/* 입 왼쪽 */}
      <mesh position={[-0.09, 0.9, 0.69]} rotation={[0, 0, 0.5]}>
        <torusGeometry args={[0.07, 0.018, 8, 12, Math.PI * 0.7]} />
        <meshStandardMaterial color={BROWN} roughness={0.5} />
      </mesh>
      {/* 입 오른쪽 */}
      <mesh position={[0.09, 0.9, 0.69]} rotation={[0, 0, -0.5]}>
        <torusGeometry args={[0.07, 0.018, 8, 12, Math.PI * 0.7]} />
        <meshStandardMaterial color={BROWN} roughness={0.5} />
      </mesh>

      {/* 수염 왼쪽 */}
      {[-0.08, 0, 0.08].map((y, i) => (
        <mesh key={`wl${i}`} position={[-0.72, 0.98 + y, 0.55]} rotation={[0, 0.2, i === 1 ? 0 : i === 0 ? 0.15 : -0.15]}>
          <boxGeometry args={[0.38, 0.015, 0.015]} />
          <meshStandardMaterial color={BROWN} />
        </mesh>
      ))}
      {/* 수염 오른쪽 */}
      {[-0.08, 0, 0.08].map((y, i) => (
        <mesh key={`wr${i}`} position={[0.72, 0.98 + y, 0.55]} rotation={[0, -0.2, i === 1 ? 0 : i === 0 ? 0.15 : -0.15]}>
          <boxGeometry args={[0.38, 0.015, 0.015]} />
          <meshStandardMaterial color={BROWN} />
        </mesh>
      ))}

      {/* 팔 왼쪽 */}
      <RoundedBox args={[0.32, 0.75, 0.32]} radius={0.15} position={[-0.88, 0.1, 0]}>
        <meshStandardMaterial color={YELLOW} roughness={0.6} />
      </RoundedBox>
      {/* 손 왼쪽 */}
      <Sphere args={[0.2, 16, 16]} position={[-0.88, -0.32, 0]}>
        <meshStandardMaterial color={YELLOW_DARK} roughness={0.6} />
      </Sphere>

      {/* 팔 오른쪽 */}
      <RoundedBox args={[0.32, 0.75, 0.32]} radius={0.15} position={[0.88, 0.1, 0]}>
        <meshStandardMaterial color={YELLOW} roughness={0.6} />
      </RoundedBox>
      {/* 손 오른쪽 */}
      <Sphere args={[0.2, 16, 16]} position={[0.88, -0.32, 0]}>
        <meshStandardMaterial color={YELLOW_DARK} roughness={0.6} />
      </Sphere>

      {/* 다리 왼쪽 */}
      <RoundedBox args={[0.38, 0.5, 0.38]} radius={0.18} position={[-0.36, -0.98, 0]}>
        <meshStandardMaterial color={YELLOW} roughness={0.6} />
      </RoundedBox>
      <Sphere args={[0.22, 16, 16]} position={[-0.36, -1.26, 0.08]}>
        <meshStandardMaterial color={YELLOW_DARK} roughness={0.6} />
      </Sphere>

      {/* 다리 오른쪽 */}
      <RoundedBox args={[0.38, 0.5, 0.38]} radius={0.18} position={[0.36, -0.98, 0]}>
        <meshStandardMaterial color={YELLOW} roughness={0.6} />
      </RoundedBox>
      <Sphere args={[0.22, 16, 16]} position={[0.36, -1.26, 0.08]}>
        <meshStandardMaterial color={YELLOW_DARK} roughness={0.6} />
      </Sphere>

      {/* 꼬리 */}
      <mesh ref={tailRef} position={[-0.5, -0.3, -0.65]} rotation={[0.5, 0, 0.3]}>
        <torusGeometry args={[0.38, 0.1, 12, 24, Math.PI * 1.1]} />
        <meshStandardMaterial color={YELLOW_DARK} roughness={0.6} />
      </mesh>

    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} receiveShadow>
      <circleGeometry args={[3, 64]} />
      <meshStandardMaterial color="#FFF9E6" roughness={1} />
    </mesh>
  );
}

function Shadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.58, 0]}>
      <ellipseGeometry args={[0.7, 0.5, 32]} />
      <meshStandardMaterial color="#E8C840" transparent opacity={0.25} />
    </mesh>
  );
}

export default function ChunSikPage() {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-yellow-50 to-orange-50 flex flex-col items-center justify-center">
      <div className="text-2xl font-black text-yellow-500 mb-2">춘식이</div>
      <div className="text-sm text-gray-400 mb-4">드래그해서 360° 돌려보세요 👆</div>

      <div className="w-[380px] h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-yellow-100">
        <Canvas
          camera={{ position: [0, 0.5, 4.5], fov: 40 }}
          shadows
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#FFE0A0" />
          <pointLight position={[0, 3, 2]} intensity={0.4} color="#FFF0C0" />

          <Chunsik />
          <Floor />
          <Shadow />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.8}
            autoRotate={false}
          />
        </Canvas>
      </div>

      <div className="mt-4 text-xs text-gray-400">마우스/터치로 회전 가능</div>
    </div>
  );
}
