"use client";

import Image from "next/image";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ChatKingProgress from "@/components/ChatKingProgress";

export default function EventsPage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl px-1 pb-24 pt-3 sm:px-4">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/home" aria-label="홈으로 돌아가기" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-white text-slate-600 transition active:scale-95">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">와기 이벤트</h1>
        </div>

        <article aria-labelledby="chat-king-title" className="overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-[0_12px_40px_-20px_rgba(14,165,233,0.3)]">
          <Image src="/events/chat-king.png" alt="왕관을 쓴 하늘색 오리가 소개하는 채팅의 왕 이벤트. 12월 1일부터 10일까지 채팅 100만 개 보내기. 달성 보상은 라이트 20일 무료 체험이며, 체험 후 자동 종료됩니다." width={1024} height={1536} sizes="(max-width: 672px) 100vw, 672px" priority className="h-auto w-full" />
          <div className="p-6 sm:p-8">
            <h2 id="chat-king-title" className="text-2xl font-bold tracking-tight text-slate-800">채팅의 왕</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex gap-5"><dt className="w-10 shrink-0 text-slate-500">기간</dt><dd className="font-medium text-slate-800">2026년 12월 1일 ~ 12월 10일 (한국 시간)</dd></div>
              <div className="flex gap-5"><dt className="w-10 shrink-0 text-slate-500">미션</dt><dd className="font-medium text-slate-800">한 사람당 채팅 100만 개 보내기</dd></div>
              <div className="flex gap-5"><dt className="w-10 shrink-0 text-slate-500">보상</dt><dd className="font-semibold text-sky-700">라이트 20일 무료 체험</dd></div>
            </dl>
            <ChatKingProgress />
            <div className="mt-6 rounded-2xl bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900">
              <p className="font-semibold">20일이 지나면 체험이 자동 종료돼요.</p>
              <p>체험 종료 후 결제로 전환되거나 요금이 청구되지 않아요.</p>
            </div>
          </div>
        </article>
      </div>
    </PageContainer>
  );
}
