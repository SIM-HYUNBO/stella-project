import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { ingredients } = await req.json();
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ recipe: "AI 기능이 설정되지 않았어요." });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: `다음 재료로 만들 수 있는 요리 레시피를 상세하게 작성해줘: ${ingredients.join(", ")}` }],
    }),
  });
  const data = await res.json();
  return NextResponse.json({ recipe: data.choices?.[0]?.message?.content });
}
