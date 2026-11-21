"use client";

import Link from "next/link";
import LightTrialNotice from "@/components/LightTrialNotice";

const plans = [
  { name: "LIGHT", label: "라이트", price: "2,000", premium: false },
  { name: "PREMIUM", label: "프리미엄", price: "5,000", premium: true },
];

export default function UpgradePage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#080e19] text-white selection:bg-sky-300 selection:text-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-420px] h-[760px] w-[900px] -translate-x-1/2 rounded-full bg-sky-400/15 blur-[100px]" />
        <div className="absolute -right-48 top-[520px] h-[540px] w-[540px] rounded-full bg-blue-600/10 blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-[680px] opacity-[0.06] [background-image:linear-gradient(#a5d8ff_1px,transparent_1px),linear-gradient(90deg,#a5d8ff_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(black,transparent)]" />
      </div>

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/tools" aria-label="설정으로 돌아가기" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 backdrop-blur-xl transition hover:border-white/30 hover:bg-white/10 active:scale-95">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
        </Link>
        <Link href="/home" className="text-sm font-semibold tracking-[0.2em] text-slate-200">WAGIE<span className="ml-1 text-sky-300">.</span></Link>
      </header>

      <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-10 sm:px-6 sm:pt-16">
        <div className="mb-12 text-center sm:mb-16">
          <p className="mb-6 text-[10px] font-medium tracking-[0.32em] text-sky-200/80">WAGIE MEMBERSHIP</p>
          <h1 className="text-[clamp(2.3rem,7vw,4.4rem)] font-medium leading-[1.2] tracking-[-0.055em]">우리의 대화에<br /><span className="bg-gradient-to-r from-white via-sky-200 to-blue-400 bg-clip-text text-transparent">조금 더 특별함을.</span></h1>
          <p className="mt-6 text-sm leading-relaxed text-slate-400">라이트와 프리미엄, 나에게 맞는 와기를 만나 봐.</p>
          <p className="mt-5 inline-flex rounded-full border border-sky-200/20 bg-sky-200/10 px-4 py-2 text-xs font-medium text-sky-200">첫 1개월 무료 체험 · 오픈 예정</p>
          <LightTrialNotice />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          {plans.map((plan) => (
            <section key={plan.name} aria-labelledby={`plan-${plan.name}`} className={`group relative isolate overflow-hidden rounded-[30px] border p-5 transition duration-500 motion-safe:hover:-translate-y-1 sm:p-7 ${plan.premium ? "border-sky-200/25 bg-gradient-to-b from-[#17283c] to-[#0e1725] shadow-[0_0_64px_-24px_rgba(56,189,248,0.35)]" : "border-white/10 bg-gradient-to-b from-[#19212e] to-[#101723]"}`}>
              <div aria-hidden="true" className={`pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${plan.premium ? "via-sky-100/80" : "via-white/30"}`} />
              <div className={`relative mb-8 flex aspect-[1.7] flex-col justify-between overflow-hidden rounded-[20px] border p-5 shadow-2xl ${plan.premium ? "border-sky-100/30 bg-[linear-gradient(120deg,#314b67_0%,#142236_40%,#203d58_65%,#101a2a_100%)] text-sky-50" : "border-white/80 bg-[linear-gradient(120deg,#e8eef3_0%,#c3ced9_40%,#f4f7fa_65%,#b9c6d4_100%)] text-slate-700"}`}>
                <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-72 w-36 rotate-[28deg] bg-white/10 blur-xl transition-transform duration-700 group-hover:translate-x-[-70px]" />
                <div className="relative flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-[0.22em]">WAGIE</span>
                  <span aria-hidden="true" className="flex -space-x-2"><span className="h-6 w-6 rounded-full border border-current opacity-40" /><span className="h-6 w-6 rounded-full border border-current opacity-40" /></span>
                </div>
                <div className="relative flex items-end justify-between">
                  <span className="text-xl font-medium tracking-[0.14em]">{plan.name}</span>
                  <span className="text-[9px] tracking-[0.14em] opacity-60">MEMBERSHIP</span>
                </div>
              </div>
              <div className="mb-6 flex items-center gap-3">
                <div aria-hidden="true" className={`flex h-9 w-9 items-center justify-center rounded-xl border ${plan.premium ? "border-sky-200/20 bg-sky-200/10 text-sky-200" : "border-white/10 bg-white/5 text-slate-300"}`}>
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    {plan.premium ? <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" /><path d="m19 2 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" /></> : <><circle cx="12" cy="12" r="8" /><path d="m8 12 3 3 5-6" /></>}
                  </svg>
                </div>
                <h2 id={`plan-${plan.name}`} className="text-lg font-medium">{plan.label}</h2>
              </div>
              <p className="mb-3 text-xs font-medium text-sky-200">첫 1개월 무료</p>
              <p className="mb-2 flex flex-wrap items-baseline gap-1.5">
                <span className="text-lg text-slate-400">₩</span>
                <span className="text-[52px] font-light leading-none tracking-[-0.04em] tabular-nums">{plan.price}</span>
                <span className="ml-1 text-xs text-slate-400">/ 월</span>
              </p>
              <p className="mb-7 text-xs leading-relaxed text-slate-400">무료 체험 종료 후 월 {plan.price}원</p>
              <ul className="mb-7 space-y-3 border-t border-white/10 pt-5 text-sm text-slate-200">
                <li className="flex items-center gap-2"><span aria-hidden="true" className="text-sky-300">✓</span>일반 AI 이용</li>
                {plan.premium && <li className="flex items-center gap-2"><span aria-hidden="true" className="text-sky-300">✓</span>학습용 AI 이용</li>}
                {plan.premium && <li className="flex items-center gap-2"><span aria-hidden="true" className="text-sky-300">✓</span>새 기능 미리보기</li>}
              </ul>
              <button type="button" disabled className={`flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border text-sm font-medium ${plan.premium ? "border-sky-100 bg-gradient-to-r from-sky-200 to-[#c5dfff] text-[#172a40] shadow-[0_0_24px_-8px_rgba(125,211,252,0.5)]" : "border-white/15 bg-white/5 text-slate-300"}`}>
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                1개월 무료 체험 준비 중
              </button>
            </section>
          ))}
        </div>
        <section aria-labelledby="plan-comparison" className="mt-10 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
          <h2 id="plan-comparison" className="px-5 pb-4 pt-6 text-lg font-medium sm:px-7">기능 비교</h2>
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">라이트와 프리미엄의 멤버십 혜택 비교</caption>
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400">
                <th scope="col" className="w-[42%] px-5 py-4 text-left font-normal sm:px-7">기능</th>
                <th scope="col" className="px-2 py-4 font-medium text-slate-200">라이트</th>
                <th scope="col" className="px-2 py-4 font-medium text-sky-200">프리미엄</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <th scope="row" className="px-5 py-5 text-left font-normal text-slate-300 sm:px-7">일반 AI</th>
                <td className="px-2 py-5 text-center text-sky-200">포함</td>
                <td className="px-2 py-5 text-center text-sky-200">포함</td>
              </tr>
              <tr className="border-b border-white/5">
                <th scope="row" className="px-5 py-5 text-left font-normal text-slate-300 sm:px-7">학습용 AI</th>
                <td className="px-2 py-5 text-center text-slate-500">미포함</td>
                <td className="px-2 py-5 text-center text-sky-200">포함</td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-5 text-left font-normal text-slate-300 sm:px-7">새 기능 미리보기</th>
                <td className="px-2 py-5 text-center text-slate-500">미포함</td>
                <td className="px-2 py-5 text-center text-sky-200">포함</td>
              </tr>
            </tbody>
          </table>
          <p className="border-t border-white/5 px-5 py-4 text-xs leading-5 text-slate-400 sm:px-7">정식 오픈 시 제공할 멤버십 혜택이에요.</p>
        </section>
        <p className="mt-9 text-center text-xs leading-6 text-slate-400">멤버십 오픈 예정 · 현재는 요금 안내 페이지예요.<br />구매와 결제는 정식 오픈 후 이용할 수 있어요.</p>
      </div>
    </main>
  );
}
