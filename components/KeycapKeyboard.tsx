"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// ── 한글 두벌식 ──────────────────────────────────────────────────────────────
const CHOSUNG  = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const JUNGSUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
const JONGSUNG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

const CHO_IDX : Record<string,number> = Object.fromEntries(CHOSUNG.map((c,i)=>[c,i]));
const JUNG_IDX: Record<string,number> = Object.fromEntries(JUNGSUNG.map((c,i)=>[c,i]));
const JONG_IDX: Record<string,number> = {};
JONGSUNG.forEach((c,i)=>{ if(c) JONG_IDX[c]=i; });

const COMPOUND_JONG: Record<string,number> = {"1_9":3,"4_12":5,"4_18":6,"8_0":9,"8_6":10,"8_7":11,"8_9":12,"8_16":13,"8_17":14,"8_18":15,"17_9":18};
const COMPOUND_JUNG: Record<string,number> = {"8_0":9,"8_1":10,"8_20":11,"13_4":14,"13_5":15,"13_20":16,"18_20":19};
const SPLIT_JONG: Record<number,[number,number]> = {3:[1,9],5:[4,12],6:[4,18],9:[8,0],10:[8,6],11:[8,7],12:[8,9],13:[8,16],14:[8,17],15:[8,18],18:[17,9]};
const JONG_TO_CHO: Record<number,number> = {1:0,2:1,4:2,7:3,8:5,16:6,17:7,19:9,20:10,21:11,22:12,23:14,24:15,25:16,26:17,27:18};

const buildSyl = (cho:number,jung:number,jong=0) => String.fromCharCode(0xAC00+(cho*21+jung)*28+jong);

type Comp = {cho:number;jung:number;jong:number}|null;

function getCompChar(c:Comp): string {
  if(!c) return "";
  if(c.jung<0) return CHOSUNG[c.cho];
  return buildSyl(c.cho,c.jung,c.jong<0?0:c.jong);
}
function finalizeStr(text:string,c:Comp): string { return text+getCompChar(c); }

function koInput(text:string,comp:Comp,jamo:string):[string,Comp] {
  const vi=JUNG_IDX[jamo],ci=CHO_IDX[jamo];
  if(vi!==undefined){
    if(!comp) return [text,{cho:11,jung:vi,jong:-1}];
    if(comp.jung<0) return [text,{cho:comp.cho,jung:vi,jong:-1}];
    if(comp.jong<0){
      const k=`${comp.jung}_${vi}`;
      if(COMPOUND_JUNG[k]!==undefined) return [text,{cho:comp.cho,jung:COMPOUND_JUNG[k],jong:-1}];
      return [finalizeStr(text,comp),{cho:11,jung:vi,jong:-1}];
    }
    const sp=SPLIT_JONG[comp.jong];
    const[rj,nc]=sp??[0,JONG_TO_CHO[comp.jong]??11];
    return [text+buildSyl(comp.cho,comp.jung,rj),{cho:nc,jung:vi,jong:-1}];
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
  if(comp.jong>=0){ const sp=SPLIT_JONG[comp.jong]; return [text,{...comp,jong:sp?sp[0]:-1}]; }
  if(comp.jung>=0) return [text,{cho:comp.cho,jung:-1,jong:-1}];
  return [text,null];
}

// ── 레이아웃 ─────────────────────────────────────────────────────────────────
const KO_MAP: Record<string,string> = {q:"ㅂ",w:"ㅈ",e:"ㄷ",r:"ㄱ",t:"ㅅ",y:"ㅛ",u:"ㅕ",i:"ㅑ",o:"ㅐ",p:"ㅔ",a:"ㅁ",s:"ㄴ",d:"ㅇ",f:"ㄹ",g:"ㅎ",h:"ㅗ",j:"ㅓ",k:"ㅏ",l:"ㅣ",z:"ㅋ",x:"ㅌ",c:"ㅊ",v:"ㅍ",b:"ㅠ",n:"ㅜ",m:"ㅡ"};
const KO_SH : Record<string,string> = {q:"ㅃ",w:"ㅉ",e:"ㄸ",r:"ㄲ",t:"ㅆ",o:"ㅒ",p:"ㅖ"};

const ALPHA_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["Shift","z","x","c","v","b","n","m","⌫"],
  ["123","한/영"," ","↩"],
];
const NUM_ROWS = [
  ["1","2","3","4","5","6","7","8","9","0"],
  ["-","/",":",";","(",")",'"',"'","@","_"],
  ["#","+","=",".","!","?",",","\\","⌫"],
  ["ABC","한/영"," ","↩"],
];

// 키별 flex 비율
function keyFlex(k:string): number {
  if(k===" ") return 4;
  if(k==="Shift"||k==="⌫") return 1.5;
  if(k==="↩") return 1.4;
  if(k==="123"||k==="ABC") return 1.2;
  if(k==="한/영") return 1.3;
  return 1;
}

interface Props {
  defaultValue: string;
  onChange?: (text: string) => void;
  onEnter: (fullText: string) => void;
  onClose: () => void;
}

export default function KeycapKeyboard({ defaultValue, onChange, onEnter, onClose }: Props) {
  const [text, setText] = useState(defaultValue);
  const [comp, setComp] = useState<Comp>(null);
  const [shift, setShift] = useState(false);
  const [koMode, setKoMode] = useState(false);
  const [numMode, setNumMode] = useState(false);
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  const compChar = getCompChar(comp);
  const displayText = text + compChar;

  // 외부에서 초기값이 바뀌면 동기화
  useEffect(() => { setText(defaultValue); setComp(null); }, [defaultValue]);

  const flash = (k:string) => {
    setPressed(p=>{const n=new Set(p);n.add(k);return n;});
    setTimeout(()=>setPressed(p=>{const n=new Set(p);n.delete(k);return n;}),110);
  };

  const pressKey = (key:string) => {
    flash(key);
    if(key==="Shift"){ setShift(s=>!s); return; }
    if(key==="한/영"){ setKoMode(m=>!m); setComp(null); return; }
    if(key==="123"){ setNumMode(true); return; }
    if(key==="ABC"){ setNumMode(false); return; }
    if(key==="⌫"){
      if(koMode&&!numMode){
        const[nt,nc]=koBackspace(text,comp);
        setText(nt); setComp(nc); onChange?.(nt);
      } else {
        const nt=text.slice(0,-1); setText(nt); onChange?.(nt);
      }
      return;
    }
    if(key==="↩"){
      const full=finalizeStr(text,comp).trim();
      if(full){ setText(""); setComp(null); onChange?.(""); onEnter(full); }
      return;
    }
    if(key===" "){
      const nt=finalizeStr(text,comp)+" "; setText(nt); setComp(null); onChange?.(nt); return;
    }

    if(koMode&&!numMode){
      const jamo=shift?(KO_SH[key]??KO_MAP[key]):KO_MAP[key];
      if(jamo){
        const[nt,nc]=koInput(text,comp,jamo);
        setText(nt); setComp(nc); onChange?.(nt);
        if(shift&&KO_SH[key]) setShift(false);
        return;
      }
    }
    const isLetter=/^[a-z]$/.test(key);
    let char=key;
    if(shift&&isLetter){ char=key.toUpperCase(); setShift(false); }
    const nt=text+char; setText(nt); onChange?.(nt);
  };

  const rows = numMode ? NUM_ROWS : ALPHA_ROWS;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const keyboard = (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:9999,
      background:"#1c1c1e",
      borderTop:"1px solid #3a3a3c",
      boxShadow:"0 -6px 30px rgba(0,0,0,0.6)",
      paddingBottom:"max(8px, env(safe-area-inset-bottom))",
      userSelect:"none", WebkitUserSelect:"none",
      touchAction:"none",
    }}>
      {/* 미리보기 + 닫기 */}
      <div style={{
        display:"flex", alignItems:"center", gap:8,
        padding:"8px 10px 6px",
        borderBottom:"1px solid #2c2c2e",
      }}>
        <div style={{
          flex:1, fontSize:15, color:"#e5e5ea",
          minHeight:22, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis",
        }}>
          {displayText || <span style={{color:"#48484a"}}>입력...</span>}
          <span style={{
            display:"inline-block", width:2, height:"1em",
            background:"#0a84ff", marginLeft:1, verticalAlign:"text-bottom",
            animation:"kchat-blink 1s step-end infinite",
          }}/>
        </div>
        <button
          onMouseDown={e=>e.preventDefault()}
          onTouchStart={e=>{e.preventDefault(); onClose();}}
          onClick={onClose}
          style={{
            padding:"3px 12px", borderRadius:8,
            background:"#2c2c2e", color:"#8e8e93",
            border:"none", cursor:"pointer", fontSize:13, fontWeight:600, flexShrink:0,
          }}>
          닫기
        </button>
      </div>

      {/* 키 */}
      <div style={{display:"flex", flexDirection:"column", gap:5, padding:"6px 4px 0"}}>
        {rows.map((row,ri)=>(
          <div key={ri} style={{display:"flex", flexDirection:"row", gap:4, width:"100%"}}>
            {row.map(k=>{
              const isDown  = pressed.has(k);
              const isActive= (k==="Shift"&&shift)||(k==="한/영"&&koMode);
              const showKo  = koMode&&!numMode&&!!KO_MAP[k];
              const label   = showKo ? (shift&&KO_SH[k] ? KO_SH[k] : KO_MAP[k]!) : k;
              const isEnter = k==="↩";
              const isSpace = k===" ";

              return (
                <button key={k+ri}
                  onMouseDown={e=>{e.preventDefault(); pressKey(k);}}
                  onTouchStart={e=>{e.preventDefault(); pressKey(k);}}
                  style={{
                    flex: keyFlex(k),
                    height: 50,
                    minWidth: 0,
                    borderRadius: 9,
                    background: isDown ? "#0a0a0a"
                      : isActive   ? "#0a84ff"
                      : isEnter    ? "#0a84ff"
                      : isSpace    ? "#3a3a3c"
                      : "#2c2c2e",
                    color: isDown ? "#555" : "#f5f5f7",
                    fontSize: showKo ? 21 : label.length > 2 ? 11 : 16,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: isDown ? "scale(0.91)" : "scale(1)",
                    transition: "transform 0.06s, background 0.06s",
                    touchAction: "none",
                    boxShadow: isDown ? "none" : "0 2px 0 #080808",
                    position: "relative",
                    flexShrink: 1,
                  }}>
                  {showKo && (
                    <span style={{
                      position:"absolute", top:3, right:5,
                      fontSize:8, color:"rgba(255,255,255,0.3)", fontFamily:"monospace",
                    }}>{k.toUpperCase()}</span>
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <style>{`@keyframes kchat-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );

  return createPortal(keyboard, document.body);
}
