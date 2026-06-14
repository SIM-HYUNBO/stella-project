"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── 사운드 ────────────────────────────────────────────────────────────────────
type SP = { clickFreq: number; clickQ: number; clickVol: number; thumpStart: number; thumpEnd: number; thumpDecay: number; thumpVol: number };

function playClick(ctx: AudioContext, s: SP, mult = 1.0) {
  const now = ctx.currentTime;
  const dur = 0.004;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.4));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bpf = ctx.createBiquadFilter(); bpf.type = "bandpass";
  bpf.frequency.value = s.clickFreq * mult; bpf.Q.value = s.clickQ;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(s.clickVol, now); ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(bpf); bpf.connect(ng); ng.connect(ctx.destination); src.start(now);
  const osc = ctx.createOscillator(); osc.type = "sine";
  osc.frequency.setValueAtTime(s.thumpStart * mult, now);
  osc.frequency.exponentialRampToValueAtTime(s.thumpEnd * mult, now + s.thumpDecay);
  const og = ctx.createGain(); og.gain.setValueAtTime(s.thumpVol, now); og.gain.exponentialRampToValueAtTime(0.0001, now + s.thumpDecay + 0.01);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now + s.thumpDecay + 0.02);
}

// ── 테마 ──────────────────────────────────────────────────────────────────────
type ThemeDef = {
  id: string; name: string; dot: string;
  pageBg: string; keyBg: string; keyDownBg: string;
  keyShadow: string; keyDownShadow: string;
  border: string; topBorder: string;
  iconColor: string; btnColor: string;
  sound: SP;
};

const THEMES: ThemeDef[] = [
  { id:"dark",name:"다크",dot:"#888",pageBg:"radial-gradient(ellipse at center,#1e1e2e 0%,#0d0d0d 100%)",keyBg:"linear-gradient(180deg,#525252 0%,#424242 100%)",keyDownBg:"linear-gradient(180deg,#363636 0%,#2e2e2e 100%)",keyShadow:"0 8px 0 #0a0a0a,inset 0 1px 0 rgba(255,255,255,0.1)",keyDownShadow:"0 2px 0 #080808,inset 0 2px 6px rgba(0,0,0,0.7)",border:"rgba(255,255,255,0.06)",topBorder:"rgba(255,255,255,0.1)",iconColor:"rgba(255,255,255,0.55)",btnColor:"rgba(255,255,255,0.6)",sound:{clickFreq:3500,clickQ:1.0,clickVol:0.28,thumpStart:240,thumpEnd:65,thumpDecay:0.055,thumpVol:0.20}},
  { id:"light",name:"라이트",dot:"#b0aba0",pageBg:"linear-gradient(135deg,#f0ede8 0%,#ddd8d0 100%)",keyBg:"linear-gradient(180deg,#faf8f5 0%,#eae7e2 100%)",keyDownBg:"linear-gradient(180deg,#e0ddd8 0%,#d0cdc8 100%)",keyShadow:"0 8px 0 #999,inset 0 1px 0 rgba(255,255,255,0.8)",keyDownShadow:"0 2px 0 #aaa,inset 0 2px 6px rgba(0,0,0,0.2)",border:"rgba(0,0,0,0.08)",topBorder:"rgba(255,255,255,0.7)",iconColor:"rgba(60,50,40,0.4)",btnColor:"rgba(60,50,40,0.7)",sound:{clickFreq:2200,clickQ:0.6,clickVol:0.16,thumpStart:160,thumpEnd:50,thumpDecay:0.07,thumpVol:0.13}},
  { id:"ocean",name:"오션",dot:"#0ea5e9",pageBg:"radial-gradient(ellipse at center,#0c1a2e 0%,#060e1a 100%)",keyBg:"linear-gradient(180deg,#163552 0%,#0e2540 100%)",keyDownBg:"linear-gradient(180deg,#0c2038 0%,#091828 100%)",keyShadow:"0 8px 0 #041020,inset 0 1px 0 rgba(14,165,233,0.2)",keyDownShadow:"0 2px 0 #030c18,inset 0 2px 6px rgba(0,0,0,0.8)",border:"rgba(14,165,233,0.12)",topBorder:"rgba(14,165,233,0.15)",iconColor:"rgba(100,200,255,0.6)",btnColor:"rgba(100,200,255,0.7)",sound:{clickFreq:1800,clickQ:0.5,clickVol:0.12,thumpStart:130,thumpEnd:40,thumpDecay:0.09,thumpVol:0.10}},
  { id:"retro",name:"레트로",dot:"#d4a853",pageBg:"linear-gradient(135deg,#2a1a08 0%,#1a1008 100%)",keyBg:"linear-gradient(180deg,#c8a870 0%,#b89060 100%)",keyDownBg:"linear-gradient(180deg,#a08050 0%,#907040 100%)",keyShadow:"0 8px 0 #3a2810,inset 0 1px 0 rgba(255,220,150,0.3)",keyDownShadow:"0 2px 0 #2a1808,inset 0 2px 6px rgba(0,0,0,0.5)",border:"rgba(212,168,83,0.15)",topBorder:"rgba(212,168,83,0.25)",iconColor:"rgba(42,26,8,0.4)",btnColor:"rgba(42,26,8,0.65)",sound:{clickFreq:5500,clickQ:2.0,clickVol:0.40,thumpStart:380,thumpEnd:90,thumpDecay:0.04,thumpVol:0.25}},
  { id:"neon",name:"네온",dot:"#ff00ff",pageBg:"radial-gradient(ellipse at center,#0d0020 0%,#050010 100%)",keyBg:"linear-gradient(180deg,#2a0055 0%,#1e003d 100%)",keyDownBg:"linear-gradient(180deg,#150030 0%,#0d0020 100%)",keyShadow:"0 8px 0 #060010,0 0 12px rgba(200,0,255,0.5),inset 0 1px 0 rgba(255,0,255,0.2)",keyDownShadow:"0 2px 0 #040008,0 0 20px rgba(255,0,255,0.8),inset 0 2px 6px rgba(0,0,0,0.9)",border:"rgba(200,0,255,0.15)",topBorder:"rgba(255,0,255,0.15)",iconColor:"rgba(255,100,255,0.65)",btnColor:"rgba(255,100,255,0.7)",sound:{clickFreq:6000,clickQ:3.0,clickVol:0.22,thumpStart:800,thumpEnd:200,thumpDecay:0.03,thumpVol:0.18}},
];
const PITCH_MULTS = [1.3,1.0,0.8,1.2,1.0,0.85,1.15,1.0,0.9];

function adjBright(hex:string,amt:number):string{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);const c=(v:number)=>Math.max(0,Math.min(255,v+amt)).toString(16).padStart(2,"0");return`#${c(r)}${c(g)}${c(b)}`;}
function isLight(hex:string):boolean{return parseInt(hex.slice(1,3),16)*0.299+parseInt(hex.slice(3,5),16)*0.587+parseInt(hex.slice(5,7),16)*0.114>140;}

function KeyIcon({ idx, color }: { idx: number; color: string }) {
  const s = 38;
  const p = { stroke:color, strokeWidth:1.8, strokeLinecap:"round" as const, strokeLinejoin:"round" as const, fill:"none" };
  const icons = [
    <svg width={s} height={s} viewBox="0 0 24 24" key="star"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" {...p}/></svg>,
    <svg width={s} height={s} viewBox="0 0 24 24" key="heart"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...p}/></svg>,
    <svg width={s} height={s} viewBox="0 0 24 24" key="moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...p}/></svg>,
    <svg width={s} height={s} viewBox="0 0 24 24" key="sun"><circle cx="12" cy="12" r="4" {...p}/>{([[12,2,12,4],[12,20,12,22],[2,12,4,12],[20,12,22,12],[5.6,5.6,7,7],[17,17,18.4,18.4],[5.6,18.4,7,17],[17,7,18.4,5.6]] as number[][]).map(([x1,y1,x2,y2],i)=><line key={i} x1={x1} y1={y1} x2={x2} y2={y2} {...p}/>)}</svg>,
    <svg width={s} height={s} viewBox="0 0 24 24" key="cloud"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" {...p}/></svg>,
    <svg width={s} height={s} viewBox="0 0 24 24" key="bolt"><polyline points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" {...p}/></svg>,
    <svg width={s} height={s} viewBox="0 0 24 24" key="crown"><path d="M3 20h18" {...p}/><path d="M4 20V9l4 4 4-7 4 7 4-4v11" {...p}/></svg>,
    <svg width={s} height={s} viewBox="0 0 24 24" key="gem"><path d="M6 3h12l4 6-10 12L2 9z" {...p}/><line x1="2" y1="9" x2="22" y2="9" {...p}/><line x1="12" y1="3" x2="6" y2="9" {...p}/><line x1="12" y1="3" x2="18" y2="9" {...p}/></svg>,
    <svg width={s} height={s} viewBox="0 0 24 24" key="flower"><circle cx="12" cy="12" r="2.5" {...p}/><ellipse cx="12" cy="6.5" rx="2" ry="3" {...p}/><ellipse cx="12" cy="17.5" rx="2" ry="3" {...p}/><ellipse cx="6.5" cy="12" rx="3" ry="2" {...p}/><ellipse cx="17.5" cy="12" rx="3" ry="2" {...p}/></svg>,
  ];
  return icons[idx] ?? null;
}

// ── 갤러그 게임 ───────────────────────────────────────────────────────────────
interface GEnemy { id:number; col:number; row:number; x:number; y:number; alive:boolean; diving:boolean; diveVx:number; diveVy:number; diveReturnX:number; diveReturnY:number }
interface GBullet { id:number; x:number; y:number; vy:number; fromPlayer:boolean }
interface GParticle { x:number; y:number; vx:number; vy:number; life:number; color:string }

const ENEMY_ROWS = 3, ENEMY_COLS = 6;
const ENEMY_COLORS = ["#ff44ff","#44ffff","#aaff44"] as const;
const SND_SHOOT: SP = { clickFreq:4800,clickQ:3,clickVol:0.18,thumpStart:500,thumpEnd:200,thumpDecay:0.03,thumpVol:0.12 };
const SND_HIT:   SP = { clickFreq:800, clickQ:1,clickVol:0.25,thumpStart:200,thumpEnd:60, thumpDecay:0.06,thumpVol:0.20 };
const SND_DIE:   SP = { clickFreq:150, clickQ:0.5,clickVol:0.3,thumpStart:80, thumpEnd:30, thumpDecay:0.15,thumpVol:0.25 };

function GalagaGame({ audioCtxRef, onExit }: { audioCtxRef: React.MutableRefObject<AudioContext|null>; onExit:()=>void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef  = useRef({ left:false, right:false });

  const G = useRef({
    player: { x:170, y:0, invincible:0 },
    enemies: [] as GEnemy[],
    bullets: [] as GBullet[],
    particles: [] as GParticle[],
    score:0, lives:3, wave:1,
    fmDir:1, fmX:0, fmSpeed:0.6, fmDropPending:false,
    nextShoot:0, nextEnemyShoot:0, nextDive:0,
    bulletId:0, particleId:0,
    running:false, frameId:0,
  });

  const [phase, setPhase] = useState<"idle"|"playing"|"over">("idle");
  const [final, setFinal] = useState({ score:0, wave:1 });

  const getAudio = useCallback(() => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext||(window as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext!)();
    if (audioCtxRef.current.state==="suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, [audioCtxRef]);

  const spawnEnemies = useCallback((wave:number, CW:number) => {
    const g = G.current;
    const spX = (CW - ENEMY_COLS*38) / 2;
    g.enemies = [];
    for (let row=0; row<ENEMY_ROWS; row++)
      for (let col=0; col<ENEMY_COLS; col++)
        g.enemies.push({ id:row*ENEMY_COLS+col, col, row, x:spX+col*38+19, y:44+row*36, alive:true, diving:false, diveVx:0, diveVy:0, diveReturnX:spX+col*38+19, diveReturnY:44+row*36 });
    g.fmX = 0; g.fmDir = 1; g.fmSpeed = 0.5+wave*0.08;
    g.nextDive = performance.now()+3000;
  }, []);

  const explode = useCallback((x:number, y:number, color:string) => {
    const g = G.current;
    for (let i=0; i<10; i++) {
      const angle = (Math.PI*2/10)*i + Math.random()*0.5;
      const spd = 1.5+Math.random()*2.5;
      g.particles.push({ x, y, vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd, life:35+Math.random()*20, color });
    }
  }, []);

  const draw = useCallback((now:number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const g = G.current;
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle="#030008"; ctx.fillRect(0,0,W,H);
    // 별들
    for (let i=0; i<40; i++) {
      const sx=((i*137+now*0.01*(i%3+1)*0.3)%W+W)%W;
      const sy=((i*97+now*0.008*(i%2+1)*0.5)%H+H)%H;
      const bright=0.3+0.4*Math.sin(now*0.001+i);
      ctx.fillStyle=`rgba(255,255,255,${bright})`; ctx.fillRect(sx,sy,1,1);
    }

    // 적
    g.enemies.forEach(e => {
      if (!e.alive) return;
      const color = ENEMY_COLORS[e.row];
      ctx.shadowBlur=12; ctx.shadowColor=color; ctx.strokeStyle=color; ctx.lineWidth=1.5;
      // 외계인 몸통
      ctx.beginPath();
      ctx.moveTo(e.x,e.y-10); ctx.lineTo(e.x+10,e.y+6); ctx.lineTo(e.x+5,e.y+2);
      ctx.lineTo(e.x,e.y+8); ctx.lineTo(e.x-5,e.y+2); ctx.lineTo(e.x-10,e.y+6); ctx.closePath();
      ctx.stroke();
      // 눈
      ctx.fillStyle=color; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.arc(e.x-3,e.y-2,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x+3,e.y-2,2,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    });

    // 플레이어
    const p = g.player;
    if (p.invincible<1 || Math.floor(now/80)%2===0) {
      ctx.shadowBlur=18; ctx.shadowColor="#00ffff";
      ctx.strokeStyle="#00ffff"; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(p.x,p.y-14); ctx.lineTo(p.x+12,p.y+10); ctx.lineTo(p.x+5,p.y+5);
      ctx.lineTo(p.x,p.y+8); ctx.lineTo(p.x-5,p.y+5); ctx.lineTo(p.x-12,p.y+10); ctx.closePath();
      ctx.stroke();
      // 엔진불꽃
      ctx.strokeStyle=`rgba(0,200,255,${0.5+0.5*Math.sin(now*0.02)})`; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(p.x-5,p.y+8); ctx.lineTo(p.x,p.y+16); ctx.lineTo(p.x+5,p.y+8); ctx.stroke();
      ctx.shadowBlur=0;
    }

    // 총알
    g.bullets.forEach(b => {
      if (b.fromPlayer) {
        ctx.shadowBlur=10; ctx.shadowColor="#ffff00";
        ctx.strokeStyle="#ffff44"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x,b.y+12); ctx.stroke();
      } else {
        ctx.shadowBlur=8; ctx.shadowColor="#ff4040";
        ctx.strokeStyle="#ff6060"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x,b.y-10); ctx.stroke();
      }
      ctx.shadowBlur=0;
    });

    // 파티클
    g.particles.forEach(pt => {
      const a = pt.life/55;
      ctx.fillStyle=pt.color+Math.round(a*255).toString(16).padStart(2,"0");
      ctx.fillRect(pt.x-1.5,pt.y-1.5,3,3);
    });

    // HUD
    ctx.shadowBlur=8; ctx.shadowColor="#ff00ff";
    ctx.font="bold 16px monospace"; ctx.textAlign="left"; ctx.fillStyle="#ff88ff";
    ctx.fillText(`${g.score}`,8,22);
    ctx.textAlign="right"; ctx.fillStyle="#44ffff";
    ctx.fillText(`WAVE ${g.wave}`,W-8,22);
    // 라이프
    for (let i=0;i<g.lives;i++) {
      ctx.fillStyle="#00ffff"; ctx.shadowColor="#00ffff";
      ctx.beginPath(); ctx.moveTo(W/2-24+i*20,H-12); ctx.lineTo(W/2-18+i*20,H-4); ctx.lineTo(W/2-12+i*20,H-12); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur=0;
  }, []);

  const loop = useCallback(() => {
    const g = G.current; if (!g.running) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const now = performance.now();
    const inp = inputRef.current;

    // 플레이어 이동
    if (inp.left)  g.player.x = Math.max(14, g.player.x-4);
    if (inp.right) g.player.x = Math.min(W-14, g.player.x+4);
    if (g.player.invincible>0) g.player.invincible--;

    // 플레이어 자동 발사
    if (now > g.nextShoot) {
      g.bullets.push({ id:g.bulletId++, x:g.player.x, y:g.player.y-14, vy:-9, fromPlayer:true });
      g.nextShoot = now+420;
      try { playClick(getAudio(),SND_SHOOT,0.8+Math.random()*0.1); } catch(_){}
    }

    // 대형 이동
    const alive = g.enemies.filter(e=>e.alive&&!e.diving);
    if (alive.length>0) {
      const minX = Math.min(...alive.map(e=>e.x));
      const maxX = Math.max(...alive.map(e=>e.x));
      if (maxX >= W-18) { g.fmDir=-1; g.fmDropPending=true; }
      if (minX <= 18)   { g.fmDir=1;  g.fmDropPending=true; }
      g.fmX += g.fmDir * g.fmSpeed;
      const drop = g.fmDropPending ? 12 : 0;
      g.enemies.forEach(e => {
        if (!e.alive||e.diving) return;
        e.x += g.fmDir * g.fmSpeed;
        e.y += drop;
        e.diveReturnX = e.x; e.diveReturnY = e.y;
      });
      if (g.fmDropPending) g.fmDropPending = false;
    }

    // 다이브
    if (now > g.nextDive) {
      const candidates = g.enemies.filter(e=>e.alive&&!e.diving);
      if (candidates.length>0) {
        const diver = candidates[Math.floor(Math.random()*candidates.length)];
        diver.diving=true;
        const dx = g.player.x-diver.x, dy = (g.player.y-20)-diver.y;
        const len = Math.hypot(dx,dy)||1;
        diver.diveVx = dx/len*4; diver.diveVy = dy/len*4;
      }
      g.nextDive = now + 2000 + Math.random()*2000;
    }

    // 다이브 적 이동
    g.enemies.forEach(e => {
      if (!e.alive||!e.diving) return;
      e.x += e.diveVx; e.y += e.diveVy;
      e.diveVy += 0.08;
      if (e.y > H+30) { e.x=e.diveReturnX; e.y=-30; e.diveVy=-3; e.diveVx=(e.diveReturnX-e.x)*0.05; }
      if (Math.abs(e.x-e.diveReturnX)<15 && Math.abs(e.y-e.diveReturnY)<15 && e.y > e.diveReturnY-10) {
        e.diving=false; e.x=e.diveReturnX; e.y=e.diveReturnY;
      }
    });

    // 적 발사
    if (now > g.nextEnemyShoot) {
      const shooters = g.enemies.filter(e=>e.alive);
      if (shooters.length>0) {
        const sh = shooters[Math.floor(Math.random()*shooters.length)];
        g.bullets.push({ id:g.bulletId++, x:sh.x, y:sh.y+12, vy:3.5+g.wave*0.3, fromPlayer:false });
      }
      g.nextEnemyShoot = now + 1200 - g.wave*60;
    }

    // 총알 이동
    g.bullets.forEach(b => { b.y += b.vy; });
    g.bullets = g.bullets.filter(b => b.y>-20 && b.y<H+20);

    // 충돌: 플레이어 총알 vs 적
    g.bullets = g.bullets.filter(pb => {
      if (!pb.fromPlayer) return true;
      const hit = g.enemies.find(e=>e.alive&&Math.abs(e.x-pb.x)<14&&Math.abs(e.y-pb.y)<14);
      if (hit) {
        hit.alive=false;
        g.score += hit.diving?200:100;
        explode(hit.x,hit.y,ENEMY_COLORS[hit.row]);
        try { playClick(getAudio(),SND_HIT,1.0+Math.random()*0.1); } catch(_){}
        return false;
      }
      return true;
    });

    // 충돌: 적 총알 vs 플레이어
    if (g.player.invincible===0) {
      const hit = g.bullets.find(b=>!b.fromPlayer&&Math.abs(b.x-g.player.x)<14&&Math.abs(b.y-g.player.y)<14);
      if (hit) {
        g.bullets=g.bullets.filter(b=>b!==hit);
        g.lives--;
        g.player.invincible=120;
        explode(g.player.x,g.player.y,"#00ffff");
        try { playClick(getAudio(),SND_DIE); } catch(_){}
        if (g.lives<=0) { g.running=false; setFinal({score:g.score,wave:g.wave}); setPhase("over"); return; }
      }
      // 다이브 적과 충돌
      const diver = g.enemies.find(e=>e.alive&&e.diving&&Math.abs(e.x-g.player.x)<18&&Math.abs(e.y-g.player.y)<18);
      if (diver) {
        diver.alive=false; g.lives--;
        g.player.invincible=120;
        explode(diver.x,diver.y,ENEMY_COLORS[diver.row]);
        try { playClick(getAudio(),SND_DIE); } catch(_){}
        if (g.lives<=0) { g.running=false; setFinal({score:g.score,wave:g.wave}); setPhase("over"); return; }
      }
    }

    // 웨이브 클리어
    if (g.enemies.every(e=>!e.alive)) {
      g.wave++;
      spawnEnemies(g.wave, W);
    }

    // 적이 아래로 내려옴
    if (g.enemies.some(e=>e.alive&&!e.diving&&e.y>H-50)) {
      g.running=false; setFinal({score:g.score,wave:g.wave}); setPhase("over"); return;
    }

    // 파티클
    g.particles.forEach(pt => { pt.x+=pt.vx; pt.y+=pt.vy; pt.vy+=0.08; pt.life--; });
    g.particles=g.particles.filter(pt=>pt.life>0);

    draw(now);
    g.frameId=requestAnimationFrame(loop);
  }, [draw, getAudio, explode, spawnEnemies]);

  const startGame = useCallback(() => {
    const g=G.current; cancelAnimationFrame(g.frameId);
    const canvas=canvasRef.current; if(!canvas) return;
    const W=canvas.width, H=canvas.height;
    g.player={x:W/2,y:H-30,invincible:0};
    g.bullets=[]; g.particles=[]; g.score=0; g.lives=3; g.wave=1;
    g.bulletId=0; g.nextShoot=0; g.nextEnemyShoot=performance.now()+2000; g.nextDive=performance.now()+3000;
    g.running=true;
    spawnEnemies(1,W);
    setPhase("playing");
    g.frameId=requestAnimationFrame(loop);
  }, [loop, spawnEnemies]);

  useEffect(() => {
    const dn=(e:KeyboardEvent)=>{
      if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A") inputRef.current.left=true;
      if(e.key==="ArrowRight"||e.key==="d"||e.key==="D") inputRef.current.right=true;
      if((e.key==="Enter"||e.key==="r")&&phase!=="playing") startGame();
    };
    const up=(e:KeyboardEvent)=>{
      if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A") inputRef.current.left=false;
      if(e.key==="ArrowRight"||e.key==="d"||e.key==="D") inputRef.current.right=false;
    };
    window.addEventListener("keydown",dn); window.addEventListener("keyup",up);
    return()=>{ window.removeEventListener("keydown",dn); window.removeEventListener("keyup",up); };
  },[startGame,phase]);

  useEffect(() => {
    const canvas=canvasRef.current; if(!canvas) return;
    canvas.width=Math.min(340,window.innerWidth-40);
    canvas.height=Math.round(canvas.width*1.4);
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    ctx.fillStyle="#030008"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font="bold 22px monospace"; ctx.textAlign="center";
    ctx.fillStyle="#ff88ff"; ctx.shadowBlur=14; ctx.shadowColor="#ff00ff";
    ctx.fillText("NEON GALAGA",canvas.width/2,canvas.height/2-14);
    ctx.shadowBlur=0; ctx.font="12px monospace"; ctx.fillStyle="rgba(255,160,255,0.5)";
    ctx.fillText("START 눌러봐",canvas.width/2,canvas.height/2+12);
    // 플레이어 미리보기
    const px=canvas.width/2, py=canvas.height/2+50;
    ctx.shadowBlur=14; ctx.shadowColor="#00ffff"; ctx.strokeStyle="#00ffff"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(px,py-12); ctx.lineTo(px+10,py+8); ctx.lineTo(px,py+4); ctx.lineTo(px-10,py+8); ctx.closePath(); ctx.stroke();
    ctx.shadowBlur=0;
  },[]);

  useEffect(()=>()=>{ cancelAnimationFrame(G.current.frameId); G.current.running=false; },[]);

  const CW = canvasRef.current?.width ?? 340;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,width:"100%"}}>
      <canvas ref={canvasRef} style={{borderRadius:16,border:"1px solid rgba(200,0,255,0.2)",boxShadow:"0 0 40px rgba(180,0,255,0.18)"}}/>

      {phase==="idle"&&(
        <button onClick={startGame} style={{padding:"13px 52px",borderRadius:16,background:"linear-gradient(135deg,#cc00ff,#6600cc)",color:"white",fontWeight:900,fontSize:19,border:"none",cursor:"pointer",boxShadow:"0 0 22px rgba(200,0,255,0.55)",letterSpacing:3}}>START</button>
      )}
      {phase==="over"&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <div style={{fontFamily:"monospace",textAlign:"center"}}>
            <div style={{fontSize:24,fontWeight:900,color:"#ffff55",textShadow:"0 0 14px #ffff00"}}>{final.score.toLocaleString()}</div>
            <div style={{fontSize:12,color:"#80ffff",marginTop:3}}>WAVE {final.wave} 까지</div>
          </div>
          <button onClick={startGame} style={{padding:"11px 38px",borderRadius:14,background:"linear-gradient(135deg,#cc00ff,#6600cc)",color:"white",fontWeight:900,fontSize:16,border:"none",cursor:"pointer",boxShadow:"0 0 16px rgba(200,0,255,0.45)",letterSpacing:2}}>다시하기</button>
        </div>
      )}
      {phase==="playing"&&(
        <div style={{display:"flex",gap:16,width:"100%",maxWidth:CW}}>
          <button
            onPointerDown={e=>{e.preventDefault();inputRef.current.left=true;}}
            onPointerUp={()=>inputRef.current.left=false}
            onPointerLeave={()=>inputRef.current.left=false}
            style={{flex:1,height:68,borderRadius:16,background:"rgba(0,200,255,0.1)",border:"2px solid rgba(0,255,255,0.5)",boxShadow:"0 0 18px rgba(0,200,255,0.3)",cursor:"pointer",touchAction:"none",fontSize:28,color:"#44ffff"}}>◀</button>
          <button
            onPointerDown={e=>{e.preventDefault();inputRef.current.right=true;}}
            onPointerUp={()=>inputRef.current.right=false}
            onPointerLeave={()=>inputRef.current.right=false}
            style={{flex:1,height:68,borderRadius:16,background:"rgba(0,200,255,0.1)",border:"2px solid rgba(0,255,255,0.5)",boxShadow:"0 0 18px rgba(0,200,255,0.3)",cursor:"pointer",touchAction:"none",fontSize:28,color:"#44ffff"}}>▶</button>
        </div>
      )}
      <button onClick={onExit} style={{fontSize:12,color:"rgba(255,100,255,0.4)",background:"none",border:"none",cursor:"pointer"}}>← 키캡으로</button>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function KeycapPage() {
  const router = useRouter();
  const [pressed, setPressed] = useState<number|null>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [showThemes, setShowThemes] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [gameMode, setGameMode] = useState(false);
  const [customBg, setCustomBg] = useState("#1a1a2e");
  const [customKey, setCustomKey] = useState("#5a4a8a");
  const [customIcon, setCustomIcon] = useState("#c8b4ff");
  const [customSound, setCustomSound] = useState(0);

  const audioCtxRef = useRef<AudioContext|null>(null);
  const soundOnRef = useRef(true);
  const currentSoundRef = useRef<SP>(THEMES[0].sound);
  soundOnRef.current = soundOn;

  const customTheme: ThemeDef = {
    id:"custom",name:"커스텀",dot:customIcon,
    pageBg:`radial-gradient(ellipse at center,${adjBright(customBg,20)} 0%,${customBg} 100%)`,
    keyBg:`linear-gradient(180deg,${adjBright(customKey,22)} 0%,${customKey} 100%)`,
    keyDownBg:`linear-gradient(180deg,${adjBright(customKey,-20)} 0%,${adjBright(customKey,-32)} 100%)`,
    keyShadow:`0 8px 0 ${adjBright(customKey,-70)},inset 0 1px 0 rgba(255,255,255,0.12)`,
    keyDownShadow:`0 2px 0 ${adjBright(customKey,-90)},inset 0 2px 6px rgba(0,0,0,0.5)`,
    border:isLight(customKey)?"rgba(0,0,0,0.1)":"rgba(255,255,255,0.08)",
    topBorder:isLight(customKey)?"rgba(0,0,0,0.15)":"rgba(255,255,255,0.15)",
    iconColor:customIcon, btnColor:isLight(customKey)?"rgba(0,0,0,0.65)":customIcon,
    sound:THEMES[customSound].sound,
  };

  const ALL_THEMES = [...THEMES, customTheme];
  const T = gameMode ? THEMES[4] : (ALL_THEMES[themeIdx] ?? THEMES[0]);
  currentSoundRef.current = T.sound;

  const pressKey = useCallback((idx:number) => {
    if (soundOnRef.current) {
      try {
        if (!audioCtxRef.current)
          audioCtxRef.current = new (window.AudioContext||(window as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext!)();
        const ctx=audioCtxRef.current;
        if (ctx.state==="suspended") ctx.resume();
        playClick(ctx, currentSoundRef.current, PITCH_MULTS[idx]);
      } catch(_) {}
    }
    setPressed(idx); setTimeout(()=>setPressed(null),130);
  },[]);

  const btnStyle = { padding:"8px 16px",borderRadius:12,fontSize:15,fontWeight:700,background:T.keyBg,border:`1px solid ${T.border}`,boxShadow:T.keyShadow,cursor:"pointer",color:T.btnColor };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 select-none"
      style={{ background:T.pageBg, padding:"32px 20px", transition:"background 0.4s" }}>

      <button onClick={()=>router.back()} style={{...btnStyle,position:"fixed",top:16,left:16,zIndex:10}}>←</button>

      {gameMode ? (
        <GalagaGame audioCtxRef={audioCtxRef} onExit={()=>setGameMode(false)} />
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:16,width:"100%",maxWidth:340}}>
            {Array.from({length:9},(_,i)=>{
              const isDown=pressed===i;
              return (
                <button key={i} onPointerDown={e=>{e.preventDefault();pressKey(i);}}
                  style={{aspectRatio:"1",borderRadius:20,background:isDown?T.keyDownBg:T.keyBg,boxShadow:isDown?T.keyDownShadow:T.keyShadow,border:`1px solid ${T.border}`,borderTop:`1px solid ${T.topBorder}`,cursor:"pointer",transform:isDown?"translateY(6px)":"translateY(0)",transition:"transform 0.07s, box-shadow 0.07s",userSelect:"none",WebkitUserSelect:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <KeyIcon idx={i} color={T.iconColor}/>
                </button>
              );
            })}
          </div>

          <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
            <button onPointerDown={e=>e.preventDefault()} onClick={()=>setSoundOn(v=>!v)} style={{...btnStyle,opacity:soundOn?1:0.35}}>{soundOn?"🔊":"🔇"}</button>
            <button onPointerDown={e=>e.preventDefault()} onClick={()=>setShowThemes(v=>!v)} style={{...btnStyle,display:"flex",alignItems:"center",gap:7,fontSize:12}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:T.dot,display:"inline-block",boxShadow:`0 0 8px ${T.dot}`}}/>테마
            </button>
            <button onPointerDown={e=>e.preventDefault()} onClick={()=>setGameMode(true)} style={{...btnStyle,fontSize:13}}>🚀 갤러그</button>
          </div>

          {showThemes&&(
            <div style={{display:"flex",flexDirection:"column",gap:16,padding:"16px 20px",borderRadius:20,width:"100%",maxWidth:340,background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.08)",backdropFilter:"blur(12px)"}}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
                {ALL_THEMES.map((th,i)=>(
                  <button key={th.id} onPointerDown={e=>e.preventDefault()} onClick={()=>setThemeIdx(i)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,opacity:themeIdx===i?1:0.45,background:"none",border:"none",cursor:"pointer"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:th.dot,boxShadow:themeIdx===i?`0 0 0 2.5px white,0 0 12px ${th.dot}`:`0 0 0 2px rgba(255,255,255,0.2)`,transform:themeIdx===i?"scale(1.2)":"scale(1)",transition:"all 0.15s"}}/>
                    <span style={{fontSize:9,color:themeIdx===i?"white":"rgba(255,255,255,0.4)",fontWeight:700}}>{th.name}</span>
                  </button>
                ))}
              </div>
              {themeIdx===5&&(
                <>
                  <div style={{height:1,background:"rgba(255,255,255,0.08)"}}/>
                  <div style={{display:"flex",gap:0,justifyContent:"space-around"}}>
                    {([{label:"배경",value:customBg,set:setCustomBg},{label:"키",value:customKey,set:setCustomKey},{label:"아이콘",value:customIcon,set:setCustomIcon}] as {label:string;value:string;set:(v:string)=>void}[]).map(({label,value,set})=>(
                      <label key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",position:"relative"}}>
                        <div style={{width:44,height:44,borderRadius:14,background:value,border:"2.5px solid rgba(255,255,255,0.25)",boxShadow:`0 0 12px ${value}88`}}/>
                        <span style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontWeight:700}}>{label}</span>
                        <input type="color" value={value} onChange={e=>set(e.target.value)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
                      </label>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
                    {THEMES.map((th,i)=>(
                      <button key={th.id} onPointerDown={e=>e.preventDefault()} onClick={()=>setCustomSound(i)} style={{padding:"5px 10px",borderRadius:8,fontSize:10,fontWeight:700,cursor:"pointer",background:customSound===i?th.dot:"rgba(255,255,255,0.07)",color:customSound===i?"white":"rgba(255,255,255,0.45)",border:`1px solid ${customSound===i?th.dot:"rgba(255,255,255,0.1)"}`,transition:"all 0.15s"}}>{th.name}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
