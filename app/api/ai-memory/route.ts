import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const text = (messages || [])
    .map((m: any) => `${m.role}: ${m.content}`)
    .join("\n");

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
            content: `
JSON으로만 출력:
{
 "summary": "...",
 "personality": "감정적/논리적/활발/신중"
}
            `,
          },
          { role: "user", content: text },
        ],
      }),
    }
  );

  const data = await response.json();

  try {
    return NextResponse.json(
      JSON.parse(data.choices?.[0]?.message?.content || "{}")
    );
  } catch {
    return NextResponse.json({
      summary: "분석 실패",
      personality: "unknown",
    });
  }
}