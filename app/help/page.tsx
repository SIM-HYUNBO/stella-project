import Link from "next/link";

export default function HelpPage() {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-amber-50 via-white to-sky-50 px-5 py-6 text-slate-800">
      <div className="mx-auto max-w-xl">
        <Link href="/home" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-sky-700 shadow-sm">← 홈으로</Link>
        <section className="mt-5 rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-black tracking-widest text-sky-700">WAGIE HELP</p>
          <h1 className="mt-2 text-2xl font-black">와기 도움말</h1>
          <p className="mt-2 text-sm text-slate-600">와기 사용 안내를 준비하고 있어요.</p>
          <Link href="/tools/contact" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-sky-50 px-4 text-sm font-bold text-sky-700">Q&amp;A방으로</Link>
        </section>
      </div>
    </main>
  );
}
