"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function ChibiHuman() {
  const mountRef = useRef<HTMLDivElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current || !joystickRef.current || !knobRef.current) return;

    const container = mountRef.current;
    const joystick = joystickRef.current;
    const knob = knobRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f8fbff");

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2.5, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.target.set(0, 1.6, 0);
    controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, 2.5));

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const human = new THREE.Group();

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 48),
      new THREE.MeshStandardMaterial({ color: 0xffd8b4 })
    );
    head.position.y = 2.4;
    human.add(head);

    const eyeGeo = new THREE.CircleGeometry(0.18, 32);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      side: THREE.DoubleSide,
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.28, 2.55, 1.01);
    human.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.position.x = 0.28;
    human.add(rightEye);

    const shineGeo = new THREE.CircleGeometry(0.05, 16);
    const shineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });

    const leftShine = new THREE.Mesh(shineGeo, shineMat);
    leftShine.position.set(-0.22, 2.62, 1.02);
    human.add(leftShine);

    const rightShine = leftShine.clone();
    rightShine.position.x = 0.34;
    human.add(rightShine);

    const mouthShape = new THREE.Shape();
    mouthShape.absarc(-0.06, 0, 0.09, -Math.PI / 2, Math.PI / 2, true);
    mouthShape.absarc(0.06, 0, 0.09, Math.PI / 2, -Math.PI / 2, true);

    const mouth = new THREE.Mesh(
      new THREE.ShapeGeometry(mouthShape),
      new THREE.MeshBasicMaterial({
        color: 0x8b3a3a,
        side: THREE.DoubleSide,
      })
    );
    mouth.scale.set(1.3, 1, 1);
    mouth.position.set(0, 2.22, 1.02);
    human.add(mouth);

    const cheekGeo = new THREE.CircleGeometry(0.12, 24);
    const cheekMat = new THREE.MeshBasicMaterial({
      color: 0xffa0b8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });

    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.position.set(-0.5, 2.2, 1.02);
    human.add(leftCheek);

    const rightCheek = leftCheek.clone();
    rightCheek.position.x = 0.5;
    human.add(rightCheek);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.55, 1.1, 32),
      new THREE.MeshStandardMaterial({ color: 0x73a9ff })
    );
    body.position.y = 1.2;
    human.add(body);

    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 16);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd8b4 });

    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.rotation.z = Math.PI / 3;
    leftArm.position.set(-0.55, 1.35, 0);
    human.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.rotation.z = -Math.PI / 3;
    rightArm.position.set(0.55, 1.35, 0);
    human.add(rightArm);

    const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.75, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.16, 0.38, 0);
    human.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.position.set(0.16, 0.38, 0);
    human.add(rightLeg);

    scene.add(human);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(20, 128),
      new THREE.MeshStandardMaterial({ color: 0xe9eef7 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    scene.add(floor);

    const move = new THREE.Vector2(0, 0);
    let joystickActive = false;

    const updateJoystick = (e: PointerEvent) => {
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let x = e.clientX - cx;
      let y = e.clientY - cy;

      const max = 38;
      const len = Math.sqrt(x * x + y * y);

      if (len > max) {
        x = (x / len) * max;
        y = (y / len) * max;
      }

      knob.style.transform = `translate(${x}px, ${y}px)`;
      move.x = x / max;
      move.y = y / max;
    };

    const joystickDown = (e: PointerEvent) => {
      joystickActive = true;
      joystick.setPointerCapture(e.pointerId);
      updateJoystick(e);
    };

    const joystickMove = (e: PointerEvent) => {
      if (!joystickActive) return;
      updateJoystick(e);
    };

    const joystickUp = () => {
      joystickActive = false;
      knob.style.transform = "translate(0px, 0px)";
      move.set(0, 0);
    };

    joystick.addEventListener("pointerdown", joystickDown);
    joystick.addEventListener("pointermove", joystickMove);
    joystick.addEventListener("pointerup", joystickUp);
    joystick.addEventListener("pointercancel", joystickUp);

    let t = 0;
    let animationId = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      t += 0.03;

      human.position.x += move.x * 0.04;
      human.position.z += move.y * 0.04;

      human.position.x = THREE.MathUtils.clamp(human.position.x, -10, 10);
      human.position.z = THREE.MathUtils.clamp(human.position.z, -10, 10);

      human.position.y = Math.sin(t) * 0.05;
      human.rotation.z = Math.sin(t * 0.5) * 0.025;

      if (move.length() > 0.05) {
        human.rotation.y = Math.atan2(move.x, move.y);
      }

      const blink = Math.sin(t * 1.7) > 0.985;

      leftEye.scale.y += ((blink ? 0.08 : 1) - leftEye.scale.y) * 0.35;
      rightEye.scale.y += ((blink ? 0.08 : 1) - rightEye.scale.y) * 0.35;

      leftShine.visible = !blink;
      rightShine.visible = !blink;

      const cameraOffset = new THREE.Vector3(0, 2.5, 6);
      camera.position.lerp(human.position.clone().add(cameraOffset), 0.08);

      controls.target.lerp(
        new THREE.Vector3(human.position.x, human.position.y + 1.6, human.position.z),
        0.08
      );

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);

      joystick.removeEventListener("pointerdown", joystickDown);
      joystick.removeEventListener("pointermove", joystickMove);
      joystick.removeEventListener("pointerup", joystickUp);
      joystick.removeEventListener("pointercancel", joystickUp);

      controls.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
<button
  onClick={() => window.history.back()}
  className="absolute top-6 left-6 px-4 py-2 rounded-full bg-white/80 border border-gray-200 shadow-lg text-gray-700">
  ← 뒤로가기
</button>
      <div
        ref={joystickRef}
        className="absolute left-8 bottom-8 w-24 h-24 rounded-full bg-white/70 border border-blue-200 shadow-lg touch-none flex items-center justify-center"
      >
        <div
          ref={knobRef}
          className="w-10 h-10 rounded-full bg-blue-400 shadow-md transition-transform duration-75"
        />
      </div>
    </div>
  );
}