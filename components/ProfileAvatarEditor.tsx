"use client";
/* eslint-disable @next/next/no-img-element -- Generated local SVG/PNG previews and user-uploaded data URLs. */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Shuffle, X } from "lucide-react";
import { AVATAR_OPTIONS, DEFAULT_AVATAR, ProfileAvatar, avatarDataUri, normalizeAvatar } from "@/lib/profile-avatar";
import styles from "@/app/profile/profile.module.css";
const LABELS: Record<string, string> = { bob: "단발", short: "숏컷", wave: "웨이브", bun: "올림머리", crop: "짧은 머리", none: "없음", smile: "미소", happy: "활짝", wink: "윙크", calm: "차분", hoodie: "후드", tee: "티셔츠", collar: "셔츠", glasses: "안경", headphones: "헤드폰", cap: "모자" };
export default function ProfileAvatarEditor({ initial, onClose, onSave }: { initial: ProfileAvatar; onClose: () => void; onSave: (value: ProfileAvatar) => Promise<void> }) {
  const [draft, setDraft] = useState(() => normalizeAvatar(initial));
  const [tab, setTab] = useState("hair");
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = overflow; previous?.focus(); }; }, []);
  const choices = (key: keyof ProfileAvatar, title: string) => <fieldset className={styles.field}><legend>{title}</legend><div className={styles.choices}>{AVATAR_OPTIONS[key].map(option => <button type="button" disabled={saving} key={option} aria-label={option.startsWith("#") ? `${title} ${option}` : LABELS[option]} aria-pressed={draft[key] === option} className={option.startsWith("#") ? styles.swatch : styles.avatarChoice} style={option.startsWith("#") ? { background: option } : undefined} onClick={() => setDraft(value => ({ ...value, [key]: option }))}>{option.startsWith("#") ? draft[key] === option && <Check size={17} color={option === "#39302e" || option === "#405a78" || option === "#875b48" ? "white" : "#354052"} /> : <><img src={avatarDataUri({ ...draft, [key]: option, ...(["hair", "expression"].includes(key) ? { accessory: "none" } : {}) })} alt="" aria-hidden="true" /><span>{LABELS[option]}</span></>}</button>)}</div></fieldset>;
  return createPortal(<div className={styles.editorOverlay} role="dialog" aria-modal="true" aria-label="내 아바타 꾸미기" onKeyDown={event => {
    if (event.key === "Escape" && !lock.current) onClose();
    if (event.key === "Tab") { const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"); const first = buttons[0], last = buttons[buttons.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
  }}><section className={styles.editor}><header className={styles.editorHeader}><div><span className={styles.eyebrow}>MAKE IT YOURS</span><h2>내 아바타 꾸미기</h2></div><button type="button" autoFocus disabled={saving} aria-label="아바타 꾸미기 닫기" onClick={onClose} className={styles.iconButton}><X size={21} /></button></header>
    <div className={styles.editorPreview}><img src={avatarDataUri(draft)} alt="내가 꾸미는 캐릭터 미리보기" /><button type="button" disabled={saving} className={styles.random} onClick={() => setDraft(normalizeAvatar(Object.fromEntries(Object.keys(DEFAULT_AVATAR).map(key => { const options = AVATAR_OPTIONS[key as keyof ProfileAvatar]; return [key, options[Math.floor(Math.random() * options.length)]]; }))))}><Shuffle size={15} />랜덤으로</button></div>
    <nav className={styles.tabs} aria-label="꾸미기 분류">{[["hair", "헤어"], ["face", "얼굴"], ["outfit", "옷"], ["accessory", "소품"], ["background", "배경"]].map(([key,label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</nav>
    <div className={styles.editorOptions}>{tab === "hair" ? <>{choices("hair", "헤어스타일")}{choices("hairColor", "머리 색")}</> : tab === "face" ? <>{choices("expression", "표정")}{choices("skin", "피부 톤")}</> : tab === "outfit" ? <>{choices("outfit", "옷 종류")}{choices("outfitColor", "옷 색")}</> : tab === "accessory" ? choices("accessory", "소품") : choices("background", "배경색")}</div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <footer className={styles.editorFooter}><button type="button" disabled={saving} onClick={onClose} className={styles.secondary}>취소</button><button type="button" disabled={saving} className={styles.primary} onClick={async () => { if (lock.current) return; lock.current = true; setSaving(true); setError(""); try { await onSave(draft); onClose(); } catch (error) { setError(error instanceof Error ? error.message : "저장하지 못했어. 다시 시도해 줘."); } finally { lock.current = false; setSaving(false); } }}>{saving ? "저장하고 있어…" : "이 모습으로 저장"}<Check size={17} /></button></footer>
  </section></div>, document.body);
}
