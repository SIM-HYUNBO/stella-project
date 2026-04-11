"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function FutureHome() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#cfefff");

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const player = new THREE.Object3D();
    scene.add(player);

    camera.position.set(0, 1.6, 0);
    player.add(camera);
    player.position.set(0, 0, 6);

    const sun = new THREE.DirectionalLight("#ffffff", 1.5);
    sun.position.set(20, 30, 20);
    scene.add(sun);

    scene.add(new THREE.AmbientLight("#ffffff", 0.7));

    /* glowing floor */

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(10, 64),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#88f0ff",
      })
    );

    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    /* glowing rings */

    const rings: THREE.Mesh<
      THREE.RingGeometry,
      THREE.MeshBasicMaterial
    >[] = [];

    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1 + i * 1.2, 1.2 + i * 1.2, 64),
        new THREE.MeshBasicMaterial({
          color: "#00ffff",
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        })
      );

      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;

      scene.add(ring);
      rings.push(ring);
    }

    /* dome */

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(12, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: "#f4fbff",
        transparent: true,
        opacity: 0.9,
      })
    );

    scene.add(dome);

    /* floating bed */

    const bedGroup = new THREE.Group();

    const bedBase = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.3, 2),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#a0f0ff",
      })
    );

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.4, 2),
      new THREE.MeshStandardMaterial({ color: "#e6f7ff" })
    );

    mattress.position.y = 0.35;

    bedGroup.add(bedBase);
    bedGroup.add(mattress);

    bedGroup.position.set(-3, 1.5, -1);

    scene.add(bedGroup);

    /* hologram */

    const holo = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1),
      new THREE.MeshStandardMaterial({
        color: "#00eaff",
        emissive: "#00eaff",
        transparent: true,
        opacity: 0.7,
      })
    );

    holo.position.set(0, 2, 0);
    scene.add(holo);

    /* house robot */

    const robot = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, 2, 32),
      new THREE.MeshStandardMaterial({
        color: "#b0f0ff",
        metalness: 0.6,
        roughness: 0.3,
      })
    );

    body.position.y = 1;
    robot.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 32, 32),
      new THREE.MeshStandardMaterial({ color: "#e0ffff" })
    );

    head.position.y = 2.2;
    robot.add(head);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "#ff00ff",
        emissive: "#ff00ff",
      })
    );

    eye.position.set(0, 2.2, 0.35);
    robot.add(eye);

    robot.position.set(3, 0, 0);
    scene.add(robot);

    /* window */

    const windowFrame = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 4),
      new THREE.MeshStandardMaterial({
        color: "#aeeaff",
        transparent: true,
        opacity: 0.4,
      })
    );

    windowFrame.position.set(0, 3, -9);
    scene.add(windowFrame);

    /* city */

    const city = new THREE.Group();

    for (let i = 0; i < 120; i++) {
      const h = Math.random() * 30 + 10;

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(2, h, 2),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(
            Math.random() * 0.5 + 0.3,
            Math.random() * 0.5 + 0.3,
            Math.random()
          ),
          emissive: "#222244",
        })
      );

      building.position.set(
        (Math.random() - 0.5) * 200,
        h / 2,
        -60 + Math.random() * 20
      );

      city.add(building);
    }

    scene.add(city);

    /* walking robots */

    const walkers: THREE.Group[] = [];

    function createWalker() {
      const g = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.6, 0.6),
        new THREE.MeshStandardMaterial({ color: "#aee6ff" })
      );

      body.position.y = 0.8;

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.5),
        new THREE.MeshStandardMaterial({ color: "#d6f7ff" })
      );

      head.position.y = 1.8;

      g.add(body);
      g.add(head);

      g.position.set(
        (Math.random() - 0.5) * 120,
        0,
        -40 - Math.random() * 80
      );

      scene.add(g);
      walkers.push(g);
    }

    for (let i = 0; i < 20; i++) createWalker();

    /* controls */

    const keys: Record<string, boolean> = {};

    window.addEventListener("keydown", (e) => {
      keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    renderer.domElement.addEventListener("click", () => {
      renderer.domElement.requestPointerLock();
    });

    let yaw = 0;
    let pitch = 0;

    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement === renderer.domElement) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;

        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        player.rotation.y = yaw;
        camera.rotation.x = pitch;
      }
    });

    const speed = 0.12;

    function move() {
      if (keys["w"]) player.translateZ(-speed);
      if (keys["s"]) player.translateZ(speed);
      if (keys["a"]) player.translateX(-speed);
      if (keys["d"]) player.translateX(speed);
    }

    function animate() {
      requestAnimationFrame(animate);

      move();

      rings.forEach((r, i) => {
        r.material.opacity = 0.3 + Math.sin(Date.now() * 0.002 + i) * 0.2;
      });

      bedGroup.position.y = 1.5 + Math.sin(Date.now() * 0.002) * 0.1;

      holo.rotation.y += 0.01;

      walkers.forEach((w) => {
        w.translateZ(0.03);

        if (Math.random() < 0.01) {
          w.rotation.y += (Math.random() - 0.5) * Math.PI;
        }
      });

      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }, []);

  return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
}