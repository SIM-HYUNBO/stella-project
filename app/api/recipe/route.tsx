import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

export async function POST(req: NextRequest) {
  const { userId, ingredients } = await req.json();
  const openai = getOpenAI();
  if (!openai) return NextResponse.json({ recipe: "AI 기능이 설정되지 않았어요." });
  const prompt = `다음 재료로 만들 수 있는 요리 레시피를 상세하게 작성해줘: ${ingredients.join(", ")}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  return NextResponse.json({ recipe: completion.choices[0].message.content });
}