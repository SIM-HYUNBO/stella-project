"use client";
import { useState, useCallback, useEffect, useRef } from "react";

// ── 한글 두벌식 ──────────────────────────────────────────────────────────────
const KO_NORMAL: Record<string, string> = {
  q:"ㅂ",w:"ㅈ",e:"ㄷ",r:"ㄱ",t:"ㅅ",y:"ㅛ",u:"ㅕ",i:"ㅑ",o:"ㅐ",p:"ㅔ",
  a:"ㅁ",s:"ㄴ",d:"ㅇ",f:"ㄹ",g:"ㅎ",h:"ㅗ",j:"ㅓ",k:"ㅏ",l:"ㅣ",
  z:"ㅋ",x:"ㅌ",c:"ㅊ",v:"ㅍ",b:"ㅠ",n:"ㅜ",m:"ㅡ",
};
const KO_SHIFT: Record<string, string> = {
  q:"ㅃ",w:"ㅉ",e:"ㄸ",r:"ㄲ",t:"ㅆ",o:"ㅒ",p:"ㅖ",
};

const CHOSUNG  = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const JUNGSUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
const JONGSUNG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

const CHO_IDX : Record<string,number> = Object.fromEntries(CHOSUNG.map((c,i)=>[c,i]));
const JUNG_IDX: Record<string,number> = Object.fromEntries(JUNGSUNG.map((c,i)=>[c,i]));
const JONG_IDX: Record<string,number> = {};
JONGSUNG.forEach((c,i)=>{ if(c) JONG_IDX[c]=i; });

const COMPOUND_JONG: Record<string,number> = {
  "1_9":3,"4_12":5,"4_18":6,"8_0":9,"8_6":10,"8_7":11,
  "8_9":12,"8_16":13,"8_17":14,"8_18":15,"17_9":18,
};
const COMPOUND_JUNG: Record<string,number> = {
  "8_0":9,"8_1":10,"8_20":11,"13_4":14,"13_5":15,"13_20":16,"18_20":19,
};
const SPLIT_JONG: Record<number,[number,number]> = {
  3:[1,9],5:[4,12],6:[4,18],9:[8,0],10:[8,6],11:[8,7],
  12:[8,9],13:[8,16],14:[8,17],15:[8,18],18:[17,9],
};
const JONG_TO_CHO: Record<number,number> = {
  1:0,2:1,4:2,7:3,8:5,16:6,17:7,19:9,20:10,21:11,22:12,23:14,24:15,25:16,26:17,27:18,
};

const buildSyl = (cho:number,jung:number,jong=0) =>
  String.fromCharCode(0xAC00+(cho*21+jung)*28+jong);

type Comp = {cho:number;jung:number;jong:number}|null;

function getCompChar(c:Comp): string {
  if(!c) return "";
  if(c.jung<0) return CHOSUNG[c.cho];
  return buildSyl(c.cho,c.jung,c.jong<0?0:c.jong);
}
function finalizeStr(text:string,c:Comp): string { return text+getCompChar(c); }

function koInput(text:string,comp:Comp,jamo:string):[string,Comp] {
  const vi=JUNG_IDX[jamo];
  const ci=CHO_IDX[jamo];
  if(vi!==undefined){
    if(!comp) return [text,{cho:11,jung:vi,jong:-1}];
    if(comp.jung<0) return [text,{cho:comp.cho,jung:vi,jong:-1}];
    if(comp.jong<0){
      const k=`${comp.jung}_${vi}`;
      if(COMPOUND_JUNG[k]!==undefined) return [text,{cho:comp.cho,jung:COMPOUND_JUNG[k],jong:-1}];
      return [finalizeStr(text,comp),{cho:11,jung:vi,jong:-1}];
    }
    const sp=SPLIT_JONG[comp.jong];
    const[remJong,newCho]=sp??[0,JONG_TO_CHO[comp.jong]??11];
    return [text+buildSyl(comp.cho,comp.jung,remJong),{cho:newCho,jung:vi,jong:-1}];
  }
  if(ci!==undefined){
    if(!comp) return [text,{cho:ci,jung:-1,jong:-1}];
    if(comp.jung<0) return [finalizeStr(text,comp),{cho:ci,jung:-1,jong:-1}];
    if(comp.jong<0){
      if(JONG_IDX[jamo]!==undefined) return [text,{cho:comp.cho,jung:comp.jung,jong:JONG_IDX[jamo]}];
      return [finalizeStr(text,comp),{cho:ci,jung:-1,jong:-1}];
    }
    const k=`${comp.jong}_${ci}`;
    if(COMPOUND_JONG[k]!==undefined) return [text,{cho:comp.cho,jung:comp.jung,jong:COMPOUND_JONG[k]}];
    return [finalizeStr(text,comp),{cho:ci,jung:-1,jong:-1}];
  }
  return [text,comp];
}

function koBackspace(text:string,comp:Comp):[string,Comp] {
  if(!comp) return [text.slice(0,-1),null];
  if(comp.jong>=0){
    const sp=SPLIT_JONG[comp.jong];
    return [text,{...comp,jong:sp?sp[0]:-1}];
  }
  if(comp.jung>=0) return [text,{cho:comp.cho,jung:-1,jong:-1}];
  return [text,null];
}

// ── 사운드 ────────────────────────────────────────────────────────────────────
type SoundParams = { clickFreq:number; clickQ:number; clickVol:number; thumpStart:number; thumpEnd:number; thumpDecay:number; thumpVol:number };

function playClick(ctx:AudioContext, s:SoundParams, type:"normal"|"space"|"accent") {
  const now = ctx.currentTime;
  const mult   = type==="space"?1.7:type==="accent"?1.25:1.0;
  const pMult  = type==="space"?0.55:type==="accent"?0.82:1.0;

  // 노이즈 클릭
  const dur = 0.004;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate*dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*0.4));
  const src=ctx.createBufferSource(); src.buffer=buf;
  const bpf=ctx.createBiquadFilter(); bpf.type="bandpass"; bpf.frequency.value=s.clickFreq*pMult; bpf.Q.value=s.clickQ;
  const ng=ctx.createGain(); ng.gain.setValueAtTime(s.clickVol*mult,now); ng.gain.exponentialRampToValueAtTime(0.0001,now+dur);
  src.connect(bpf); bpf.connect(ng); ng.connect(ctx.destination); src.start(now);

  // 저음 thump
  const osc=ctx.createOscillator(); osc.type="sine";
  osc.frequency.setValueAtTime(s.thumpStart*pMult,now);
  osc.frequency.exponentialRampToValueAtTime(s.thumpEnd*pMult,now+s.thumpDecay);
  const og=ctx.createGain(); og.gain.setValueAtTime(s.thumpVol*mult,now); og.gain.exponentialRampToValueAtTime(0.0001,now+s.thumpDecay+0.01);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now+s.thumpDecay+0.02);
}

// ── 테마 ──────────────────────────────────────────────────────────────────────
type ThemeDef = {
  id:string; name:string; dot:string;
  pageBg:string;
  boardBg:string; boardShadow:string;
  keyBg:string; keyBgAccent:string; keyBgSpace:string;
  keyDownBg:string; keyShadow:string; keyDownShadow:string;
  keyText:string;
  keySub:string;
  activeBg:string;
  border:string;
  topBorder:string;
  dispBg:string; dispText:string; dispBorder:string;
  dispCursor:string; dispPlaceholder:string;
  scanline:string;
  sound:SoundParams;
};

const THEMES: ThemeDef[] = [
  {
    id:"dark", name:"다크", dot:"#555",
    pageBg:"radial-gradient(ellipse at center,#1e1e2e 0%,#0d0d0d 100%)",
    boardBg:"linear-gradient(180deg,#2a2a2a 0%,#1e1e1e 100%)",
    boardShadow:"0 25px 60px rgba(0,0,0,0.9),0 0 0 1px #333,inset 0 1px 0 rgba(255,255,255,0.08)",
    keyBg:"linear-gradient(180deg,#525252 0%,#424242 100%)",
    keyBgAccent:"linear-gradient(180deg,#3e3e56 0%,#32324a 100%)",
    keyBgSpace:"linear-gradient(180deg,#424242 0%,#363636 100%)",
    keyDownBg:"linear-gradient(180deg,#363636 0%,#2e2e2e 100%)",
    keyShadow:"0 5px 0 #0a0a0a,0 6px 2px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.1)",
    keyDownShadow:"0 1px 0 #080808,inset 0 1px 3px rgba(0,0,0,0.6)",
    keyText:"#d0d0d0", keySub:"rgba(255,255,255,0.35)",
    activeBg:"linear-gradient(180deg,#2a7a4a 0%,#1e5a38 100%)",
    border:"rgba(255,255,255,0.06)", topBorder:"rgba(255,255,255,0.08)",
    dispBg:"#060608", dispText:"#a0ffb0", dispBorder:"#2a2a3a",
    dispCursor:"#a0ffb0", dispPlaceholder:"#2a3a2a",
    scanline:"rgba(255,255,255,0.015)",
    sound:{clickFreq:3500,clickQ:1.0,clickVol:0.28,thumpStart:240,thumpEnd:65,thumpDecay:0.055,thumpVol:0.20},
  },
  {
    id:"light", name:"라이트", dot:"#d4d0c8",
    pageBg:"linear-gradient(135deg,#f0ede8 0%,#ddd8d0 100%)",
    boardBg:"linear-gradient(180deg,#e8e4de 0%,#d8d3cc 100%)",
    boardShadow:"0 20px 50px rgba(0,0,0,0.25),0 0 0 1px #bbb,inset 0 1px 0 rgba(255,255,255,0.7)",
    keyBg:"linear-gradient(180deg,#faf8f5 0%,#eae7e2 100%)",
    keyBgAccent:"linear-gradient(180deg,#d8d4ce 0%,#c8c4bc 100%)",
    keyBgSpace:"linear-gradient(180deg,#f0ede8 0%,#e0dbd4 100%)",
    keyDownBg:"linear-gradient(180deg,#e0ddd8 0%,#d0cdc8 100%)",
    keyShadow:"0 5px 0 #999,0 6px 2px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.8)",
    keyDownShadow:"0 1px 0 #aaa,inset 0 1px 3px rgba(0,0,0,0.15)",
    keyText:"#2a2a2a", keySub:"rgba(0,0,0,0.4)",
    activeBg:"linear-gradient(180deg,#4a9a6a 0%,#3a7a52 100%)",
    border:"rgba(0,0,0,0.08)", topBorder:"rgba(255,255,255,0.6)",
    dispBg:"#f8f6f2", dispText:"#1a1a2a", dispBorder:"#c8c4bc",
    dispCursor:"#4a6a9a", dispPlaceholder:"#b8b4ac",
    scanline:"rgba(0,0,0,0.015)",
    sound:{clickFreq:2200,clickQ:0.6,clickVol:0.16,thumpStart:160,thumpEnd:50,thumpDecay:0.07,thumpVol:0.13},
  },
  {
    id:"ocean", name:"오션", dot:"#0ea5e9",
    pageBg:"radial-gradient(ellipse at center,#0c1a2e 0%,#060e1a 100%)",
    boardBg:"linear-gradient(180deg,#0d1f35 0%,#081525 100%)",
    boardShadow:"0 25px 60px rgba(0,50,100,0.8),0 0 0 1px #0e3560,inset 0 1px 0 rgba(14,165,233,0.15)",
    keyBg:"linear-gradient(180deg,#163552 0%,#0e2540 100%)",
    keyBgAccent:"linear-gradient(180deg,#0a2844 0%,#081d32 100%)",
    keyBgSpace:"linear-gradient(180deg,#14304e 0%,#0e2540 100%)",
    keyDownBg:"linear-gradient(180deg,#0c2038 0%,#091828 100%)",
    keyShadow:"0 5px 0 #041020,0 6px 2px rgba(0,0,0,0.6),inset 0 1px 0 rgba(14,165,233,0.2)",
    keyDownShadow:"0 1px 0 #030c18,inset 0 1px 3px rgba(0,0,0,0.7)",
    keyText:"#7dd3fc", keySub:"rgba(125,211,252,0.4)",
    activeBg:"linear-gradient(180deg,#0ea5e9 0%,#0284c7 100%)",
    border:"rgba(14,165,233,0.12)", topBorder:"rgba(14,165,233,0.15)",
    dispBg:"#040c18", dispText:"#38bdf8", dispBorder:"#0e3560",
    dispCursor:"#38bdf8", dispPlaceholder:"#0e3560",
    scanline:"rgba(14,165,233,0.02)",
    sound:{clickFreq:1800,clickQ:0.5,clickVol:0.12,thumpStart:130,thumpEnd:40,thumpDecay:0.09,thumpVol:0.10},
  },
  {
    id:"retro", name:"레트로", dot:"#d4a853",
    pageBg:"linear-gradient(135deg,#2a1a08 0%,#1a1008 100%)",
    boardBg:"linear-gradient(180deg,#4a3520 0%,#3a2815 100%)",
    boardShadow:"0 25px 60px rgba(0,0,0,0.9),0 0 0 1px #6a4a28,inset 0 1px 0 rgba(212,168,83,0.15)",
    keyBg:"linear-gradient(180deg,#c8a870 0%,#b89060 100%)",
    keyBgAccent:"linear-gradient(180deg,#7a5a38 0%,#6a4a28 100%)",
    keyBgSpace:"linear-gradient(180deg,#d0b080 0%,#c0a070 100%)",
    keyDownBg:"linear-gradient(180deg,#a08050 0%,#907040 100%)",
    keyShadow:"0 5px 0 #3a2810,0 6px 2px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,220,150,0.3)",
    keyDownShadow:"0 1px 0 #2a1808,inset 0 2px 4px rgba(0,0,0,0.4)",
    keyText:"#2a1a08", keySub:"rgba(42,26,8,0.5)",
    activeBg:"linear-gradient(180deg,#d4a853 0%,#b08830 100%)",
    border:"rgba(212,168,83,0.15)", topBorder:"rgba(212,168,83,0.2)",
    dispBg:"#120c04", dispText:"#d4a853", dispBorder:"#6a4a28",
    dispCursor:"#d4a853", dispPlaceholder:"#4a3010",
    scanline:"rgba(212,168,83,0.03)",
    sound:{clickFreq:5500,clickQ:2.0,clickVol:0.40,thumpStart:380,thumpEnd:90,thumpDecay:0.04,thumpVol:0.25},
  },
  {
    id:"neon", name:"네온", dot:"#ff00ff",
    pageBg:"radial-gradient(ellipse at center,#0d0020 0%,#050010 100%)",
    boardBg:"linear-gradient(180deg,#150030 0%,#0d0020 100%)",
    boardShadow:"0 25px 60px rgba(150,0,255,0.4),0 0 0 1px #3d0080,inset 0 1px 0 rgba(255,0,255,0.1)",
    keyBg:"linear-gradient(180deg,#2a0055 0%,#1e003d 100%)",
    keyBgAccent:"linear-gradient(180deg,#1a0040 0%,#12002d 100%)",
    keyBgSpace:"linear-gradient(180deg,#220050 0%,#1a003a 100%)",
    keyDownBg:"linear-gradient(180deg,#150030 0%,#0d0020 100%)",
    keyShadow:"0 5px 0 #060010,0 0 8px rgba(200,0,255,0.4),inset 0 1px 0 rgba(255,0,255,0.2)",
    keyDownShadow:"0 1px 0 #040008,0 0 12px rgba(255,0,255,0.6),inset 0 1px 3px rgba(0,0,0,0.8)",
    keyText:"#e080ff", keySub:"rgba(220,100,255,0.5)",
    activeBg:"linear-gradient(180deg,#cc00ff 0%,#9900cc 100%)",
    border:"rgba(200,0,255,0.15)", topBorder:"rgba(255,0,255,0.12)",
    dispBg:"#08001a", dispText:"#ff60ff", dispBorder:"#3d0080",
    dispCursor:"#ff00ff", dispPlaceholder:"#3d0060",
    scanline:"rgba(255,0,255,0.025)",
    sound:{clickFreq:6000,clickQ:3.0,clickVol:0.22,thumpStart:800,thumpEnd:200,thumpDecay:0.03,thumpVol:0.18},
  },
];

// ── 키보드 레이아웃 ──────────────────────────────────────────────────────────
const SHIFT_OUT: Record<string,string> = {
  "`":"~","1":"!","2":"@","3":"#","4":"$","5":"%","6":"^","7":"&","8":"*","9":"(","0":")","-":"_","=":"+",
  "[":"{","]":"}","\\":"|",";":":","'":'"',",":"<",".":">","/":"?",
};

type KeyDef = {label:string;sub?:string;key:string;flex:number;accent?:boolean;ko?:string;koSub?:string};

const ROWS: KeyDef[][] = [
  [
    {label:"`",sub:"~",key:"`",flex:1},{label:"1",sub:"!",key:"1",flex:1},{label:"2",sub:"@",key:"2",flex:1},
    {label:"3",sub:"#",key:"3",flex:1},{label:"4",sub:"$",key:"4",flex:1},{label:"5",sub:"%",key:"5",flex:1},
    {label:"6",sub:"^",key:"6",flex:1},{label:"7",sub:"&",key:"7",flex:1},{label:"8",sub:"*",key:"8",flex:1},
    {label:"9",sub:"(",key:"9",flex:1},{label:"0",sub:")",key:"0",flex:1},{label:"-",sub:"_",key:"-",flex:1},
    {label:"=",sub:"+",key:"=",flex:1},{label:"Backspace",key:"Backspace",flex:2.1,accent:true},
  ],
  [
    {label:"Tab",key:"Tab",flex:1.6,accent:true},
    {label:"Q",key:"q",flex:1,ko:"ㅂ",koSub:"ㅃ"},{label:"W",key:"w",flex:1,ko:"ㅈ",koSub:"ㅉ"},
    {label:"E",key:"e",flex:1,ko:"ㄷ",koSub:"ㄸ"},{label:"R",key:"r",flex:1,ko:"ㄱ",koSub:"ㄲ"},
    {label:"T",key:"t",flex:1,ko:"ㅅ",koSub:"ㅆ"},{label:"Y",key:"y",flex:1,ko:"ㅛ"},
    {label:"U",key:"u",flex:1,ko:"ㅕ"},{label:"I",key:"i",flex:1,ko:"ㅑ"},
    {label:"O",key:"o",flex:1,ko:"ㅐ",koSub:"ㅒ"},{label:"P",key:"p",flex:1,ko:"ㅔ",koSub:"ㅖ"},
    {label:"[",sub:"{",key:"[",flex:1},{label:"]",sub:"}",key:"]",flex:1},
    {label:"\\",sub:"|",key:"\\",flex:1.5,accent:true},
  ],
  [
    {label:"Caps",key:"CapsLock",flex:1.85,accent:true},
    {label:"A",key:"a",flex:1,ko:"ㅁ"},{label:"S",key:"s",flex:1,ko:"ㄴ"},
    {label:"D",key:"d",flex:1,ko:"ㅇ"},{label:"F",key:"f",flex:1,ko:"ㄹ"},
    {label:"G",key:"g",flex:1,ko:"ㅎ"},{label:"H",key:"h",flex:1,ko:"ㅗ"},
    {label:"J",key:"j",flex:1,ko:"ㅓ"},{label:"K",key:"k",flex:1,ko:"ㅏ"},
    {label:"L",key:"l",flex:1,ko:"ㅣ"},
    {label:";",sub:":",key:";",flex:1},{label:"'",sub:'"',key:"'",flex:1},
    {label:"Enter",key:"Enter",flex:2.35,accent:true},
  ],
  [
    {label:"Shift",key:"LShift",flex:2.35,accent:true},
    {label:"Z",key:"z",flex:1,ko:"ㅋ"},{label:"X",key:"x",flex:1,ko:"ㅌ"},
    {label:"C",key:"c",flex:1,ko:"ㅊ"},{label:"V",key:"v",flex:1,ko:"ㅍ"},
    {label:"B",key:"b",flex:1,ko:"ㅠ"},{label:"N",key:"n",flex:1,ko:"ㅜ"},
    {label:"M",key:"m",flex:1,ko:"ㅡ"},
    {label:",",sub:"<",key:",",flex:1},{label:".",sub:">",key:".",flex:1},
    {label:"/",sub:"?",key:"/",flex:1},
    {label:"Shift",key:"RShift",flex:2.85,accent:true},
  ],
  [
    {label:"Ctrl",key:"LCtrl",flex:1.3,accent:true},{label:"Win",key:"Win",flex:1.3,accent:true},
    {label:"Alt",key:"LAlt",flex:1.3,accent:true},
    {label:"",key:" ",flex:6.5},
    {label:"Alt",key:"RAlt",flex:1.3,accent:true},{label:"Win",key:"RWin",flex:1.3,accent:true},
    {label:"Ctrl",key:"RCtrl",flex:1.3,accent:true},
  ],
];

export default function KeycapPage() {
  const [text, setText] = useState("");
  const [comp, setComp] = useState<Comp>(null);
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const [koMode, setKoMode] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);
  const [showThemes, setShowThemes] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef<AudioContext|null>(null);
  const soundOnRef  = useRef(true);
  const themeIdxRef = useRef(0);
  soundOnRef.current  = soundOn;
  themeIdxRef.current = themeIdx;

  const T = THEMES[themeIdx];
  const displayText = text + getCompChar(comp);

  const fireClick = useCallback((keyType:"normal"|"space"|"accent") => {
    if(!soundOnRef.current) return;
    try {
      if(!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext||(window as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext!)();
      }
      const ctx = audioCtxRef.current;
      if(ctx.state==="suspended") ctx.resume();
      playClick(ctx, THEMES[themeIdxRef.current].sound, keyType);
    } catch(_){}
  },[]);

  const flash = useCallback((key:string) => {
    setPressed(p=>{const n=new Set(p);n.add(key);return n;});
    setTimeout(()=>setPressed(p=>{const n=new Set(p);n.delete(key);return n;}),130);
  },[]);

  const pressKey = useCallback((key:string) => {
    flash(key);
    const mods=["LCtrl","RCtrl","LAlt","RAlt","Win","RWin"];
    if(mods.includes(key)) return;
    // 소리 종류 결정
    const accentKeys=["Enter","Backspace","Tab","LShift","RShift","CapsLock"];
    if(accentKeys.includes(key)) fireClick("accent");
    else if(key===" ") fireClick("space");
    else fireClick("normal");

    if(key==="CapsLock"){setCaps(c=>!c);return;}
    if(key==="LShift"||key==="RShift"){setShift(s=>!s);return;}
    if(key==="Backspace"){
      if(koMode){const[nt,nc]=koBackspace(text,comp);setText(nt);setComp(nc);}
      else setText(t=>t.slice(0,-1));
      return;
    }
    if(key==="Enter"){setText(finalizeStr(text,comp)+"\n");setComp(null);return;}
    if(key==="Tab"){setText(finalizeStr(text,comp)+"    ");setComp(null);return;}
    if(key===" "){setText(finalizeStr(text,comp)+" ");setComp(null);return;}

    if(koMode){
      const jamo=shift?(KO_SHIFT[key]??KO_NORMAL[key]):KO_NORMAL[key];
      if(jamo){
        const[nt,nc]=koInput(text,comp,jamo);
        setText(nt);setComp(nc);
        if(shift&&KO_SHIFT[key]) setShift(false);
        return;
      }
      setText(finalizeStr(text,comp));setComp(null);
    }

    const isLetter=/^[a-z]$/.test(key);
    let char=key;
    if(shift){char=SHIFT_OUT[key]??(isLetter?key.toUpperCase():key);setShift(false);}
    else if(caps&&isLetter) char=key.toUpperCase();
    setText(t=>t+char);
  },[text,comp,shift,caps,koMode,flash,fireClick]);

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(["INPUT","TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if(e.key==="Shift"){setShift(true);flash("LShift");flash("RShift");return;}
      if(e.key==="CapsLock"){setCaps(c=>!c);flash("CapsLock");return;}
      if(e.key==="Backspace"){e.preventDefault();pressKey("Backspace");return;}
      if(e.key==="Enter"){e.preventDefault();pressKey("Enter");return;}
      if(e.key==="Tab"){e.preventDefault();pressKey("Tab");return;}
      if(e.key===" "){e.preventDefault();pressKey(" ");return;}
      if(e.key.length===1) pressKey(e.key.toLowerCase());
    };
    const up=(e:KeyboardEvent)=>{if(e.key==="Shift") setShift(false);};
    window.addEventListener("keydown",down);
    window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  },[pressKey,flash]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 select-none transition-all duration-500"
      style={{background:T.pageBg}}>

      {/* 디스플레이 */}
      <div className="w-full max-w-5xl">
        <div className="relative rounded-2xl overflow-hidden transition-all duration-500"
          style={{background:T.dispBg,border:`1px solid ${T.dispBorder}`,boxShadow:`inset 0 2px 12px rgba(0,0,0,0.8),0 0 20px rgba(0,0,0,0.3)`}}>
          <div className="absolute inset-0 pointer-events-none"
            style={{background:`repeating-linear-gradient(0deg,transparent,transparent 23px,${T.scanline} 24px)`}}/>
          <div className="px-6 py-4 font-mono text-base min-h-[72px] relative z-10 leading-7 transition-colors duration-500"
            style={{color:T.dispText,textShadow:`0 0 8px ${T.dispCursor}66`}}>
            <span className="whitespace-pre-wrap break-all">
              {displayText||<span style={{color:T.dispPlaceholder}}>여기에 입력됩니다...</span>}
            </span>
            <span className="inline-block w-[2px] h-[1.1em] ml-0.5 align-text-bottom transition-colors duration-500"
              style={{background:T.dispCursor,boxShadow:`0 0 6px ${T.dispCursor}`,animation:"kc-blink 1s step-end infinite"}}/>
          </div>
        </div>
        <div className="flex justify-between mt-2 px-1">
          <div className="flex gap-3 text-[11px]">
            {shift&&<span style={{color:"#60a5fa",fontWeight:700}}>SHIFT</span>}
            {caps&&<span style={{color:"#fbbf24",fontWeight:700}}>CAPS</span>}
            {comp&&<span style={{color:"#c084fc",fontWeight:700}}>조합중: {getCompChar(comp)}</span>}
          </div>
          <button onClick={()=>{setText("");setComp(null);}}
            className="text-[11px] transition-colors" style={{color:T.keySub}}>지우기 ✕</button>
        </div>
      </div>

      {/* 테마 선택 패널 */}
      {showThemes&&(
        <div className="flex gap-4 px-6 py-3 rounded-2xl"
          style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(255,255,255,0.08)",backdropFilter:"blur(12px)"}}>
          {THEMES.map((th,i)=>(
            <button key={th.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{setThemeIdx(i);setShowThemes(false);}}
              className="flex flex-col items-center gap-1.5 transition-all duration-150"
              style={{opacity:themeIdx===i?1:0.5}}>
              <div style={{
                width:30,height:30,borderRadius:"50%",background:th.dot,
                boxShadow:themeIdx===i?`0 0 0 2.5px white,0 0 14px ${th.dot}`:`0 0 0 2px rgba(255,255,255,0.2)`,
                transform:themeIdx===i?"scale(1.18)":"scale(1)",
                transition:"all 0.15s",
              }}/>
              <span style={{fontSize:10,color:themeIdx===i?"white":"rgba(255,255,255,0.4)",fontWeight:700}}>{th.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 키보드 본체 */}
      <div className="w-full max-w-5xl rounded-[32px] flex flex-col gap-[7px] p-7 transition-all duration-500"
        style={{background:T.boardBg,boxShadow:T.boardShadow}}>

        {ROWS.map((row,ri)=>(
          <div key={ri} className="flex gap-[7px]">
            {row.map((k)=>{
              const isDown=pressed.has(k.key);
              const isActive=(k.key==="LShift"||k.key==="RShift")?shift:k.key==="CapsLock"?caps:false;
              const showKo=koMode&&(k.ko||k.koSub);
              const mainLabel=showKo?(shift&&k.koSub?k.koSub:(k.ko??k.label)):k.label;
              const subLabel=showKo?(shift?undefined:k.koSub):k.sub;

              let bg=k.key===" "?T.keyBgSpace:k.accent?T.keyBgAccent:T.keyBg;
              if(isActive) bg=T.activeBg;
              if(isDown) bg=T.keyDownBg;

              return (
                <button key={k.key+ri}
                  onMouseDown={e=>{e.preventDefault();pressKey(k.key);}}
                  style={{
                    flex:k.flex,height:64,borderRadius:10,
                    position:"relative",cursor:"pointer",
                    transition:"transform 0.07s,box-shadow 0.07s",
                    transform:isDown?"translateY(4px)":"translateY(0)",
                    background:bg,
                    boxShadow:isDown?T.keyDownShadow:T.keyShadow,
                    border:`1px solid ${T.border}`,
                    borderTop:`1px solid ${T.topBorder}`,
                    color:isActive?"#7affa0":T.keyText,
                    fontWeight:700,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    userSelect:"none",WebkitUserSelect:"none",
                    textShadow:isActive?`0 0 8px #7affa0`:`0 1px 2px rgba(0,0,0,0.5)`,
                  }}>
                  {subLabel&&(
                    <span style={{position:"absolute",top:5,right:7,fontSize:9,color:T.keySub,fontWeight:500}}>{subLabel}</span>
                  )}
                  {showKo&&(
                    <span style={{position:"absolute",bottom:5,right:7,fontSize:8,color:T.keySub,fontWeight:500,opacity:0.5,fontFamily:"monospace"}}>{k.label}</span>
                  )}
                  <span style={{fontSize:mainLabel.length>4?11:mainLabel.length>1?13:showKo?22:15,lineHeight:1}}>
                    {mainLabel}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {/* 하단 바 */}
        <div className="flex justify-between items-center mt-2 px-1">
          <span style={{fontSize:10,color:T.keySub,letterSpacing:"0.3em",fontFamily:"monospace",opacity:0.4}}>
            STELLA KEYCAP
          </span>
          <div className="flex gap-2 items-center">
            {/* 소리 토글 */}
            <button
              onMouseDown={e=>e.preventDefault()}
              onClick={()=>setSoundOn(v=>!v)}
              style={{
                padding:"4px 10px",borderRadius:8,fontSize:13,fontWeight:700,
                background:soundOn?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)",
                color:soundOn?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.25)",
                border:"1px solid rgba(255,255,255,0.1)",
                cursor:"pointer",transition:"all 0.15s",
              }}>
              {soundOn?"🔊":"🔇"}
            </button>
            <button
              onMouseDown={e=>e.preventDefault()}
              onClick={()=>setShowThemes(v=>!v)}
              style={{
                padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:700,
                background:showThemes?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.06)",
                color:"rgba(255,255,255,0.5)",
                border:"1px solid rgba(255,255,255,0.1)",
                cursor:"pointer",transition:"all 0.15s",
                display:"flex",alignItems:"center",gap:5,
              }}>
              <span style={{width:10,height:10,borderRadius:"50%",background:T.dot,display:"inline-block",boxShadow:`0 0 6px ${T.dot}`}}/>
              테마
            </button>
            <button
              onMouseDown={e=>e.preventDefault()}
              onClick={()=>{setComp(null);setKoMode(m=>!m);}}
              style={{
                padding:"4px 14px",borderRadius:8,fontSize:12,fontWeight:700,
                background:koMode?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.08)",
                color:koMode?"#fff":"rgba(255,255,255,0.4)",
                border:koMode?"1px solid #8b5cf6":"1px solid rgba(255,255,255,0.12)",
                cursor:"pointer",transition:"all 0.15s",
                boxShadow:koMode?"0 0 12px rgba(139,92,246,0.4)":"none",
              }}>
              {koMode?"한":"영"} / {koMode?"영":"한"}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes kc-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
