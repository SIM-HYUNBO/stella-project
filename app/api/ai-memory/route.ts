import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const text = (messages || []).map((m: any) => `${m.role}: ${m.content}`).join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `JSON으로만 출력:\n{\n "summary": "...",\n "personality": "감정적/논리적/활발/신중"\n}`,
        },
        { role: "user", content: text },
      ],
    }),
  });

  const data = await response.json();

  try {
    return NextResponse.json(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
  } catch {
    return NextResponse.json({ summary: "분석 실패", personality: "unknown" });
  }
}
