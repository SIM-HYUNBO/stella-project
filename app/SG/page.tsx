"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useRouter } from "next/navigation"

function MagicHouse() {
  const router = useRouter()

  return (
    <group
      onClick={() => router.push("/3Dhome")}
      onPointerOver={(e) => (e.stopPropagation(), (document.body.style.cursor = "pointer"))}
      onPointerOut={() => (document.body.style.cursor = "default")}
    >
      {/* 집 본체 */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#8e44ad" />
      </mesh>

      {/* 지붕 */}
      <mesh position={[0, 2.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.3, 1.3, 2.3, 4]} />
        <meshStandardMaterial color="#5e3370" />
      </mesh>
    </group>
  )
}

export default function Scene() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 4, 8], fov: 50 }}>
        <color attach="background" args={["#1e1e3f"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />

        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#2e8b57" />
        </mesh>

        <MagicHouse />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  )
}