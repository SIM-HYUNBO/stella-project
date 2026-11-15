import Link from "next/link";
import { topics } from "./topics";

export default function HelpPage() {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-amber-50 via-white to-sky-50 px-5 py-6 text-slate-800">
      <div className="mx-auto max-w-xl">
        <Link href="/home" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-sky-700 shadow-sm">← 홈으로</Link>
        <section className="mt-5 rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-black tracking-widest text-sky-700">WAGIE HELP</p>
          <h1 className="mt-2 text-2xl font-black">와기 도움말</h1>
          <p className="mt-2 text-sm text-slate-600">궁금한 기능을 골라 보세요. 누르면 사용 순서와 팁이 펼쳐져요.</p>
        </section>
        <section aria-label="도움말 메뉴" className="mt-4 space-y-2.5">
          {topics.map(topic => (
            <details key={topic.id} name="wagie-help-topic" className="group rounded-[22px] border border-sky-100 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[22px] p-4 hover:bg-sky-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-xl">{topic.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">{topic.title}</span>
                  <span className="mt-1 block text-xs text-slate-600">{topic.summary}</span>
                </span>
                <svg aria-hidden="true" className="shrink-0 text-sky-600 transition-transform group-open:rotate-180 motion-reduce:transition-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <div className="space-y-5 border-t border-sky-50 px-4 pb-5 pt-4 sm:px-5">
                {topic.guides.map(guide => (
                  <div key={guide.title}>
                    <h2 className="text-sm font-black">{guide.title}</h2>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 marker:font-bold marker:text-sky-700">
                      {guide.steps.map(step => <li key={step}>{step}</li>)}
                    </ol>
                    {guide.tip && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"><strong>팁 · </strong>{guide.tip}</p>}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </section>
        <section className="mt-5 rounded-[22px] bg-sky-50 p-4">
          <h2 className="text-sm font-black">아직 궁금한 게 있나요?</h2>
          <p className="mt-1 text-sm text-slate-600">어떤 화면에서 막혔는지 적어 Q&amp;A방에 남겨 주세요.</p>
          <Link href="/tools/contact" className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-white px-4 text-sm font-bold text-sky-700">Q&amp;A방으로 →</Link>
        </section>
      </div>
    </main>
  );
}
