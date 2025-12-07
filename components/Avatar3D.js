"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// 귀여운 아바타 형태 정의
function CuteAvatar() {
const head = new THREE.SphereGeometry(0.6, 32, 32); // 머리
const body = new THREE.CapsuleGeometry(0.35, 0.6, 4, 8); // 몸통
const limb = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 12); // 팔다리

return ( <group scale={1.2}>
{/* 머리 */}
<mesh geometry={head} position={[0, 1.3, 0]}> <meshStandardMaterial color="#ffdab9" /> </mesh>

```
  {/* 눈 */}
  <mesh position={[-0.22, 1.35, 0.55]}>
    <sphereGeometry args={[0.08, 16, 16]} />
    <meshStandardMaterial color="black" />
  </mesh>
  <mesh position={[0.22, 1.35, 0.55]}>
    <sphereGeometry args={[0.08, 16, 16]} />
    <meshStandardMaterial color="black" />
  </mesh>

  {/* 몸 */}
  <mesh geometry={body} position={[0, 0.4, 0]}>
    <meshStandardMaterial color="#87cefa" />
  </mesh>

  {/* 팔 */}
  <mesh geometry={limb} position={[-0.55, 0.4, 0]} rotation={[0, 0, 1.2]}>
    <meshStandardMaterial color="#ffdab9" />
  </mesh>
  <mesh geometry={limb} position={[0.55, 0.4, 0]} rotation={[0, 0, -1.2]}>
    <meshStandardMaterial color="#ffdab9" />
  </mesh>

  {/* 다리 */}
  <mesh geometry={limb} position={[-0.25, -0.3, 0]}>
    <meshStandardMaterial color="#556b2f" />
  </mesh>
  <mesh geometry={limb} position={[0.25, -0.3, 0]}>
    <meshStandardMaterial color="#556b2f" />
  </mesh>
</group>


);
}

// 3D 아바타 컴포넌트
export default function Avatar3D() {
return (
<Canvas camera={{ position: [0, 1.5, 4] }}> <ambientLight intensity={1} />
<directionalLight position={[3, 3, 3]} intensity={1} />


  <CuteAvatar />

  <OrbitControls enableZoom={false} />
</Canvas>

);
}
