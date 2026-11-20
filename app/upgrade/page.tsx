"use client";

import Link from "next/link";

const plans = [
  { name: "BASIC", label: "베이직", price: "2,000", premium: false },
  { name: "PREMIUM", label: "프리미엄", price: "5,000", premium: true },
];

export default function UpgradePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f9fc] text-[#182338]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-48 h-[560px] w-[560px] rounded-full bg-sky-200/40 blur-[100px]" />
        <div className="absolute -left-32 top-[520px] h-96 w-96 rounded-full bg-indigo-100/50 blur-[100px]" />
      </div>

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/tools" aria-label="설정으로 돌아가기" className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white/70 shadow-sm transition hover:bg-white active:scale-95">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
        </Link>
        <Link href="/home" className="text-sm font-semibold tracking-[0.2em]">WAGIE</Link>
      </header>

      <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-10 sm:pt-16">
        <div className="mb-12 text-center sm:mb-16">
          <p className="mb-5 text-xs font-medium tracking-[0.28em] text-sky-600">WAGIE MEMBERSHIP</p>
          <h1 className="text-[38px] font-semibold leading-[1.2] tracking-tight sm:text-6xl">우리의 대화에<br /><span className="text-sky-500">조금 더 특별함을.</span></h1>
          <p className="mt-6 text-sm leading-relaxed text-slate-500">베이직과 프리미엄, 나에게 맞는 와기를 만나 봐.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          {plans.map((plan) => (
            <section key={plan.name} aria-labelledby={`plan-${plan.name}`} className={`relative isolate overflow-hidden rounded-[32px] border p-7 sm:p-9 ${plan.premium ? "border-slate-700 bg-[#152139] text-white shadow-[0_24px_64px_-24px_rgba(15,23,42,0.6)]" : "border-white bg-white/85 shadow-[0_20px_60px_-30px_rgba(51,65,85,0.2)]"}`}>
              {plan.premium && <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-sky-400/25 blur-[65px]" />}
              <div aria-hidden="true" className={`mb-9 flex h-12 w-12 items-center justify-center rounded-2xl border ${plan.premium ? "border-white/15 bg-white/10 text-sky-200" : "border-sky-100 bg-sky-50 text-sky-500"}`}>
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  {plan.premium ? <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" /><path d="m19 2 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" /></> : <><circle cx="12" cy="12" r="8" /><path d="m8 12 3 3 5-6" /></>}
                </svg>
              </div>
              <p className={`mb-2 text-[11px] font-medium tracking-[0.24em] ${plan.premium ? "text-sky-200" : "text-slate-400"}`}>{plan.name}</p>
              <h2 id={`plan-${plan.name}`} className="text-2xl font-semibold">{plan.label}</h2>
              <p className="mb-8 mt-8 flex flex-wrap items-baseline gap-1.5">
                <span className={`text-lg ${plan.premium ? "text-slate-300" : "text-slate-400"}`}>₩</span>
                <span className="text-5xl font-medium tracking-tight">{plan.price}</span>
                <span className={`ml-1 text-sm ${plan.premium ? "text-slate-400" : "text-slate-500"}`}>/ 월</span>
              </p>
              <div className={`mb-8 border-t pt-5 text-sm ${plan.premium ? "border-white/10 text-slate-300" : "border-slate-100 text-slate-500"}`}>포함될 기능은 준비 중이에요.</div>
              <button type="button" disabled className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold ${plan.premium ? "bg-gradient-to-r from-sky-200 to-sky-100 text-slate-800" : "bg-slate-100 text-slate-500"}`}>
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                구독 준비 중
              </button>
            </section>
          ))}
        </div>
        <p className="mt-8 text-center text-xs leading-6 text-slate-500">멤버십 오픈 예정 · 현재는 요금 안내 페이지예요.<br />구매와 결제는 정식 오픈 후 이용할 수 있어요.</p>
      </div>
    </main>
  );
}
