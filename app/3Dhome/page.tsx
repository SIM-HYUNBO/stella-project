"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

// -------------------- 바닥 --------------------
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#f5e6c8" />
    </mesh>
  );
}

function OutsideFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#4caf50" />
    </mesh>
  );
}

// -------------------- 벽 & 창 --------------------
function Walls() {
  return (
    <>
      <mesh position={[0, 5, -10]}>
        <boxGeometry args={[20, 10, 0.5]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <mesh position={[-10, 5, 0]}>
        <boxGeometry args={[0.5, 10, 20]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <mesh position={[10, 5, 0]}>
        <boxGeometry args={[0.5, 10, 20]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
    </>
  );
}

function Window() {
  return (
    <group position={[0, 5, -9.7]}>
      <mesh>
        <boxGeometry args={[10, 6, 0.05]} />
        <meshStandardMaterial color="#cceeff" transparent opacity={0.85} emissive="#87cefa" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 3.1, 0.1]}>
        <boxGeometry args={[10.4, 0.3, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, -3.1, 0.1]}>
        <boxGeometry args={[10.4, 0.3, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-5.2, 0, 0.1]}>
        <boxGeometry args={[0.3, 6.4, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[5.2, 0, 0.1]}>
        <boxGeometry args={[0.3, 6.4, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[0.2, 6, 0.1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// -------------------- 가구 --------------------
function Bed() {
  return (
    <group position={[-5, 0, -5]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[6, 1, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[1.5, 1.5, 0]}>
        <boxGeometry args={[1.3, 0.5, 2]} />
        <meshStandardMaterial color="#eaeaea" />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[6.4, 0.6, 4.4]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
    </group>
  );
}

function Desk() {
  return (
    <group position={[4, 0, -5]}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[5, 0.4, 2.4]} />
        <meshStandardMaterial color="#a47148" />
      </mesh>
      {[[-2, 0.5, -0.8],[2, 0.5, -0.8],[-2, 0.5, 0.8],[2, 0.5, 0.8]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.2, 1, 0.2]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
      ))}
    </group>
  );
}

function Chair() {
  return (
    <group position={[4, 0, -2]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.2, 0.2, 1.2]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[0, 1.3, 0.5]}>
        <boxGeometry args={[1.2, 1.2, 0.2]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.2]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
}

function Sofa() {
  return (
    <group position={[-6, 0, 3]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[3, 0.6, 1.5]} />
        <meshStandardMaterial color="#d2b48c" />
      </mesh>
      <mesh position={[0, 0.9, -0.65]}>
        <boxGeometry args={[3, 1, 0.3]} />
        <meshStandardMaterial color="#d2b48c" />
      </mesh>
      <mesh position={[-1.55, 0.6, 0]}>
        <boxGeometry args={[0.3, 1, 1.5]} />
        <meshStandardMaterial color="#d2b48c" />
      </mesh>
      <mesh position={[1.55, 0.6, 0]}>
        <boxGeometry args={[0.3, 1, 1.5]} />
        <meshStandardMaterial color="#d2b48c" />
      </mesh>
    </group>
  );
}

function CoffeeTable() {
  return (
    <group position={[-3.7, 0, 3]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1, 1, 0.1, 32]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      {[[-0.7, -0.25, -0.7],[0.7, -0.25, -0.7],[-0.7, -0.25, 0.7],[0.7, -0.25, 0.7]].map((pos, i) => (
        <mesh key={i} position={[pos[0],0,pos[2]]}>
          <cylinderGeometry args={[0.1,0.1,0.5,16]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
      ))}
    </group>
  );
}

function Lamp() {
  return (
    <group position={[2, 1.6, -5.6]}>
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 1, 12]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ffffcc" emissive="#ffffaa" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[0, 0.7, 0]} intensity={1.5} />
    </group>
  );
}

function Leaf({ position = [8, 0, -5], rotation = [0, 0, 0], scale = [1, 1, 1] }) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[0.04, 0.9]} />
      <meshStandardMaterial color="#2e8b57" side={THREE.DoubleSide} />
    </mesh>
  );
}

function PotPlant({ position = [8, 0, -5] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.5, 16]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.22, 0.27, 0.1, 16]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      {[...Array(12)].map((_, i) => (
        <Leaf
          key={i}
          position={[0, 0.55 + Math.random() * 0.5, 0]}
          rotation={[Math.random() * 0.05, Math.random() * Math.PI * 2, Math.random() * 0.05]}
          scale={[1, 1 + Math.random(), 1]}
        />
      ))}
    </group>
  );
}

// -------------------- Vacuum --------------------
function Vacuum() {
  const ref = useRef<THREE.Group>(null);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.key]: true }));
    const up = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.key]: false }));
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const targetRotation = useRef(0);

  useFrame(() => {
    if (!ref.current) return;
    let dx = 0;
    let dz = 0;

    if (keys["ArrowUp"]) { dz -= 0.05; targetRotation.current = 0; }
    if (keys["ArrowDown"]) { dz += 0.05; targetRotation.current = Math.PI; }
    if (keys["ArrowLeft"]) { dx -= 0.05; targetRotation.current = Math.PI/2; }
    if (keys["ArrowRight"]) { dx += 0.05; targetRotation.current = -Math.PI/2; }

    ref.current.position.x += dx;
    ref.current.position.z += dz;
    ref.current.rotation.y += (targetRotation.current - ref.current.rotation.y) * 0.1;
  });

  return (
    <group ref={ref} position={[0, 0.05, 0]}>
      <mesh>
        <cylinderGeometry args={[0.5,0.5,0.15,64]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0,0.1,0]}>
        <cylinderGeometry args={[0.1,0.1,0.05,32]} />
        <meshStandardMaterial color="#d32f2f" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.3,0.05,0]}>
        <sphereGeometry args={[0.05,16,16]} />
        <meshStandardMaterial color="#00bcd4" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// -------------------- Character --------------------
function Character() {
  const ref = useRef<THREE.Group>(null);
  const keys = useRef<{ [key:string]:boolean }>({});
  const [action, setAction] = useState<"idle"|"sit"|"sleep">("idle");
  const velocityY = useRef(0);
  const bedPos = new THREE.Vector3(-5,0,-5);
  const chairPos = new THREE.Vector3(4,0,-2);

  const touchStart = useRef<{x:number,y:number}|null>(null);
  const touchMove = useRef<{x:number,y:number}>({x:0,y:0});

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>keys.current[e.key.toLowerCase()]=true;
    const up=(e:KeyboardEvent)=>keys.current[e.key.toLowerCase()]=false;
    window.addEventListener("keydown",down);
    window.addEventListener("keyup",up);

    const ts=(e:TouchEvent)=>{touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};};
    const tm=(e:TouchEvent)=>{
      if(!touchStart.current) return;
      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;
      touchMove.current={x:dx,y:dy};
    };
    const te=()=>{touchStart.current=null; touchMove.current={x:0,y:0};};
    window.addEventListener("touchstart",ts);
    window.addEventListener("touchmove",tm);
    window.addEventListener("touchend",te);

    return ()=>{
      window.removeEventListener("keydown",down);
      window.removeEventListener("keyup",up);
      window.removeEventListener("touchstart",ts);
      window.removeEventListener("touchmove",tm);
      window.removeEventListener("touchend",te);
    };
  },[]);

  useFrame(()=>{
    if(!ref.current) return;
    const speed=0.05;
    const pos=ref.current.position;
    pos.y += velocityY.current; velocityY.current-=0.01;
    if(pos.y<0) pos.y=0; if(pos.y===0) velocityY.current=0;

    const distBed=pos.distanceTo(bedPos);
    const distChair=pos.distanceTo(chairPos);
    if(distBed<1.5 && pos.y===0) setAction("sleep");
    else if(distChair<1.2 && pos.y===0) setAction("sit");
    else if(pos.y===0) setAction("idle");

    let dx=0,dz=0;
    if(keys.current["w"]) dz-=speed;
    if(keys.current["s"]) dz+=speed;
    if(keys.current["a"]) dx-=speed;
    if(keys.current["d"]) dx+=speed;

    dx+=touchMove.current.x*0.001;
    dz+=touchMove.current.y*0.001;
    pos.x+=dx; pos.z+=dz;

    if(dx!==0||dz!==0){const rot=Math.atan2(dx,dz); ref.current.rotation.y+=(rot-ref.current.rotation.y)*0.15;}
    if(action==="sleep") {ref.current.rotation.z+=(-Math.PI/2-ref.current.rotation.z)*0.1; pos.y+=(0.4-pos.y)*0.1;}
    else if(action==="sit"){ref.current.rotation.z+=(0-ref.current.rotation.z)*0.1; pos.y+=(0.6-pos.y)*0.1;}
    else{ref.current.rotation.z+=(0-ref.current.rotation.z)*0.1; if(pos.y===0) pos.y=0;}
  });

  return (
    <group ref={ref} position={[0,0,-3]} scale={[0.66,0.66,0.66]}>
      <mesh position={[0,1.1,0]}><sphereGeometry args={[0.6,32,32]}/><meshStandardMaterial color="#ffb6c1"/></mesh>
      <mesh position={[0,2.2,0]}><sphereGeometry args={[0.9,32,32]}/><meshStandardMaterial color="#ffe0bd"/></mesh>
      <mesh position={[-0.3,2.3,0.75]}><sphereGeometry args={[0.12,16,16]}/><meshStandardMaterial color="black"/></mesh>
      <mesh position={[0.3,2.3,0.75]}><sphereGeometry args={[0.12,16,16]}/><meshStandardMaterial color="black"/></mesh>
      <mesh position={[-0.25,0.3,0]}><cylinderGeometry args={[0.2,0.2,0.6,16]}/><meshStandardMaterial color="#ff69b4"/></mesh>
      <mesh position={[0.25,0.3,0]}><cylinderGeometry args={[0.2,0.2,0.6,16]}/><meshStandardMaterial color="#ff69b4"/></mesh>
    </group>
  );
}
function Monitor() {
  return (
    <group position={[4, 1.8, -5]}>
      <mesh>
        <boxGeometry args={[1.7, 1, 0.1]} />
        <meshStandardMaterial color="black" emissive="#333" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -0.7, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

function Drawer() {
  return (
    <group position={[-1, 1, -8]} scale={[2, 2, 2]}>
      <mesh>
        <boxGeometry args={[1.2, 1, 0.5]} />
        <meshStandardMaterial color="#8d6e63" metalness={0.3} roughness={0.7} />
      </mesh>
      {[0.3, 0, -0.3].map((y, i) => (
        <group key={i} position={[0, y, 0.26]}>
          <mesh>
            <boxGeometry args={[1.1, 0.25, 0.05]} />
            <meshStandardMaterial color="#a1887f" />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Clock() {
  return (
    <group position={[7, 7, -9.7]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.6, 0.6, 0.05, 32]} />
        <meshStandardMaterial color="#bcaaa4" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.02, 0.3, 0.02]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.02, 0.2, 0.02]} />
        <meshStandardMaterial color="#000" />
      </mesh>
    </group>
  );
}

// -------------------- 전체 화면 Canvas --------------------
export default function RoomScene() {
  return (
    <div style={{width:'100vw', height:'100vh', overflow:'hidden'}}>
      <Canvas camera={{position:[0,10,15],fov:60}}>
        <ambientLight intensity={0.7}/>
        <directionalLight position={[5,10,5]} intensity={0.5}/>
        <OrbitControls enablePan={false} enableZoom={true} />

        <OutsideFloor />
        <Floor />
        <Walls />
        <Window />
        <Bed />
        <Desk />
        <Monitor />
        <Chair />
        <Sofa />
        <CoffeeTable />
        <Lamp />
        <PotPlant position={[8,0,-5]} />
        <Vacuum />
        <Drawer />
        <Clock />
        <Character />
      </Canvas>
    </div>
  );
}

