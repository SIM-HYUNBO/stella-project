import { NextRequest, NextResponse } from "next/server";

type Message = { from: string; content: string; };

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await req.json();
    if (!messages || messages.length === 0) return NextResponse.json({ summary: "요약할 메시지가 없습니다." });

    const key = process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json({ summary: "AI 키가 없어요." });

    const chatText = messages.map((m) => `${m.from}: ${m.content}`).join("\n");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 300,
        messages: [{ role: "user", content: `다음 채팅 내용을 4~5문장으로 간결하게 한국어로 요약해줘.\n\n${chatText}` }],
      }),
    });
    const data = await res.json();
    return NextResponse.json({ summary: data.choices?.[0]?.message?.content ?? "요약 실패" });
  } catch {
    return NextResponse.json({ error: "요약 중 오류" }, { status: 500 });
  }
}
