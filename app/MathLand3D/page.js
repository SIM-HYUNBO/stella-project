"use client";

import React, { useRef, useState, useEffect, forwardRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";

/* -----------------------------------------
Avatar3D
------------------------------------------*/
const Avatar3D = forwardRef(function Avatar3D({ moving }, ref) {
  const leftLegRef = useRef();
  const rightLegRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (leftLegRef.current && rightLegRef.current && moving) {
      leftLegRef.current.rotation.x = Math.sin(t * 5) * 0.5;
      rightLegRef.current.rotation.x = Math.sin(t * 5 + Math.PI) * 0.5;
    }
  });

  return (
    <group ref={ref}>
      {/* Body */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 1, 32]} />
        <meshStandardMaterial color="#4A90E2" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#F5D7B8" />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.15, 1.8, 0.35]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.15, 1.8, 0.35]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#000" />
      </mesh>

      {/* Legs */}
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

/* -----------------------------------------
Moving Avatar controller
------------------------------------------*/
const MovingAvatar = () => {
  const ref = useRef();
  const [keys, setKeys] = useState({});
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const down = (e) =>
      setKeys((k) => ({ ...k, [e.key.toLowerCase()]: true }));
    const up = (e) =>
      setKeys((k) => ({ ...k, [e.key.toLowerCase()]: false }));

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(() => {
    if (!ref.current) return;

    const speed = 0.08;
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
    ref.current.position.z += move[2];

    setMoving(anyKey);

    if (anyKey) {
      const angle = Math.atan2(move[0], move[2]);
      ref.current.rotation.y = angle;
    }
  });

  return <Avatar3D ref={ref} moving={moving} />;
};

/* -----------------------------------------
Trees
------------------------------------------*/
function generateTrees() {
  const trees = [];
  for (let i = -40; i <= 40; i += 20) {
    for (let j = -40; j <= 40; j += 20) {
      if (Math.random() > 0.5) continue;

      trees.push(
        <mesh position={[i, 2, j]} key={`tree-trunk-${i}-${j}`}>
          <cylinderGeometry args={[0.5, 0.5, 4, 12]} />
          <meshStandardMaterial color="sienna" />
        </mesh>
      );

      trees.push(
        <mesh position={[i, 5, j]} key={`tree-leaves-${i}-${j}`}>
          <coneGeometry args={[2, 4, 8]} />
          <meshStandardMaterial color="green" />
        </mesh>
      );
    }
  }
  return trees;
}

/* -----------------------------------------
Coin
------------------------------------------*/
function Coin({ position }) {
  const ref = useRef();

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.04;
  });

  return (
    <mesh ref={ref} position={position}>
      <cylinderGeometry args={[1, 1, 0.2, 32]} />
      <meshStandardMaterial
        color="gold"
        metalness={1}
        roughness={0.1}
      />
    </mesh>
  );
}

function generateCoins(count) {
  const coins = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    coins.push(<Coin key={i} position={[x, 0.5, z]} />);
  }
  return coins;
}

/* -----------------------------------------
Main Export Page
------------------------------------------*/
export default function MathLand3DPage() {
  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 10, 20], fov: 60 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1} />

        <Suspense fallback={null}>
          <Sky sunPosition={[5, 10, 2]} />

          {/* Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#a0d8f1" />
          </mesh>

          {generateTrees()}
          {generateCoins(25)}

          <MovingAvatar />

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
