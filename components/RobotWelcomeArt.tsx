/** Small glass robot illustration shared by the two AI entry screens. */
export default function RobotWelcomeArt({ color, compact = false, icon = false }: { color: string; compact?: boolean; icon?: boolean }) {
  return <div aria-hidden="true" className={`relative mx-auto ${icon ? "h-8 w-8" : compact ? "h-28 w-36" : "h-44 w-56"}`}>
    {!icon && <div className="absolute inset-x-5 bottom-3 h-8 rounded-[50%] blur-xl opacity-20" style={{ background: color }} />}
    <svg className="relative h-full w-full" viewBox={icon ? "25 10 190 160" : "0 0 240 190"} fill="none">
      <ellipse cx="120" cy="174" rx="55" ry="7" fill={color} opacity="0.1" />
      <circle cx="194" cy="40" r="5" fill={color} opacity="0.35" />
      <path d="M41 60v12M35 66h12" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M119 42V29" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <circle cx="119" cy="23" r="8" fill={color} fillOpacity="0.25" stroke="white" strokeWidth="2" />
      <rect x="33" y="86" width="17" height="33" rx="8.5" fill={color} fillOpacity="0.18" stroke="white" strokeWidth="2" />
      <rect x="190" y="86" width="17" height="33" rx="8.5" fill={color} fillOpacity="0.18" stroke="white" strokeWidth="2" />
      <rect x="47" y="46" width="146" height="114" rx="42" fill={color} fillOpacity="0.18" stroke="white" strokeWidth="3" />
      <path d="M63 80c4-14 15-20 31-20h52" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      <rect x="65" y="75" width="110" height="63" rx="25" fill="white" fillOpacity="0.82" stroke="white" strokeWidth="2" />
      <path d="M91 99v8M149 99v8" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
      <path d="M111 119q9 8 18 0" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="86" cy="118" rx="8" ry="4" fill={color} opacity="0.3" />
      <ellipse cx="154" cy="118" rx="8" ry="4" fill={color} opacity="0.3" />
    </svg>
  </div>;
}
