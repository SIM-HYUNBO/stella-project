"use client";
import { useState, useCallback, useEffect } from "react";

type KeyDef = { label: string; sub?: string; key: string; flex: number; accent?: boolean };

const SHIFT_OUT: Record<string, string> = {
  "`":"~","1":"!","2":"@","3":"#","4":"$","5":"%","6":"^","7":"&","8":"*","9":"(","0":")","-":"_","=":"+",
  "[":"{","]":"}","\\":"|",";":":","'":'"',",":"<",".":">","/":"?",
};

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
    {label:"Q",key:"q",flex:1},{label:"W",key:"w",flex:1},{label:"E",key:"e",flex:1},
    {label:"R",key:"r",flex:1},{label:"T",key:"t",flex:1},{label:"Y",key:"y",flex:1},
    {label:"U",key:"u",flex:1},{label:"I",key:"i",flex:1},{label:"O",key:"o",flex:1},
    {label:"P",key:"p",flex:1},{label:"[",sub:"{",key:"[",flex:1},{label:"]",sub:"}",key:"]",flex:1},
    {label:"\\",sub:"|",key:"\\",flex:1.5,accent:true},
  ],
  [
    {label:"Caps Lock",key:"CapsLock",flex:1.85,accent:true},
    {label:"A",key:"a",flex:1},{label:"S",key:"s",flex:1},{label:"D",key:"d",flex:1},
    {label:"F",key:"f",flex:1},{label:"G",key:"g",flex:1},{label:"H",key:"h",flex:1},
    {label:"J",key:"j",flex:1},{label:"K",key:"k",flex:1},{label:"L",key:"l",flex:1},
    {label:";",sub:":",key:";",flex:1},{label:"'",sub:'"',key:"'",flex:1},
    {label:"Enter",key:"Enter",flex:2.35,accent:true},
  ],
  [
    {label:"Shift",key:"LShift",flex:2.35,accent:true},
    {label:"Z",key:"z",flex:1},{label:"X",key:"x",flex:1},{label:"C",key:"c",flex:1},
    {label:"V",key:"v",flex:1},{label:"B",key:"b",flex:1},{label:"N",key:"n",flex:1},
    {label:"M",key:"m",flex:1},{label:",",sub:"<",key:",",flex:1},{label:".",sub:">",key:".",flex:1},
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
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);

  const flash = useCallback((key: string) => {
    setPressed(p => { const n = new Set(p); n.add(key); return n; });
    setTimeout(() => setPressed(p => { const n = new Set(p); n.delete(key); return n; }), 130);
  }, []);

  const pressKey = useCallback((key: string) => {
    flash(key);
    switch (key) {
      case "Backspace": setText(t => t.slice(0, -1)); break;
      case "Enter": setText(t => t + "\n"); break;
      case "Tab": setText(t => t + "    "); break;
      case "CapsLock": setCaps(c => !c); break;
      case "LShift": case "RShift": setShift(s => !s); break;
      case "LCtrl": case "RCtrl": case "LAlt": case "RAlt": case "Win": case "RWin": break;
      case " ": setText(t => t + " "); break;
      default: {
        const isLetter = /^[a-z]$/.test(key);
        let char = key;
        if (shift) {
          char = SHIFT_OUT[key] ?? (isLetter ? key.toUpperCase() : key);
          setShift(false);
        } else if (caps && isLetter) {
          char = key.toUpperCase();
        }
        setText(t => t + char);
      }
    }
  }, [shift, caps, flash]);

  // 물리 키보드도 지원
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") { setShift(true); flash("LShift"); flash("RShift"); return; }
      if (e.key === "CapsLock") { setCaps(c => !c); flash("CapsLock"); return; }
      if (e.key === "Backspace") { e.preventDefault(); setText(t => t.slice(0, -1)); flash("Backspace"); return; }
      if (e.key === "Enter") { e.preventDefault(); setText(t => t + "\n"); flash("Enter"); return; }
      if (e.key === "Tab") { e.preventDefault(); setText(t => t + "    "); flash("Tab"); return; }
      if (e.key === " ") { e.preventDefault(); setText(t => t + " "); flash(" "); return; }
      if (e.key.length === 1) { setText(t => t + e.key); flash(e.key.toLowerCase()); }
    };
    const up = (e: KeyboardEvent) => { if (e.key === "Shift") setShift(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [flash]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 select-none"
      style={{ background: "radial-gradient(ellipse at center, #1e1e2e 0%, #0d0d0d 100%)" }}>

      {/* 디스플레이 */}
      <div className="w-full max-w-5xl">
        <div className="relative rounded-2xl overflow-hidden"
          style={{ background: "#060608", border: "1px solid #2a2a3a", boxShadow: "inset 0 2px 12px rgba(0,0,0,0.8), 0 0 0 1px #111" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.015) 24px)" }} />
          <div className="px-6 py-4 font-mono text-base min-h-[72px] relative z-10 leading-7"
            style={{ color: "#a0ffb0", textShadow: "0 0 8px rgba(100,255,150,0.4)" }}>
            <span className="whitespace-pre-wrap break-all">{text || <span style={{ color: "#2a3a2a" }}>여기에 입력됩니다...</span>}</span>
            <span className="inline-block w-[2px] h-[1.1em] ml-0.5 align-text-bottom"
              style={{ background: "#a0ffb0", boxShadow: "0 0 6px #a0ffb0", animation: "kc-blink 1s step-end infinite" }} />
          </div>
        </div>
        <div className="flex justify-between mt-2 px-1">
          <div className="flex gap-3 text-[11px] text-gray-600">
            {shift && <span className="text-sky-400 font-bold">SHIFT</span>}
            {caps && <span className="text-yellow-400 font-bold">CAPS</span>}
          </div>
          <button onClick={() => setText("")}
            className="text-[11px] text-gray-600 hover:text-gray-400 transition">지우기 ✕</button>
        </div>
      </div>

      {/* 키보드 본체 */}
      <div className="w-full max-w-5xl rounded-[32px] flex flex-col gap-[7px] p-7"
        style={{
          background: "linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.9), 0 0 0 1px #333, inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>

        {ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-[7px]">
            {row.map((k) => {
              const isDown = pressed.has(k.key);
              const isActive = (k.key === "LShift" || k.key === "RShift") ? shift : k.key === "CapsLock" ? caps : false;
              const isSpace = k.key === " ";

              return (
                <button
                  key={k.key + ri}
                  onMouseDown={(e) => { e.preventDefault(); pressKey(k.key); }}
                  style={{
                    flex: k.flex,
                    height: 64,
                    borderRadius: 10,
                    position: "relative",
                    cursor: "pointer",
                    transition: "transform 0.07s, box-shadow 0.07s",
                    transform: isDown ? "translateY(4px)" : "translateY(0)",
                    background: isActive
                      ? "linear-gradient(180deg, #2a7a4a 0%, #1e5a38 100%)"
                      : k.accent
                      ? (isDown ? "linear-gradient(180deg, #323244 0%, #28283a 100%)" : "linear-gradient(180deg, #3e3e56 0%, #32324a 100%)")
                      : isSpace
                      ? (isDown ? "linear-gradient(180deg, #2e2e2e 0%, #262626 100%)" : "linear-gradient(180deg, #424242 0%, #363636 100%)")
                      : (isDown ? "linear-gradient(180deg, #363636 0%, #2e2e2e 100%)" : "linear-gradient(180deg, #525252 0%, #424242 100%)"),
                    boxShadow: isDown
                      ? "0 1px 0 #080808, inset 0 1px 3px rgba(0,0,0,0.6)"
                      : isActive
                      ? "0 5px 0 #0a2a1a, 0 6px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"
                      : "0 5px 0 #0a0a0a, 0 6px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: isActive ? "#7affa0" : "#d0d0d0",
                    fontWeight: k.accent ? 600 : 700,
                    fontSize: k.label.length > 4 ? 11 : k.label.length > 2 ? 12 : 15,
                    letterSpacing: k.label.length === 1 ? "0.02em" : undefined,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    textShadow: isActive ? "0 0 8px #7affa0" : "0 1px 2px rgba(0,0,0,0.8)",
                  }}
                >
                  {k.sub && (
                    <span style={{
                      position: "absolute", top: 5, right: 7,
                      fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 500,
                    }}>{k.sub}</span>
                  )}
                  {k.label}
                </button>
              );
            })}
          </div>
        ))}

        {/* 브랜드 */}
        <div className="flex justify-center mt-1">
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.1)", letterSpacing: "0.3em", fontFamily: "monospace" }}>
            STELLA KEYCAP
          </span>
        </div>
      </div>

      <style>{`
        @keyframes kc-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
