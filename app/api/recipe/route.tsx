import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
const getOpenAI = () => {
  if (!process.env.GROQ_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  return _openai;
};

export async function POST(req: NextRequest) {
  const { ingredients } = await req.json();
  const openai = getOpenAI();
  if (!openai) return NextResponse.json({ recipe: "AI 기능이 설정되지 않았어요." });
  const prompt = `다음 재료로 만들 수 있는 요리 레시피를 상세하게 작성해줘: ${ingredients.join(", ")}`;

  const completion = await openai.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
  });

  return NextResponse.json({ recipe: completion.choices[0].message.content });
}
