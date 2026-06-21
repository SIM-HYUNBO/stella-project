import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, memory } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const safeMessages = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const memoryContext = memory
      ? `사용자 성격: ${memory.personality}\n요약: ${memory.summary}`
      : "";

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `너는 개인 AI 비서야.\n${memoryContext}`,
            },
            ...safeMessages,
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `OpenAI 오류 (${response.status})`;
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return NextResponse.json({ error: "OpenAI 응답 없음" }, { status: 500 });
    }

    return NextResponse.json({ reply });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "서버 오류" },
      { status: 500 }
    );
  }
}