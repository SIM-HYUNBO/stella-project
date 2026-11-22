"use client";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import styles from "@/app/welcome.module.css";
type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: ReactNode };
export function AuthInput({ label, icon, id, ...props }: Props) {
  return <label className={styles.field} htmlFor={id}><span className={styles.fieldLabel}>{label}</span><span className={styles.inputWrap}>{icon}<input {...props} id={id}/></span></label>;
}
export function AuthPasswordInput({ label, id, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return <label className={styles.field} htmlFor={id}><span className={styles.fieldLabel}>{label}</span><span className={styles.inputWrap}><LockKeyhole size={17} strokeWidth={1.6}/><input {...props} id={id} type={visible ? "text" : "password"}/><button type="button" aria-label={visible ? `${label} 숨기기` : `${label} 보기`} aria-pressed={visible} className={styles.eyeButton} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={17} strokeWidth={1.6}/> : <Eye size={17} strokeWidth={1.6}/>}</button></span></label>;
}
