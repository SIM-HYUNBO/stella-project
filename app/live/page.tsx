"use client";
import { useEffect, useRef } from "react";

const MadLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    class Particle {
      x: number;
      y: number;
      dx: number;
      dy: number;
      color: string;
      size: number;
      life: number;
      constructor(x: number, y: number, dx: number, dy: number, color: string, size: number) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.color = color;
        this.size = size;
        this.life = 100;
      }
      update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life--;
      }
      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const particles: Particle[] = [];
    const colors = ["#ff4f4f", "#4fff9b", "#4fc6ff", "#ffff4f", "#ff84ff"];

    const randomColor = () => colors[Math.floor(Math.random() * colors.length)];

    const spawnParticles = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const dx = (Math.random() - 0.5) * 8;
        const dy = (Math.random() - 0.5) * 8;
        const size = Math.random() * 8 + 2;
        particles.push(new Particle(x, y, dx, dy, randomColor(), size));
      }
    };

    const playSound = () => {
      const ctxAudio = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctxAudio.createOscillator();
      osc.type = "square";
      osc.frequency.value = 200 + Math.random() * 600;
      osc.connect(ctxAudio.destination);
      osc.start();
      osc.stop(ctxAudio.currentTime + 0.1);
    };

    const handleClick = (e: MouseEvent) => {
      spawnParticles(e.clientX, e.clientY, 20);
      playSound();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons === 1) spawnParticles(e.clientX, e.clientY, 5);
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        spawnParticles(touch.clientX, touch.clientY, 10);
        playSound();
      }
    };

    const animate = () => {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      requestAnimationFrame(animate);
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchmove", handleTouch, { passive: false });

    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    animate();

    return () => {
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchstart", handleTouch);
      canvas.removeEventListener("touchmove", handleTouch);
    };
  }, []);

  return (
    <>
    
      <canvas ref={canvasRef} style={{ display: "block", background: "#111", cursor: "pointer" }} />
    </>
  );
};

export default MadLab;