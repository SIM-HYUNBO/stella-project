import styles from "./AIThinking.module.css";

export default function AIThinking() {
  return <div role="status" aria-label="답변 생각 중" className={styles.waiting}>
    <svg aria-hidden="true" className={styles.robot} width="36" height="36" viewBox="0 0 40 40" fill="none">
      <path d="M20 9V5" stroke="#2797d4" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="4" r="2" fill="#facc15" />
      <rect x="7" y="10" width="26" height="23" rx="9" fill="#e0f4ff" stroke="#38bdf8" strokeWidth="1.5" />
      <path d="M4 19v6m32-6v6" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
      <g className={styles.eyes}><circle cx="15" cy="20" r="2" fill="#2182b5" /><circle cx="25" cy="20" r="2" fill="#2182b5" /></g>
      <path d="M16 26q4 3 8 0" stroke="#2797d4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
    <span aria-hidden="true" className={styles.dots}>{[0, 1, 2].map(i => <span key={i} style={{ animationDelay: `${i * 160}ms` }} />)}</span>
    <span aria-hidden="true" className={styles.label}>생각을 모으는 중…</span>
  </div>;
}
