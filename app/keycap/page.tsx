"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── 사운드 ───────────────────────────────────────────────────────────────────
type SP = { clickFreq:number; clickQ:number; clickVol:number; thumpStart:number; thumpEnd:number; thumpDecay:number; thumpVol:number };
function playClick(ctx:AudioContext, s:SP, mult=1.0) {
  const now=ctx.currentTime, dur=0.004;
  const buf=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*dur),ctx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*0.4));
  const src=ctx.createBufferSource(); src.buffer=buf;
  const bpf=ctx.createBiquadFilter(); bpf.type="bandpass"; bpf.frequency.value=s.clickFreq*mult; bpf.Q.value=s.clickQ;
  const ng=ctx.createGain(); ng.gain.setValueAtTime(s.clickVol,now); ng.gain.exponentialRampToValueAtTime(0.0001,now+dur);
  src.connect(bpf); bpf.connect(ng); ng.connect(ctx.destination); src.start(now);
  const osc=ctx.createOscillator(); osc.type="sine";
  osc.frequency.setValueAtTime(s.thumpStart*mult,now); osc.frequency.exponentialRampToValueAtTime(s.thumpEnd*mult,now+s.thumpDecay);
  const og=ctx.createGain(); og.gain.setValueAtTime(s.thumpVol,now); og.gain.exponentialRampToValueAtTime(0.0001,now+s.thumpDecay+0.01);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now+s.thumpDecay+0.02);
}

// ── 테마 ─────────────────────────────────────────────────────────────────────
type ThemeDef = { id:string; name:string; dot:string; pageBg:string; keyBg:string; keyDownBg:string; keyShadow:string; keyDownShadow:string; border:string; topBorder:string; iconColor:string; btnColor:string; sound:SP };
const THEMES:ThemeDef[] = [
  { id:"dark",name:"다크",dot:"#888",pageBg:"radial-gradient(ellipse at center,#1e1e2e 0%,#0d0d0d 100%)",keyBg:"linear-gradient(180deg,#525252 0%,#424242 100%)",keyDownBg:"linear-gradient(180deg,#363636 0%,#2e2e2e 100%)",keyShadow:"0 8px 0 #0a0a0a,inset 0 1px 0 rgba(255,255,255,0.1)",keyDownShadow:"0 2px 0 #080808,inset 0 2px 6px rgba(0,0,0,0.7)",border:"rgba(255,255,255,0.06)",topBorder:"rgba(255,255,255,0.1)",iconColor:"rgba(255,255,255,0.55)",btnColor:"rgba(255,255,255,0.6)",sound:{clickFreq:3500,clickQ:1.0,clickVol:0.28,thumpStart:240,thumpEnd:65,thumpDecay:0.055,thumpVol:0.20}},
  { id:"light",name:"라이트",dot:"#b0aba0",pageBg:"linear-gradient(135deg,#f0ede8 0%,#ddd8d0 100%)",keyBg:"linear-gradient(180deg,#faf8f5 0%,#eae7e2 100%)",keyDownBg:"linear-gradient(180deg,#e0ddd8 0%,#d0cdc8 100%)",keyShadow:"0 8px 0 #999,inset 0 1px 0 rgba(255,255,255,0.8)",keyDownShadow:"0 2px 0 #aaa,inset 0 2px 6px rgba(0,0,0,0.2)",border:"rgba(0,0,0,0.08)",topBorder:"rgba(255,255,255,0.7)",iconColor:"rgba(60,50,40,0.4)",btnColor:"rgba(60,50,40,0.7)",sound:{clickFreq:2200,clickQ:0.6,clickVol:0.16,thumpStart:160,thumpEnd:50,thumpDecay:0.07,thumpVol:0.13}},
  { id:"ocean",name:"오션",dot:"#0ea5e9",pageBg:"radial-gradient(ellipse at center,#0c1a2e 0%,#060e1a 100%)",keyBg:"linear-gradient(180deg,#163552 0%,#0e2540 100%)",keyDownBg:"linear-gradient(180deg,#0c2038 0%,#091828 100%)",keyShadow:"0 8px 0 #041020,inset 0 1px 0 rgba(14,165,233,0.2)",keyDownShadow:"0 2px 0 #030c18,inset 0 2px 6px rgba(0,0,0,0.8)",border:"rgba(14,165,233,0.12)",topBorder:"rgba(14,165,233,0.15)",iconColor:"rgba(100,200,255,0.6)",btnColor:"rgba(100,200,255,0.7)",sound:{clickFreq:1800,clickQ:0.5,clickVol:0.12,thumpStart:130,thumpEnd:40,thumpDecay:0.09,thumpVol:0.10}},
  { id:"retro",name:"레트로",dot:"#d4a853",pageBg:"linear-gradient(135deg,#2a1a08 0%,#1a1008 100%)",keyBg:"linear-gradient(180deg,#c8a870 0%,#b89060 100%)",keyDownBg:"linear-gradient(180deg,#a08050 0%,#907040 100%)",keyShadow:"0 8px 0 #3a2810,inset 0 1px 0 rgba(255,220,150,0.3)",keyDownShadow:"0 2px 0 #2a1808,inset 0 2px 6px rgba(0,0,0,0.5)",border:"rgba(212,168,83,0.15)",topBorder:"rgba(212,168,83,0.25)",iconColor:"rgba(42,26,8,0.4)",btnColor:"rgba(42,26,8,0.65)",sound:{clickFreq:5500,clickQ:2.0,clickVol:0.40,thumpStart:380,thumpEnd:90,thumpDecay:0.04,thumpVol:0.25}},
  { id:"neon",name:"네온",dot:"#ff00ff",pageBg:"radial-gradient(ellipse at center,#0d0020 0%,#050010 100%)",keyBg:"linear-gradient(180deg,#2a0055 0%,#1e003d 100%)",keyDownBg:"linear-gradient(180deg,#150030 0%,#0d0020 100%)",keyShadow:"0 8px 0 #060010,0 0 12px rgba(200,0,255,0.5),inset 0 1px 0 rgba(255,0,255,0.2)",keyDownShadow:"0 2px 0 #040008,0 0 20px rgba(255,0,255,0.8),inset 0 2px 6px rgba(0,0,0,0.9)",border:"rgba(200,0,255,0.15)",topBorder:"rgba(255,0,255,0.15)",iconColor:"rgba(255,100,255,0.65)",btnColor:"rgba(255,100,255,0.7)",sound:{clickFreq:6000,clickQ:3.0,clickVol:0.22,thumpStart:800,thumpEnd:200,thumpDecay:0.03,thumpVol:0.18}},
];
const PITCH_MULTS=[1.3,1.0,0.8,1.2,1.0,0.85,1.15,1.0,0.9];
const SND_SHOOT:SP={clickFreq:4800,clickQ:3,clickVol:0.18,thumpStart:500,thumpEnd:200,thumpDecay:0.03,thumpVol:0.12};
const SND_HIT:SP  ={clickFreq:800, clickQ:1,clickVol:0.25,thumpStart:200,thumpEnd:60, thumpDecay:0.06,thumpVol:0.20};
const SND_DIE:SP  ={clickFreq:150, clickQ:0.5,clickVol:0.3,thumpStart:80,thumpEnd:30, thumpDecay:0.15,thumpVol:0.25};
const SND_EAT:SP  ={clickFreq:2200,clickQ:2,clickVol:0.14,thumpStart:330,thumpEnd:550,thumpDecay:0.09,thumpVol:0.14};

function adjBright(hex:string,amt:number):string{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);const c=(v:number)=>Math.max(0,Math.min(255,v+amt)).toString(16).padStart(2,"0");return`#${c(r)}${c(g)}${c(b)}`;}
function isLight(hex:string):boolean{return parseInt(hex.slice(1,3),16)*0.299+parseInt(hex.slice(3,5),16)*0.587+parseInt(hex.slice(5,7),16)*0.114>140;}

function KeyIcon({ idx, color }: { idx:number; color:string }) {
  const s=38, p={stroke:color,strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,fill:"none"};
  const icons=[
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
  return icons[idx]??null;
}

// ── 공통 AudioContext helper ──────────────────────────────────────────────────
function makeGetAudio(audioCtxRef: React.MutableRefObject<AudioContext|null>) {
  return () => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext||(window as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext!)();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };
}

// ── 갤러그 ───────────────────────────────────────────────────────────────────
interface GEnemy  { id:number; col:number; row:number; x:number; y:number; tx:number; ty:number; alive:boolean; entering:boolean; entryDelay:number; diving:boolean; diveVx:number; diveVy:number; diveReturnX:number; diveReturnY:number }
interface GBullet { id:number; x:number; y:number; vx:number; vy:number; fromPlayer:boolean }
interface GParticle { x:number; y:number; vx:number; vy:number; life:number; color:string; size:number }
interface GPowerUp { id:number; x:number; y:number; vy:number; type:"double"|"shield"|"bomb" }
interface GPopup   { id:number; x:number; y:number; vy:number; life:number; text:string; color:string }
interface GBoss    { x:number; y:number; hp:number; maxHp:number; timer:number; nextShoot:number; phase:number; invincible:number; alive:boolean }

const ENEMY_ROWS=3, ENEMY_COLS=6;
const ENEMY_COLORS=["#ff44ff","#44ffff","#aaff44"] as const;
const isBossWave=(w:number)=>w%3===0;

function GalagaGame({ audioCtxRef, onExit }:{ audioCtxRef:React.MutableRefObject<AudioContext|null>; onExit:()=>void }) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const inputRef =useRef({ left:false, right:false });
  const getAudio =useCallback(()=>makeGetAudio(audioCtxRef)(),[audioCtxRef]);

  const G=useRef({
    player:{ x:170, y:0, invincible:0 },
    enemies:[] as GEnemy[], bullets:[] as GBullet[], particles:[] as GParticle[],
    powerups:[] as GPowerUp[], popups:[] as GPopup[], boss:null as GBoss|null,
    score:0, combo:0, maxCombo:0, lives:3, wave:1,
    powerType:"none" as "none"|"double"|"shield", powerEnd:0,
    fmDir:1, fmSpeed:0.6, fmDropPending:false,
    shake:0, flash:0, entering:false,
    nextShoot:0, nextEnemyShoot:0, nextDive:0,
    bulletId:0, pupId:0, popId:0, running:false, frameId:0, frame:0,
  });
  const [phase, setPhase]=useState<"idle"|"playing"|"over">("idle");
  const [final, setFinal]=useState({score:0,wave:1,maxCombo:0});

  const addPopup=useCallback((x:number,y:number,text:string,color:string)=>{ G.current.popups.push({id:G.current.popId++,x,y,vy:-1.5,life:45,text,color}); },[]);
  const explode=useCallback((x:number,y:number,color:string,count=10)=>{
    for(let i=0;i<count;i++){const a=(Math.PI*2/count)*i+Math.random()*0.4,spd=1.5+Math.random()*3;G.current.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:30+Math.random()*25,color,size:1.5+Math.random()*2});}
  },[]);

  const spawnEnemies=useCallback((wave:number,CW:number)=>{
    const g=G.current,spX=(CW-ENEMY_COLS*40)/2;
    g.enemies=[];
    for(let row=0;row<ENEMY_ROWS;row++) for(let col=0;col<ENEMY_COLS;col++){
      const tx=spX+col*40+20,ty=48+row*38;
      g.enemies.push({id:row*ENEMY_COLS+col,col,row,x:tx,y:-50,tx,ty,alive:true,entering:true,entryDelay:col*6+row*5,diving:false,diveVx:0,diveVy:0,diveReturnX:tx,diveReturnY:ty});
    }
    g.fmDir=1;g.fmSpeed=0.45+wave*0.07;g.fmDropPending=false;g.entering=true;
    g.nextDive=performance.now()+5000;g.nextEnemyShoot=performance.now()+3500;
  },[]);

  const spawnBoss=useCallback((wave:number,CW:number)=>{
    const g=G.current,hp=10+Math.floor(wave/3)*5;
    g.boss={x:CW/2,y:70,hp,maxHp:hp,timer:0,nextShoot:performance.now()+2000,phase:0,invincible:0,alive:true};
    g.enemies=[];g.entering=false;g.nextEnemyShoot=9e9;
  },[]);

  const draw=useCallback((now:number)=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");if(!ctx)return;
    const g=G.current,W=canvas.width,H=canvas.height;
    ctx.save();
    if(g.shake>0){const a=Math.min(g.shake*0.35,9);ctx.translate((Math.random()*2-1)*a,(Math.random()*2-1)*a);g.shake--;}
    ctx.fillStyle="#030008";ctx.fillRect(0,0,W,H);
    const f=g.frame;
    for(let i=0;i<90;i++){const layer=i%3,speed=[0.12,0.35,0.9][layer],sz=[0.8,1.3,2.2][layer];ctx.fillStyle=`rgba(255,255,255,${layer===2?0.5+0.4*Math.sin(f*0.04+i):0.15+0.15*(i%3)})`;ctx.fillRect((i*137)%W,((i*97+f*speed)%H+H)%H,sz,sz);}
    if(g.boss?.alive){
      const boss=g.boss,bw=Math.round(W*0.6),bx2=(W-bw)/2;
      ctx.fillStyle="rgba(255,0,0,0.18)";ctx.fillRect(bx2,6,bw,9);
      const hpColor=boss.hp/boss.maxHp>0.5?"#ff4444":boss.hp/boss.maxHp>0.25?"#ff8800":"#ffff00";
      ctx.fillStyle=hpColor;ctx.shadowBlur=8;ctx.shadowColor=hpColor;ctx.fillRect(bx2,6,Math.round(bw*boss.hp/boss.maxHp),9);
      ctx.strokeStyle="rgba(255,100,100,0.4)";ctx.lineWidth=1;ctx.strokeRect(bx2,6,bw,9);
      ctx.font="bold 10px monospace";ctx.textAlign="left";ctx.fillStyle="rgba(255,150,150,0.7)";ctx.shadowBlur=0;ctx.fillText("BOSS",bx2+3,14);
      const bc=boss.invincible>0?"#ffffff":"#ff3333",pulse=1+0.05*Math.sin(f*0.08);
      ctx.shadowBlur=22;ctx.shadowColor=bc;ctx.strokeStyle=bc;ctx.lineWidth=2.2;
      ctx.beginPath();ctx.moveTo(boss.x,boss.y-28*pulse);ctx.lineTo(boss.x+32,boss.y+14);ctx.lineTo(boss.x+20,boss.y+8);ctx.lineTo(boss.x+14,boss.y+24);ctx.lineTo(boss.x,boss.y+18);ctx.lineTo(boss.x-14,boss.y+24);ctx.lineTo(boss.x-20,boss.y+8);ctx.lineTo(boss.x-32,boss.y+14);ctx.closePath();ctx.stroke();
      ctx.fillStyle=bc;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(boss.x-6,boss.y-5,3.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(boss.x+6,boss.y-5,3.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }
    g.enemies.forEach(e=>{if(!e.alive)return;const color=ENEMY_COLORS[e.row];ctx.shadowBlur=12;ctx.shadowColor=color;ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(e.x,e.y-11);ctx.lineTo(e.x+11,e.y+7);ctx.lineTo(e.x+6,e.y+3);ctx.lineTo(e.x,e.y+9);ctx.lineTo(e.x-6,e.y+3);ctx.lineTo(e.x-11,e.y+7);ctx.closePath();ctx.stroke();ctx.fillStyle=color;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(e.x-3,e.y-2,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(e.x+3,e.y-2,2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;});
    const p=g.player;
    if(p.invincible<1||Math.floor(now/80)%2===0){
      const pc=g.powerType==="shield"?"#88ffff":"#00ffff";
      ctx.shadowBlur=18;ctx.shadowColor=pc;ctx.strokeStyle=pc;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(p.x,p.y-14);ctx.lineTo(p.x+12,p.y+10);ctx.lineTo(p.x+5,p.y+5);ctx.lineTo(p.x,p.y+8);ctx.lineTo(p.x-5,p.y+5);ctx.lineTo(p.x-12,p.y+10);ctx.closePath();ctx.stroke();
      if(g.powerType==="double"){ctx.strokeStyle="rgba(255,255,0,0.5)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-4,p.y-12);ctx.lineTo(p.x-4,p.y-20);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x+4,p.y-12);ctx.lineTo(p.x+4,p.y-20);ctx.stroke();}
      if(g.powerType==="shield"){ctx.strokeStyle=`rgba(100,200,255,${0.3+0.3*Math.sin(f*0.1)})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2*Math.max(0,(g.powerEnd-now)/10000));ctx.stroke();}
      ctx.strokeStyle=`rgba(0,200,255,${0.5+0.5*Math.sin(f*0.25)})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x-5,p.y+8);ctx.lineTo(p.x,p.y+16);ctx.lineTo(p.x+5,p.y+8);ctx.stroke();ctx.shadowBlur=0;
    }
    g.powerups.forEach(pu=>{
      const pulse=1+0.18*Math.sin(f*0.12+pu.id);ctx.textAlign="center";
      if(pu.type==="double"){ctx.shadowBlur=14;ctx.shadowColor="#ffff00";ctx.strokeStyle="#ffff00";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(pu.x-12,pu.y-10,24,20,6);ctx.stroke();ctx.fillStyle="#ffff00";ctx.font="bold 12px monospace";ctx.fillText("×2",pu.x,pu.y+4);}
      else if(pu.type==="shield"){ctx.shadowBlur=14;ctx.shadowColor="#44aaff";ctx.strokeStyle="#44aaff";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(pu.x,pu.y,11*pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(68,170,255,0.25)";ctx.fill();ctx.fillStyle="#44aaff";ctx.font="bold 12px monospace";ctx.fillText("S",pu.x,pu.y+4);}
      else{ctx.shadowBlur=14;ctx.shadowColor="#ff6600";ctx.fillStyle="#ff6600";ctx.beginPath();ctx.arc(pu.x,pu.y,10*pulse,0,Math.PI*2);ctx.fill();ctx.fillStyle="white";ctx.font="bold 11px monospace";ctx.fillText("B",pu.x,pu.y+4);}
      ctx.shadowBlur=0;
    });
    g.bullets.forEach(b=>{
      if(b.fromPlayer){ctx.shadowBlur=10;ctx.shadowColor="#ffff44";ctx.strokeStyle="#ffff44";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(b.x,b.y+10);ctx.lineTo(b.x,b.y-2);ctx.stroke();}
      else{ctx.shadowBlur=8;ctx.shadowColor="#ff4040";ctx.strokeStyle="#ff6060";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(b.x,b.y-8);ctx.lineTo(b.x+b.vx*3,b.y+4);ctx.stroke();}
      ctx.shadowBlur=0;
    });
    g.particles.forEach(pt=>{const a=pt.life/55;ctx.fillStyle=pt.color+Math.round(Math.min(1,a)*200).toString(16).padStart(2,"0");ctx.fillRect(pt.x-pt.size/2,pt.y-pt.size/2,pt.size,pt.size);});
    ctx.textAlign="center";
    g.popups.forEach(pop=>{ctx.globalAlpha=Math.min(1,pop.life/20);ctx.font="bold 14px monospace";ctx.fillStyle=pop.color;ctx.shadowBlur=8;ctx.shadowColor=pop.color;ctx.fillText(pop.text,pop.x,pop.y);});
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    if(g.combo>=3){ctx.font=`bold ${Math.min(13+g.combo,22)}px monospace`;ctx.textAlign="center";ctx.fillStyle=`rgba(255,220,0,${Math.min(1,(g.combo-2)*0.25)})`;ctx.shadowBlur=14;ctx.shadowColor="#ffaa00";ctx.fillText(`COMBO ×${g.combo}!`,W/2,H/2-10);ctx.shadowBlur=0;}
    ctx.shadowBlur=8;ctx.shadowColor="#ff00ff";ctx.font="bold 15px monospace";ctx.textAlign="left";ctx.fillStyle="#ff88ff";ctx.fillText(`${g.score}`,8,22);
    ctx.shadowColor="#44ffff";ctx.textAlign="right";ctx.fillStyle="#44ffff";ctx.fillText(`WAVE ${g.wave}`,W-8,22);
    if(g.powerType!=="none"&&g.powerEnd>now){const sec=Math.ceil((g.powerEnd-now)/1000),col=g.powerType==="double"?"#ffff44":"#44aaff";ctx.shadowColor=col;ctx.textAlign="center";ctx.fillStyle=col;ctx.font="bold 11px monospace";ctx.fillText(g.powerType==="double"?`×2 ${sec}s`:`SLD ${sec}s`,W/2,H-26);}
    for(let i=0;i<g.lives;i++){ctx.fillStyle="#00ffff";ctx.shadowColor="#00ffff";ctx.shadowBlur=8;const lx=W/2-20+i*20,ly=H-12;ctx.beginPath();ctx.moveTo(lx,ly-7);ctx.lineTo(lx+7,ly+4);ctx.lineTo(lx,ly+1);ctx.lineTo(lx-7,ly+4);ctx.closePath();ctx.fill();}
    ctx.shadowBlur=0;
    if(g.flash>0){ctx.fillStyle=`rgba(255,255,255,${Math.min(1,g.flash)})`;ctx.fillRect(0,0,W,H);g.flash=Math.max(0,g.flash-0.05);}
    ctx.restore();
  },[]);

  const loop=useCallback(()=>{
    const g=G.current;if(!g.running)return;
    const canvas=canvasRef.current;if(!canvas)return;
    const W=canvas.width,H=canvas.height,now=performance.now();
    g.frame++;
    const inp=inputRef.current;
    if(inp.left)g.player.x=Math.max(14,g.player.x-4.5);
    if(inp.right)g.player.x=Math.min(W-14,g.player.x+4.5);
    if(g.player.invincible>0)g.player.invincible--;
    if(g.powerType!=="none"&&now>g.powerEnd)g.powerType="none";
    if(g.entering){let any=false;g.enemies.forEach(e=>{if(!e.alive||!e.entering)return;if(g.frame<e.entryDelay+5){e.y=-50;e.x=e.tx;any=true;return;}const t=Math.min(1,(g.frame-e.entryDelay-5)/55);e.y=-50+(e.ty+50)*t;e.x=e.tx+Math.sin(t*Math.PI*3)*35*(1-t);if(t>=1){e.entering=false;e.x=e.tx;e.y=e.ty;e.diveReturnX=e.tx;e.diveReturnY=e.ty;}else any=true;});if(!any){g.entering=false;g.nextDive=now+1500;}}
    if(!g.entering){const alive=g.enemies.filter(e=>e.alive&&!e.diving&&!e.entering);if(alive.length>0){const minX=Math.min(...alive.map(e=>e.x)),maxX=Math.max(...alive.map(e=>e.x));if(maxX>=W-20){g.fmDir=-1;g.fmDropPending=true;}if(minX<=20){g.fmDir=1;g.fmDropPending=true;}const drop=g.fmDropPending?14:0;g.enemies.forEach(e=>{if(!e.alive||e.diving||e.entering)return;e.x+=g.fmDir*g.fmSpeed;e.y+=drop;e.diveReturnX=e.x;e.diveReturnY=e.y;});if(g.fmDropPending)g.fmDropPending=false;}}
    if(!g.entering&&now>g.nextDive){const cands=g.enemies.filter(e=>e.alive&&!e.diving);if(cands.length>0){const diver=cands[Math.floor(Math.random()*cands.length)];diver.diving=true;const dx=g.player.x-diver.x,dy=g.player.y-diver.y,len=Math.hypot(dx,dy)||1;diver.diveVx=dx/len*4.5;diver.diveVy=dy/len*4.5;}g.nextDive=now+1800+Math.random()*1800;}
    g.enemies.forEach(e=>{if(!e.alive||!e.diving)return;e.x+=e.diveVx;e.y+=e.diveVy;e.diveVy+=0.07;if(e.y>H+35){e.x=e.diveReturnX;e.y=-35;e.diveVy=-3.5;}if(Math.abs(e.x-e.diveReturnX)<18&&Math.abs(e.y-e.diveReturnY)<18&&e.y>e.diveReturnY-12){e.diving=false;e.x=e.diveReturnX;e.y=e.diveReturnY;}});
    if(now>g.nextEnemyShoot&&!g.entering){const sh=g.enemies.filter(e=>e.alive);if(sh.length>0){const src=sh[Math.floor(Math.random()*sh.length)];const dx=g.player.x-src.x,dy=g.player.y-src.y,len=Math.hypot(dx,dy)||1;g.bullets.push({id:g.bulletId++,x:src.x,y:src.y+12,vx:dx/len*2.5,vy:dy/len*3.5+1,fromPlayer:false});}g.nextEnemyShoot=now+Math.max(400,1000-g.wave*40);}
    if(g.boss?.alive){
      const boss=g.boss;boss.timer++;boss.x=W/2+Math.sin(boss.timer*0.022)*(W/2-55);if(boss.invincible>0)boss.invincible--;
      if(now>boss.nextShoot){const ph=boss.phase%4,px=g.player.x,py=g.player.y;
        if(ph===0){for(let i=-2;i<=2;i++){const a=Math.PI/2+i*0.28;g.bullets.push({id:g.bulletId++,x:boss.x,y:boss.y+28,vx:Math.cos(a)*3.5,vy:Math.sin(a)*3.5,fromPlayer:false});}boss.nextShoot=now+1800;}
        else if(ph===1){const dx=px-boss.x,dy=py-boss.y,len=Math.hypot(dx,dy)||1,perp={x:-dy/len,y:dx/len};for(let i=-1;i<=1;i++)g.bullets.push({id:g.bulletId++,x:boss.x+perp.x*i*12,y:boss.y+28,vx:dx/len*4+perp.x*i*0.5,vy:dy/len*4,fromPlayer:false});boss.nextShoot=now+2000;}
        else if(ph===2){for(let i=0;i<7;i++)g.bullets.push({id:g.bulletId++,x:boss.x+(i-3)*24,y:boss.y+28,vx:(i-3)*0.3,vy:4,fromPlayer:false});boss.nextShoot=now+2200;}
        else{for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2+boss.timer*0.06;g.bullets.push({id:g.bulletId++,x:boss.x,y:boss.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,fromPlayer:false});}boss.nextShoot=now+1600;}
        boss.phase++;}
      g.bullets=g.bullets.filter(pb=>{if(!pb.fromPlayer)return true;if(Math.abs(boss.x-pb.x)<32&&Math.abs(boss.y-pb.y)<32&&boss.invincible===0){boss.hp--;boss.invincible=18;g.flash=0.2;explode(pb.x,pb.y,"#ff4444",6);try{playClick(getAudio(),SND_HIT,0.9);}catch(_){}
        if(boss.hp<=0){boss.alive=false;g.flash=0.8;g.shake=35;for(let i=0;i<5;i++)explode(boss.x+(Math.random()*70-35),boss.y+(Math.random()*50-25),"#ff4444",12);const pts=5000+g.wave*500;g.score+=pts;g.combo++;if(g.combo>g.maxCombo)g.maxCombo=g.combo;addPopup(boss.x,boss.y-30,`+${pts}`,"#ff4444");try{playClick(getAudio(),SND_DIE,0.5);}catch(_){}g.boss=null;const nw=g.wave+1;g.wave=nw;setTimeout(()=>{if(!g.running)return;const cw=canvasRef.current?.width??340;if(isBossWave(nw))spawnBoss(nw,cw);else spawnEnemies(nw,cw);},2000);}return false;}return true;});
    }
    if(now>g.nextShoot){const interval=g.powerType==="double"?300:460;if(g.powerType==="double"){g.bullets.push({id:g.bulletId++,x:g.player.x-5,y:g.player.y-14,vx:0,vy:-10,fromPlayer:true});g.bullets.push({id:g.bulletId++,x:g.player.x+5,y:g.player.y-14,vx:0,vy:-10,fromPlayer:true});}else{g.bullets.push({id:g.bulletId++,x:g.player.x,y:g.player.y-14,vx:0,vy:-10,fromPlayer:true});}g.nextShoot=now+interval;try{playClick(getAudio(),SND_SHOOT,0.8+Math.random()*0.1);}catch(_){}}
    g.bullets.forEach(b=>{b.y+=b.vy;b.x+=b.vx;});g.bullets=g.bullets.filter(b=>b.y>-25&&b.y<H+25&&b.x>-25&&b.x<W+25);
    g.bullets=g.bullets.filter(pb=>{if(!pb.fromPlayer)return true;const hit=g.enemies.find(e=>e.alive&&!e.entering&&Math.abs(e.x-pb.x)<14&&Math.abs(e.y-pb.y)<14);if(hit){hit.alive=false;const pts=hit.diving?200:100;g.score+=pts;g.combo++;if(g.combo>g.maxCombo)g.maxCombo=g.combo;explode(hit.x,hit.y,ENEMY_COLORS[hit.row]);addPopup(hit.x,hit.y-14,`+${pts}`,ENEMY_COLORS[hit.row]);if(Math.random()<0.18){const types:Array<"double"|"shield"|"bomb">=["double","shield","bomb"];g.powerups.push({id:g.pupId++,x:hit.x,y:hit.y,vy:1.8,type:types[Math.floor(Math.random()*3)]});}try{playClick(getAudio(),SND_HIT,1+Math.random()*0.1);}catch(_){}return false;}return true;});
    if(g.player.invincible===0&&g.powerType!=="shield"){const hitB=g.bullets.find(b=>!b.fromPlayer&&Math.abs(b.x-g.player.x)<13&&Math.abs(b.y-g.player.y)<13),hitD=g.enemies.find(e=>e.alive&&e.diving&&Math.abs(e.x-g.player.x)<18&&Math.abs(e.y-g.player.y)<18);if(hitB||hitD){if(hitB)g.bullets=g.bullets.filter(b=>b!==hitB);if(hitD){hitD.alive=false;explode(hitD.x,hitD.y,ENEMY_COLORS[hitD.row]);}g.lives--;g.combo=0;g.player.invincible=140;g.shake=25;g.flash=0.45;explode(g.player.x,g.player.y,"#00ffff",14);try{playClick(getAudio(),SND_DIE);}catch(_){}if(g.lives<=0){g.running=false;setFinal({score:g.score,wave:g.wave,maxCombo:g.maxCombo});setPhase("over");return;}}}
    g.powerups.forEach(pu=>{pu.y+=pu.vy;});const collected:GPowerUp[]=[];g.powerups=g.powerups.filter(pu=>{if(pu.y>H+20)return false;if(Math.abs(pu.x-g.player.x)<22&&Math.abs(pu.y-g.player.y)<22){collected.push(pu);return false;}return true;});
    collected.forEach(pu=>{g.flash=0.15;if(pu.type==="bomb"){g.bullets=g.bullets.filter(b=>b.fromPlayer);let cl=0;g.enemies.forEach(e=>{if(e.alive){e.alive=false;explode(e.x,e.y,ENEMY_COLORS[e.row],6);g.score+=50;cl++;}});addPopup(g.player.x,g.player.y-30,cl>0?`BOMB +${cl*50}`:"BOMB!","#ff6600");g.flash=0.5;g.shake=20;}else if(pu.type==="shield"){g.powerType="shield";g.powerEnd=now+10000;addPopup(g.player.x,g.player.y-30,"SHIELD!","#44aaff");}else{g.powerType="double";g.powerEnd=now+15000;addPopup(g.player.x,g.player.y-30,"DOUBLE SHOT!","#ffff44");}});
    if(!g.boss&&g.enemies.every(e=>!e.alive)&&!g.entering){const nw=g.wave+1;g.wave=nw;if(isBossWave(nw))spawnBoss(nw,W);else spawnEnemies(nw,W);}
    if(g.enemies.some(e=>e.alive&&!e.entering&&e.y>H-40)){g.running=false;setFinal({score:g.score,wave:g.wave,maxCombo:g.maxCombo});setPhase("over");return;}
    g.particles.forEach(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.vy+=0.07;pt.life--;});g.particles=g.particles.filter(pt=>pt.life>0);
    g.popups.forEach(pop=>{pop.y+=pop.vy;pop.life--;});g.popups=g.popups.filter(pop=>pop.life>0);
    draw(now);g.frameId=requestAnimationFrame(loop);
  },[draw,getAudio,explode,addPopup,spawnEnemies,spawnBoss]);

  const startGame=useCallback(()=>{
    const g=G.current;cancelAnimationFrame(g.frameId);const canvas=canvasRef.current;if(!canvas)return;
    const W=canvas.width,H=canvas.height;g.player={x:W/2,y:H-32,invincible:0};g.bullets=[];g.particles=[];g.powerups=[];g.popups=[];g.boss=null;g.score=0;g.combo=0;g.maxCombo=0;g.lives=3;g.wave=1;g.powerType="none";g.powerEnd=0;g.shake=0;g.flash=0;g.frame=0;g.bulletId=0;g.pupId=0;g.popId=0;g.nextShoot=0;g.running=true;spawnEnemies(1,W);setPhase("playing");g.frameId=requestAnimationFrame(loop);
  },[loop,spawnEnemies]);

  useEffect(()=>{
    const dn=(e:KeyboardEvent)=>{if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A")inputRef.current.left=true;if(e.key==="ArrowRight"||e.key==="d"||e.key==="D")inputRef.current.right=true;if((e.key==="Enter"||e.key===" ")&&phase!=="playing")startGame();};
    const up=(e:KeyboardEvent)=>{if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A")inputRef.current.left=false;if(e.key==="ArrowRight"||e.key==="d"||e.key==="D")inputRef.current.right=false;};
    window.addEventListener("keydown",dn);window.addEventListener("keyup",up);return()=>{window.removeEventListener("keydown",dn);window.removeEventListener("keyup",up);};
  },[startGame,phase]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;canvas.width=Math.min(340,window.innerWidth-40);canvas.height=Math.round(canvas.width*1.45);
    const ctx=canvas.getContext("2d");if(!ctx)return;ctx.fillStyle="#030008";ctx.fillRect(0,0,canvas.width,canvas.height);for(let i=0;i<80;i++){ctx.fillStyle=`rgba(255,255,255,${0.1+0.4*(i%3)/3})`;ctx.fillRect((i*137)%canvas.width,(i*97)%canvas.height,[0.8,1.3,2][i%3],[0.8,1.3,2][i%3]);}
    ctx.shadowBlur=18;ctx.shadowColor="#ff00ff";ctx.font="bold 24px monospace";ctx.textAlign="center";ctx.fillStyle="#ff88ff";ctx.fillText("NEON GALAGA",canvas.width/2,canvas.height/2-18);ctx.shadowBlur=8;ctx.shadowColor="#44ffff";ctx.font="10px monospace";ctx.fillStyle="rgba(100,220,255,0.55)";ctx.fillText("← A / → D  |  터치 버튼",canvas.width/2,canvas.height/2+8);ctx.shadowBlur=0;
    const px=canvas.width/2,py=canvas.height/2+46;ctx.shadowBlur=16;ctx.shadowColor="#00ffff";ctx.strokeStyle="#00ffff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py-12);ctx.lineTo(px+11,py+8);ctx.lineTo(px,py+4);ctx.lineTo(px-11,py+8);ctx.closePath();ctx.stroke();ctx.shadowBlur=0;
  },[]);
  useEffect(()=>()=>{cancelAnimationFrame(G.current.frameId);G.current.running=false;},[]);
  const CW=canvasRef.current?.width??340;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,width:"100%"}}>
      <canvas ref={canvasRef} style={{borderRadius:16,border:"1px solid rgba(200,0,255,0.2)",boxShadow:"0 0 40px rgba(180,0,255,0.15)"}}/>
      {phase==="idle"&&<button onClick={startGame} style={{padding:"13px 52px",borderRadius:16,background:"linear-gradient(135deg,#cc00ff,#6600cc)",color:"white",fontWeight:900,fontSize:19,border:"none",cursor:"pointer",boxShadow:"0 0 24px rgba(200,0,255,0.55)",letterSpacing:3}}>START</button>}
      {phase==="over"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}><div style={{fontFamily:"monospace",textAlign:"center",lineHeight:1.8}}><div style={{fontSize:26,fontWeight:900,color:"#ffff55",textShadow:"0 0 16px #ffff00"}}>{final.score.toLocaleString()}</div><div style={{fontSize:12,color:"#80ffff"}}>WAVE {final.wave}</div>{final.maxCombo>=3&&<div style={{fontSize:11,color:"#ffcc44"}}>MAX COMBO ×{final.maxCombo}</div>}</div><button onClick={startGame} style={{padding:"11px 38px",borderRadius:14,background:"linear-gradient(135deg,#cc00ff,#6600cc)",color:"white",fontWeight:900,fontSize:16,border:"none",cursor:"pointer",boxShadow:"0 0 16px rgba(200,0,255,0.45)",letterSpacing:2}}>다시하기</button></div>}
      {phase==="playing"&&<div style={{display:"flex",gap:16,width:"100%",maxWidth:CW}}><button onPointerDown={e=>{e.preventDefault();inputRef.current.left=true;}} onPointerUp={()=>inputRef.current.left=false} onPointerLeave={()=>inputRef.current.left=false} style={{flex:1,height:68,borderRadius:16,background:"rgba(0,200,255,0.08)",border:"1.5px solid rgba(0,255,255,0.45)",boxShadow:"0 0 18px rgba(0,200,255,0.2)",cursor:"pointer",touchAction:"none",fontSize:30,color:"#44ffff"}}>◀</button><button onPointerDown={e=>{e.preventDefault();inputRef.current.right=true;}} onPointerUp={()=>inputRef.current.right=false} onPointerLeave={()=>inputRef.current.right=false} style={{flex:1,height:68,borderRadius:16,background:"rgba(0,200,255,0.08)",border:"1.5px solid rgba(0,255,255,0.45)",boxShadow:"0 0 18px rgba(0,200,255,0.2)",cursor:"pointer",touchAction:"none",fontSize:30,color:"#44ffff"}}>▶</button></div>}
      <button onClick={onExit} style={{fontSize:12,color:"rgba(255,100,255,0.35)",background:"none",border:"none",cursor:"pointer"}}>← 뒤로</button>
    </div>
  );
}

// ── 스네이크 (캐주얼 토이) ───────────────────────────────────────────────────
const SNAKE_GRID=20;
const FOOD_COLORS=["#ff44ff","#44ffff","#aaff44","#ffaa44","#ff4488"];

function SnakeGame({ audioCtxRef, onExit }:{ audioCtxRef:React.MutableRefObject<AudioContext|null>; onExit:()=>void }) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const getAudio=useCallback(()=>makeGetAudio(audioCtxRef)(),[audioCtxRef]);

  const G=useRef({
    snake:[] as {x:number;y:number}[],
    lastDir:{x:1,y:0},
    food:{x:5,y:5}, foodColor:"#ff44ff",
    running:false, frameId:0, frame:0, cell:16,
  });
  const [started,setStarted]=useState(false);

  const placeFood=useCallback(()=>{
    const g=G.current;
    let pos:{x:number;y:number};
    do{ pos={x:Math.floor(Math.random()*SNAKE_GRID),y:Math.floor(Math.random()*SNAKE_GRID)}; }
    while(g.snake.some(s=>s.x===pos.x&&s.y===pos.y));
    g.food=pos; g.foodColor=FOOD_COLORS[Math.floor(Math.random()*FOOD_COLORS.length)];
  },[]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");if(!ctx)return;
    const g=G.current,c=g.cell,W=canvas.width,H=canvas.height,total=g.snake.length;
    ctx.fillStyle="#030008";ctx.fillRect(0,0,W,H);
    // 그리드 (아주 은은하게)
    ctx.strokeStyle="rgba(200,0,255,0.04)";ctx.lineWidth=0.5;
    for(let i=0;i<=SNAKE_GRID;i++){ctx.beginPath();ctx.moveTo(i*c,0);ctx.lineTo(i*c,H);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*c);ctx.lineTo(W,i*c);ctx.stroke();}
    // 먹이
    const fp=1+0.22*Math.sin(g.frame*0.08);
    ctx.shadowBlur=20;ctx.shadowColor=g.foodColor;ctx.fillStyle=g.foodColor;
    ctx.beginPath();ctx.arc(g.food.x*c+c/2,g.food.y*c+c/2,(c/2-1)*fp,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.55)";ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(g.food.x*c+c/2-c/6,g.food.y*c+c/2-c/6,c/7,0,Math.PI*2);ctx.fill();
    // 뱀
    g.snake.forEach((seg,idx)=>{
      const t=total<=1?0:Math.min(1,idx/(total-1));
      const r=Math.round(t*255),gr=Math.round(255-t*180),b=255,a=1-t*0.28;
      const glow=t<0.5?"#00ffff":"#ff00ff";
      const isHead=idx===0,pad=isHead?0:1;
      ctx.shadowBlur=isHead?18:6;ctx.shadowColor=glow;ctx.fillStyle=`rgba(${r},${gr},${b},${a})`;
      ctx.beginPath();ctx.roundRect(seg.x*c+pad,seg.y*c+pad,c-pad*2,c-pad*2,isHead?5:3);ctx.fill();
      ctx.shadowBlur=0;
      if(isHead){
        const d=g.lastDir,cx2=seg.x*c+c/2,cy2=seg.y*c+c/2,er=c*0.12;
        ctx.fillStyle="#000820";
        if(Math.abs(d.x)>0){[cy2-c*0.2,cy2+c*0.2].forEach(ey=>{ctx.beginPath();ctx.arc(cx2+d.x*c*0.15,ey,er,0,Math.PI*2);ctx.fill();});}
        else{[cx2-c*0.2,cx2+c*0.2].forEach(ex=>{ctx.beginPath();ctx.arc(ex,cy2+d.y*c*0.15,er,0,Math.PI*2);ctx.fill();});}
      }
    });
  },[]);

  // 렌더링 루프 (이동 없음 — 입력 시에만 이동)
  const loop=useCallback(()=>{
    const g=G.current;if(!g.running)return;
    g.frame++;draw();g.frameId=requestAnimationFrame(loop);
  },[draw]);

  // 한 칸 이동 (스와이프/버튼 누를 때 호출)
  const step=useCallback((dx:number,dy:number)=>{
    const g=G.current;if(!g.running)return;
    const head=g.snake[0];
    // 벽 통과 (반대편으로)
    const nh={x:(head.x+dx+SNAKE_GRID)%SNAKE_GRID,y:(head.y+dy+SNAKE_GRID)%SNAKE_GRID};
    g.lastDir={x:dx,y:dy};
    g.snake.unshift(nh);
    if(nh.x===g.food.x&&nh.y===g.food.y){
      placeFood();
      try{playClick(getAudio(),SND_EAT,0.9+Math.random()*0.3);}catch(_){}
    } else {
      g.snake.pop();
    }
  },[placeFood,getAudio]);

  const joyDirRef=useRef({x:0,y:0});
  const [joy,setJoy]=useState({active:false,bx:0,by:0,tx:0,ty:0});
  const JOY_R=48, TIP_R=24;

  // 조이스틱 방향으로 연속 이동
  useEffect(()=>{
    if(!joy.active)return;
    const id=setInterval(()=>{
      const {x,y}=joyDirRef.current;
      if(x!==0||y!==0)step(x,y);
    },170);
    return()=>clearInterval(id);
  },[joy.active,step]);

  const onJoyDown=useCallback((e:React.PointerEvent<HTMLDivElement>)=>{
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect=e.currentTarget.getBoundingClientRect();
    const bx=e.clientX-rect.left,by=e.clientY-rect.top;
    setJoy({active:true,bx,by,tx:bx,ty:by});
    joyDirRef.current={x:0,y:0};
  },[]);

  const onJoyMove=useCallback((e:React.PointerEvent<HTMLDivElement>)=>{
    // getBoundingClientRect은 업데이터 밖에서 동기적으로 계산
    const rect=e.currentTarget.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    setJoy(j=>{
      if(!j.active)return j;
      const dx=mx-j.bx,dy=my-j.by,dist=Math.hypot(dx,dy);
      const tx=j.bx+(dist>0?dx/dist:0)*Math.min(dist,JOY_R);
      const ty=j.by+(dist>0?dy/dist:0)*Math.min(dist,JOY_R);
      if(dist>14){
        if(Math.abs(dx)>=Math.abs(dy))joyDirRef.current={x:dx>0?1:-1,y:0};
        else joyDirRef.current={x:0,y:dy>0?1:-1};
      }else{joyDirRef.current={x:0,y:0};}
      return{...j,tx,ty};
    });
  },[]);

  const onJoyUp=useCallback(()=>{
    setJoy({active:false,bx:0,by:0,tx:0,ty:0});
    joyDirRef.current={x:0,y:0};
  },[]);

  const startGame=useCallback(()=>{
    const g=G.current;cancelAnimationFrame(g.frameId);
    const canvas=canvasRef.current;if(!canvas)return;
    g.cell=Math.floor(canvas.width/SNAKE_GRID);
    g.snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    g.lastDir={x:1,y:0};g.frame=0;g.running=true;
    placeFood();setStarted(true);g.frameId=requestAnimationFrame(loop);
  },[loop,placeFood]);

  // 키보드
  useEffect(()=>{
    const dn=(e:KeyboardEvent)=>{
      if(e.key==="ArrowUp"   ||e.key==="w"||e.key==="W"){e.preventDefault();step(0,-1);}
      if(e.key==="ArrowDown" ||e.key==="s"||e.key==="S"){e.preventDefault();step(0,1);}
      if(e.key==="ArrowLeft" ||e.key==="a"||e.key==="A"){e.preventDefault();step(-1,0);}
      if(e.key==="ArrowRight"||e.key==="d"||e.key==="D"){e.preventDefault();step(1,0);}
      if(!started&&(e.key==="Enter"||e.key===" "))startGame();
    };
    window.addEventListener("keydown",dn);return()=>window.removeEventListener("keydown",dn);
  },[step,startGame,started]);

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    canvas.width=Math.min(340,window.innerWidth-40);canvas.height=canvas.width;
    const ctx=canvas.getContext("2d");if(!ctx)return;
    ctx.fillStyle="#030008";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.shadowBlur=18;ctx.shadowColor="#ff00ff";ctx.font="bold 22px monospace";ctx.textAlign="center";ctx.fillStyle="#ff88ff";
    ctx.fillText("NEON SNAKE",canvas.width/2,canvas.height/2-16);
    ctx.shadowBlur=6;ctx.shadowColor="#44ffff";ctx.font="10px monospace";ctx.fillStyle="rgba(100,220,255,0.5)";
    ctx.fillText("조이스틱 드래그로 이동",canvas.width/2,canvas.height/2+8);ctx.shadowBlur=0;
  },[]);
  useEffect(()=>()=>{cancelAnimationFrame(G.current.frameId);G.current.running=false;},[]);

  const CW=canvasRef.current?.width??300;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,width:"100%"}}>
      <canvas ref={canvasRef} style={{borderRadius:16,border:"1px solid rgba(200,0,255,0.2)",boxShadow:"0 0 40px rgba(180,0,255,0.15)"}}/>

      {!started
        ? <button onClick={startGame} style={{padding:"13px 52px",borderRadius:16,background:"linear-gradient(135deg,#cc00ff,#6600cc)",color:"white",fontWeight:900,fontSize:19,border:"none",cursor:"pointer",boxShadow:"0 0 24px rgba(200,0,255,0.55)",letterSpacing:3}}>START</button>
        : (
          // 조이스틱 존
          <div
            onPointerDown={onJoyDown} onPointerMove={onJoyMove}
            onPointerUp={onJoyUp} onPointerLeave={onJoyUp} onPointerCancel={onJoyUp}
            style={{width:CW,height:140,borderRadius:20,background:"rgba(0,200,255,0.04)",border:"1px solid rgba(0,255,255,0.1)",position:"relative",touchAction:"none",userSelect:"none",cursor:"pointer"}}>
            {joy.active?(
              <>
                {/* 베이스 */}
                <div style={{position:"absolute",left:joy.bx-JOY_R,top:joy.by-JOY_R,width:JOY_R*2,height:JOY_R*2,borderRadius:"50%",border:"2px solid rgba(0,255,255,0.3)",background:"rgba(0,200,255,0.07)",pointerEvents:"none"}}/>
                {/* 방향 표시 선 */}
                {(()=>{const dx=joy.tx-joy.bx,dy=joy.ty-joy.by,dist=Math.hypot(dx,dy);if(dist<8)return null;return(<div style={{position:"absolute",left:joy.bx,top:joy.by,width:dist,height:2,background:"rgba(0,255,255,0.25)",transformOrigin:"0 50%",transform:`rotate(${Math.atan2(dy,dx)}rad) translateY(-50%)`,pointerEvents:"none"}}/> ); })()}
                {/* 팁 */}
                <div style={{position:"absolute",left:joy.tx-TIP_R,top:joy.ty-TIP_R,width:TIP_R*2,height:TIP_R*2,borderRadius:"50%",background:"rgba(0,220,255,0.5)",boxShadow:"0 0 20px rgba(0,200,255,0.7), inset 0 0 10px rgba(255,255,255,0.2)",pointerEvents:"none"}}/>
              </>
            ):(
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6,pointerEvents:"none"}}>
                <div style={{width:JOY_R*2,height:JOY_R*2,borderRadius:"50%",border:"1.5px solid rgba(0,255,255,0.15)",background:"rgba(0,200,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:TIP_R*2,height:TIP_R*2,borderRadius:"50%",background:"rgba(0,200,255,0.15)",boxShadow:"0 0 10px rgba(0,200,255,0.2)"}}/>
                </div>
              </div>
            )}
          </div>
        )
      }
      <button onClick={onExit} style={{fontSize:12,color:"rgba(255,100,255,0.35)",background:"none",border:"none",cursor:"pointer"}}>← 뒤로</button>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function KeycapPage() {
  const router=useRouter();
  const [pressed,setPressed]=useState<number|null>(null);
  const [themeIdx,setThemeIdx]=useState(0);
  const [showThemes,setShowThemes]=useState(false);
  const [gameMode,setGameMode]=useState<"none"|"galaga"|"snake">("none");
  const [showGamePicker,setShowGamePicker]=useState(false);
  const [soundOn,setSoundOn]=useState(true);
  const [customBg,setCustomBg]=useState("#1a1a2e");
  const [customKey,setCustomKey]=useState("#5a4a8a");
  const [customIcon,setCustomIcon]=useState("#c8b4ff");
  const [customSound,setCustomSound]=useState(0);

  const audioCtxRef=useRef<AudioContext|null>(null);
  const soundOnRef=useRef(true); soundOnRef.current=soundOn;
  const currentSoundRef=useRef<SP>(THEMES[0].sound);

  const customTheme:ThemeDef={
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
  const ALL_THEMES=[...THEMES,customTheme];
  const T=gameMode!=="none"?THEMES[4]:(ALL_THEMES[themeIdx]??THEMES[0]);
  currentSoundRef.current=T.sound;

  const pressKey=useCallback((idx:number)=>{
    if(soundOnRef.current){
      try{
        if(!audioCtxRef.current) audioCtxRef.current=new (window.AudioContext||(window as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext!)();
        const ctx=audioCtxRef.current;if(ctx.state==="suspended")ctx.resume();
        playClick(ctx,currentSoundRef.current,PITCH_MULTS[idx]);
      }catch(_){}
    }
    setPressed(idx);setTimeout(()=>setPressed(null),130);
  },[]);

  const btnStyle={padding:"8px 16px",borderRadius:12,fontSize:15,fontWeight:700,background:T.keyBg,border:`1px solid ${T.border}`,boxShadow:T.keyShadow,cursor:"pointer",color:T.btnColor};

  const exitGame=()=>{ setGameMode("none"); setShowGamePicker(false); };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 select-none"
      style={{background:T.pageBg,padding:"32px 20px",transition:"background 0.4s"}}>
      <button onClick={()=>router.back()} style={{...btnStyle,position:"fixed",top:16,left:16,zIndex:10}}>←</button>

      {gameMode==="galaga" ? <GalagaGame audioCtxRef={audioCtxRef} onExit={exitGame}/>
      : gameMode==="snake" ? <SnakeGame audioCtxRef={audioCtxRef} onExit={exitGame}/>
      : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:16,width:"100%",maxWidth:340}}>
            {Array.from({length:9},(_,i)=>{
              const isDown=pressed===i;
              return(
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
            <button onPointerDown={e=>e.preventDefault()} onClick={()=>setShowGamePicker(v=>!v)} style={{...btnStyle,fontSize:13}}>🎮 게임</button>
          </div>

          {showGamePicker&&(
            <div style={{display:"flex",gap:12,padding:"14px 18px",borderRadius:18,background:"rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.08)",backdropFilter:"blur(12px)"}}>
              {([{id:"galaga" as const,label:"🚀",name:"갤러그"},{id:"snake" as const,label:"🐍",name:"스네이크"}]).map(g=>(
                <button key={g.id} onClick={()=>{setGameMode(g.id);setShowGamePicker(false);}}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"12px 20px",borderRadius:14,background:"rgba(200,0,255,0.1)",border:"1.5px solid rgba(200,0,255,0.3)",cursor:"pointer",boxShadow:"0 0 14px rgba(180,0,255,0.15)"}}>
                  <span style={{fontSize:28}}>{g.label}</span>
                  <span style={{fontSize:11,fontWeight:700,color:"rgba(255,150,255,0.8)"}}>{g.name}</span>
                </button>
              ))}
            </div>
          )}

          {showThemes&&(
            <div style={{display:"flex",flexDirection:"column",gap:16,padding:"16px 20px",borderRadius:20,width:"100%",maxWidth:340,background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.08)",backdropFilter:"blur(12px)"}}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
                {ALL_THEMES.map((th,i)=>(
                  <button key={th.id} onPointerDown={e=>e.preventDefault()} onClick={()=>setThemeIdx(i)}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,opacity:themeIdx===i?1:0.45,background:"none",border:"none",cursor:"pointer"}}>
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
                      <button key={th.id} onPointerDown={e=>e.preventDefault()} onClick={()=>setCustomSound(i)}
                        style={{padding:"5px 10px",borderRadius:8,fontSize:10,fontWeight:700,cursor:"pointer",background:customSound===i?th.dot:"rgba(255,255,255,0.07)",color:customSound===i?"white":"rgba(255,255,255,0.45)",border:`1px solid ${customSound===i?th.dot:"rgba(255,255,255,0.1)"}`,transition:"all 0.15s"}}>{th.name}</button>
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
