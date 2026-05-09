import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ messages: [], userWinCount: 0 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const safeMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: "너는 이효린이야. 밝고 활발하고 친근한 말투로 대화해. 반말로 대화하고 이모티콘을 가끔 써.",
          },
          ...safeMessages,
        ],
      }),
    });

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "응답 실패";

    return NextResponse.json({ text, userWinCount: 0 });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
