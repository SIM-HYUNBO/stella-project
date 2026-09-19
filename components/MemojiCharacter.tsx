"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type Look = { skin: string; hair: string; hairColor: string; eyes: string; outfit: string; accessory: string };
export const DEFAULT_LOOK: Look = { skin: "#f5c9aa", hair: "none", hairColor: "#3f2930", eyes: "round", outfit: "#b9a7ed", accessory: "none" };
export type Shape = { categoryName: string; score: number };
type Props = { look: Look; shapes: React.MutableRefObject<Shape[]> };

function Ball({ position, scale, color }: { position: [number, number, number]; scale: [number, number, number]; color: string }) {
  return <mesh position={position} scale={scale}><sphereGeometry args={[1, 40, 32]} /><meshStandardMaterial color={color} roughness={0.46} /></mesh>;
}

function Character({ look, shapes }: Props) {
  const rim = useMemo(() => new THREE.TorusGeometry(0.15, 0.017, 12, 48), []);
  useEffect(() => () => rim.dispose(), [rim]);
  const body = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const value = (name: string) => shapes.current.find(s => s.categoryName === name)?.score || 0;
    if (body.current) body.current.position.y = Math.sin(clock.elapsedTime * 1.8) * 0.025;
    if (left.current) left.current.scale.y = THREE.MathUtils.lerp(left.current.scale.y, Math.max(0.08, 1 - value("eyeBlinkLeft")), 0.4);
    if (right.current) right.current.scale.y = THREE.MathUtils.lerp(right.current.scale.y, Math.max(0.08, 1 - value("eyeBlinkRight")), 0.4);
    if (mouth.current) {
      mouth.current.scale.y = THREE.MathUtils.lerp(mouth.current.scale.y, 0.038 + value("jawOpen") * 0.19, 0.35);
      mouth.current.scale.x = 0.105 + value("mouthSmileLeft") * 0.07;
    }
  });
  const eye = (x: number, ref: React.RefObject<THREE.Group | null>) => <group ref={ref} position={[x, 0.65, 0.674]}>
    <Ball position={[0, 0, 0]} scale={[look.eyes === "round" ? 0.082 : 0.061, look.eyes === "soft" ? 0.06 : 0.1, 0.045]} color="#352b38" />
    <Ball position={[-0.023, 0.032, 0.041]} scale={[0.019, 0.024, 0.012]} color="#ffffff" />
  </group>;
  return <group ref={body}>
    <Ball position={[0, -0.58, 0]} scale={[0.49, 0.54, 0.31]} color={look.outfit} />
    <Ball position={[-0.47, -0.56, 0]} scale={[0.16, 0.31, 0.17]} color={look.outfit} />
    <Ball position={[0.47, -0.56, 0]} scale={[0.16, 0.31, 0.17]} color={look.outfit} />
    <Ball position={[-0.48, -0.79, 0.03]} scale={[0.14, 0.15, 0.14]} color={look.skin} />
    <Ball position={[0.48, -0.79, 0.03]} scale={[0.14, 0.15, 0.14]} color={look.skin} />
    <Ball position={[-0.23, -1.06, 0.08]} scale={[0.21, 0.16, 0.29]} color="#fffaf5" />
    <Ball position={[0.23, -1.06, 0.08]} scale={[0.21, 0.16, 0.29]} color="#fffaf5" />
    <Ball position={[0, -0.1, 0]} scale={[0.18, 0.24, 0.18]} color={look.skin} />
    <Ball position={[0, 0.61, 0]} scale={[0.71, 0.77, 0.64]} color={look.skin} />
    {[-1, 1].map(side => <group key={side}>
      <Ball position={[side * 0.69, 0.55, 0]} scale={[0.14, 0.2, 0.13]} color={look.skin} />
      <Ball position={[side * 0.36, 0.4, 0.551]} scale={[0.13, 0.059, 0.036]} color="#ec9d9a" />
      <Ball position={[side * 0.25, 0.84, 0.594]} scale={[0.11, 0.028, 0.034]} color={look.hairColor} />
    </group>)}
    {eye(-0.25, left)}{eye(0.25, right)}
    <Ball position={[0, 0.48, 0.66]} scale={[0.072, 0.083, 0.08]} color={look.skin} />
    <mesh ref={mouth} position={[0, 0.29, 0.598]} scale={[0.105, 0.038, 0.022]}><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color="#9e4e59" /></mesh>
    {look.hair !== "none" && <>
      {/* A continuous crown and rear shell cover the scalp without covering the face. */}
      <mesh position={[0, 0.61, 0]} scale={[0.745, 0.81, 0.68]}>
        <sphereGeometry args={[1, 48, 32, 0, Math.PI * 2, 0, 0.98]} />
        <meshStandardMaterial color={look.hairColor} roughness={0.46} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.61, 0]} scale={[0.745, look.hair === "bob" ? 0.88 : 0.81, 0.68]}>
        <sphereGeometry args={[1, 48, 40, Math.PI, Math.PI, 0, look.hair === "bob" ? 2.85 : 2.48]} />
        <meshStandardMaterial color={look.hairColor} roughness={0.46} side={THREE.DoubleSide} />
      </mesh>
      {[-0.42, -0.16, 0.13, 0.4].map((x, i) => <Ball key={x} position={[x, 1.08 + (i % 2) * 0.03, 0.4]} scale={[0.23, look.hair === "bob" ? 0.22 : 0.15, 0.21]} color={look.hairColor} />)}
      {look.hair === "bob" && [-1, 1].map(s => <Ball key={s} position={[s * 0.61, 0.69, -0.12]} scale={[0.2, 0.52, 0.4]} color={look.hairColor} />)}
      {look.hair === "buns" && [-1, 1].map(s => <Ball key={s} position={[s * 0.61, 1.24, -0.11]} scale={[0.27, 0.27, 0.26]} color={look.hairColor} />)}
    </>}
    {look.accessory === "glasses" && <group position={[0, 0.65, 0.733]}>
      {[-0.25, 0.25].map(x => <mesh key={x} position={[x, 0, 0]} geometry={rim}><meshStandardMaterial color="#725873" /></mesh>)}
      <Ball position={[0, 0, 0]} scale={[0.1, 0.014, 0.014]} color="#725873" />
    </group>}
    {look.accessory === "bow" && <group position={[0.43, 1.19, 0.45]}>
      <Ball position={[-0.09, 0, 0]} scale={[0.12, 0.08, 0.04]} color="#f18dad" />
      <Ball position={[0.09, 0, 0]} scale={[0.12, 0.08, 0.04]} color="#f18dad" />
      <Ball position={[0, 0, 0.02]} scale={[0.045, 0.045, 0.035]} color="#ffd7e5" />
    </group>}
    <Ball position={[0, -1.27, 0]} scale={[0.83, 0.07, 0.65]} color="#d3c6e8" />
  </group>;
}

export default function MemojiCharacter(props: Props) {
  return <Canvas camera={{ position: [0, 0.25, 4.5], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
    <ambientLight intensity={1.5} /><directionalLight position={[3, 5, 5]} intensity={2.4} /><directionalLight position={[-3, 1, 2]} intensity={0.9} color="#dacdff" />
    <Character {...props} /><OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 2.8} maxPolarAngle={Math.PI / 1.8} target={[0, 0.12, 0]} />
  </Canvas>;
}
