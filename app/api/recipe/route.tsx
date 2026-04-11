import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { userId, ingredients } = await req.json();
  const prompt = `다음 재료로 만들 수 있는 요리 레시피를 상세하게 작성해줘: ${ingredients.join(", ")}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  return NextResponse.json({ recipe: completion.choices[0].message.content });
}