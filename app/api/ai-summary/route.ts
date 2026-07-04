import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _client: OpenAI | null = null;
const client = () => {
  if (!process.env.GROQ_API_KEY) return null;
  if (!_client) _client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  return _client;
};

type Message = { from: string; content: string; };

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ summary: "요약할 메시지가 없습니다." });
    }

    const chatText = messages.map((m) => `${m.from}: ${m.content}`).join("\n");

    const c = client();
    if (!c) return NextResponse.json({ summary: "AI 기능이 설정되지 않았어요." });
    const response = await c.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [{ role: "user", content: `다음 채팅 내용을 4~5문장으로 간결하게 한국어로 요약해줘. 핵심 주제와 결론 위주로.\n\n${chatText}` }],
    });

    const summary = response.choices[0]?.message?.content ?? "요약 실패";
    return NextResponse.json({ summary });
  } catch (err) {
    console.error("AI 요약 오류:", err);
    return NextResponse.json({ error: "요약 중 오류가 발생했습니다." }, { status: 500 });
  }
}
