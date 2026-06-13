"use client";
import { useState, useEffect } from "react";

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

  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:200,
      background:"#1a1a1a",
      borderTop:"1px solid #333",
      boxShadow:"0 -4px 24px rgba(0,0,0,0.5)",
      padding:"0 4px 8px",
      userSelect:"none", WebkitUserSelect:"none",
    }}>
      {/* 미리보기 + 닫기 */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 4px 4px",borderBottom:"1px solid #2a2a2a",marginBottom:4}}>
        <div style={{
          flex:1, fontFamily:"monospace", fontSize:15, color:"#e0e0e0",
          minHeight:24, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis",
          direction:"ltr",
        }}>
          {displayText||<span style={{color:"#555"}}>입력...</span>}
          <span style={{display:"inline-block",width:2,height:"1em",background:"#60a5fa",marginLeft:1,verticalAlign:"text-bottom",animation:"kchat-blink 1s step-end infinite"}}/>
        </div>
        <button onMouseDown={e=>e.preventDefault()} onTouchStart={e=>{e.preventDefault();onClose();}} onClick={onClose}
          style={{padding:"2px 10px",borderRadius:6,background:"#333",color:"#aaa",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,flexShrink:0}}>
          닫기
        </button>
      </div>

      {/* 키 */}
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {rows.map((row,ri)=>(
          <div key={ri} style={{display:"flex",gap:3}}>
            {row.map(k=>{
              const isDown=pressed.has(k);
              const isActive=(k==="Shift"&&shift)||(k==="한/영"&&koMode);
              const showKo=koMode&&!numMode&&KO_MAP[k];
              const label=showKo?(shift&&KO_SH[k]?KO_SH[k]:KO_MAP[k]!):k;
              const isEnter=k==="↩";
              const isSpace=k===" ";

              return (
                <button key={k+ri}
                  onMouseDown={e=>{e.preventDefault();pressKey(k);}}
                  onTouchStart={e=>{e.preventDefault();pressKey(k);}}
                  style={{
                    flex:keyFlex(k), height:42, borderRadius:6,
                    background:isDown?"#111":isActive?"#3b5bdb":isEnter?"#2563eb":isSpace?"#3a3a3a":"#2e2e2e",
                    color:isDown?"#888":"#e0e0e0",
                    fontSize:showKo?20:label.length>2?10:14,
                    fontWeight:700,
                    border:"none",
                    cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    transform:isDown?"scale(0.93)":"scale(1)",
                    transition:"transform 0.07s,background 0.07s",
                    touchAction:"none",
                    boxShadow:isDown?"none":"0 2px 0 #111",
                    position:"relative",
                  }}>
                  {/* 영문 서브라벨 (한글 모드) */}
                  {showKo&&(
                    <span style={{position:"absolute",top:2,right:4,fontSize:7,color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{k.toUpperCase()}</span>
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
}
