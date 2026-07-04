import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, robotName } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
    }

    const safeMessages = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        stream: true,
        messages: [
          {
            role: "system",
            content: `너는 ${robotName || "AI"} 야. 친근하고 자연스럽게 대화해줘. 너무 길게 말하지 말고 간결하게. 반드시 한국어로만 답해.`,
          },
          ...safeMessages,
        ],
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      const errMsg = data?.error?.message || `오류 (${response.status})`;
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "서버 오류" }, { status: 500 });
  }
}
