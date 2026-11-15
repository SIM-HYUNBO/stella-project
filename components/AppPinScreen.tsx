import { useId } from "react";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

type Props = {
  title: string;
  description: string;
  count: number;
  error?: string;
  step?: 1 | 2;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClose?: () => void;
};

export default function AppPinScreen({ title, description, count, error, step, onDigit, onDelete, onClose }: Props) {
  const titleId = useId();
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId}
      className="fixed inset-0 z-[9998] overflow-y-auto overscroll-contain bg-gradient-to-br from-amber-50 via-white to-sky-100 text-slate-800">
      <div className="relative grid min-h-full place-items-center px-4 py-5">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-16 top-[10%] h-56 w-56 rounded-full bg-yellow-200/50 blur-3xl" />
          <div className="absolute -right-10 bottom-[10%] h-64 w-64 rounded-full bg-sky-200/70 blur-3xl" />
        </div>
        <section className="relative w-full max-w-[340px] rounded-[32px] border border-white bg-white/75 px-5 pb-5 pt-4 text-center shadow-[0_18px_55px_rgba(56,139,180,0.14)] backdrop-blur-xl sm:px-7">
          {onClose && <button type="button" aria-label="비밀번호 설정 닫기" onClick={onClose} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-lg text-slate-500 hover:bg-sky-50">✕</button>}
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white bg-gradient-to-br from-yellow-100 to-sky-100 shadow-sm">
            <img src="/wag.png" alt="" className="h-11 w-11 object-contain" />
          </div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-sky-800">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V7a4 4 0 0 1 8 0v4m-4 4v2" /></svg>
            {step ? `비밀번호 설정 · ${step}/2` : "WAGIE LOCK"}
          </div>
          <h1 id={titleId} className="text-xl font-black">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          <div role="img" aria-label={`4자리 중 ${count}자리 입력됨`} className="mx-auto mt-3 flex w-fit items-center gap-3 rounded-full border border-white bg-slate-100/80 px-4 py-2.5">
            {[0, 1, 2, 3].map(index => <span key={index} className={`h-3 w-3 rounded-full border transition-colors ${index >= count ? "border-slate-300 bg-white" : error ? "border-red-400 bg-red-400" : "border-sky-500 bg-sky-400"}`} />)}
          </div>
          <p role="status" className="flex min-h-7 items-center justify-center text-xs font-semibold text-red-600">{error}</p>
          <div className="grid grid-cols-3 gap-2">
            {keys.map(key => key ? <button key={key} type="button" aria-label={key === "delete" ? "마지막 숫자 지우기" : key} disabled={count === 4 || (key === "delete" && !count)}
              onClick={() => key === "delete" ? onDelete() : onDigit(key)}
              className="grid h-12 place-items-center rounded-2xl border border-sky-100 bg-gradient-to-b from-white to-sky-50/80 text-xl font-black tabular-nums shadow-sm transition hover:border-sky-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60 sm:h-14">
              {key === "delete" ? <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 6H9l-6 6 6 6h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1Zm-8 3 6 6m0-6-6 6" /></svg> : key}
            </button> : <span key="empty" aria-hidden="true" className="grid place-items-center text-sm text-amber-500">✦</span>)}
          </div>
        </section>
      </div>
    </div>
  );
}
